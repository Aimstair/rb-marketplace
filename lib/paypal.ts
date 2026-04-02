const DEFAULT_PAYPAL_BASE_URL = "https://api-m.paypal.com"

function getPaypalBaseUrl(): string {
  return process.env.PAYPAL_API_BASE_URL || DEFAULT_PAYPAL_BASE_URL
}

async function getPaypalAccessToken(): Promise<{ success: boolean; accessToken?: string; error?: string }> {
  const clientId = process.env.PAYPAL_CLIENT_ID
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET

  if (!clientId || !clientSecret) {
    return { success: false, error: "Missing PayPal credentials" }
  }

  try {
    const response = await fetch(`${getPaypalBaseUrl()}/v1/oauth2/token`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: "grant_type=client_credentials",
    })

    if (!response.ok) {
      const text = await response.text()
      return { success: false, error: `Failed to get PayPal access token: ${text}` }
    }

    const json = await response.json()
    if (!json?.access_token) {
      return { success: false, error: "PayPal access token missing in response" }
    }

    return { success: true, accessToken: json.access_token as string }
  } catch (error: any) {
    return { success: false, error: error?.message || "Failed to get PayPal access token" }
  }
}

export async function createPaypalOrder(input: {
  amountInMinor: number
  currency: string
  description: string
  returnUrl: string
  cancelUrl: string
  customId?: string
  invoiceId?: string
}) {
  const token = await getPaypalAccessToken()
  if (!token.success || !token.accessToken) {
    return { success: false, error: token.error || "PayPal auth failed" }
  }

  const majorAmount = (input.amountInMinor / 100).toFixed(2)

  try {
    const response = await fetch(`${getPaypalBaseUrl()}/v2/checkout/orders`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token.accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        intent: "CAPTURE",
        purchase_units: [
          {
            description: input.description,
            custom_id: input.customId,
            invoice_id: input.invoiceId,
            amount: {
              currency_code: input.currency,
              value: majorAmount,
            },
          },
        ],
        payment_source: {
          paypal: {
            experience_context: {
              user_action: "PAY_NOW",
              return_url: input.returnUrl,
              cancel_url: input.cancelUrl,
            },
          },
        },
      }),
    })

    if (!response.ok) {
      const text = await response.text()
      return { success: false, error: `Failed to create PayPal order: ${text}` }
    }

    const order = await response.json()
    return { success: true, data: order }
  } catch (error: any) {
    return { success: false, error: error?.message || "Failed to create PayPal order" }
  }
}

export async function getPaypalOrder(orderId: string) {
  const token = await getPaypalAccessToken()
  if (!token.success || !token.accessToken) {
    return { success: false, error: token.error || "PayPal auth failed" }
  }

  try {
    const response = await fetch(`${getPaypalBaseUrl()}/v2/checkout/orders/${orderId}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token.accessToken}`,
        "Content-Type": "application/json",
      },
    })

    if (!response.ok) {
      const text = await response.text()
      return { success: false, error: `Failed to retrieve PayPal order: ${text}` }
    }

    const order = await response.json()
    return { success: true, data: order }
  } catch (error: any) {
    return { success: false, error: error?.message || "Failed to retrieve PayPal order" }
  }
}

export async function capturePaypalOrder(orderId: string) {
  const token = await getPaypalAccessToken()
  if (!token.success || !token.accessToken) {
    return { success: false, error: token.error || "PayPal auth failed" }
  }

  try {
    const response = await fetch(`${getPaypalBaseUrl()}/v2/checkout/orders/${orderId}/capture`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token.accessToken}`,
        "Content-Type": "application/json",
      },
    })

    if (!response.ok) {
      const text = await response.text()
      return { success: false, error: `Failed to capture PayPal order: ${text}` }
    }

    const order = await response.json()
    return { success: true, data: order }
  } catch (error: any) {
    return { success: false, error: error?.message || "Failed to capture PayPal order" }
  }
}

export async function verifyPaypalWebhookSignature(input: {
  transmissionId: string
  transmissionTime: string
  certUrl: string
  authAlgo: string
  transmissionSig: string
  webhookId: string
  webhookEvent: unknown
}) {
  const token = await getPaypalAccessToken()
  if (!token.success || !token.accessToken) {
    return { success: false, verified: false, error: token.error || "PayPal auth failed" }
  }

  try {
    const response = await fetch(`${getPaypalBaseUrl()}/v1/notifications/verify-webhook-signature`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token.accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        auth_algo: input.authAlgo,
        cert_url: input.certUrl,
        transmission_id: input.transmissionId,
        transmission_sig: input.transmissionSig,
        transmission_time: input.transmissionTime,
        webhook_id: input.webhookId,
        webhook_event: input.webhookEvent,
      }),
    })

    if (!response.ok) {
      const text = await response.text()
      return { success: false, verified: false, error: `PayPal webhook verification failed: ${text}` }
    }

    const verification = await response.json()
    return {
      success: true,
      verified: verification?.verification_status === "SUCCESS",
    }
  } catch (error: any) {
    return { success: false, verified: false, error: error?.message || "PayPal webhook verification failed" }
  }
}
