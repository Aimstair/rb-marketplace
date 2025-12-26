"use server"

import { prisma } from "@/lib/prisma"
import { auth } from "@/auth"
import { createPaymentLink, getPaymentIntent } from "@/lib/paymongo"
import { createNotification } from "./notifications"

// Subscription tier pricing in centavos (₱)
const SUBSCRIPTION_PRICING = {
  PRO: 19900, // ₱199.00
  ELITE: 49900, // ₱499.00
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

    // Get base URL for redirects
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"

    // Create payment link
    const paymentResult = await createPaymentLink({
      amount,
      description,
      remarks: `Upgrade to ${tier} plan`,
      successUrl: `${baseUrl}/subscriptions/payment-success`,
      cancelUrl: `${baseUrl}/subscriptions/payment-cancel`,
      metadata: {
        userId: user.id,
        tier: tier,
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

    // Store payment record in database
    const payment = await prisma.payment.create({
      data: {
        userId: user.id,
        amount: amount / 100, // Store in pesos
        currency: "PHP",
        status: "pending",
        provider: "paymongo",
        providerPaymentId: paymentResult.data.id,
        type: "subscription",
        metadata: {
          tier: tier,
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

    // Verify with PayMongo
    const paymongoResult = await getPaymentIntent(payment.providerPaymentId)

    if (!paymongoResult.success || !paymongoResult.data) {
      return {
        success: false,
        error: "Failed to verify payment with provider",
      }
    }

    const paymentStatus = paymongoResult.data.attributes.status

    if (paymentStatus === "succeeded") {
      // Payment successful - upgrade subscription
      const tier = (payment.metadata as any).tier as "PRO" | "ELITE"

      await prisma.$transaction(async (tx) => {
        // Update payment status
        await tx.payment.update({
          where: { id: payment.id },
          data: {
            status: "completed",
            paidAt: new Date(),
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
    } else if (paymentStatus === "awaiting_payment_method" || paymentStatus === "processing") {
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
