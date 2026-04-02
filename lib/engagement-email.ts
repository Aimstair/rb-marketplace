import { prisma } from "@/lib/prisma"
import { sendEmail } from "@/lib/email"
import {
  clearCampaignDispatchGuard,
  markCampaignDispatchDelivered,
  tryAcquireCampaignDispatchGuard,
} from "@/lib/campaign-idempotency"
import { logInfo, logWarn } from "@/lib/observability"

type EmailCategory = "message" | "trade" | "marketing"

interface DigestItem {
  title: string
  message: string
  link: string | null
}

interface WeeklyDigestContext {
  recipientUserId: string
  unreadItems: DigestItem[]
  unreadCount: number
  inactivityDays?: number | null
  campaignKey?: string
  trendingListings: Array<{
    title: string
    views: number
    priceLabel: string
  }>
  risingUsers: Array<{
    username: string
    completedSales: number
  }>
}

interface ResolvedRecipient {
  userId: string
  username: string
  email: string
}

interface CampaignDeliveryResult {
  sent: boolean
  deduped: boolean
  skipped: boolean
  attempts: number
  retries: number
}

const DEFAULT_CAMPAIGN_RETRY_ATTEMPTS = 3
const DEFAULT_CAMPAIGN_DEDUPE_TTL_MS = 24 * 60 * 60 * 1000

function composeCampaignRecipientKey(campaignKey: string, recipientUserId: string): string {
  return `${campaignKey.trim()}:${recipientUserId.trim()}`
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms)
  })
}

async function sendCampaignEmailWithGuards(input: {
  campaignKey: string
  recipientUserId: string
  send: () => Promise<boolean>
  maxAttempts?: number
  dedupeTtlMs?: number
}): Promise<CampaignDeliveryResult> {
  const dedupeTtlMs = Math.max(input.dedupeTtlMs ?? DEFAULT_CAMPAIGN_DEDUPE_TTL_MS, 60_000)
  const maxAttempts = Math.min(Math.max(input.maxAttempts ?? DEFAULT_CAMPAIGN_RETRY_ATTEMPTS, 1), 5)

  const key = composeCampaignRecipientKey(input.campaignKey, input.recipientUserId)
  const acquired = await tryAcquireCampaignDispatchGuard(key, dedupeTtlMs)
  if (!acquired) {
    return {
      sent: false,
      deduped: true,
      skipped: false,
      attempts: 0,
      retries: 0,
    }
  }

  let attempts = 0
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    attempts = attempt
    try {
      const sent = await input.send()
      if (sent) {
        await markCampaignDispatchDelivered(key, dedupeTtlMs)
        return {
          sent: true,
          deduped: false,
          skipped: false,
          attempts,
          retries: Math.max(0, attempts - 1),
        }
      }
    } catch (error) {
      logWarn("email.campaign.send_attempt_failed", {
        campaignKey: input.campaignKey,
        recipientUserId: input.recipientUserId,
        attempt,
        error: error instanceof Error ? error.message : String(error),
      })
    }

    if (attempt < maxAttempts) {
      await wait(Math.min(250 * 2 ** (attempt - 1), 2_000))
    }
  }

  await clearCampaignDispatchGuard(key)
  return {
    sent: false,
    deduped: false,
    skipped: false,
    attempts,
    retries: Math.max(0, attempts - 1),
  }
}

export async function sendCampaignEmailToRecipient(input: {
  campaignKey: string
  recipientUserId: string
  to: string
  subject: string
  html: string
  maxAttempts?: number
}): Promise<CampaignDeliveryResult> {
  return sendCampaignEmailWithGuards({
    campaignKey: input.campaignKey,
    recipientUserId: input.recipientUserId,
    maxAttempts: input.maxAttempts,
    send: () =>
      sendEmail({
        to: input.to,
        subject: input.subject,
        html: input.html,
      }),
  })
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#039;")
}

function getAppBaseUrl(): string {
  const candidate = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || "http://localhost:3000"
  try {
    return new URL(candidate).toString().replace(/\/$/, "")
  } catch {
    return "http://localhost:3000"
  }
}

function toAbsolutePath(path: string): string {
  if (!path.startsWith("/")) {
    return `${getAppBaseUrl()}/${path}`
  }
  return `${getAppBaseUrl()}${path}`
}

async function resolveEmailRecipient(
  userId: string,
  category: EmailCategory
): Promise<ResolvedRecipient | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      username: true,
      isBanned: true,
      preferences: {
        select: {
          notifyNewMessages: true,
          notifyTradeUpdates: true,
          notifyMarketingEmails: true,
        },
      },
    },
  })

  if (!user || user.isBanned || !user.email) {
    return null
  }

  const prefs = user.preferences
  const isAllowed = (() => {
    if (category === "message") {
      return prefs?.notifyNewMessages ?? true
    }

    if (category === "trade") {
      return prefs?.notifyTradeUpdates ?? true
    }

    return prefs?.notifyMarketingEmails ?? false
  })()

  if (!isAllowed) {
    return null
  }

  return {
    userId: user.id,
    username: user.username,
    email: user.email,
  }
}

export async function sendMessageInteractionEmail(input: {
  recipientUserId: string
  senderUsername: string
  messagePreview: string
  conversationId: string
}): Promise<boolean> {
  const recipient = await resolveEmailRecipient(input.recipientUserId, "message")
  if (!recipient) {
    logInfo("email.message.skipped", { recipientUserId: input.recipientUserId })
    return false
  }

  const safeSender = escapeHtml(input.senderUsername)
  const safePreview = escapeHtml(input.messagePreview)
  const conversationUrl = toAbsolutePath(`/messages?id=${input.conversationId}`)

  const sent = await sendEmail({
    to: recipient.email,
    subject: `New message from ${input.senderUsername} on RB Marketplace`,
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.5; color: #111; max-width: 640px; margin: 0 auto;">
        <h2>You have a new message</h2>
        <p><strong>${safeSender}</strong> sent you a message:</p>
        <blockquote style="border-left: 4px solid #ddd; margin: 12px 0; padding: 8px 12px; color: #444;">
          ${safePreview}
        </blockquote>
        <p><a href="${conversationUrl}">Open conversation</a></p>
      </div>
    `,
  })

  if (sent) {
    logInfo("email.message.sent", { recipientUserId: recipient.userId, conversationId: input.conversationId })
  } else {
    logWarn("email.message.failed", { recipientUserId: recipient.userId, conversationId: input.conversationId })
  }

  return sent
}

export async function sendTransactionCompletedEmail(input: {
  recipientUserId: string
  counterpartyUsername: string
  listingTitle: string
  role: "buyer" | "seller"
}): Promise<boolean> {
  const recipient = await resolveEmailRecipient(input.recipientUserId, "trade")
  if (!recipient) {
    logInfo("email.transaction.skipped", { recipientUserId: input.recipientUserId })
    return false
  }

  const safeCounterparty = escapeHtml(input.counterpartyUsername)
  const safeListing = escapeHtml(input.listingTitle)
  const transactionsUrl = toAbsolutePath("/my-transactions")

  const sent = await sendEmail({
    to: recipient.email,
    subject: `Transaction completed: ${input.listingTitle}`,
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.5; color: #111; max-width: 640px; margin: 0 auto;">
        <h2>Your transaction is complete</h2>
        <p>The ${input.role} confirmation is complete for <strong>${safeListing}</strong>.</p>
        <p>You completed this trade with <strong>${safeCounterparty}</strong>.</p>
        <p><a href="${transactionsUrl}">View transaction details</a></p>
      </div>
    `,
  })

  if (sent) {
    logInfo("email.transaction.sent", { recipientUserId: recipient.userId, role: input.role })
  } else {
    logWarn("email.transaction.failed", { recipientUserId: recipient.userId, role: input.role })
  }

  return sent
}

export async function sendWeeklyDigestWithHighlightsEmail(
  input: WeeklyDigestContext
): Promise<CampaignDeliveryResult> {
  const recipient = await resolveEmailRecipient(input.recipientUserId, "marketing")
  if (!recipient) {
    logInfo("email.weekly_digest.skipped", { recipientUserId: input.recipientUserId })
    return {
      sent: false,
      deduped: false,
      skipped: true,
      attempts: 0,
      retries: 0,
    }
  }

  const digestRows = input.unreadItems
    .slice(0, 10)
    .map((item) => {
      const title = escapeHtml(item.title)
      const message = escapeHtml(item.message)
      const link = item.link ? `<a href="${toAbsolutePath(item.link)}">Open</a>` : ""
      return `<li><strong>${title}</strong><br/>${message} ${link}</li>`
    })
    .join("")

  const trendingRows = input.trendingListings
    .slice(0, 5)
    .map((item) => `<li><strong>${escapeHtml(item.title)}</strong> - ${item.views} views (${escapeHtml(item.priceLabel)})</li>`)
    .join("")

  const risingRows = input.risingUsers
    .slice(0, 5)
    .map((user) => `<li><strong>${escapeHtml(user.username)}</strong> - ${user.completedSales} completed sales this week</li>`)
    .join("")

  const notificationsUrl = toAbsolutePath("/notifications")
  const comebackCopy =
    input.inactivityDays && input.inactivityDays >= 7
      ? `<p style="margin-top: 16px;"><strong>We miss you.</strong> It has been about ${input.inactivityDays} days since your last activity. Come back and check new opportunities.</p>`
      : ""

  const campaignKey = input.campaignKey || `weekly-digest:${new Date().toISOString().slice(0, 10)}`
  const delivery = await sendCampaignEmailWithGuards({
    campaignKey,
    recipientUserId: recipient.userId,
    maxAttempts: 3,
    send: () =>
      sendEmail({
        to: recipient.email,
        subject: `Your RB Marketplace Weekly Report (${input.unreadCount} updates)`,
        html: `
          <div style="font-family: Arial, sans-serif; line-height: 1.5; color: #111; max-width: 680px; margin: 0 auto;">
            <h2>Hi ${escapeHtml(recipient.username)}, here is your weekly report</h2>
            <p>You have ${input.unreadCount} unread updates this week.</p>
            <h3>Unread notifications</h3>
            <ul>${digestRows || "<li>No unread notifications this week.</li>"}</ul>
            <h3>Trending listings</h3>
            <ul>${trendingRows || "<li>No trending listings available right now.</li>"}</ul>
            <h3>Rising users</h3>
            <ul>${risingRows || "<li>No rising user highlights this week.</li>"}</ul>
            ${comebackCopy}
            <p style="margin-top: 16px;"><a href="${notificationsUrl}">Open your notifications</a></p>
          </div>
        `,
      }),
  })

  if (delivery.deduped) {
    logInfo("email.weekly_digest.deduped", {
      recipientUserId: recipient.userId,
      campaignKey,
    })
    return delivery
  }

  if (delivery.sent) {
    logInfo("email.weekly_digest.sent", {
      recipientUserId: recipient.userId,
      unreadCount: input.unreadCount,
      campaignKey,
      retries: delivery.retries,
    })
  } else {
    logWarn("email.weekly_digest.failed", {
      recipientUserId: recipient.userId,
      unreadCount: input.unreadCount,
      campaignKey,
      attempts: delivery.attempts,
    })
  }

  return delivery
}

interface GiveawayAnnouncementCampaignInput {
  campaignKey?: string
  title: string
  rewardLabel?: string | null
  startsAt?: Date | string | null
  endsAt?: Date | string | null
  batchLimit?: number
  dryRun?: boolean
}

export async function sendGiveawayAnnouncementCampaign(
  input: GiveawayAnnouncementCampaignInput
): Promise<{
  usersEvaluated: number
  emailsQueued: number
  emailsSent: number
  emailsFailed: number
  emailsDeduped: number
  retryAttempts: number
}> {
  const batchLimit = Math.min(Math.max(input.batchLimit ?? 100, 1), 500)
  const users = await prisma.user.findMany({
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
      email: true,
      username: true,
    },
    orderBy: {
      createdAt: "asc",
    },
    take: batchLimit,
  })

  let emailsQueued = 0
  let emailsSent = 0
  let emailsFailed = 0
  let emailsDeduped = 0
  let retryAttempts = 0

  const startsAtLabel = input.startsAt ? new Date(input.startsAt).toLocaleString() : "Now"
  const endsAtLabel = input.endsAt ? new Date(input.endsAt).toLocaleString() : "TBD"
  const giveawaysUrl = toAbsolutePath("/")
  const campaignKey =
    input.campaignKey ||
    `giveaway:${input.title.trim().toLowerCase()}:${input.startsAt ? new Date(input.startsAt).toISOString() : "now"}`

  for (const user of users) {
    if (!user.email) {
      continue
    }

    emailsQueued += 1
    if (input.dryRun) {
      continue
    }

    const delivery = await sendCampaignEmailWithGuards({
      campaignKey,
      recipientUserId: user.id,
      maxAttempts: 3,
      send: () =>
        sendEmail({
          to: user.email,
          subject: `New giveaway live: ${input.title}`,
          html: `
            <div style="font-family: Arial, sans-serif; line-height: 1.5; color: #111; max-width: 640px; margin: 0 auto;">
              <h2>New giveaway announcement</h2>
              <p>Hi ${escapeHtml(user.username)}, a new giveaway is now available:</p>
              <p><strong>${escapeHtml(input.title)}</strong></p>
              <p>Reward: ${escapeHtml(input.rewardLabel || "Surprise reward")}</p>
              <p>Starts: ${escapeHtml(startsAtLabel)}</p>
              <p>Ends: ${escapeHtml(endsAtLabel)}</p>
              <p><a href="${giveawaysUrl}">Open RB Marketplace</a></p>
            </div>
          `,
        }),
    })
    retryAttempts += delivery.retries

    if (delivery.deduped) {
      emailsDeduped += 1
      continue
    }

    if (delivery.sent) {
      emailsSent += 1
    } else {
      emailsFailed += 1
    }
  }

  logInfo("email.giveaway_announcement.completed", {
    title: input.title,
    usersEvaluated: users.length,
    emailsQueued,
    emailsSent,
    emailsFailed,
    emailsDeduped,
    retryAttempts,
    dryRun: Boolean(input.dryRun),
    campaignKey,
  })

  return {
    usersEvaluated: users.length,
    emailsQueued,
    emailsSent,
    emailsFailed,
    emailsDeduped,
    retryAttempts,
  }
}

export async function sendInactivityComebackEmail(input: {
  campaignKey: string
  recipientUserId: string
  inactivityDays: number
}): Promise<CampaignDeliveryResult> {
  const recipient = await resolveEmailRecipient(input.recipientUserId, "marketing")
  if (!recipient) {
    return {
      sent: false,
      deduped: false,
      skipped: true,
      attempts: 0,
      retries: 0,
    }
  }

  const dashboardUrl = toAbsolutePath("/")
  const safeDays = Math.max(0, Math.floor(input.inactivityDays))

  const delivery = await sendCampaignEmailWithGuards({
    campaignKey: input.campaignKey,
    recipientUserId: recipient.userId,
    maxAttempts: 3,
    send: () =>
      sendEmail({
        to: recipient.email,
        subject: "You have new opportunities waiting on RB Marketplace",
        html: `
          <div style="font-family: Arial, sans-serif; line-height: 1.5; color: #111; max-width: 640px; margin: 0 auto;">
            <h2>We miss you, ${escapeHtml(recipient.username)}</h2>
            <p>It has been about ${safeDays} day${safeDays === 1 ? "" : "s"} since your last activity.</p>
            <p>New listings, traders, and updates are waiting for you. Jump back in whenever you are ready.</p>
            <p><a href="${dashboardUrl}">Open RB Marketplace</a></p>
          </div>
        `,
      }),
  })

  if (delivery.deduped) {
    logInfo("email.inactivity_comeback.deduped", {
      recipientUserId: recipient.userId,
      campaignKey: input.campaignKey,
    })
  } else if (delivery.sent) {
    logInfo("email.inactivity_comeback.sent", {
      recipientUserId: recipient.userId,
      campaignKey: input.campaignKey,
      retries: delivery.retries,
    })
  } else if (!delivery.skipped) {
    logWarn("email.inactivity_comeback.failed", {
      recipientUserId: recipient.userId,
      campaignKey: input.campaignKey,
      attempts: delivery.attempts,
    })
  }

  return delivery
}