/**
 * PayMongo API Integration
 * Handles payment processing with PayMongo
 */

const PAYMONGO_SECRET_KEY = process.env.PAYMONGO_SECRET_KEY || ""
const PAYMONGO_PUBLIC_KEY = process.env.PAYMONGO_PUBLIC_KEY || ""
const PAYMONGO_WEBHOOK_SECRET = process.env.PAYMONGO_WEBHOOK_SECRET || ""

if (!PAYMONGO_SECRET_KEY) {
  console.warn("PAYMONGO_SECRET_KEY is not set")
}

const PAYMONGO_BASE_URL = "https://api.paymongo.com/v1"

/**
 * Create base64 encoded auth header
 */
function getAuthHeader(): string {
  return `Basic ${Buffer.from(PAYMONGO_SECRET_KEY).toString("base64")}`
}

export interface PaymentIntentData {
  amount: number // Amount in centavos (e.g., 19900 for ₱199.00)
  currency: string // "PHP"
  description: string
  statement_descriptor: string
  metadata?: Record<string, string>
}

export interface PaymentMethodData {
  type: "gcash" | "grab_pay" | "paymaya" | "card"
  billing?: {
    name: string
    email: string
    phone?: string
  }
}

export interface PaymentLinkData {
  amount: number // Amount in centavos
  description: string
  remarks?: string
  successUrl?: string
  cancelUrl?: string
  metadata?: Record<string, string>
}

/**
 * Create a payment intent
 */
export async function createPaymentIntent(data: PaymentIntentData) {
  try {
    const response = await fetch(`${PAYMONGO_BASE_URL}/payment_intents`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: getAuthHeader(),
      },
      body: JSON.stringify({
        data: {
          attributes: data,
        },
      }),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.errors?.[0]?.detail || "Failed to create payment intent")
    }

    const result = await response.json()
    return { success: true, data: result.data }
  } catch (error: any) {
    console.error("PayMongo payment intent error:", error)
    return { success: false, error: error.message }
  }
}

/**
 * Create a payment method
 */
export async function createPaymentMethod(data: PaymentMethodData & { details?: any }) {
  try {
    const response = await fetch(`${PAYMONGO_BASE_URL}/payment_methods`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: getAuthHeader(),
      },
      body: JSON.stringify({
        data: {
          attributes: data,
        },
      }),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.errors?.[0]?.detail || "Failed to create payment method")
    }

    const result = await response.json()
    return { success: true, data: result.data }
  } catch (error: any) {
    console.error("PayMongo payment method error:", error)
    return { success: false, error: error.message }
  }
}

/**
 * Attach payment method to payment intent
 */
export async function attachPaymentIntent(
  paymentIntentId: string,
  paymentMethodId: string,
  returnUrl: string
) {
  try {
    const response = await fetch(`${PAYMONGO_BASE_URL}/payment_intents/${paymentIntentId}/attach`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: getAuthHeader(),
      },
      body: JSON.stringify({
        data: {
          attributes: {
            payment_method: paymentMethodId,
            return_url: returnUrl,
          },
        },
      }),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.errors?.[0]?.detail || "Failed to attach payment method")
    }

    const result = await response.json()
    return { success: true, data: result.data }
  } catch (error: any) {
    console.error("PayMongo attach payment error:", error)
    return { success: false, error: error.message }
  }
}

/**
 * Create a payment link (checkout URL)
 * This is the recommended approach for subscriptions
 */
export async function createPaymentLink(data: PaymentLinkData) {
  try {
    const response = await fetch(`${PAYMONGO_BASE_URL}/links`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: getAuthHeader(),
      },
      body: JSON.stringify({
        data: {
          attributes: data,
        },
      }),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.errors?.[0]?.detail || "Failed to create payment link")
    }

    const result = await response.json()
    return { success: true, data: result.data }
  } catch (error: any) {
    console.error("PayMongo payment link error:", error)
    return { success: false, error: error.message }
  }
}

/**
 * Retrieve payment intent details
 */
export async function getPaymentIntent(paymentIntentId: string) {
  try {
    const response = await fetch(`${PAYMONGO_BASE_URL}/payment_intents/${paymentIntentId}`, {
      method: "GET",
      headers: {
        Accept: "application/json",
        Authorization: getAuthHeader(),
      },
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.errors?.[0]?.detail || "Failed to retrieve payment intent")
    }

    const result = await response.json()
    return { success: true, data: result.data }
  } catch (error: any) {
    console.error("PayMongo get payment intent error:", error)
    return { success: false, error: error.message }
  }
}

/**
 * Retrieve payment link details
 */
export async function getPaymentLink(linkId: string) {
  try {
    const response = await fetch(`${PAYMONGO_BASE_URL}/links/${linkId}`, {
      method: "GET",
      headers: {
        Accept: "application/json",
        Authorization: getAuthHeader(),
      },
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.errors?.[0]?.detail || "Failed to retrieve payment link")
    }

    const result = await response.json()
    return { success: true, data: result.data }
  } catch (error: any) {
    console.error("PayMongo get payment link error:", error)
    return { success: false, error: error.message }
  }
}

/**
 * Verify webhook signature
 */
export function verifyWebhookSignature(payload: string, signature: string): boolean {
  const crypto = require("crypto")
  
  if (!PAYMONGO_WEBHOOK_SECRET) {
    console.error("PAYMONGO_WEBHOOK_SECRET is not set")
    return false
  }

  console.log("[PayMongo] Verifying webhook signature")
  console.log("[PayMongo] Secret loaded:", PAYMONGO_WEBHOOK_SECRET ? `${PAYMONGO_WEBHOOK_SECRET.substring(0, 10)}...` : "NOT SET")
  console.log("[PayMongo] Received signature:", signature ? `${signature.substring(0, 20)}...` : "EMPTY")

  const computedSignature = crypto
    .createHmac("sha256", PAYMONGO_WEBHOOK_SECRET)
    .update(payload)
    .digest("hex")

  console.log("[PayMongo] Computed signature:", `${computedSignature.substring(0, 20)}...`)
  console.log("[PayMongo] Signatures match:", computedSignature === signature)

  return computedSignature === signature
}

/**
 * Get public key for client-side usage (safe to expose)
 */
export function getPublicKey(): string {
  return PAYMONGO_PUBLIC_KEY
}
