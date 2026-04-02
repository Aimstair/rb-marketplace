import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { createNotification } from "@/app/actions/notifications"
import { sendGiveawayAnnouncementCampaign } from "@/lib/engagement-email"
import { isGiveawayFeatureEnabled } from "@/lib/feature-flags"
import { logError, logInfo, logWarn } from "@/lib/observability"

export const dynamic = "force-dynamic"

const DEFAULT_ACTIVE_DURATION_HOURS = 24
const prismaAny = prisma as any

function getRequestSecret(request: NextRequest): string {
  const direct = request.headers.get("x-giveaway-secret")
  if (direct) {
    return direct
  }

  const authHeader = request.headers.get("authorization")
  if (!authHeader) {
    return ""
  }

  if (!authHeader.toLowerCase().startsWith("bearer ")) {
    return ""
  }

  return authHeader.slice(7).trim()
}

async function isGiveawayStorageReady(): Promise<boolean> {
  if (!prismaAny.giveaway || !prismaAny.giveawayEntry) {
    return false
  }

  try {
    const result = await prisma.$queryRaw<Array<{ relation: string | null }>>`
      SELECT to_regclass('public.giveaways')::text AS relation
    `

    return Boolean(result?.[0]?.relation)
  } catch {
    return false
  }
}

function normalizeBoolean(value: unknown): boolean {
  if (typeof value === "boolean") {
    return value
  }

  if (typeof value === "string") {
    return value.toLowerCase() === "true"
  }

  return false
}

function addHours(base: Date, hours: number): Date {
  const value = new Date(base)
  value.setHours(value.getHours() + hours)
  return value
}

async function pickRandomWinnerUserId(giveawayId: string): Promise<string | null> {
  const entries = await prismaAny.giveawayEntry.findMany({
    where: { giveawayId },
    select: {
      userId: true,
    },
  })

  if (!entries || entries.length === 0) {
    return null
  }

  const randomIndex = Math.floor(Math.random() * entries.length)
  return entries[randomIndex]?.userId || null
}

export async function POST(request: NextRequest) {
  try {
    if (!isGiveawayFeatureEnabled()) {
      return NextResponse.json({
        success: true,
        skipped: "feature_disabled",
      })
    }

    const expectedSecret = process.env.GIVEAWAY_CRON_SECRET || ""
    const providedSecret = getRequestSecret(request)

    if (!expectedSecret || providedSecret !== expectedSecret) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    let dryRun = false
    try {
      const body = await request.json()
      dryRun = normalizeBoolean((body || {}).dryRun)
    } catch {
      dryRun = false
    }

    const storageReady = await isGiveawayStorageReady()
    if (!storageReady) {
      return NextResponse.json(
        {
          success: false,
          error: "Giveaway storage is not initialized",
        },
        { status: 503 }
      )
    }

    const now = new Date()
    const activeGiveaways = await prismaAny.giveaway.findMany({
      where: { status: "ACTIVE" },
      select: {
        id: true,
        title: true,
        startsAt: true,
        endsAt: true,
      },
      orderBy: [{ startsAt: "asc" }, { createdAt: "asc" }],
    })

    if (activeGiveaways.length > 1) {
      logWarn("giveaway.tick.multiple_active", {
        count: activeGiveaways.length,
        ids: activeGiveaways.map((entry: any) => entry.id),
      })
    }

    const completedGiveawayIds: string[] = []
    let activatedGiveawayId: string | null = null

    for (const giveaway of activeGiveaways) {
      if (!giveaway.endsAt || new Date(giveaway.endsAt) > now) {
        continue
      }

      const winnerUserId = await pickRandomWinnerUserId(giveaway.id)
      completedGiveawayIds.push(giveaway.id)

      if (dryRun) {
        continue
      }

      await prismaAny.giveaway.update({
        where: { id: giveaway.id },
        data: {
          status: "COMPLETED",
          winnerUserId,
          endsAt: giveaway.endsAt || now,
        },
      })

      if (winnerUserId) {
        await createNotification(
          winnerUserId,
          "SYSTEM",
          "You won a giveaway!",
          `Congratulations! You won \"${giveaway.title}\".`,
          "/"
        ).catch((error) => {
          logWarn("giveaway.tick.winner_notification_failed", {
            giveawayId: giveaway.id,
            winnerUserId,
            error: error instanceof Error ? error.message : String(error),
          })
        })
      }
    }

    const stillActiveCount = dryRun
      ? activeGiveaways.filter((entry: any) => !entry.endsAt || new Date(entry.endsAt) > now).length
      : await prismaAny.giveaway.count({ where: { status: "ACTIVE" } })

    if (stillActiveCount === 0) {
      const queuedGiveaway = await prismaAny.giveaway.findFirst({
        where: {
          status: "QUEUED",
          OR: [{ startsAt: null }, { startsAt: { lte: now } }],
        },
        select: {
          id: true,
          title: true,
          rewardLabel: true,
          startsAt: true,
          endsAt: true,
        },
        orderBy: [{ startsAt: "asc" }, { createdAt: "asc" }],
      })

      if (queuedGiveaway) {
        activatedGiveawayId = queuedGiveaway.id

        if (!dryRun) {
          const startAt = queuedGiveaway.startsAt || now
          const endAt = queuedGiveaway.endsAt || addHours(startAt, DEFAULT_ACTIVE_DURATION_HOURS)

          await prismaAny.giveaway.update({
            where: { id: queuedGiveaway.id },
            data: {
              status: "ACTIVE",
              startsAt: startAt,
              endsAt: endAt,
            },
          })

          await sendGiveawayAnnouncementCampaign({
            campaignKey: `giveaway-activation:${queuedGiveaway.id}`,
            title: queuedGiveaway.title,
            rewardLabel: queuedGiveaway.rewardLabel,
            startsAt: startAt,
            endsAt: endAt,
            batchLimit: 200,
          }).catch((error) => {
            logWarn("giveaway.tick.announcement_failed", {
              giveawayId: queuedGiveaway.id,
              error: error instanceof Error ? error.message : String(error),
            })
          })
        }
      }
    }

    logInfo("giveaway.tick.completed", {
      dryRun,
      completedCount: completedGiveawayIds.length,
      activatedGiveawayId,
    })

    return NextResponse.json({
      success: true,
      dryRun,
      completedGiveawayIds,
      activatedGiveawayId,
      timestamp: now.toISOString(),
    })
  } catch (error) {
    logError("giveaway.tick.failed", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to process giveaway tick",
      },
      { status: 500 }
    )
  }
}
