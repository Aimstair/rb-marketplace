import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import {
  annotatePaymentMetadataExpiry,
  resolvePendingPaypalSubscriptionExpiry,
} from "@/lib/payment-expiry"

export const dynamic = "force-dynamic"

function resolveSecret(request: NextRequest): string {
  const direct = request.headers.get("x-payment-cleanup-secret")
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
    return ["1", "true", "yes", "on", "enabled"].includes(value.trim().toLowerCase())
  }

  return false
}

function shouldDeleteExpiredPayments(): boolean {
  return toBoolean(process.env.DELETE_EXPIRED_PAYPAL_PENDING_SUBSCRIPTIONS)
}

export async function POST(request: NextRequest) {
  try {
    const expectedSecret = process.env.PAYMENT_CLEANUP_CRON_SECRET || ""
    const providedSecret = resolveSecret(request)

    if (!expectedSecret || providedSecret !== expectedSecret) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
    }

    let dryRun = false
    try {
      const body = await request.json()
      dryRun = toBoolean(body?.dryRun)
    } catch {
      dryRun = false
    }

    const pendingPayments = await prisma.payment.findMany({
      where: {
        status: "pending",
        provider: "paypal",
        type: "subscription",
      },
      select: {
        id: true,
        userId: true,
        provider: true,
        type: true,
        createdAt: true,
        metadata: true,
      },
      orderBy: {
        createdAt: "asc",
      },
      take: 500,
    })

    const now = new Date()
    const expiredPayments = pendingPayments.filter((payment) => {
      const expiry = resolvePendingPaypalSubscriptionExpiry(payment)
      return Boolean(expiry && expiry <= now)
    })

    const deleteExpired = shouldDeleteExpiredPayments()

    if (dryRun) {
      return NextResponse.json({
        success: true,
        dryRun,
        pendingCount: pendingPayments.length,
        expiredCount: expiredPayments.length,
        action: deleteExpired ? "delete" : "fail",
      })
    }

    if (deleteExpired) {
      const ids = expiredPayments.map((payment) => payment.id)

      const deleted = ids.length > 0
        ? await prisma.payment.deleteMany({
            where: {
              id: { in: ids },
              status: "pending",
            },
          })
        : { count: 0 }

      return NextResponse.json({
        success: true,
        dryRun,
        pendingCount: pendingPayments.length,
        expiredCount: expiredPayments.length,
        deletedCount: deleted.count,
        failedCount: 0,
        action: "delete",
      })
    }

    let failedCount = 0
    for (const payment of expiredPayments) {
      const expiry = resolvePendingPaypalSubscriptionExpiry(payment)
      if (!expiry) {
        continue
      }

      await prisma.payment.updateMany({
        where: {
          id: payment.id,
          status: "pending",
        },
        data: {
          status: "failed",
          metadata: annotatePaymentMetadataExpiry(payment.metadata, expiry, {
            pendingStatus: "expired",
            expiredAt: now.toISOString(),
            failureReason: "pending_paypal_subscription_expired",
            expiredBy: "payments_cleanup_cron",
          }) as any,
        },
      })

      failedCount += 1
    }

    return NextResponse.json({
      success: true,
      dryRun,
      pendingCount: pendingPayments.length,
      expiredCount: expiredPayments.length,
      deletedCount: 0,
      failedCount,
      action: "fail",
    })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to cleanup pending payments",
      },
      { status: 500 }
    )
  }
}
