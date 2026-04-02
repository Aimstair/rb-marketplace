"use server"

import { headers } from "next/headers"
import { auth } from "@/auth"
import { createNotification } from "@/app/actions/notifications"
import { checkMultipleFields, logModerationAction } from "@/lib/moderation"
import { prisma } from "@/lib/prisma"
import { checkRateLimit, getClientIp } from "@/lib/rate-limit"
import {
  hallOfShameCommentCreateSchema,
  hallOfShameCommentQuerySchema,
  hallOfShameSearchSchema,
  hallOfShameSubmissionSchema,
  type HallOfShameCommentCreateInput,
  type HallOfShameCommentQueryInput,
  type HallOfShameCommentView,
  type HallOfShamePublicEntry,
  type HallOfShameSearchInput,
  type HallOfShameSubmissionInput,
} from "@/lib/schemas"

const MAX_SUBMISSIONS_PER_DAY = 3
const SUBMISSION_WINDOW_MS = 24 * 60 * 60 * 1000
const MAX_COMMENTS_PER_HOUR = 20
const COMMENT_WINDOW_MS = 60 * 60 * 1000

type IdentifierType = "GCASH" | "BANK_ACCOUNT" | "PAYPAL_EMAIL" | "OTHER"

export interface HallOfShameActionResult {
  success: boolean
  error?: string
  entryId?: string
  commentId?: string
}

export interface HallOfShameListResult {
  success: boolean
  entries?: HallOfShamePublicEntry[]
  total?: number
  pages?: number
  currentPage?: number
  error?: string
}

export interface HallOfShamePendingEntry extends HallOfShamePublicEntry {
  status: string
  reporter: {
    id: string
    username: string
    email: string
  }
}

export interface HallOfShamePendingListResult {
  success: boolean
  entries?: HallOfShamePendingEntry[]
  total?: number
  pages?: number
  currentPage?: number
  error?: string
}

export interface HallOfShameDetailResult {
  success: boolean
  entry?: HallOfShamePublicEntry
  error?: string
}

export interface HallOfShameCommentListResult {
  success: boolean
  comments?: HallOfShameCommentView[]
  total?: number
  pages?: number
  currentPage?: number
  error?: string
}

function normalizeAlias(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ")
}

function normalizeHandle(value: string): string {
  return value.trim().toLowerCase().replace(/^@/, "")
}

function normalizeIdentifierValue(type: IdentifierType, value: string): string {
  const trimmed = value.trim()

  if (type === "GCASH" || type === "BANK_ACCOUNT") {
    return trimmed.replace(/\D/g, "")
  }

  if (type === "PAYPAL_EMAIL") {
    return trimmed.toLowerCase()
  }

  return trimmed.toLowerCase().replace(/\s+/g, " ")
}

function mapEntry(entry: any): HallOfShamePublicEntry {
  return {
    id: entry.id,
    incidentSummary: entry.incidentSummary,
    transactionContext: entry.transactionContext,
    incidentDate: entry.incidentDate,
    amount: entry.amount,
    currency: entry.currency,
    aliases: (entry.aliases || []).map((alias: any) => alias.alias),
    identifiers: (entry.identifiers || []).map((identifier: any) => ({
      type: identifier.type,
      label: identifier.label,
      value: identifier.value,
    })),
    socialLinks: (entry.socialLinks || []).map((socialLink: any) => ({
      platform: socialLink.platform,
      url: socialLink.url,
      handle: socialLink.handle,
    })),
    evidenceUrls: (entry.evidence || []).map((evidence: any) => evidence.url),
    createdAt: entry.createdAt,
    publishedAt: entry.publishedAt,
  }
}

function mapComment(comment: any): HallOfShameCommentView {
  return {
    id: comment.id,
    content: comment.content,
    createdAt: comment.createdAt,
    updatedAt: comment.updatedAt,
    author: {
      id: comment.author.id,
      username: comment.author.username,
      profilePicture: comment.author.profilePicture,
      isVerified: comment.author.isVerified,
    },
  }
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
      role: true,
    },
  })
}

async function notifyAdmins(title: string, message: string, link: string): Promise<void> {
  const admins = await prisma.user.findMany({
    where: { role: "admin" },
    select: { id: true },
  })

  await Promise.allSettled(
    admins.map((admin) => createNotification(admin.id, "SYSTEM", title, message, link))
  )
}

export async function submitHallOfShameEntry(input: HallOfShameSubmissionInput): Promise<HallOfShameActionResult> {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return { success: false, error: "You must be logged in to submit a report." }
    }

    const parsed = hallOfShameSubmissionSchema.safeParse(input)
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.issues[0]?.message || "Invalid submission data.",
      }
    }

    const payload = parsed.data

    const requestHeaders = await headers()
    const ip = getClientIp(requestHeaders)
    const rateLimitKey = `hall-of-shame:${user.id}:${ip}`
    const rateLimit = await checkRateLimit(rateLimitKey, MAX_SUBMISSIONS_PER_DAY, SUBMISSION_WINDOW_MS)

    if (!rateLimit.allowed) {
      return {
        success: false,
        error: "Rate limit reached. You can submit up to 3 reports per day.",
      }
    }

    const moderationCheck = await checkMultipleFields({
      incidentSummary: payload.incidentSummary,
      transactionContext: payload.transactionContext || "",
      aliases: payload.aliases.join(" "),
    })

    if (moderationCheck.isBlacklisted) {
      return {
        success: false,
        error: "Submission contains blocked language and was not accepted.",
      }
    }

    const aliasMap = new Map<string, string>()
    for (const alias of payload.aliases) {
      const normalizedAlias = normalizeAlias(alias)
      if (normalizedAlias) {
        aliasMap.set(normalizedAlias, alias.trim())
      }
    }

    if (aliasMap.size === 0) {
      return { success: false, error: "Please provide at least one valid alias." }
    }

    const identifierMap = new Map<string, { type: IdentifierType; value: string; normalizedValue: string; label?: string }>()
    for (const identifier of payload.identifiers) {
      const normalizedValue = normalizeIdentifierValue(identifier.type, identifier.value)
      if (!normalizedValue) {
        continue
      }

      const dedupeKey = `${identifier.type}:${normalizedValue}`
      if (!identifierMap.has(dedupeKey)) {
        identifierMap.set(dedupeKey, {
          type: identifier.type,
          value: identifier.value.trim(),
          normalizedValue,
          label: identifier.label?.trim() || undefined,
        })
      }
    }

    if (identifierMap.size === 0) {
      return { success: false, error: "Please provide at least one valid payment identifier." }
    }

    const hasPaymentIdentifier = Array.from(identifierMap.values()).some((identifier) => identifier.type !== "OTHER")
    if (!hasPaymentIdentifier) {
      return {
        success: false,
        error: "At least one GCash, bank account, or PayPal identifier is required.",
      }
    }

    const socialMap = new Map<string, { platform: string; url?: string; handle?: string; normalizedHandle?: string }>()
    for (const socialLink of payload.socialLinks || []) {
      const platform = socialLink.platform.trim()
      const handle = socialLink.handle?.trim() || undefined
      const normalizedHandle = handle ? normalizeHandle(handle) : undefined
      const url = socialLink.url?.trim() || undefined
      if (!platform || (!handle && !url)) {
        continue
      }

      const dedupeKey = `${platform.toLowerCase()}:${normalizedHandle || url || ""}`
      if (!socialMap.has(dedupeKey)) {
        socialMap.set(dedupeKey, {
          platform,
          handle,
          normalizedHandle,
          url,
        })
      }
    }

    const hallTable = (prisma as any).hallOfShameEntry

    const entry = await hallTable.create({
      data: {
        reporterId: user.id,
        incidentSummary: payload.incidentSummary.trim(),
        transactionContext: payload.transactionContext?.trim() || null,
        incidentDate: payload.incidentDate ? new Date(payload.incidentDate) : null,
        amount: payload.amount ?? null,
        currency: payload.currency || "PHP",
        status: "PENDING",
        aliases: {
          create: Array.from(aliasMap.entries()).map(([normalizedAlias, alias]) => ({
            alias,
            normalizedAlias,
          })),
        },
        identifiers: {
          create: Array.from(identifierMap.values()).map((identifier) => ({
            type: identifier.type,
            value: identifier.value,
            normalizedValue: identifier.normalizedValue,
            label: identifier.label || null,
          })),
        },
        socialLinks: {
          create: Array.from(socialMap.values()).map((socialLink) => ({
            platform: socialLink.platform,
            handle: socialLink.handle || null,
            normalizedHandle: socialLink.normalizedHandle || null,
            url: socialLink.url || null,
          })),
        },
        evidence: {
          create: payload.evidenceUrls.map((url) => ({ url })),
        },
      },
      select: {
        id: true,
      },
    })

    await notifyAdmins(
      "New Hall of Shame Submission",
      "A new scam report is waiting for moderation review.",
      "/admin/hall-of-shame"
    )

    await logModerationAction(user.id, "HALL_OF_SHAME_SUBMITTED", `Submitted entry ${entry.id}`)

    return {
      success: true,
      entryId: entry.id,
    }
  } catch (error) {
    console.error("Failed to submit Hall of Shame entry:", error)
    return {
      success: false,
      error: "Failed to submit report. Please try again.",
    }
  }
}

export async function getPublicHallOfShameEntries(
  input: Partial<HallOfShameSearchInput> = {}
): Promise<HallOfShameListResult> {
  try {
    const parsed = hallOfShameSearchSchema.safeParse(input)
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.issues[0]?.message || "Invalid search input.",
      }
    }

    const payload = parsed.data
    const hallTable = (prisma as any).hallOfShameEntry
    const where: any = {
      status: "APPROVED",
    }

    const andConditions: any[] = []

    if (payload.identifierType && payload.identifierType !== "all") {
      andConditions.push({
        identifiers: {
          some: {
            type: payload.identifierType,
          },
        },
      })
    }

    const query = payload.query.trim()
    if (query) {
      const normalizedQuery = query.toLowerCase().replace(/\s+/g, " ")
      const normalizedDigits = query.replace(/\D/g, "")
      const normalizedHandle = normalizeHandle(query)

      const orConditions: any[] = [
        {
          incidentSummary: {
            contains: query,
            mode: "insensitive",
          },
        },
        {
          aliases: {
            some: {
              normalizedAlias: {
                contains: normalizedQuery,
              },
            },
          },
        },
        {
          identifiers: {
            some: {
              normalizedValue: {
                contains: normalizedDigits || normalizedQuery,
              },
            },
          },
        },
        {
          socialLinks: {
            some: {
              url: {
                contains: query,
                mode: "insensitive",
              },
            },
          },
        },
      ]

      if (normalizedHandle) {
        orConditions.push({
          socialLinks: {
            some: {
              normalizedHandle: {
                contains: normalizedHandle,
              },
            },
          },
        })
      }

      andConditions.push({ OR: orConditions })
    }

    if (andConditions.length > 0) {
      where.AND = andConditions
    }

    const [total, entries] = await Promise.all([
      hallTable.count({ where }),
      hallTable.findMany({
        where,
        include: {
          aliases: {
            select: { alias: true },
            orderBy: { createdAt: "asc" },
          },
          identifiers: {
            select: {
              type: true,
              label: true,
              value: true,
            },
            orderBy: { createdAt: "asc" },
          },
          socialLinks: {
            select: {
              platform: true,
              url: true,
              handle: true,
            },
            orderBy: { createdAt: "asc" },
          },
          evidence: {
            select: {
              url: true,
            },
            orderBy: { createdAt: "asc" },
          },
        },
        orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }],
        skip: (payload.page - 1) * payload.itemsPerPage,
        take: payload.itemsPerPage,
      }),
    ])

    return {
      success: true,
      entries: entries.map(mapEntry),
      total,
      pages: Math.ceil(total / payload.itemsPerPage),
      currentPage: payload.page,
    }
  } catch (error) {
    console.error("Failed to fetch Hall of Shame entries:", error)
    return {
      success: false,
      error: "Failed to load entries.",
    }
  }
}

export async function getPublicHallOfShameEntryById(entryId: string): Promise<HallOfShameDetailResult> {
  try {
    if (!entryId?.trim()) {
      return {
        success: false,
        error: "Entry ID is required.",
      }
    }

    const hallTable = (prisma as any).hallOfShameEntry
    const entry = await hallTable.findFirst({
      where: {
        id: entryId,
        status: "APPROVED",
      },
      include: {
        aliases: {
          select: { alias: true },
          orderBy: { createdAt: "asc" },
        },
        identifiers: {
          select: {
            type: true,
            label: true,
            value: true,
          },
          orderBy: { createdAt: "asc" },
        },
        socialLinks: {
          select: {
            platform: true,
            url: true,
            handle: true,
          },
          orderBy: { createdAt: "asc" },
        },
        evidence: {
          select: {
            url: true,
          },
          orderBy: { createdAt: "asc" },
        },
      },
    })

    if (!entry) {
      return {
        success: false,
        error: "Entry not found.",
      }
    }

    return {
      success: true,
      entry: mapEntry(entry),
    }
  } catch (error) {
    console.error("Failed to fetch Hall of Shame entry:", error)
    return {
      success: false,
      error: "Failed to load entry.",
    }
  }
}

export async function getHallOfShameComments(
  input: Partial<HallOfShameCommentQueryInput>
): Promise<HallOfShameCommentListResult> {
  try {
    const parsed = hallOfShameCommentQuerySchema.safeParse(input)
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.issues[0]?.message || "Invalid comments query.",
      }
    }

    const payload = parsed.data
    const hallTable = (prisma as any).hallOfShameEntry
    const commentTable = (prisma as any).hallOfShameComment

    const entry = await hallTable.findFirst({
      where: {
        id: payload.entryId,
        status: "APPROVED",
      },
      select: { id: true },
    })

    if (!entry) {
      return {
        success: false,
        error: "Entry not found.",
      }
    }

    const where = { entryId: payload.entryId }

    const [total, comments] = await Promise.all([
      commentTable.count({ where }),
      commentTable.findMany({
        where,
        include: {
          author: {
            select: {
              id: true,
              username: true,
              profilePicture: true,
              isVerified: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
        skip: (payload.page - 1) * payload.itemsPerPage,
        take: payload.itemsPerPage,
      }),
    ])

    return {
      success: true,
      comments: comments.map(mapComment),
      total,
      pages: Math.ceil(total / payload.itemsPerPage),
      currentPage: payload.page,
    }
  } catch (error) {
    console.error("Failed to fetch Hall of Shame comments:", error)
    return {
      success: false,
      error: "Failed to load comments.",
    }
  }
}

export async function createHallOfShameComment(
  input: Partial<HallOfShameCommentCreateInput>
): Promise<HallOfShameActionResult> {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return {
        success: false,
        error: "You must be logged in to post a comment.",
      }
    }

    const parsed = hallOfShameCommentCreateSchema.safeParse({
      entryId: input.entryId,
      content: input.content?.trim(),
    })
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.issues[0]?.message || "Invalid comment payload.",
      }
    }

    const payload = parsed.data
    const hallTable = (prisma as any).hallOfShameEntry
    const commentTable = (prisma as any).hallOfShameComment

    const entry = await hallTable.findFirst({
      where: {
        id: payload.entryId,
        status: "APPROVED",
      },
      select: { id: true },
    })

    if (!entry) {
      return {
        success: false,
        error: "Entry not found.",
      }
    }

    const requestHeaders = await headers()
    const ip = getClientIp(requestHeaders)
    const rateLimitKey = `hall-of-shame-comment:${user.id}:${ip}`
    const rateLimit = await checkRateLimit(rateLimitKey, MAX_COMMENTS_PER_HOUR, COMMENT_WINDOW_MS)

    if (!rateLimit.allowed) {
      return {
        success: false,
        error: "Rate limit reached. Please wait before posting again.",
      }
    }

    const moderationCheck = await checkMultipleFields({
      comment: payload.content,
    })

    if (moderationCheck.isBlacklisted) {
      return {
        success: false,
        error: "Comment contains blocked language and was not accepted.",
      }
    }

    const comment = await commentTable.create({
      data: {
        entryId: payload.entryId,
        authorId: user.id,
        content: payload.content,
      },
      select: {
        id: true,
      },
    })

    return {
      success: true,
      entryId: payload.entryId,
      commentId: comment.id,
    }
  } catch (error) {
    console.error("Failed to create Hall of Shame comment:", error)
    return {
      success: false,
      error: "Failed to post comment.",
    }
  }
}

export async function getPendingHallOfShameEntries(
  page: number = 1,
  searchQuery: string = ""
): Promise<HallOfShamePendingListResult> {
  try {
    const user = await getCurrentUser()

    if (!user || user.role !== "admin") {
      return {
        success: false,
        error: "Admin access required.",
      }
    }

    const safePage = Math.max(1, page)
    const pageSize = 12
    const hallTable = (prisma as any).hallOfShameEntry
    const where: any = {
      status: "PENDING",
    }

    const trimmedQuery = searchQuery.trim()
    if (trimmedQuery) {
      const normalizedQuery = trimmedQuery.toLowerCase().replace(/\s+/g, " ")
      const normalizedDigits = trimmedQuery.replace(/\D/g, "")

      where.OR = [
        {
          incidentSummary: {
            contains: trimmedQuery,
            mode: "insensitive",
          },
        },
        {
          aliases: {
            some: {
              normalizedAlias: {
                contains: normalizedQuery,
              },
            },
          },
        },
        {
          identifiers: {
            some: {
              normalizedValue: {
                contains: normalizedDigits || normalizedQuery,
              },
            },
          },
        },
      ]
    }

    const [total, entries] = await Promise.all([
      hallTable.count({ where }),
      hallTable.findMany({
        where,
        include: {
          reporter: {
            select: {
              id: true,
              username: true,
              email: true,
            },
          },
          aliases: {
            select: { alias: true },
            orderBy: { createdAt: "asc" },
          },
          identifiers: {
            select: {
              type: true,
              label: true,
              value: true,
            },
            orderBy: { createdAt: "asc" },
          },
          socialLinks: {
            select: {
              platform: true,
              url: true,
              handle: true,
            },
            orderBy: { createdAt: "asc" },
          },
          evidence: {
            select: {
              url: true,
            },
            orderBy: { createdAt: "asc" },
          },
        },
        orderBy: { createdAt: "desc" },
        skip: (safePage - 1) * pageSize,
        take: pageSize,
      }),
    ])

    return {
      success: true,
      entries: entries.map((entry: any) => ({
        ...mapEntry(entry),
        status: entry.status,
        reporter: {
          id: entry.reporter.id,
          username: entry.reporter.username,
          email: entry.reporter.email,
        },
      })),
      total,
      pages: Math.ceil(total / pageSize),
      currentPage: safePage,
    }
  } catch (error) {
    console.error("Failed to fetch pending Hall of Shame entries:", error)
    return {
      success: false,
      error: "Failed to load pending entries.",
    }
  }
}

export async function reviewHallOfShameEntry(
  entryId: string,
  action: "APPROVE" | "REJECT" | "REMOVE",
  notes?: string,
  rejectionReason?: string
): Promise<HallOfShameActionResult> {
  try {
    const user = await getCurrentUser()

    if (!user || user.role !== "admin") {
      return {
        success: false,
        error: "Admin access required.",
      }
    }

    if (!entryId) {
      return {
        success: false,
        error: "Entry ID is required.",
      }
    }

    if (action === "REJECT" && !rejectionReason?.trim()) {
      return {
        success: false,
        error: "Rejection reason is required.",
      }
    }

    const hallTable = (prisma as any).hallOfShameEntry
    const existingEntry = await hallTable.findUnique({
      where: { id: entryId },
      select: {
        id: true,
        reporterId: true,
      },
    })

    if (!existingEntry) {
      return {
        success: false,
        error: "Entry not found.",
      }
    }

    const nextStatus = action === "APPROVE" ? "APPROVED" : action === "REJECT" ? "REJECTED" : "REMOVED"

    await hallTable.update({
      where: { id: entryId },
      data: {
        status: nextStatus,
        reviewerId: user.id,
        reviewerNotes: notes?.trim() || null,
        rejectionReason: action === "REJECT" ? rejectionReason?.trim() || null : null,
        publishedAt: action === "APPROVE" ? new Date() : null,
      },
    })

    if (action === "APPROVE") {
      await createNotification(
        existingEntry.reporterId,
        "SYSTEM",
        "Hall of Shame Entry Approved",
        "Your submission has been approved and is now visible publicly.",
        "/hall-of-shame"
      )
    }

    if (action === "REJECT") {
      await createNotification(
        existingEntry.reporterId,
        "SYSTEM",
        "Hall of Shame Entry Rejected",
        "Your submission was reviewed but not approved. Please improve evidence quality and resubmit.",
        "/hall-of-shame"
      )
    }

    await logModerationAction(
      user.id,
      `HALL_OF_SHAME_${action}`,
      `Updated entry ${entryId} to ${nextStatus}`
    )

    return {
      success: true,
      entryId,
    }
  } catch (error) {
    console.error("Failed to review Hall of Shame entry:", error)
    return {
      success: false,
      error: "Failed to update entry.",
    }
  }
}
