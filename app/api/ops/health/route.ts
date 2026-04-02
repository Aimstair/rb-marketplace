import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import {
  getFeatureFlagSnapshot,
  isEmailNotificationsFeatureEnabled,
  isGiveawayFeatureEnabled,
  isPaymongoWebhookEnabled,
} from "@/lib/feature-flags"

const prismaAny = prisma as any

type AlertSeverity = "info" | "warning" | "critical"

interface OpsAlert {
  code: string
  severity: AlertSeverity
  message: string
  metadata?: Record<string, unknown>
}

function addAlert(alerts: OpsAlert[], alert: OpsAlert) {
  alerts.push(alert)
}

async function getGiveawayMetrics(alerts: OpsAlert[]) {
  if (!prismaAny.giveaway) {
    return {
      activeCount: 0,
      overdueActiveCount: 0,
      staleQueuedCount: 0,
    }
  }

  const now = new Date()
  const staleThreshold = new Date(now)
  staleThreshold.setHours(staleThreshold.getHours() - 48)

  const [activeCount, overdueActiveCount, staleQueuedCount] = await Promise.all([
    prismaAny.giveaway.count({ where: { status: "ACTIVE" } }),
    prismaAny.giveaway.count({
      where: {
        status: "ACTIVE",
        endsAt: { lt: now },
      },
    }),
    prismaAny.giveaway.count({
      where: {
        status: "QUEUED",
        startsAt: { lt: staleThreshold },
      },
    }),
  ])

  if (activeCount > 1) {
    addAlert(alerts, {
      code: "giveaway.multiple_active",
      severity: "critical",
      message: "Multiple ACTIVE giveaways detected.",
      metadata: { activeCount },
    })
  }

  if (overdueActiveCount > 0) {
    addAlert(alerts, {
      code: "giveaway.overdue_active",
      severity: "warning",
      message: "One or more ACTIVE giveaways are already overdue.",
      metadata: { overdueActiveCount },
    })
  }

  if (staleQueuedCount > 0) {
    addAlert(alerts, {
      code: "giveaway.stale_queue",
      severity: "warning",
      message: "Queued giveaways appear stale and should be reviewed.",
      metadata: { staleQueuedCount },
    })
  }

  return {
    activeCount,
    overdueActiveCount,
    staleQueuedCount,
  }
}

async function getNotificationBacklogMetrics() {
  const staleSince = new Date()
  staleSince.setHours(staleSince.getHours() - 24)

  const unreadBacklog = await prisma.notification.count({
    where: {
      isRead: false,
      createdAt: { lt: staleSince },
    },
  })

  return { unreadBacklog }
}

async function getPaymentMetrics(alerts: OpsAlert[]) {
  const stalePendingSince = new Date()
  stalePendingSince.setHours(stalePendingSince.getHours() - 24)

  const [stalePendingPayments, pendingPaymongoPayments] = await Promise.all([
    prisma.payment.count({
      where: {
        status: "pending",
        updatedAt: { lt: stalePendingSince },
      },
    }),
    prisma.payment.count({
      where: {
        provider: "paymongo",
        status: "pending",
      },
    }),
  ])

  if (stalePendingPayments > 0) {
    addAlert(alerts, {
      code: "payments.stale_pending",
      severity: "warning",
      message: "Pending payments are stale and may need reconciliation.",
      metadata: { stalePendingPayments },
    })
  }

  if (!isPaymongoWebhookEnabled() && pendingPaymongoPayments > 0) {
    addAlert(alerts, {
      code: "payments.paymongo_pending_while_webhook_disabled",
      severity: "critical",
      message: "Pending PayMongo payments exist while PayMongo webhook is disabled.",
      metadata: { pendingPaymongoPayments },
    })
  }

  return {
    stalePendingPayments,
    pendingPaymongoPayments,
  }
}

function validateEnvironment(alerts: OpsAlert[]) {
  if (isGiveawayFeatureEnabled() && !process.env.GIVEAWAY_CRON_SECRET) {
    addAlert(alerts, {
      code: "env.missing_giveaway_secret",
      severity: "critical",
      message: "GIVEAWAY_CRON_SECRET is missing while giveaway feature is enabled.",
    })
  }

  if (isEmailNotificationsFeatureEnabled() && !process.env.EMAIL_DIGEST_CRON_SECRET) {
    addAlert(alerts, {
      code: "env.missing_digest_secret",
      severity: "critical",
      message: "EMAIL_DIGEST_CRON_SECRET is missing while email notification feature is enabled.",
    })
  }

  const enabledProviders = (
    process.env.ENABLED_SUBSCRIPTION_PAYMENT_PROVIDERS ||
    process.env.ENABLED_PAYMENT_PROVIDERS ||
    ""
  )
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean)

  if (enabledProviders.includes("paypal")) {
    const missing = [
      !process.env.PAYPAL_CLIENT_ID ? "PAYPAL_CLIENT_ID" : null,
      !process.env.PAYPAL_CLIENT_SECRET ? "PAYPAL_CLIENT_SECRET" : null,
      !process.env.PAYPAL_WEBHOOK_ID ? "PAYPAL_WEBHOOK_ID" : null,
    ].filter(Boolean)

    if (missing.length > 0) {
      addAlert(alerts, {
        code: "env.missing_paypal_config",
        severity: "critical",
        message: "PayPal is enabled but required credentials are missing.",
        metadata: { missing },
      })
    }
  }
}

export async function GET() {
  const startedAt = Date.now()
  const alerts: OpsAlert[] = []

  try {
    const [dbProbe, giveawayMetrics, notificationMetrics, paymentMetrics] = await Promise.all([
      prisma.$queryRaw<Array<{ now: Date }>>`SELECT NOW() as now`,
      getGiveawayMetrics(alerts),
      getNotificationBacklogMetrics(),
      getPaymentMetrics(alerts),
    ])

    validateEnvironment(alerts)

    const hasCritical = alerts.some((alert) => alert.severity === "critical")
    const status = hasCritical ? "degraded" : alerts.length > 0 ? "warning" : "ok"

    return NextResponse.json({
      status,
      timestamp: new Date().toISOString(),
      durationMs: Date.now() - startedAt,
      dbConnected: Boolean(dbProbe?.[0]?.now),
      featureFlags: getFeatureFlagSnapshot(),
      metrics: {
        giveaways: giveawayMetrics,
        notifications: notificationMetrics,
        payments: paymentMetrics,
      },
      alerts,
    })
  } catch (error) {
    return NextResponse.json(
      {
        status: "error",
        timestamp: new Date().toISOString(),
        durationMs: Date.now() - startedAt,
        error: error instanceof Error ? error.message : "Failed to compute ops health",
      },
      { status: 500 }
    )
  }
}
