import { NextRequest, NextResponse } from "next/server"
import { verifyWebhookSignature } from "@/lib/paymongo"
import { completeProviderPayment, markProviderPaymentFailed } from "@/lib/payment-processing"
import { logError, logInfo, logWarn } from "@/lib/observability"
import { isPaymongoWebhookEnabled } from "@/lib/feature-flags"

/**
 * PayMongo Webhook Handler
 * Handles payment.paid and other webhook events
 * 
 * Configure this webhook URL in PayMongo Dashboard:
 * https://your-domain.com/api/webhooks/paymongo
 */
export async function POST(request: NextRequest) {
  try {
    if (!isPaymongoWebhookEnabled()) {
      logWarn("paymongo.webhook.disabled")
      return NextResponse.json(
        { error: "PayMongo webhook is disabled" },
        { status: 410 }
      )
    }

    const body = await request.text()
    const signature = request.headers.get("paymongo-signature") || ""

    // Verify webhook signature
    if (!verifyWebhookSignature(body, signature)) {
      logWarn("paymongo.webhook.signature_invalid")
      return NextResponse.json(
        { error: "Invalid signature" },
        { status: 401 }
      )
    }

    const event = JSON.parse(body)
    const eventId = event?.data?.id as string | undefined
    const eventType = event.data.attributes.type

    logInfo("paymongo.webhook.received", {
      eventType: eventType || null,
      eventId: eventId || null,
    })

    // Handle payment.paid event
    if (eventType === "payment.paid") {
      await handlePaymentPaid(event.data, eventId)
    }
    
    // Handle link.payment.paid event
    if (eventType === "link.payment.paid") {
      await handleLinkPaymentPaid(event.data, eventId)
    }

    // Handle payment.failed event
    if (eventType === "payment.failed") {
      await handlePaymentFailed(event.data, eventId)
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    logError("paymongo.webhook.processing_failed", error)
    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 500 }
    )
  }
}

/**
 * Handle payment.paid event
 */
async function handlePaymentPaid(data: any, eventId?: string) {
  try {
    const paymentIntentId = data?.attributes?.data?.id
    const metadata = data?.attributes?.data?.attributes?.metadata || {}
    const referenceNumber = data?.attributes?.data?.attributes?.reference_number

    if (!paymentIntentId) {
      logWarn("paymongo.webhook.payment_paid_missing_intent", {
        eventId: eventId || null,
      })
      return
    }

    const result = await completeProviderPayment({
      provider: "paymongo",
      providerPaymentId: paymentIntentId,
      metadata,
      providerReferenceId: referenceNumber || null,
      providerEventId: eventId || null,
    })

    if (result.status === "not_found") {
      logWarn("paymongo.webhook.payment_not_found", {
        eventId: eventId || null,
        providerPaymentId: paymentIntentId,
      })
    }
  } catch (error) {
    logError("paymongo.webhook.payment_paid_failed", error, {
      eventId: eventId || null,
    })
    throw error
  }
}

/**
 * Handle link.payment.paid event (for payment links)
 */
async function handleLinkPaymentPaid(data: any, eventId?: string) {
  try {
    const linkData = data?.attributes?.data
    if (!linkData?.id) {
      logWarn("paymongo.webhook.link_paid_missing_id", {
        eventId: eventId || null,
      })
      return
    }

    const linkId = linkData.id
    const linkAttributes = linkData.attributes || {}
    const metadata = linkAttributes.metadata || {}

    logInfo("paymongo.webhook.link_paid_processing", {
      eventId: eventId || null,
      providerPaymentId: linkId,
    })

    const result = await completeProviderPayment({
      provider: "paymongo",
      providerPaymentId: linkId,
      metadata,
      providerReferenceId: linkAttributes.reference_number || null,
      providerEventId: eventId || null,
    })

    if (result.status === "not_found") {
      logWarn("paymongo.webhook.link_payment_not_found", {
        eventId: eventId || null,
        providerPaymentId: linkId,
      })
    }
  } catch (error) {
    logError("paymongo.webhook.link_paid_failed", error, {
      eventId: eventId || null,
    })
    throw error
  }
}

/**
 * Handle payment.failed event
 */
async function handlePaymentFailed(data: any, eventId?: string) {
  try {
    const paymentIntentId = data?.attributes?.data?.id
    if (!paymentIntentId) {
      logWarn("paymongo.webhook.payment_failed_missing_intent", {
        eventId: eventId || null,
      })
      return
    }

    const result = await markProviderPaymentFailed({
      provider: "paymongo",
      providerPaymentId: paymentIntentId,
      providerEventId: eventId || null,
    })

    if (result.status === "not_found") {
      logWarn("paymongo.webhook.failed_payment_not_found", {
        eventId: eventId || null,
        providerPaymentId: paymentIntentId,
      })
      return
    }
  } catch (error) {
    logError("paymongo.webhook.payment_failed_handler_failed", error, {
      eventId: eventId || null,
    })
    throw error
  }
}
