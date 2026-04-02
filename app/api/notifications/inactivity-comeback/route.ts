import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { sendInactivityComebackEmail } from "@/lib/engagement-email"
import { isEmailNotificationsFeatureEnabled } from "@/lib/feature-flags"
import { logError, logInfo } from "@/lib/observability"

export const dynamic = "force-dynamic"

function resolveSecret(request: NextRequest): string {
  const direct = request.headers.get("x-email-inactivity-secret")
  if (direct) {
    return direct
  }

  const fallback = request.headers.get("x-email-digest-secret")
  if (fallback) {
    return fallback
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

function toNumber(value: unknown, fallback: number): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.floor(value)
  }

  if (typeof value === "string") {
    const parsed = Number.parseInt(value, 10)
    if (Number.isFinite(parsed)) {
      return parsed
    }
  }

  return fallback
}

function resolveCampaignDate(value: unknown): string {
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value.trim())) {
    return value.trim()
  }

  return new Date().toISOString().slice(0, 10)
}

export async function POST(request: NextRequest) {
  try {
    if (!isEmailNotificationsFeatureEnabled()) {
      return NextResponse.json({ success: true, skipped: "feature_disabled" })
    }

    const expectedSecret = process.env.EMAIL_INACTIVITY_CRON_SECRET || process.env.EMAIL_DIGEST_CRON_SECRET || ""
    const providedSecret = resolveSecret(request)

    if (!expectedSecret || expectedSecret !== providedSecret) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
    }

    let dryRun = false
    let minInactivityDays = 7
    let batchLimit = 200
    let campaignDate = new Date().toISOString().slice(0, 10)

    try {
      const body = await request.json()
      dryRun = toBoolean((body || {}).dryRun)
      minInactivityDays = Math.min(Math.max(toNumber((body || {}).minInactivityDays, 7), 3), 120)
      batchLimit = Math.min(Math.max(toNumber((body || {}).batchLimit, 200), 1), 1000)
      campaignDate = resolveCampaignDate((body || {}).campaignDate)
    } catch {
      dryRun = false
      minInactivityDays = 7
      batchLimit = 200
      campaignDate = new Date().toISOString().slice(0, 10)
    }

    const inactiveSince = new Date()
    inactiveSince.setDate(inactiveSince.getDate() - minInactivityDays)

    const users = await prisma.user.findMany({
      where: {
        isBanned: false,
        lastActive: {
          lte: inactiveSince,
        },
        preferences: {
          is: {
            notifyMarketingEmails: true,
          },
        },
      },
      select: {
        id: true,
        email: true,
        lastActive: true,
      },
      orderBy: {
        lastActive: "asc",
      },
      take: batchLimit,
    })

    if (users.length === 0) {
      return NextResponse.json({
        success: true,
        dryRun,
        usersEvaluated: 0,
        emailsQueued: 0,
        emailsSent: 0,
        emailsFailed: 0,
        emailsDeduped: 0,
        emailsSkipped: 0,
        retryAttempts: 0,
      })
    }

    const campaignKey = `inactivity-comeback:${campaignDate}:d${minInactivityDays}`

    let emailsQueued = 0
    let emailsSent = 0
    let emailsFailed = 0
    let emailsDeduped = 0
    let emailsSkipped = 0
    let retryAttempts = 0

    for (const user of users) {
      if (!user.email) {
        continue
      }

      emailsQueued += 1
      if (dryRun) {
        continue
      }

      const inactivityDays = Math.max(
        0,
        Math.floor((Date.now() - new Date(user.lastActive).getTime()) / (24 * 60 * 60 * 1000))
      )

      const delivery = await sendInactivityComebackEmail({
        campaignKey,
        recipientUserId: user.id,
        inactivityDays,
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

    logInfo("notifications.inactivity_comeback.completed", {
      dryRun,
      campaignKey,
      minInactivityDays,
      usersEvaluated: users.length,
      emailsQueued,
      emailsSent,
      emailsFailed,
      emailsDeduped,
      emailsSkipped,
      retryAttempts,
    })

    return NextResponse.json({
      success: true,
      dryRun,
      campaignKey,
      minInactivityDays,
      usersEvaluated: users.length,
      emailsQueued,
      emailsSent,
      emailsFailed,
      emailsDeduped,
      emailsSkipped,
      retryAttempts,
    })
  } catch (error) {
    logError("notifications.inactivity_comeback.failed", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to process inactivity comeback campaign",
      },
      { status: 500 }
    )
  }
}
