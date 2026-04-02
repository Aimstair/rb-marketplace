/* eslint-disable no-console */

const { loadEnvConfig } = require("@next/env")

loadEnvConfig(process.cwd())

function asBool(value, defaultValue = false) {
  if (value === undefined) {
    return defaultValue
  }

  const normalized = String(value).trim().toLowerCase()
  if (["1", "true", "yes", "on", "enabled"].includes(normalized)) {
    return true
  }

  if (["0", "false", "no", "off", "disabled"].includes(normalized)) {
    return false
  }

  return defaultValue
}

function isHttpsUrl(value) {
  if (!value) {
    return false
  }

  try {
    const parsed = new URL(value)
    return parsed.protocol === "https:"
  } catch {
    return false
  }
}

function required(condition, message, errors, warnings) {
  if (condition) {
    return
  }

  if (message.startsWith("WARN:")) {
    warnings.push(message.replace(/^WARN:\s*/, ""))
  } else {
    errors.push(message)
  }
}

async function callJson(url, options) {
  const response = await fetch(url, options)
  const body = await response.json().catch(() => ({}))
  return { ok: response.ok, status: response.status, body }
}

async function main() {
  const errors = []
  const warnings = []

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || ""
  const nextAuthUrl = process.env.NEXTAUTH_URL || ""
  const publicAppUrl = process.env.NEXT_PUBLIC_APP_URL || ""
  const giveawayEnabled = asBool(process.env.ENABLE_GIVEAWAY_FEATURE, true)
  const emailEnabled = asBool(process.env.ENABLE_EMAIL_NOTIFICATIONS_FEATURE, true)
  const paymongoWebhookEnabled = asBool(process.env.ENABLE_PAYMONGO_WEBHOOK, true)
  const realtimeEnabled = asBool(
    process.env.NEXT_PUBLIC_ENABLE_REALTIME_MESSAGING_FEATURE || process.env.ENABLE_REALTIME_MESSAGING_FEATURE,
    true
  )

  const activeProvider = (process.env.ACTIVE_SUBSCRIPTION_PAYMENT_PROVIDER || process.env.ACTIVE_PAYMENT_PROVIDER || "paymongo").toLowerCase()
  const enabledProviders = (process.env.ENABLED_SUBSCRIPTION_PAYMENT_PROVIDERS || process.env.ENABLED_PAYMENT_PROVIDERS || activeProvider)
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean)

  console.log("\n=== Phase 6 Rollout Validation ===")
  console.log("Feature flags:")
  console.log(`- ENABLE_GIVEAWAY_FEATURE=${giveawayEnabled}`)
  console.log(`- ENABLE_EMAIL_NOTIFICATIONS_FEATURE=${emailEnabled}`)
  console.log(`- ENABLE_PAYMONGO_WEBHOOK=${paymongoWebhookEnabled}`)
  console.log(`- ENABLE_REALTIME_MESSAGING_FEATURE=${realtimeEnabled}`)
  console.log(`- ACTIVE_PROVIDER=${activeProvider}`)
  console.log(`- ENABLED_PROVIDERS=${enabledProviders.join(",")}`)

  required(!!process.env.DATABASE_URL, "DATABASE_URL is required", errors, warnings)
  required(!!nextAuthUrl, "NEXTAUTH_URL is required", errors, warnings)
  required(!!publicAppUrl, "NEXT_PUBLIC_APP_URL is required", errors, warnings)
  required(!!process.env.NEXTAUTH_SECRET, "NEXTAUTH_SECRET is required", errors, warnings)
  required(!!process.env.AUTH_SECRET, "AUTH_SECRET is required", errors, warnings)
  required(asBool(process.env.AUTH_TRUST_HOST, false), "WARN: AUTH_TRUST_HOST should be true in App Platform deployments", errors, warnings)

  if (nextAuthUrl && publicAppUrl && nextAuthUrl !== publicAppUrl) {
    warnings.push("NEXTAUTH_URL and NEXT_PUBLIC_APP_URL differ; ensure this is intentional")
  }

  if (nextAuthUrl && !isHttpsUrl(nextAuthUrl)) {
    warnings.push("NEXTAUTH_URL is not HTTPS; production should use HTTPS")
  }

  if (publicAppUrl && !isHttpsUrl(publicAppUrl)) {
    warnings.push("NEXT_PUBLIC_APP_URL is not HTTPS; production should use HTTPS")
  }

  required(!giveawayEnabled || !!process.env.GIVEAWAY_CRON_SECRET, "GIVEAWAY_CRON_SECRET must be set when giveaway feature is enabled", errors, warnings)
  required(!emailEnabled || !!process.env.EMAIL_DIGEST_CRON_SECRET, "EMAIL_DIGEST_CRON_SECRET must be set when email feature is enabled", errors, warnings)
  required(!emailEnabled || !!process.env.EMAIL_INACTIVITY_CRON_SECRET, "WARN: EMAIL_INACTIVITY_CRON_SECRET is missing; fallback to digest secret will be used", errors, warnings)

  if (realtimeEnabled) {
    required(!!process.env.PUSHER_APP_ID, "PUSHER_APP_ID is required when realtime messaging is enabled", errors, warnings)
    required(!!process.env.PUSHER_KEY, "PUSHER_KEY is required when realtime messaging is enabled", errors, warnings)
    required(!!process.env.PUSHER_SECRET, "PUSHER_SECRET is required when realtime messaging is enabled", errors, warnings)
    required(!!process.env.PUSHER_CLUSTER, "PUSHER_CLUSTER is required when realtime messaging is enabled", errors, warnings)
    required(!!process.env.NEXT_PUBLIC_PUSHER_KEY, "NEXT_PUBLIC_PUSHER_KEY is required when realtime messaging is enabled", errors, warnings)
    required(!!process.env.NEXT_PUBLIC_PUSHER_CLUSTER, "NEXT_PUBLIC_PUSHER_CLUSTER is required when realtime messaging is enabled", errors, warnings)
  }

  if (enabledProviders.includes("paypal") || activeProvider === "paypal") {
    required(!!process.env.PAYPAL_CLIENT_ID, "PAYPAL_CLIENT_ID is required when PayPal is enabled", errors, warnings)
    required(!!process.env.PAYPAL_CLIENT_SECRET, "PAYPAL_CLIENT_SECRET is required when PayPal is enabled", errors, warnings)
    required(!!process.env.PAYPAL_WEBHOOK_ID, "PAYPAL_WEBHOOK_ID is required when PayPal is enabled", errors, warnings)
  }

  if (enabledProviders.includes("paymongo")) {
    required(!!process.env.PAYMONGO_SECRET_KEY, "WARN: PAYMONGO_SECRET_KEY missing while paymongo is enabled", errors, warnings)
  }

  if (appUrl) {
    console.log("\nChecking runtime endpoints...")

    const health = await callJson(`${appUrl.replace(/\/$/, "")}/api/health`, { method: "GET" })
    if (!health.ok) {
      errors.push(`/api/health returned HTTP ${health.status}`)
    } else {
      console.log(`- /api/health OK (${health.status})`)
    }

    const ops = await callJson(`${appUrl.replace(/\/$/, "")}/api/ops/health`, { method: "GET" })
    if (!ops.ok) {
      errors.push(`/api/ops/health returned HTTP ${ops.status}`)
    } else {
      console.log(`- /api/ops/health OK (${ops.status})`)
    }

    if (giveawayEnabled && process.env.GIVEAWAY_CRON_SECRET) {
      const tickDryRun = await callJson(`${appUrl.replace(/\/$/, "")}/api/giveaways/tick`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-giveaway-secret": process.env.GIVEAWAY_CRON_SECRET,
        },
        body: JSON.stringify({ dryRun: true }),
      })

      if (!tickDryRun.ok) {
        errors.push(`/api/giveaways/tick dryRun returned HTTP ${tickDryRun.status}`)
      } else {
        console.log(`- /api/giveaways/tick dryRun OK (${tickDryRun.status})`)
      }
    }

    if (emailEnabled && process.env.EMAIL_DIGEST_CRON_SECRET) {
      const digestDryRun = await callJson(`${appUrl.replace(/\/$/, "")}/api/notifications/digest`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-email-digest-secret": process.env.EMAIL_DIGEST_CRON_SECRET,
        },
        body: JSON.stringify({ dryRun: true }),
      })

      if (!digestDryRun.ok) {
        errors.push(`/api/notifications/digest dryRun returned HTTP ${digestDryRun.status}`)
      } else {
        console.log(`- /api/notifications/digest dryRun OK (${digestDryRun.status})`)
      }

      const inactivitySecret = process.env.EMAIL_INACTIVITY_CRON_SECRET || process.env.EMAIL_DIGEST_CRON_SECRET
      const inactivityDryRun = await callJson(`${appUrl.replace(/\/$/, "")}/api/notifications/inactivity-comeback`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-email-inactivity-secret": inactivitySecret,
        },
        body: JSON.stringify({ dryRun: true, minInactivityDays: 7, batchLimit: 50 }),
      })

      if (!inactivityDryRun.ok) {
        errors.push(`/api/notifications/inactivity-comeback dryRun returned HTTP ${inactivityDryRun.status}`)
      } else {
        console.log(`- /api/notifications/inactivity-comeback dryRun OK (${inactivityDryRun.status})`)
      }
    }
  } else {
    warnings.push("NEXT_PUBLIC_APP_URL or NEXTAUTH_URL not set; runtime endpoint checks were skipped")
  }

  console.log("\n=== Rollout Check Result ===")
  if (warnings.length > 0) {
    console.log("Warnings:")
    for (const warning of warnings) {
      console.log(`- ${warning}`)
    }
  }

  if (errors.length > 0) {
    console.log("Result: FAILED")
    for (const error of errors) {
      console.log(`- ${error}`)
    }
    process.exitCode = 1
    return
  }

  console.log("Result: PASSED")
}

main().catch((error) => {
  console.error("Rollout validation failed with exception:", error)
  process.exitCode = 1
})
