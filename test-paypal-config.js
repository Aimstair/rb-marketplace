/**
 * PayPal webhook and credentials configuration validator
 * Usage: node test-paypal-config.js
 */

const fs = require("fs")
const { loadEnvConfig } = require("@next/env")

loadEnvConfig(process.cwd())

function readEnvFromLocalFile() {
  try {
    const envContent = fs.readFileSync(".env.local", "utf8")
    const values = {}

    for (const line of envContent.split(/\r?\n/)) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) {
        continue
      }

      const idx = trimmed.indexOf("=")
      const key = trimmed.slice(0, idx).trim()
      let value = trimmed.slice(idx + 1).trim()

      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1)
      }

      values[key] = value
    }

    return values
  } catch {
    return {}
  }
}

function getEnv(key, localValues) {
  return process.env[key] || localValues[key] || ""
}

async function validatePaypalAccessToken(baseUrl, clientId, clientSecret) {
  try {
    const response = await fetch(`${baseUrl}/v1/oauth2/token`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: "grant_type=client_credentials",
    })

    if (!response.ok) {
      const body = await response.text()
      return {
        success: false,
        error: `OAuth request failed (${response.status}): ${body.slice(0, 200)}`,
      }
    }

    const json = await response.json()
    if (!json.access_token) {
      return {
        success: false,
        error: "OAuth response did not include access_token",
      }
    }

    return {
      success: true,
      tokenType: json.token_type || "unknown",
      expiresIn: json.expires_in || "unknown",
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    }
  }
}

async function main() {
  console.log("\n=== PayPal Configuration Check ===\n")

  const envLocal = readEnvFromLocalFile()

  const clientId = getEnv("PAYPAL_CLIENT_ID", envLocal)
  const clientSecret = getEnv("PAYPAL_CLIENT_SECRET", envLocal)
  const webhookId = getEnv("PAYPAL_WEBHOOK_ID", envLocal)
  const baseUrl = getEnv("PAYPAL_API_BASE_URL", envLocal) || "https://api-m.sandbox.paypal.com"
  const activeProvider = getEnv("ACTIVE_SUBSCRIPTION_PAYMENT_PROVIDER", envLocal) || getEnv("ACTIVE_PAYMENT_PROVIDER", envLocal)
  const enabledProviders = getEnv("ENABLED_SUBSCRIPTION_PAYMENT_PROVIDERS", envLocal) || getEnv("ENABLED_PAYMENT_PROVIDERS", envLocal)

  const requiredChecks = [
    ["PAYPAL_CLIENT_ID", clientId],
    ["PAYPAL_CLIENT_SECRET", clientSecret],
  ]

  let missing = 0
  for (const [key, value] of requiredChecks) {
    if (!value) {
      missing += 1
      console.log(`- ${key}: MISSING`)
    } else {
      const preview = key.includes("SECRET") ? `${value.slice(0, 4)}...` : `${value.slice(0, 10)}...`
      console.log(`- ${key}: OK (${preview})`)
    }
  }

  if (!webhookId) {
    console.log("- PAYPAL_WEBHOOK_ID: MISSING (optional for OAuth/order tests; required for webhook signature verification)")
  } else {
    console.log(`- PAYPAL_WEBHOOK_ID: OK (${webhookId.slice(0, 10)}...)`)
  }

  console.log(`- PAYPAL_API_BASE_URL: ${baseUrl}`)
  console.log(`- ACTIVE_SUBSCRIPTION_PAYMENT_PROVIDER: ${activeProvider || "(not set)"}`)
  console.log(`- ENABLED_SUBSCRIPTION_PAYMENT_PROVIDERS: ${enabledProviders || "(not set)"}`)

  if (missing > 0) {
    console.log("\nResult: FAIL")
    console.log("Missing required PayPal environment variables. Add them to .env.local and retry.\n")
    process.exit(1)
  }

  console.log("\nChecking OAuth access token flow...")
  const tokenResult = await validatePaypalAccessToken(baseUrl, clientId, clientSecret)

  if (!tokenResult.success) {
    console.log("Result: FAIL")
    console.log(`OAuth validation failed: ${tokenResult.error}\n`)
    process.exit(1)
  }

  console.log(`Result: PASS (tokenType=${tokenResult.tokenType}, expiresIn=${tokenResult.expiresIn})`)
  console.log("\nNext steps:")
  console.log("1. Ensure PayPal webhook URL points to /api/webhooks/paypal")
  console.log("2. Enable events: CHECKOUT.ORDER.APPROVED, PAYMENT.CAPTURE.COMPLETED, PAYMENT.CAPTURE.DENIED, PAYMENT.CAPTURE.DECLINED")
  console.log("3. Complete a sandbox checkout and confirm payment/subscription updates in app.\n")
}

main().catch((error) => {
  console.error("Unexpected error:", error)
  process.exit(1)
})
