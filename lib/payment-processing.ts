import { prisma } from "@/lib/prisma"
import { createNotification } from "@/app/actions/notifications"
import {
  annotatePaymentMetadataExpiry,
  resolvePendingPaypalSubscriptionExpiry,
} from "@/lib/payment-expiry"

type ProviderPaymentStatus = "completed" | "already_completed" | "not_found" | "failed" | "ignored"

interface ProviderPaymentResult {
  success: boolean
  status: ProviderPaymentStatus
  paymentId?: string
  error?: string
}

interface CompleteProviderPaymentInput {
  provider: string
  providerPaymentId?: string | null
  providerOrderId?: string | null
  providerCaptureId?: string | null
  providerReferenceId?: string | null
  providerEventId?: string | null
  metadata?: Record<string, unknown>
}

interface MarkProviderPaymentFailedInput {
  provider: string
  providerPaymentId?: string | null
  providerOrderId?: string | null
  providerCaptureId?: string | null
  providerReferenceId?: string | null
  providerEventId?: string | null
}

type PaymentRecord = {
  id: string
  userId: string
  type: string
  status: string
  provider: string
  providerPaymentId: string
  createdAt: Date
  metadata: any
  user: {
    id: string
    subscriptionEndsAt: Date | null
  }
}

function uniqueIdentifiers(...values: Array<string | null | undefined>): string[] {
  return Array.from(
    new Set(values.filter((value): value is string => typeof value === "string" && value.trim().length > 0))
  )
}

function normalizeMetadata(value: unknown): Record<string, unknown> {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>
  }

  return {}
}

async function findPaymentByProviderIdentifiers(
  provider: string,
  identifiers: string[]
): Promise<PaymentRecord | null> {
  if (identifiers.length === 0) {
    return null
  }

  const payment = await prisma.payment.findFirst({
    where: {
      provider,
      providerPaymentId: { in: identifiers },
    },
    include: {
      user: {
        select: {
          id: true,
          subscriptionEndsAt: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  })

  return payment as PaymentRecord | null
}

export async function completeProviderPayment(input: CompleteProviderPaymentInput): Promise<ProviderPaymentResult> {
  try {
    const identifiers = uniqueIdentifiers(
      input.providerPaymentId,
      input.providerOrderId,
      input.providerCaptureId,
      input.providerReferenceId
    )

    const payment = await findPaymentByProviderIdentifiers(input.provider, identifiers)
    if (!payment) {
      return { success: true, status: "not_found" }
    }

    const normalizedStatus = String(payment.status).toLowerCase()

    if (normalizedStatus === "completed") {
      return { success: true, status: "already_completed", paymentId: payment.id }
    }

    if (normalizedStatus === "failed" || normalizedStatus === "refunded") {
      return { success: true, status: "ignored", paymentId: payment.id }
    }

    const expiry = resolvePendingPaypalSubscriptionExpiry({
      provider: payment.provider,
      type: payment.type,
      metadata: payment.metadata,
      createdAt: payment.createdAt,
    })

    if (normalizedStatus === "pending" && expiry && expiry <= new Date()) {
      await prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: "failed",
          metadata: annotatePaymentMetadataExpiry(payment.metadata, expiry, {
            pendingStatus: "expired",
            expiredAt: new Date().toISOString(),
            failureReason: "pending_paypal_subscription_expired",
            expiredBy: "provider_webhook_guard",
          }) as any,
        },
      })

      await createNotification(
        payment.userId,
        "SYSTEM",
        "Payment Expired",
        "Your pending PayPal subscription payment expired. Please create a new checkout to continue.",
        "/subscriptions"
      ).catch(() => {
        // Notification failure should not block expiry cleanup.
      })

      return { success: true, status: "ignored", paymentId: payment.id }
    }

    const metadata = {
      ...normalizeMetadata(payment.metadata),
      ...normalizeMetadata(input.metadata),
      providerOrderId: input.providerOrderId || undefined,
      providerCaptureId: input.providerCaptureId || undefined,
      providerReferenceId: input.providerReferenceId || undefined,
      providerEventId: input.providerEventId || undefined,
      webhookCompletedAt: new Date().toISOString(),
    }

    await prisma.$transaction(async (tx) => {
      await tx.payment.update({
        where: { id: payment.id },
        data: {
          status: "completed",
          paidAt: new Date(),
          metadata,
        },
      })

      if (payment.type === "subscription") {
        const tier = String((metadata as any).tier || "").toUpperCase()
        if (tier === "PRO" || tier === "ELITE") {
          const now = new Date()
          const baseline = payment.user.subscriptionEndsAt && payment.user.subscriptionEndsAt > now
            ? payment.user.subscriptionEndsAt
            : now
          const nextExpiry = new Date(baseline)
          nextExpiry.setDate(nextExpiry.getDate() + 30)

          await tx.user.update({
            where: { id: payment.userId },
            data: {
              subscriptionTier: tier,
              subscriptionEndsAt: nextExpiry,
              subscriptionStatus: "ACTIVE",
            },
          })

          await createNotification(
            payment.userId,
            "SYSTEM",
            `Upgraded to ${tier}!`,
            `Your subscription payment is confirmed. Your ${tier} plan is now active.`,
            "/subscriptions"
          ).catch(() => {
            // Notification failure should not roll back payment completion.
          })
        }
      }
    })

    return {
      success: true,
      status: "completed",
      paymentId: payment.id,
    }
  } catch (error) {
    return {
      success: false,
      status: "failed",
      error: error instanceof Error ? error.message : "Failed to complete provider payment",
    }
  }
}

export async function markProviderPaymentFailed(
  input: MarkProviderPaymentFailedInput
): Promise<ProviderPaymentResult> {
  try {
    const identifiers = uniqueIdentifiers(
      input.providerPaymentId,
      input.providerOrderId,
      input.providerCaptureId,
      input.providerReferenceId
    )

    const payment = await findPaymentByProviderIdentifiers(input.provider, identifiers)
    if (!payment) {
      return { success: true, status: "not_found" }
    }

    const metadata = {
      ...normalizeMetadata(payment.metadata),
      providerOrderId: input.providerOrderId || undefined,
      providerCaptureId: input.providerCaptureId || undefined,
      providerReferenceId: input.providerReferenceId || undefined,
      providerEventId: input.providerEventId || undefined,
      webhookFailedAt: new Date().toISOString(),
    }

    await prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: "failed",
        metadata,
      },
    })

    await createNotification(
      payment.userId,
      "SYSTEM",
      "Payment Failed",
      "Your latest payment could not be processed. Please try again.",
      "/subscriptions"
    ).catch(() => {
      // Notification failures are intentionally non-blocking.
    })

    return {
      success: true,
      status: "completed",
      paymentId: payment.id,
    }
  } catch (error) {
    return {
      success: false,
      status: "failed",
      error: error instanceof Error ? error.message : "Failed to mark provider payment as failed",
    }
  }
}
