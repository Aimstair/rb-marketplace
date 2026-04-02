import { NextRequest, NextResponse } from "next/server"
import { completeProviderPayment, markProviderPaymentFailed } from "@/lib/payment-processing"
import { capturePaypalOrder, verifyPaypalWebhookSignature } from "@/lib/paypal"
import { logError, logInfo, logWarn } from "@/lib/observability"
import {
  markWebhookEventFailed,
  markWebhookEventProcessed,
  resolveWebhookEventId,
  touchWebhookEvent,
} from "@/lib/webhook-events"

export const dynamic = "force-dynamic"

async function isPaypalWebhookAuthorized(request: NextRequest, payload: any): Promise<boolean> {
  const webhookId = process.env.PAYPAL_WEBHOOK_ID
  if (!webhookId) {
    return false
  }

  const transmissionId = request.headers.get("paypal-transmission-id")
  const transmissionTime = request.headers.get("paypal-transmission-time")
  const certUrl = request.headers.get("paypal-cert-url")
  const authAlgo = request.headers.get("paypal-auth-algo")
  const transmissionSig = request.headers.get("paypal-transmission-sig")

  if (!transmissionId || !transmissionTime || !certUrl || !authAlgo || !transmissionSig) {
    return false
  }

  const verification = await verifyPaypalWebhookSignature({
    transmissionId,
    transmissionTime,
    certUrl,
    authAlgo,
    transmissionSig,
    webhookId,
    webhookEvent: payload,
  })

  return verification.success && verification.verified
}

export async function POST(request: NextRequest) {
  try {
    const payload = await request.json()

    if (!process.env.PAYPAL_WEBHOOK_ID) {
      logError("paypal.webhook.misconfigured", "PAYPAL_WEBHOOK_ID is not configured")
      return NextResponse.json({ success: false, error: "Webhook misconfigured" }, { status: 503 })
    }

    const verified = await isPaypalWebhookAuthorized(request, payload)
    if (!verified) {
      logWarn("paypal.webhook.signature_invalid", {
        eventType: payload?.event_type || null,
        eventId: payload?.id || null,
      })
      return NextResponse.json({ success: false, error: "Invalid PayPal webhook signature" }, { status: 401 })
    }

    const eventType = payload?.event_type
    const eventId = resolveWebhookEventId("paypal", payload, payload?.id)
    const resource = payload?.resource || {}
    const trackedEvent = await touchWebhookEvent({
      provider: "paypal",
      eventId,
      eventType: eventType || "unknown",
      payload,
    })

    logInfo("paypal.webhook.received", {
      eventType: eventType || null,
      eventId: eventId || null,
    })

    try {
      if (eventType === "CHECKOUT.ORDER.APPROVED") {
        const orderId = resource?.id || null
        if (orderId) {
          const captureResult = await capturePaypalOrder(orderId)
          if (captureResult.success && captureResult.data) {
            const purchaseUnit = captureResult.data?.purchase_units?.[0]
            const capture = purchaseUnit?.payments?.captures?.[0]

            const completionResult = await completeProviderPayment({
              provider: "paypal",
              providerPaymentId: orderId,
              providerOrderId: orderId,
              providerCaptureId: capture?.id || undefined,
              providerReferenceId: purchaseUnit?.invoice_id || null,
              providerEventId: eventId || null,
            })

            if (!completionResult.success) {
              throw new Error(completionResult.error || "Failed to persist approved PayPal payment")
            }
          } else {
            logError("paypal.webhook.capture_failed", captureResult.error || "unknown_capture_error", {
              eventType,
              eventId: eventId || null,
              orderId,
              reason: captureResult.error || "unknown_capture_error",
            })

            throw new Error(`PayPal capture failed for order ${orderId}`)
          }
        } else {
          logWarn("paypal.webhook.order_approved_missing_order_id", {
            eventType,
            eventId: eventId || null,
          })
        }
      }

      if (eventType === "PAYMENT.CAPTURE.COMPLETED") {
        const orderId = resource?.supplementary_data?.related_ids?.order_id || null
        const captureId = resource?.id || null

        const completionResult = await completeProviderPayment({
          provider: "paypal",
          providerPaymentId: orderId || captureId || undefined,
          providerOrderId: orderId || undefined,
          providerCaptureId: captureId || undefined,
          providerReferenceId: resource?.invoice_id || null,
          providerEventId: eventId || null,
        })

        if (!completionResult.success) {
          throw new Error(completionResult.error || "Failed to persist completed PayPal capture")
        }
      }

      if (eventType === "PAYMENT.CAPTURE.DENIED" || eventType === "PAYMENT.CAPTURE.DECLINED") {
        let orderId = resource?.supplementary_data?.related_ids?.order_id || null
        const captureId = resource?.id || null

        const markFailedResult = await markProviderPaymentFailed({
          provider: "paypal",
          providerPaymentId: orderId || captureId || undefined,
          providerOrderId: orderId || undefined,
          providerCaptureId: captureId || undefined,
          providerEventId: eventId || null,
        })

        if (!markFailedResult.success) {
          throw new Error(markFailedResult.error || "Failed to mark denied PayPal capture")
        }
      }
    } catch (processingError) {
      if (trackedEvent) {
        await markWebhookEventFailed(trackedEvent.id, processingError)
      }

      throw processingError
    }

    if (trackedEvent) {
      await markWebhookEventProcessed(trackedEvent.id)
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    logError("paypal.webhook.processing_failed", error)
    return NextResponse.json({ success: false, error: "Webhook processing failed" }, { status: 500 })
  }
}
