import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { verifyWebhookSignature } from "@/lib/paymongo"
import { createNotification } from "@/app/actions/notifications"

/**
 * PayMongo Webhook Handler
 * Handles payment.paid and other webhook events
 * 
 * Configure this webhook URL in PayMongo Dashboard:
 * https://your-domain.com/api/webhooks/paymongo
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.text()
    const signature = request.headers.get("paymongo-signature") || ""

    // Detailed logging for debugging
    console.log("[PayMongo Webhook] Received request")
    console.log("[PayMongo Webhook] Signature header:", signature ? `${signature.substring(0, 20)}...` : "MISSING")
    console.log("[PayMongo Webhook] Body length:", body.length)
    console.log("[PayMongo Webhook] All headers:", JSON.stringify(Object.fromEntries(request.headers.entries())))

    // Verify webhook signature
    if (!verifyWebhookSignature(body, signature)) {
      console.error("[PayMongo Webhook] Invalid webhook signature")
      console.error("[PayMongo Webhook] Expected signature format: HMAC SHA256 hex")
      return NextResponse.json(
        { error: "Invalid signature" },
        { status: 401 }
      )
    }

    const event = JSON.parse(body)
    const eventType = event.data.attributes.type

    console.log(`[PayMongo Webhook] Received event: ${eventType}`)

    // Handle payment.paid event
    if (eventType === "payment.paid") {
      await handlePaymentPaid(event.data)
    }
    
    // Handle link.payment.paid event
    if (eventType === "link.payment.paid") {
      await handleLinkPaymentPaid(event.data)
    }

    // Handle payment.failed event
    if (eventType === "payment.failed") {
      await handlePaymentFailed(event.data)
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error("[PayMongo Webhook] Error:", error)
    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 500 }
    )
  }
}

/**
 * Handle payment.paid event
 */
async function handlePaymentPaid(data: any) {
  try {
    const paymentIntentId = data.attributes.data.id
    const metadata = data.attributes.data.attributes.metadata

    // Find payment record
    const payment = await prisma.payment.findFirst({
      where: {
        providerPaymentId: paymentIntentId,
        status: "pending",
      },
    })

    if (!payment) {
      console.log(`[PayMongo Webhook] Payment record not found for: ${paymentIntentId}`)
      return
    }

    // Update payment and subscription in transaction
    await prisma.$transaction(async (tx) => {
      // Update payment status
      await tx.payment.update({
        where: { id: payment.id },
        data: {
          status: "completed",
          paidAt: new Date(),
        },
      })

      // Upgrade subscription if it's a subscription payment
      if (payment.type === "subscription" && metadata?.tier) {
        const tier = metadata.tier as "PRO" | "ELITE"
        
        // Calculate expiry date (30 days)
        const expiresAt = new Date()
        expiresAt.setDate(expiresAt.getDate() + 30)

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

        console.log(`[PayMongo Webhook] Upgraded user ${payment.userId} to ${tier}`)
      }
    })
  } catch (error) {
    console.error("[PayMongo Webhook] handlePaymentPaid error:", error)
    throw error
  }
}

/**
 * Handle link.payment.paid event (for payment links)
 */
async function handleLinkPaymentPaid(data: any) {
  try {
    const linkData = data.attributes.data
    const linkId = linkData.id
    const linkAttributes = linkData.attributes
    const metadata = linkAttributes.metadata || {}

    console.log(`[PayMongo Webhook] Processing link payment: ${linkId}`)

    // Find payment record by link ID
    const payment = await prisma.payment.findFirst({
      where: {
        providerPaymentId: linkId,
        status: "pending",
      },
    })

    if (!payment) {
      console.log(`[PayMongo Webhook] Payment record not found for link: ${linkId}`)
      return
    }

    // Update payment and subscription in transaction
    await prisma.$transaction(async (tx) => {
      // Update payment status
      await tx.payment.update({
        where: { id: payment.id },
        data: {
          status: "completed",
          paidAt: new Date(),
        },
      })

      // Upgrade subscription if it's a subscription payment
      if (payment.type === "subscription") {
        const tier = metadata.tier || (payment.metadata as any)?.tier

        if (tier && (tier === "PRO" || tier === "ELITE")) {
          // Calculate expiry date (30 days)
          const expiresAt = new Date()
          expiresAt.setDate(expiresAt.getDate() + 30)

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

          console.log(`[PayMongo Webhook] Upgraded user ${payment.userId} to ${tier}`)
        }
      }
    })
  } catch (error) {
    console.error("[PayMongo Webhook] handleLinkPaymentPaid error:", error)
    throw error
  }
}

/**
 * Handle payment.failed event
 */
async function handlePaymentFailed(data: any) {
  try {
    const paymentIntentId = data.attributes.data.id

    // Find and update payment record
    const payment = await prisma.payment.findFirst({
      where: {
        providerPaymentId: paymentIntentId,
        status: "pending",
      },
    })

    if (!payment) {
      console.log(`[PayMongo Webhook] Payment record not found for failed payment: ${paymentIntentId}`)
      return
    }

    await prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: "failed",
      },
    })

    // Notify user
    await createNotification(
      payment.userId,
      "SYSTEM",
      "Payment Failed",
      "Your payment could not be processed. Please try again or contact support.",
      "/subscriptions"
    )

    console.log(`[PayMongo Webhook] Payment failed for user ${payment.userId}`)
  } catch (error) {
    console.error("[PayMongo Webhook] handlePaymentFailed error:", error)
    throw error
  }
}
