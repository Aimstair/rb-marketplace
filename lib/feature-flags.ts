function parseFlag(value: string | undefined, defaultValue: boolean): boolean {
  if (value === undefined) {
    return defaultValue
  }

  const normalized = value.trim().toLowerCase()
  if (["1", "true", "yes", "on", "enabled"].includes(normalized)) {
    return true
  }

  if (["0", "false", "no", "off", "disabled"].includes(normalized)) {
    return false
  }

  return defaultValue
}

export function isGiveawayFeatureEnabled(): boolean {
  return parseFlag(process.env.ENABLE_GIVEAWAY_FEATURE, true)
}

export function isEmailNotificationsFeatureEnabled(): boolean {
  return parseFlag(process.env.ENABLE_EMAIL_NOTIFICATIONS_FEATURE, true)
}

export function isPaymongoWebhookEnabled(): boolean {
  return parseFlag(process.env.ENABLE_PAYMONGO_WEBHOOK, true)
}

export function isRealtimeMessagingFeatureEnabled(): boolean {
  return parseFlag(
    process.env.NEXT_PUBLIC_ENABLE_REALTIME_MESSAGING_FEATURE ||
      process.env.ENABLE_REALTIME_MESSAGING_FEATURE,
    true
  )
}

export function getFeatureFlagSnapshot() {
  return {
    giveaway: isGiveawayFeatureEnabled(),
    emailNotifications: isEmailNotificationsFeatureEnabled(),
    paymongoWebhook: isPaymongoWebhookEnabled(),
    realtimeMessaging: isRealtimeMessagingFeatureEnabled(),
  }
}
