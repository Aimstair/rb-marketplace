/* eslint-disable no-console */
const { PrismaClient } = require("@prisma/client")
const { loadEnvConfig } = require("@next/env")

loadEnvConfig(process.cwd())

function asBool(value, defaultValue = false) {
  if (value === undefined) {
    return defaultValue
  }

  const normalized = String(value).trim().toLowerCase()
  if (["1", "true", "yes", "on", "enabled"].includes(normalized)) {
    return true
  }

  if (["0", "false", "no", "off", "disabled"].includes(normalized)) {
    return false
  }

  return defaultValue
}

function formatDate(value) {
  if (!value) {
    return "n/a"
  }

  try {
    return new Date(value).toISOString()
  } catch {
    return String(value)
  }
}

function normalizeTier(metadata) {
  const tier = metadata && typeof metadata === "object" ? metadata.tier : null
  return typeof tier === "string" ? tier.toUpperCase() : null
}

async function main() {
  const prisma = new PrismaClient()
  const failures = []
  const warnings = []

  const now = new Date()
  const staleSince = new Date(now)
  staleSince.setHours(staleSince.getHours() - 24)
  const veryStaleSince = new Date(now)
  veryStaleSince.setDate(veryStaleSince.getDate() - 7)

  const paymongoWebhookEnabled = asBool(process.env.ENABLE_PAYMONGO_WEBHOOK, true)
  const giveawayFeatureEnabled = asBool(process.env.ENABLE_GIVEAWAY_FEATURE, true)
  const emailFeatureEnabled = asBool(process.env.ENABLE_EMAIL_NOTIFICATIONS_FEATURE, true)

  console.log("\n=== Phase 6 Data QA Audit ===")
  console.log("Feature flags:")
  console.log(`- ENABLE_GIVEAWAY_FEATURE=${giveawayFeatureEnabled}`)
  console.log(`- ENABLE_EMAIL_NOTIFICATIONS_FEATURE=${emailFeatureEnabled}`)
  console.log(`- ENABLE_PAYMONGO_WEBHOOK=${paymongoWebhookEnabled}`)

  try {
    const [
      pendingByProvider,
      pendingPayments,
      stalePendingPayments,
      veryStalePendingPayments,
      pendingPaymongoCount,
      oldestPendingPaymongo,
      pendingSubscriptionRows,
      activeGiveawayCount,
      overdueActiveGiveawayCount,
      staleQueuedGiveawayCount,
      unreadBacklog,
    ] = await Promise.all([
      prisma.payment.groupBy({
        by: ["provider"],
        where: { status: "pending" },
        _count: { _all: true },
      }),
      prisma.payment.count({ where: { status: "pending" } }),
      prisma.payment.count({
        where: {
          status: "pending",
          updatedAt: { lt: staleSince },
        },
      }),
      prisma.payment.findMany({
        where: {
          status: "pending",
          updatedAt: { lt: veryStaleSince },
        },
        select: {
          id: true,
          provider: true,
          userId: true,
          updatedAt: true,
        },
        orderBy: { updatedAt: "asc" },
        take: 10,
      }),
      prisma.payment.count({
        where: {
          status: "pending",
          provider: "paymongo",
        },
      }),
      prisma.payment.findFirst({
        where: {
          status: "pending",
          provider: "paymongo",
        },
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          userId: true,
          amount: true,
          createdAt: true,
          providerPaymentId: true,
        },
      }),
      prisma.payment.findMany({
        where: {
          status: "pending",
          type: "subscription",
        },
        select: {
          id: true,
          userId: true,
          provider: true,
          createdAt: true,
          metadata: true,
          user: {
            select: {
              username: true,
              email: true,
              subscriptionTier: true,
            },
          },
        },
      }),
      prisma.giveaway.count({ where: { status: "ACTIVE" } }).catch(() => 0),
      prisma.giveaway.count({
        where: {
          status: "ACTIVE",
          endsAt: { lt: now },
        },
      }).catch(() => 0),
      prisma.giveaway.count({
        where: {
          status: "QUEUED",
          startsAt: { lt: staleSince },
        },
      }).catch(() => 0),
      prisma.notification.count({
        where: {
          isRead: false,
          createdAt: { lt: staleSince },
        },
      }),
    ])

    console.log("\nPayment snapshot:")
    console.log(`- pending_total=${pendingPayments}`)
    console.log(`- pending_stale_24h=${stalePendingPayments}`)
    console.log(`- pending_paymongo=${pendingPaymongoCount}`)

    if (pendingByProvider.length > 0) {
      console.log(`- pending_by_provider=${pendingByProvider.map((entry) => `${entry.provider}:${entry._count._all}`).join(",")}`)
    }

    if (oldestPendingPaymongo) {
      console.log("- oldest_pending_paymongo:")
      console.log(`  id=${oldestPendingPaymongo.id}`)
      console.log(`  createdAt=${formatDate(oldestPendingPaymongo.createdAt)}`)
      console.log(`  amount=${oldestPendingPaymongo.amount}`)
      console.log(`  userId=${oldestPendingPaymongo.userId}`)
      console.log(`  providerPaymentId=${oldestPendingPaymongo.providerPaymentId}`)
    }

    const alreadyOnTierRows = pendingSubscriptionRows.filter((row) => {
      const pendingTier = normalizeTier(row.metadata)
      const currentTier = (row.user.subscriptionTier || "").toUpperCase()
      return pendingTier && pendingTier === currentTier
    })

    const repeatedPendingByUserTier = new Map()
    for (const row of pendingSubscriptionRows) {
      const tier = normalizeTier(row.metadata) || "UNKNOWN"
      const key = `${row.userId}:${tier}`
      repeatedPendingByUserTier.set(key, (repeatedPendingByUserTier.get(key) || 0) + 1)
    }
    const repeatedPendingGroups = Array.from(repeatedPendingByUserTier.entries())
      .filter(([, count]) => count > 1)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)

    console.log("\nSubscription pending quality:")
    console.log(`- pending_subscription_rows=${pendingSubscriptionRows.length}`)
    console.log(`- pending_already_on_target_tier=${alreadyOnTierRows.length}`)
    console.log(`- repeated_user_tier_groups=${repeatedPendingGroups.length}`)

    if (repeatedPendingGroups.length > 0) {
      console.log("- top_repeated_groups:")
      for (const [key, count] of repeatedPendingGroups.slice(0, 5)) {
        console.log(`  ${key} -> ${count}`)
      }
    }

    console.log("\nGiveaway and notifications:")
    console.log(`- active_giveaways=${activeGiveawayCount}`)
    console.log(`- overdue_active_giveaways=${overdueActiveGiveawayCount}`)
    console.log(`- stale_queued_giveaways=${staleQueuedGiveawayCount}`)
    console.log(`- unread_notification_backlog_24h=${unreadBacklog}`)

    if (!paymongoWebhookEnabled && pendingPaymongoCount > 0) {
      failures.push("PayMongo pending payments exist while webhook is disabled")
    }

    if (activeGiveawayCount > 1) {
      failures.push(`Multiple ACTIVE giveaways detected (${activeGiveawayCount})`)
    }

    if (overdueActiveGiveawayCount > 0) {
      failures.push(`Overdue ACTIVE giveaways detected (${overdueActiveGiveawayCount})`)
    }

    if (veryStalePendingPayments.length > 0) {
      failures.push(`Very stale pending payments detected (${veryStalePendingPayments.length} sampled)`)
      console.log("\nVery stale pending sample (oldest first):")
      for (const row of veryStalePendingPayments) {
        console.log(`- ${row.id} provider=${row.provider} userId=${row.userId} updatedAt=${formatDate(row.updatedAt)}`)
      }
    }

    if (alreadyOnTierRows.length > 0) {
      warnings.push("Some pending subscription payments target a tier users already have")
    }

    if (unreadBacklog > 0) {
      warnings.push(`Unread notifications older than 24h present (${unreadBacklog})`)
    }

    console.log("\n=== QA Audit Result ===")
    if (warnings.length > 0) {
      console.log("Warnings:")
      for (const warning of warnings) {
        console.log(`- ${warning}`)
      }
    }

    if (failures.length > 0) {
      console.log("Result: FAILED")
      for (const failure of failures) {
        console.log(`- ${failure}`)
      }

      console.log("\nRecommended next commands:")
      console.log("- node fix-pending-payment.js --provider=paymongo")
      console.log("- pnpm run phase6:retire:paymongo")

      process.exitCode = 1
      return
    }

    console.log("Result: PASSED")
  } catch (error) {
    console.error("QA audit failed with exception:", error)
    process.exitCode = 1
  } finally {
    await prisma.$disconnect()
  }
}

main()
