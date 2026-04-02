const DEFAULT_PAYPAL_SUBSCRIPTION_PENDING_TTL_MINUTES = 60

interface PaypalSubscriptionPaymentShape {
  provider: string
  type: string
  createdAt: Date | string
  metadata: unknown
}

function parsePositiveInteger(value: string | undefined, fallback: number): number {
  if (!value) {
    return fallback
  }

  const parsed = Number.parseInt(value, 10)
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback
  }

  return parsed
}

function asRecord(value: unknown): Record<string, unknown> {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>
  }

  return {}
}

function parseDate(value: unknown): Date | null {
  if (typeof value !== "string" || !value.trim()) {
    return null
  }

  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

export function getPaypalSubscriptionPendingTtlMinutes(): number {
  return parsePositiveInteger(
    process.env.PAYPAL_SUBSCRIPTION_PENDING_TTL_MINUTES,
    DEFAULT_PAYPAL_SUBSCRIPTION_PENDING_TTL_MINUTES
  )
}

export function computePendingPaypalSubscriptionExpiry(createdAt: Date | string): Date {
  const created = new Date(createdAt)
  const ttlMinutes = getPaypalSubscriptionPendingTtlMinutes()
  return new Date(created.getTime() + ttlMinutes * 60 * 1000)
}

export function resolvePendingPaypalSubscriptionExpiry(payment: PaypalSubscriptionPaymentShape): Date | null {
  if (payment.provider !== "paypal" || payment.type !== "subscription") {
    return null
  }

  const metadata = asRecord(payment.metadata)
  const metadataExpiry = parseDate(metadata.expiresAt)
  if (metadataExpiry) {
    return metadataExpiry
  }

  return computePendingPaypalSubscriptionExpiry(payment.createdAt)
}

export function annotatePaymentMetadataExpiry(
  existingMetadata: unknown,
  expiresAt: Date,
  extra?: Record<string, unknown>
): Record<string, unknown> {
  return {
    ...asRecord(existingMetadata),
    expiresAt: expiresAt.toISOString(),
    ...(extra || {}),
  }
}
