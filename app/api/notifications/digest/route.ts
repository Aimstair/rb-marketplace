import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { sendCampaignEmailToRecipient, sendWeeklyDigestWithHighlightsEmail } from "@/lib/engagement-email"
import { isEmailNotificationsFeatureEnabled } from "@/lib/feature-flags"
import { logError, logInfo } from "@/lib/observability"

export const dynamic = "force-dynamic"

type DigestMode = "daily" | "weekly"

function resolveSecret(request: NextRequest): string {
  const direct = request.headers.get("x-email-digest-secret")
  if (direct) {
    return direct
  }

  const authHeader = request.headers.get("authorization")
  if (!authHeader || !authHeader.toLowerCase().startsWith("bearer ")) {
    return ""
  }

  return authHeader.slice(7).trim()
}

function toBoolean(value: unknown): boolean {
  if (typeof value === "boolean") {
    return value
  }

  if (typeof value === "string") {
    return value.toLowerCase() === "true"
  }

  return false
}

function resolveMode(value: unknown): DigestMode {
  if (typeof value !== "string") {
    return "daily"
  }

  return value.toLowerCase() === "weekly" ? "weekly" : "daily"
}

async function getTrendingHighlights(limit: number = 5): Promise<Array<{ title: string; views: number; priceLabel: string }>> {
  const [itemListings, currencyListings] = await Promise.all([
    prisma.itemListing.findMany({
      where: { status: "available" },
      select: {
        title: true,
        views: true,
        price: true,
      },
      orderBy: { views: "desc" },
      take: limit,
    }),
    prisma.currencyListing.findMany({
      where: { status: "available" },
      select: {
        title: true,
        views: true,
        ratePerPeso: true,
      },
      orderBy: { views: "desc" },
      take: limit,
    }),
  ])

  return [
    ...itemListings.map((listing) => ({
      title: listing.title,
      views: listing.views,
      priceLabel: `${listing.price.toLocaleString()} Robux`,
    })),
    ...currencyListings.map((listing) => ({
      title: listing.title,
      views: listing.views,
      priceLabel: `${listing.ratePerPeso.toLocaleString()} per PHP 1`,
    })),
  ]
    .sort((a, b) => b.views - a.views)
    .slice(0, limit)
}

async function getRisingUsers(limit: number = 5): Promise<Array<{ username: string; completedSales: number }>> {
  const since = new Date()
  since.setDate(since.getDate() - 7)

  const grouped = await prisma.transaction.groupBy({
    by: ["sellerId"],
    where: {
      status: "COMPLETED",
      updatedAt: { gte: since },
    },
    _count: {
      _all: true,
    },
    orderBy: {
      _count: {
        sellerId: "desc",
      },
    },
    take: limit,
  })

  if (grouped.length === 0) {
    return []
  }

  const users = await prisma.user.findMany({
    where: {
      id: {
        in: grouped.map((entry) => entry.sellerId),
      },
    },
    select: {
      id: true,
      username: true,
    },
  })

  const userMap = new Map(users.map((user) => [user.id, user.username]))

  return grouped
    .map((entry) => ({
      username: userMap.get(entry.sellerId) || "Unknown trader",
      completedSales: entry._count._all,
    }))
    .slice(0, limit)
}

function buildDigestHtml(username: string, items: Array<{ title: string; message: string; link: string | null }>) {
  const rows = items
    .map(
      (item) =>
        `<li><strong>${item.title}</strong><br/>${item.message}${item.link ? ` <a href="${item.link}">Open</a>` : ""}</li>`
    )
    .join("")

  return `
    <div style="font-family: Arial, sans-serif; line-height: 1.5; color: #111; max-width: 640px; margin: 0 auto;">
      <h2>Hi ${username}, here is your notification digest</h2>
      <p>You have ${items.length} unread notifications from RB Marketplace.</p>
      <ul>${rows}</ul>
      <p style="margin-top: 16px;">Visit your notifications page for full details.</p>
    </div>
  `
}

export async function POST(request: NextRequest) {
  try {
    if (!isEmailNotificationsFeatureEnabled()) {
      return NextResponse.json({ success: true, skipped: "feature_disabled" })
    }

    const expectedSecret = process.env.EMAIL_DIGEST_CRON_SECRET || ""
    const providedSecret = resolveSecret(request)
    if (!expectedSecret || expectedSecret !== providedSecret) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
    }

    let dryRun = false
    let mode: DigestMode = "daily"
    try {
      const body = await request.json()
      dryRun = toBoolean((body || {}).dryRun)
      mode = resolveMode((body || {}).mode)
    } catch {
      dryRun = false
      mode = "daily"
    }

    const since = new Date()
    since.setDate(since.getDate() - (mode === "weekly" ? 7 : 1))

    const unreadCounts = await prisma.notification.groupBy({
      by: ["userId"],
      where: {
        isRead: false,
        createdAt: { gte: since },
      },
      _count: {
        _all: true,
      },
      orderBy: {
        userId: "asc",
      },
      take: 100,
    })

    const unreadMap = new Map(unreadCounts.map((entry) => [entry.userId, entry._count._all]))

    if (mode === "daily" && unreadCounts.length === 0) {
      return NextResponse.json({
        success: true,
        dryRun,
        mode,
        usersEvaluated: 0,
        emailsSent: 0,
      })
    }

    const users =
      mode === "weekly"
        ? await prisma.user.findMany({
            where: {
              isBanned: false,
              preferences: {
                is: {
                  notifyMarketingEmails: true,
                },
              },
            },
            select: {
              id: true,
              username: true,
              email: true,
              lastActive: true,
            },
            orderBy: {
              createdAt: "asc",
            },
            take: 100,
          })
        : await prisma.user.findMany({
            where: {
              id: {
                in: unreadCounts.map((entry) => entry.userId),
              },
            },
            select: {
              id: true,
              username: true,
              email: true,
              lastActive: true,
            },
          })

    if (users.length === 0) {
      return NextResponse.json({
        success: true,
        dryRun,
        mode,
        usersEvaluated: 0,
        emailsSent: 0,
      })
    }

    const [trendingHighlights, risingUsers] =
      mode === "weekly"
        ? await Promise.all([getTrendingHighlights(5), getRisingUsers(5)])
        : [[], []]

    const userIds = users.map((user) => user.id)
    const unreadNotifications = userIds.length
      ? await prisma.notification.findMany({
          where: {
            userId: { in: userIds },
            isRead: false,
            createdAt: { gte: since },
          },
          select: {
            userId: true,
            title: true,
            message: true,
            link: true,
            createdAt: true,
          },
          orderBy: [{ userId: "asc" }, { createdAt: "desc" }],
        })
      : []

    const notificationsByUser = new Map<string, Array<{ title: string; message: string; link: string | null }>>()
    for (const notification of unreadNotifications) {
      const bucket = notificationsByUser.get(notification.userId) || []
      if (bucket.length >= 10) {
        continue
      }

      bucket.push({
        title: notification.title,
        message: notification.message,
        link: notification.link,
      })
      notificationsByUser.set(notification.userId, bucket)
    }

    const campaignWindowKey = `${mode}:${since.toISOString().slice(0, 10)}`

    let emailsSent = 0
    let emailsFailed = 0
    let emailsQueued = 0
    let emailsDeduped = 0
    let emailsSkipped = 0
    let retryAttempts = 0

    for (const user of users) {
      if (!user?.email) {
        continue
      }

      const unreadCount = unreadMap.get(user.id) || 0
      const notifications = notificationsByUser.get(user.id) || []

      if (dryRun) {
        emailsQueued += 1
        continue
      }

      if (mode === "weekly") {
        const delivery = await sendWeeklyDigestWithHighlightsEmail({
          recipientUserId: user.id,
          unreadItems: notifications,
          unreadCount,
          campaignKey: `weekly-digest:${campaignWindowKey}`,
          inactivityDays: Math.max(
            0,
            Math.floor((Date.now() - new Date(user.lastActive).getTime()) / (24 * 60 * 60 * 1000))
          ),
          trendingListings: trendingHighlights,
          risingUsers,
        })

        retryAttempts += delivery.retries

        if (delivery.skipped) {
          emailsSkipped += 1
        } else if (delivery.deduped) {
          emailsDeduped += 1
        } else if (delivery.sent) {
          emailsSent += 1
        } else {
          emailsFailed += 1
        }
      } else {
        const delivery = await sendCampaignEmailToRecipient({
          campaignKey: `daily-digest:${campaignWindowKey}`,
          recipientUserId: user.id,
          to: user.email,
          subject: `Your RB Marketplace Digest (${unreadCount} updates)`,
          html: buildDigestHtml(user.username, notifications),
          maxAttempts: 3,
        })
        retryAttempts += delivery.retries

        if (delivery.skipped) {
          emailsSkipped += 1
        } else if (delivery.deduped) {
          emailsDeduped += 1
        } else if (delivery.sent) {
          emailsSent += 1
        } else {
          emailsFailed += 1
        }
      }
    }

    logInfo("notifications.digest.completed", {
      dryRun,
      mode,
      campaignWindowKey,
      usersEvaluated: users.length,
      emailsSent,
      emailsFailed,
      emailsQueued,
      emailsDeduped,
      emailsSkipped,
      retryAttempts,
    })

    return NextResponse.json({
      success: true,
      dryRun,
      mode,
      usersEvaluated: users.length,
      emailsSent,
      emailsFailed,
      emailsQueued,
      emailsDeduped,
      emailsSkipped,
      retryAttempts,
    })
  } catch (error) {
    logError("notifications.digest.failed", error)
    return NextResponse.json({ success: false, error: "Failed to process digest" }, { status: 500 })
  }
}
