"use server"

import { prisma } from "@/lib/prisma"
import { auth } from "@/auth"
import { headers } from "next/headers"
import { createPaymentLink, getPaymentLink } from "@/lib/paymongo"
import { createPaypalOrder, getPaypalOrder } from "@/lib/paypal"
import {
  annotatePaymentMetadataExpiry,
  computePendingPaypalSubscriptionExpiry,
  resolvePendingPaypalSubscriptionExpiry,
} from "@/lib/payment-expiry"
import { checkRateLimit, getRateLimitIdentifier } from "@/lib/rate-limit"
import { createNotification } from "./notifications"

// Subscription tier pricing in centavos (₱)
const SUBSCRIPTION_PRICING = {
  PRO: 19900, // ₱199.00
  ELITE: 49900, // ₱499.00
}

const PAYMENT_CREATE_LIMIT = {
  maxRequests: 5,
  windowMs: 60 * 60 * 1000,
}

type SubscriptionProvider = "paypal" | "paymongo"

function parseProvider(value: string | undefined, fallback: SubscriptionProvider): SubscriptionProvider {
  if (!value) {
    return fallback
  }

  return value.trim().toLowerCase() === "paypal" ? "paypal" : "paymongo"
}

function getEnabledSubscriptionProviders(): SubscriptionProvider[] {
  const active = parseProvider(
    process.env.ACTIVE_SUBSCRIPTION_PAYMENT_PROVIDER || process.env.ACTIVE_PAYMENT_PROVIDER,
    "paymongo"
  )

  const allowlistRaw =
    process.env.ENABLED_SUBSCRIPTION_PAYMENT_PROVIDERS ||
    process.env.ENABLED_PAYMENT_PROVIDERS ||
    active

  const normalized = allowlistRaw
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter((item) => item === "paypal" || item === "paymongo") as SubscriptionProvider[]

  if (normalized.length === 0) {
    return [active]
  }

  return Array.from(new Set(normalized))
}

function getActiveSubscriptionProvider(): SubscriptionProvider {
  const active = parseProvider(
    process.env.ACTIVE_SUBSCRIPTION_PAYMENT_PROVIDER || process.env.ACTIVE_PAYMENT_PROVIDER,
    "paymongo"
  )
  const enabled = getEnabledSubscriptionProviders()

  if (enabled.includes(active)) {
    return active
  }

  return enabled[0]
}

async function enforcePaymentRateLimit(userId: string, email: string) {
  const requestHeaders = await headers()
  const rate = await checkRateLimit(
    getRateLimitIdentifier({
      headers: requestHeaders,
      userId,
      email,
    }),
    PAYMENT_CREATE_LIMIT.maxRequests,
    PAYMENT_CREATE_LIMIT.windowMs,
    { namespace: "payments-subscription-create" }
  )

  if (rate.allowed) {
    return { success: true as const }
  }

  return {
    success: false as const,
    error: `Too many payment attempts. Please try again in ${rate.retryAfterSeconds} seconds.`,
  }
}

export interface CreatePaymentResult {
  success: boolean
  checkoutUrl?: string
  paymentId?: string
  error?: string
}

export interface VerifyPaymentResult {
  success: boolean
  status?: "paid" | "pending" | "failed"
  error?: string
}

/**
 * Create a payment for subscription upgrade
 */
export async function createSubscriptionPayment(
  tier: "PRO" | "ELITE"
): Promise<CreatePaymentResult> {
  try {
    const session = await auth()
    if (!session?.user?.email) {
      return {
        success: false,
        error: "You must be logged in to upgrade subscription",
      }
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true, username: true, email: true, subscriptionTier: true },
    })

    if (!user) {
      return {
        success: false,
        error: "User not found",
      }
    }

    const paymentRateLimit = await enforcePaymentRateLimit(user.id, user.email)
    if (!paymentRateLimit.success) {
      return {
        success: false,
        error: paymentRateLimit.error,
      }
    }

    // Prevent downgrade or same tier
    const tierHierarchy = { FREE: 0, PRO: 1, ELITE: 2 }
    if (tierHierarchy[user.subscriptionTier as keyof typeof tierHierarchy] >= tierHierarchy[tier]) {
      return {
        success: false,
        error: "You are already on this tier or higher",
      }
    }

    const amount = SUBSCRIPTION_PRICING[tier]
    const description = `${tier} Subscription - ${user.username}`
    const provider = getActiveSubscriptionProvider()

    // Get base URL for redirects
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://rbmarket.app"

    if (provider === "paypal") {
      const pendingExpiresAt = computePendingPaypalSubscriptionExpiry(new Date())
      const paypalResult = await createPaypalOrder({
        amountInMinor: amount,
        currency: "PHP",
        description,
        returnUrl: `${baseUrl}/subscriptions/payment-success`,
        cancelUrl: `${baseUrl}/subscriptions/payment-cancel`,
        customId: user.id,
        invoiceId: `sub-${user.id}-${Date.now()}`,
      })

      if (!paypalResult.success || !paypalResult.data) {
        return {
          success: false,
          error: paypalResult.error || "Failed to create PayPal order",
        }
      }

      const checkoutUrl = (paypalResult.data.links || []).find((link: any) =>
        ["approve", "payer-action"].includes(String(link?.rel || "").toLowerCase())
      )?.href

      if (!checkoutUrl) {
        return {
          success: false,
          error: "PayPal did not return an approval URL",
        }
      }

      const payment = await prisma.payment.create({
        data: {
          userId: user.id,
          amount: amount / 100,
          currency: "PHP",
          status: "pending",
          provider: "paypal",
          providerPaymentId: paypalResult.data.id,
          type: "subscription",
          metadata: annotatePaymentMetadataExpiry(
            {
              tier,
              checkoutUrl,
            },
            pendingExpiresAt,
            {
              pendingStatus: "active",
            }
          ) as any,
        },
      })

      return {
        success: true,
        checkoutUrl,
        paymentId: payment.id,
      }
    }

    const paymentResult = await createPaymentLink({
      amount,
      description,
      remarks: `Upgrade to ${tier} plan`,
      successUrl: `${baseUrl}/subscriptions/payment-success`,
      cancelUrl: `${baseUrl}/subscriptions/payment-cancel`,
      metadata: {
        userId: user.id,
        tier,
        username: user.username,
        email: user.email,
        type: "subscription",
      },
    })

    if (!paymentResult.success || !paymentResult.data) {
      return {
        success: false,
        error: paymentResult.error || "Failed to create payment link",
      }
    }

    const payment = await prisma.payment.create({
      data: {
        userId: user.id,
        amount: amount / 100,
        currency: "PHP",
        status: "pending",
        provider: "paymongo",
        providerPaymentId: paymentResult.data.id,
        type: "subscription",
        metadata: {
          tier,
          checkoutUrl: paymentResult.data.attributes.checkout_url,
        },
      },
    })

    return {
      success: true,
      checkoutUrl: paymentResult.data.attributes.checkout_url,
      paymentId: payment.id,
    }
  } catch (error) {
    console.error("Create subscription payment error:", error)
    return {
      success: false,
      error: "Failed to create payment. Please try again.",
    }
  }
}

/**
 * Verify payment status and process subscription upgrade
 * Called from webhook or client-side after redirect
 */
export async function verifyAndProcessPayment(
  paymentId: string
): Promise<VerifyPaymentResult> {
  try {
    // Get payment record from database
    const payment = await prisma.payment.findUnique({
      where: { id: paymentId },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            email: true,
            subscriptionTier: true,
          },
        },
      },
    })

    if (!payment) {
      return {
        success: false,
        error: "Payment not found",
      }
    }

    // If already processed, return success
    if (payment.status === "completed") {
      return {
        success: true,
        status: "paid",
      }
    }

    if (payment.status === "failed") {
      return {
        success: true,
        status: "failed",
      }
    }

    const expiry = resolvePendingPaypalSubscriptionExpiry({
      provider: payment.provider,
      type: payment.type,
      metadata: payment.metadata,
      createdAt: payment.createdAt,
    })

    if (payment.status === "pending" && expiry && expiry <= new Date()) {
      await prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: "failed",
          metadata: annotatePaymentMetadataExpiry(payment.metadata, expiry, {
            pendingStatus: "expired",
            expiredAt: new Date().toISOString(),
            failureReason: "pending_paypal_subscription_expired",
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
        // Notification failures should not block payment state transitions.
      })

      return {
        success: true,
        status: "failed",
      }
    }

    let paymentStatus = ""

    if (payment.provider === "paypal") {
      const paypalResult = await getPaypalOrder(payment.providerPaymentId)
      if (!paypalResult.success || !paypalResult.data) {
        return {
          success: false,
          error: "Failed to verify payment with provider",
        }
      }

      paymentStatus = String(paypalResult.data.status || "").toUpperCase()
    } else {
      const paymongoResult = await getPaymentLink(payment.providerPaymentId)
      if (!paymongoResult.success || !paymongoResult.data) {
        return {
          success: false,
          error: "Failed to verify payment with provider",
        }
      }

      paymentStatus = String(paymongoResult.data.attributes?.status || "").toLowerCase()
    }

    const isPaid = payment.provider === "paypal"
      ? paymentStatus === "COMPLETED"
      : paymentStatus === "paid"
    const isPending = payment.provider === "paypal"
      ? ["CREATED", "APPROVED", "PAYER_ACTION_REQUIRED"].includes(paymentStatus)
      : ["unpaid", "processing"].includes(paymentStatus)

    if (isPaid) {
      // Payment successful - upgrade subscription
      const tier = (payment.metadata as any).tier as "PRO" | "ELITE"

      await prisma.$transaction(async (tx) => {
        const nextMetadata = payment.provider === "paypal" && expiry
          ? annotatePaymentMetadataExpiry(payment.metadata, expiry, {
              pendingStatus: "completed",
            })
          : payment.metadata

        // Update payment status
        await tx.payment.update({
          where: { id: payment.id },
          data: {
            status: "completed",
            paidAt: new Date(),
            metadata: (nextMetadata ?? undefined) as any,
          },
        })

        // Calculate expiry date (30 days from now)
        const expiresAt = new Date()
        expiresAt.setDate(expiresAt.getDate() + 30)

        // Upgrade user subscription
        await tx.user.update({
          where: { id: payment.userId },
          data: {
            subscriptionTier: tier,
            subscriptionEndsAt: expiresAt,
          },
        })

        // Create notification
        await createNotification(
          payment.userId,
          "SYSTEM",
          `Upgraded to ${tier}!`,
          `Your subscription has been upgraded to ${tier}. Enjoy your new features!`,
          "/subscriptions"
        )
      })

      return {
        success: true,
        status: "paid",
      }
    } else if (isPending) {
      return {
        success: true,
        status: "pending",
      }
    } else {
      // Payment failed
      await prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: "failed",
        },
      })

      return {
        success: true,
        status: "failed",
      }
    }
  } catch (error) {
    console.error("Verify payment error:", error)
    return {
      success: false,
      error: "Failed to verify payment",
    }
  }
}

/**
 * Get user's payment history
 */
export async function getPaymentHistory() {
  try {
    const session = await auth()
    if (!session?.user?.email) {
      return {
        success: false,
        error: "Unauthorized",
      }
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true },
    })

    if (!user) {
      return {
        success: false,
        error: "User not found",
      }
    }

    const payments = await prisma.payment.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 10,
    })

    return {
      success: true,
      payments,
    }
  } catch (error) {
    console.error("Get payment history error:", error)
    return {
      success: false,
      error: "Failed to fetch payment history",
    }
  }
}
