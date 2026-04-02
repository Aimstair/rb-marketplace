"use server"

import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { isGiveawayFeatureEnabled } from "@/lib/feature-flags"
import { createNotification } from "@/app/actions/notifications"
import { sendGiveawayAnnouncementCampaign } from "@/lib/engagement-email"
import { revalidatePath } from "next/cache"

const REQUIRED_COMPLETED_TRADES = 3
const ELIGIBILITY_WINDOW_DAYS = 7

const prismaAny = prisma as any

interface GiveawayHomeData {
  active: {
    id: string
    title: string
    description?: string | null
    rewardLabel?: string | null
    rewardImageUrl?: string | null
    status: string
    startsAt?: string | null
    endsAt?: string | null
    joinedCount: number
  } | null
  queued: Array<{
    id: string
    title: string
    description?: string | null
    rewardLabel?: string | null
    rewardImageUrl?: string | null
    startsAt?: string | null
    endsAt?: string | null
    joinedCount: number
  }>
  history: Array<{
    id: string
    title: string
    description?: string | null
    rewardLabel?: string | null
    rewardImageUrl?: string | null
    joinedCount: number
    endsAt?: string | null
    winnerUser?: {
      id?: string
      username?: string
      profilePicture?: string | null
    } | null
  }>
  joined: boolean
  eligibility: {
    eligible: boolean
    completedTransactionsCount: number
    requiredCount: number
  } | null
}

interface GiveawayActionResult<T = undefined> {
  success: boolean
  data?: T
  error?: string
}

function toIso(value: Date | string | null | undefined): string | null {
  if (!value) {
    return null
  }

  return new Date(value).toISOString()
}

async function getCurrentUser() {
  const session = await auth()
  if (!session?.user?.email) {
    return null
  }

  return prisma.user.findUnique({
    where: { email: session.user.email },
    select: {
      id: true,
      email: true,
      username: true,
    },
  })
}

async function getCurrentAdmin() {
  const session = await auth()
  if (!session?.user?.email) {
    return null
  }

  return prisma.user.findUnique({
    where: { email: session.user.email },
    select: {
      id: true,
      email: true,
      username: true,
      role: true,
    },
  })
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

async function countCompletedTradesForEligibility(userId: string): Promise<number> {
  const since = new Date()
  since.setDate(since.getDate() - ELIGIBILITY_WINDOW_DAYS)

  return prisma.transaction.count({
    where: {
      status: {
        in: ["COMPLETED", "completed"],
      },
      updatedAt: {
        gte: since,
      },
      OR: [{ buyerId: userId }, { sellerId: userId }],
    },
  })
}

function mapGiveawaySummary(giveaway: any) {
  return {
    id: giveaway.id,
    title: giveaway.title,
    description: giveaway.description || null,
    rewardLabel: giveaway.rewardLabel || null,
    rewardImageUrl: giveaway.rewardImageUrl || null,
    status: giveaway.status,
    startsAt: toIso(giveaway.startsAt),
    endsAt: toIso(giveaway.endsAt),
    joinedCount: giveaway?._count?.entries || 0,
  }
}

export async function getGiveawayHomeData(): Promise<GiveawayActionResult<GiveawayHomeData>> {
  try {
    const user = await getCurrentUser()

    const completedTransactionsCount = user
      ? await countCompletedTradesForEligibility(user.id)
      : 0

    const eligibility = user
      ? {
          eligible: completedTransactionsCount >= REQUIRED_COMPLETED_TRADES,
          completedTransactionsCount,
          requiredCount: REQUIRED_COMPLETED_TRADES,
        }
      : null

    if (!isGiveawayFeatureEnabled()) {
      return {
        success: true,
        data: {
          active: null,
          queued: [],
          history: [],
          joined: false,
          eligibility,
        },
      }
    }

    const storageReady = await isGiveawayStorageReady()
    if (!storageReady) {
      return {
        success: true,
        data: {
          active: null,
          queued: [],
          history: [],
          joined: false,
          eligibility,
        },
      }
    }

    const [active, queued, history] = await Promise.all([
      prismaAny.giveaway.findFirst({
        where: { status: "ACTIVE" },
        include: {
          _count: {
            select: { entries: true },
          },
        },
        orderBy: [{ startsAt: "asc" }, { createdAt: "asc" }],
      }),
      prismaAny.giveaway.findMany({
        where: { status: "QUEUED" },
        include: {
          _count: {
            select: { entries: true },
          },
        },
        orderBy: [{ startsAt: "asc" }, { createdAt: "asc" }],
        take: 5,
      }),
      prismaAny.giveaway.findMany({
        where: { status: "COMPLETED" },
        include: {
          _count: {
            select: { entries: true },
          },
          winnerUser: {
            select: {
              id: true,
              username: true,
              profilePicture: true,
            },
          },
        },
        orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
        take: 5,
      }),
    ])

    let joined = false
    if (user && active?.id) {
      const existingEntry = await prismaAny.giveawayEntry.findUnique({
        where: {
          giveawayId_userId: {
            giveawayId: active.id,
            userId: user.id,
          },
        },
        select: { id: true },
      })
      joined = Boolean(existingEntry)
    }

    return {
      success: true,
      data: {
        active: active ? mapGiveawaySummary(active) : null,
        queued: queued.map(mapGiveawaySummary),
        history: history.map((entry: any) => ({
          id: entry.id,
          title: entry.title,
          description: entry.description || null,
          rewardLabel: entry.rewardLabel || null,
          rewardImageUrl: entry.rewardImageUrl || null,
          joinedCount: entry?._count?.entries || 0,
          endsAt: toIso(entry.endsAt),
          winnerUser: entry.winnerUser
            ? {
                id: entry.winnerUser.id,
                username: entry.winnerUser.username,
                profilePicture: entry.winnerUser.profilePicture,
              }
            : null,
        })),
        joined,
        eligibility,
      },
    }
  } catch (error) {
    console.error("Failed to load giveaway home data:", error)
    return {
      success: false,
      error: "Failed to load giveaway data.",
    }
  }
}

export async function joinGiveaway(giveawayId: string): Promise<GiveawayActionResult> {
  try {
    if (!isGiveawayFeatureEnabled()) {
      return {
        success: false,
        error: "Giveaway feature is currently disabled.",
      }
    }

    const user = await getCurrentUser()
    if (!user) {
      return {
        success: false,
        error: "You must be logged in to join a giveaway.",
      }
    }

    if (!giveawayId?.trim()) {
      return {
        success: false,
        error: "Giveaway ID is required.",
      }
    }

    const storageReady = await isGiveawayStorageReady()
    if (!storageReady) {
      return {
        success: false,
        error: "Giveaway storage is not initialized. Run migrations and try again.",
      }
    }

    const completedTransactionsCount = await countCompletedTradesForEligibility(user.id)
    if (completedTransactionsCount < REQUIRED_COMPLETED_TRADES) {
      return {
        success: false,
        error: `You need at least ${REQUIRED_COMPLETED_TRADES} completed trades in the last ${ELIGIBILITY_WINDOW_DAYS} days to join.`,
      }
    }

    const giveaway = await prismaAny.giveaway.findFirst({
      where: {
        id: giveawayId,
        status: "ACTIVE",
        AND: [
          {
            OR: [{ startsAt: null }, { startsAt: { lte: new Date() } }],
          },
          {
            OR: [{ endsAt: null }, { endsAt: { gt: new Date() } }],
          },
        ],
      },
      select: {
        id: true,
        title: true,
      },
    })

    if (!giveaway) {
      return {
        success: false,
        error: "This giveaway is no longer active.",
      }
    }

    const existingEntry = await prismaAny.giveawayEntry.findUnique({
      where: {
        giveawayId_userId: {
          giveawayId,
          userId: user.id,
        },
      },
      select: { id: true },
    })

    if (existingEntry) {
      return {
        success: false,
        error: "You already joined this giveaway.",
      }
    }

    await prismaAny.giveawayEntry.create({
      data: {
        giveawayId,
        userId: user.id,
      },
      select: {
        id: true,
      },
    })

    await createNotification(
      user.id,
      "SYSTEM",
      "Giveaway Entry Confirmed",
      `You successfully joined \"${giveaway.title}\". Good luck!`,
      "/"
    ).catch(() => {
      // Notification failures are non-blocking for entry creation.
    })

    return { success: true }
  } catch (error) {
    console.error("Failed to join giveaway:", error)
    return {
      success: false,
      error: "Failed to join giveaway. Please try again.",
    }
  }
}

type GiveawayAdminStatus = "QUEUED" | "ACTIVE" | "PAUSED" | "COMPLETED" | "CANCELLED"

interface GiveawayParticipantView {
  id: string
  userId: string
  username: string
  email: string
  profilePicture: string | null
  joinedAt: string
}

interface GiveawayAdminItem {
  id: string
  title: string
  description: string | null
  rewardLabel: string | null
  rewardImageUrl: string | null
  status: GiveawayAdminStatus
  startsAt: string | null
  endsAt: string | null
  createdAt: string
  updatedAt: string
  entriesCount: number
  winnerUsername: string | null
}

interface GiveawayAdminDetail extends GiveawayAdminItem {
  createdByUsername: string | null
  participants: GiveawayParticipantView[]
}

interface GiveawayAdminResult<T> {
  success: boolean
  data?: T
  error?: string
}

function mapGiveawayAdminItem(giveaway: any): GiveawayAdminItem {
  return {
    id: giveaway.id,
    title: giveaway.title,
    description: giveaway.description || null,
    rewardLabel: giveaway.rewardLabel || null,
    rewardImageUrl: giveaway.rewardImageUrl || null,
    status: giveaway.status,
    startsAt: toIso(giveaway.startsAt),
    endsAt: toIso(giveaway.endsAt),
    createdAt: toIso(giveaway.createdAt) || new Date().toISOString(),
    updatedAt: toIso(giveaway.updatedAt) || new Date().toISOString(),
    entriesCount: giveaway?._count?.entries || 0,
    winnerUsername: giveaway?.winnerUser?.username || null,
  }
}

function allowedStatus(status: string): status is GiveawayAdminStatus {
  return ["QUEUED", "ACTIVE", "PAUSED", "COMPLETED", "CANCELLED"].includes(status)
}

export async function getAdminGiveaways(): Promise<GiveawayAdminResult<GiveawayAdminItem[]>> {
  try {
    const admin = await getCurrentAdmin()
    if (!admin || admin.role !== "admin") {
      return { success: false, error: "Admin access required." }
    }

    const storageReady = await isGiveawayStorageReady()
    if (!storageReady) {
      return { success: true, data: [] }
    }

    const giveaways = await prismaAny.giveaway.findMany({
      include: {
        _count: {
          select: { entries: true },
        },
        winnerUser: {
          select: { username: true },
        },
      },
      orderBy: [{ createdAt: "desc" }],
    })

    return {
      success: true,
      data: giveaways.map(mapGiveawayAdminItem),
    }
  } catch (error) {
    console.error("Failed to load admin giveaways:", error)
    return { success: false, error: "Failed to load giveaways." }
  }
}

export async function getAdminGiveawayDetail(
  giveawayId: string
): Promise<GiveawayAdminResult<GiveawayAdminDetail>> {
  try {
    const admin = await getCurrentAdmin()
    if (!admin || admin.role !== "admin") {
      return { success: false, error: "Admin access required." }
    }

    const storageReady = await isGiveawayStorageReady()
    if (!storageReady) {
      return { success: false, error: "Giveaway storage is not initialized." }
    }

    const giveaway = await prismaAny.giveaway.findUnique({
      where: { id: giveawayId },
      include: {
        _count: {
          select: { entries: true },
        },
        winnerUser: {
          select: { username: true },
        },
        createdBy: {
          select: { username: true },
        },
        entries: {
          select: {
            id: true,
            userId: true,
            user: {
              select: {
                id: true,
                username: true,
                email: true,
                profilePicture: true,
              },
            },
          },
          orderBy: [{ id: "desc" }],
        },
      },
    })

    if (!giveaway) {
      return { success: false, error: "Giveaway not found." }
    }

    return {
      success: true,
      data: {
        ...mapGiveawayAdminItem(giveaway),
        createdByUsername: giveaway?.createdBy?.username || null,
        participants: (giveaway.entries || []).map((entry: any) => ({
          id: entry.id,
          userId: entry.user.id,
          username: entry.user.username,
          email: entry.user.email,
          profilePicture: entry.user.profilePicture || null,
          joinedAt: toIso(giveaway.createdAt) || new Date().toISOString(),
        })),
      },
    }
  } catch (error) {
    console.error("Failed to load giveaway detail:", error)
    return { success: false, error: "Failed to load giveaway details." }
  }
}

export async function createAdminGiveaway(input: {
  title: string
  description?: string
  rewardLabel?: string
  rewardImageUrl?: string
  startsAt?: string | null
  endsAt?: string | null
}): Promise<GiveawayAdminResult<{ id: string }>> {
  try {
    const admin = await getCurrentAdmin()
    if (!admin || admin.role !== "admin") {
      return { success: false, error: "Admin access required." }
    }

    const storageReady = await isGiveawayStorageReady()
    if (!storageReady) {
      return { success: false, error: "Giveaway storage is not initialized." }
    }

    const title = input.title.trim()
    if (!title) {
      return { success: false, error: "Title is required." }
    }

    const created = await prismaAny.giveaway.create({
      data: {
        title,
        description: input.description?.trim() || null,
        rewardLabel: input.rewardLabel?.trim() || null,
        rewardImageUrl: input.rewardImageUrl?.trim() || null,
        status: "QUEUED",
        startsAt: input.startsAt ? new Date(input.startsAt) : null,
        endsAt: input.endsAt ? new Date(input.endsAt) : null,
        createdById: admin.id,
      },
      select: { id: true },
    })

    revalidatePath("/admin/giveaways")

    return {
      success: true,
      data: { id: created.id },
    }
  } catch (error) {
    console.error("Failed to create giveaway:", error)
    return { success: false, error: "Failed to create giveaway." }
  }
}

export async function updateAdminGiveaway(input: {
  id: string
  title: string
  description?: string
  rewardLabel?: string
  rewardImageUrl?: string
  startsAt?: string | null
  endsAt?: string | null
}): Promise<GiveawayAdminResult<{ id: string }>> {
  try {
    const admin = await getCurrentAdmin()
    if (!admin || admin.role !== "admin") {
      return { success: false, error: "Admin access required." }
    }

    const title = input.title.trim()
    if (!input.id || !title) {
      return { success: false, error: "Giveaway ID and title are required." }
    }

    const updated = await prismaAny.giveaway.update({
      where: { id: input.id },
      data: {
        title,
        description: input.description?.trim() || null,
        rewardLabel: input.rewardLabel?.trim() || null,
        rewardImageUrl: input.rewardImageUrl?.trim() || null,
        startsAt: input.startsAt ? new Date(input.startsAt) : null,
        endsAt: input.endsAt ? new Date(input.endsAt) : null,
      },
      select: { id: true },
    })

    revalidatePath("/admin/giveaways")

    return {
      success: true,
      data: { id: updated.id },
    }
  } catch (error) {
    console.error("Failed to update giveaway:", error)
    return { success: false, error: "Failed to update giveaway." }
  }
}

export async function setAdminGiveawayStatus(
  giveawayId: string,
  status: GiveawayAdminStatus
): Promise<GiveawayAdminResult<{ id: string }>> {
  try {
    const admin = await getCurrentAdmin()
    if (!admin || admin.role !== "admin") {
      return { success: false, error: "Admin access required." }
    }

    if (!giveawayId || !allowedStatus(status)) {
      return { success: false, error: "Invalid status update." }
    }

    const existing = await prismaAny.giveaway.findUnique({
      where: { id: giveawayId },
      select: {
        id: true,
        status: true,
        title: true,
        rewardLabel: true,
        startsAt: true,
        endsAt: true,
      },
    })

    if (!existing) {
      return { success: false, error: "Giveaway not found." }
    }

    const updated = await prismaAny.giveaway.update({
      where: { id: giveawayId },
      data: { status },
      select: { id: true },
    })

    if (status === "ACTIVE" && existing.status !== "ACTIVE") {
      await sendGiveawayAnnouncementCampaign({
        campaignKey: `giveaway-activation:${existing.id}`,
        title: existing.title,
        rewardLabel: existing.rewardLabel,
        startsAt: existing.startsAt,
        endsAt: existing.endsAt,
        batchLimit: 200,
      }).catch((error) => {
        console.error("Failed to send giveaway announcement campaign:", error)
      })
    }

    revalidatePath("/admin/giveaways")

    return {
      success: true,
      data: { id: updated.id },
    }
  } catch (error) {
    console.error("Failed to update giveaway status:", error)
    return { success: false, error: "Failed to update giveaway status." }
  }
}

export async function deactivateAdminGiveaway(
  giveawayId: string
): Promise<GiveawayAdminResult<{ id: string }>> {
  return setAdminGiveawayStatus(giveawayId, "PAUSED")
}

export async function resumeAdminGiveaway(
  giveawayId: string
): Promise<GiveawayAdminResult<{ id: string }>> {
  return setAdminGiveawayStatus(giveawayId, "ACTIVE")
}

export async function endAdminGiveawayEarly(
  giveawayId: string,
  pickWinner: boolean = true
): Promise<GiveawayAdminResult<{ id: string; winnerUserId?: string | null }>> {
  try {
    const admin = await getCurrentAdmin()
    if (!admin || admin.role !== "admin") {
      return { success: false, error: "Admin access required." }
    }

    const giveaway = await prismaAny.giveaway.findUnique({
      where: { id: giveawayId },
      include: {
        entries: {
          select: {
            userId: true,
          },
        },
      },
    })

    if (!giveaway) {
      return { success: false, error: "Giveaway not found." }
    }

    if (!["ACTIVE", "PAUSED"].includes(giveaway.status)) {
      return { success: false, error: "Only active or paused giveaways can end early." }
    }

    const participantIds = (giveaway.entries || []).map((entry: any) => entry.userId)
    let winnerUserId: string | null = null

    if (pickWinner && participantIds.length > 0) {
      winnerUserId = participantIds[Math.floor(Math.random() * participantIds.length)]
    }

    await prismaAny.giveaway.update({
      where: { id: giveaway.id },
      data: {
        status: "COMPLETED",
        endsAt: new Date(),
        winnerUserId,
      },
    })

    await Promise.allSettled(
      participantIds.map((userId: string) =>
        createNotification(
          userId,
          "SYSTEM",
          winnerUserId === userId ? "You won the giveaway" : "Giveaway ended early",
          winnerUserId === userId
            ? `You were selected as winner for ${giveaway.title}.`
            : `${giveaway.title} was ended early by an admin.`,
          "/"
        )
      )
    )

    revalidatePath("/admin/giveaways")

    return {
      success: true,
      data: { id: giveaway.id, winnerUserId },
    }
  } catch (error) {
    console.error("Failed to end giveaway early:", error)
    return { success: false, error: "Failed to end giveaway early." }
  }
}

export async function removeAdminGiveawayParticipant(input: {
  giveawayId: string
  userId: string
  reason: string
}): Promise<GiveawayAdminResult<{ giveawayId: string; userId: string }>> {
  try {
    const admin = await getCurrentAdmin()
    if (!admin || admin.role !== "admin") {
      return { success: false, error: "Admin access required." }
    }

    if (!input.reason.trim()) {
      return { success: false, error: "Removal reason is required." }
    }

    const entry = await prismaAny.giveawayEntry.findUnique({
      where: {
        giveawayId_userId: {
          giveawayId: input.giveawayId,
          userId: input.userId,
        },
      },
      select: {
        giveawayId: true,
        userId: true,
        giveaway: {
          select: {
            title: true,
          },
        },
      },
    })

    if (!entry) {
      return { success: false, error: "Participant entry not found." }
    }

    await prismaAny.giveawayEntry.delete({
      where: {
        giveawayId_userId: {
          giveawayId: input.giveawayId,
          userId: input.userId,
        },
      },
    })

    await createNotification(
      input.userId,
      "SYSTEM",
      "Giveaway entry removed",
      `Your participation in ${entry.giveaway.title} was removed by an admin. Reason: ${input.reason.trim()}`,
      "/"
    ).catch(() => {
      // Notification delivery failure should not block admin action.
    })

    revalidatePath("/admin/giveaways")

    return {
      success: true,
      data: {
        giveawayId: input.giveawayId,
        userId: input.userId,
      },
    }
  } catch (error) {
    console.error("Failed to remove giveaway participant:", error)
    return { success: false, error: "Failed to remove participant." }
  }
}
