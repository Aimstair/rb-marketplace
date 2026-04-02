type WebhookStatus = "received" | "processed" | "failed"

interface TrackedWebhookEvent {
  id: string
  provider: string
  eventId: string
  eventType: string
  status: WebhookStatus
  attempts: number
  receivedAt: string
  updatedAt: string
  error?: string
}

const webhookEvents = new Map<string, TrackedWebhookEvent>()
const TTL_MS = 48 * 60 * 60 * 1000

function nowIso(): string {
  return new Date().toISOString()
}

function keyFor(provider: string, eventId: string): string {
  return `${provider}:${eventId}`
}

function trimExpiredEvents() {
  const now = Date.now()
  for (const [key, event] of webhookEvents.entries()) {
    const updatedAt = Date.parse(event.updatedAt)
    if (Number.isNaN(updatedAt)) {
      webhookEvents.delete(key)
      continue
    }

    if (now - updatedAt > TTL_MS) {
      webhookEvents.delete(key)
    }
  }
}

setInterval(trimExpiredEvents, 60 * 60 * 1000).unref?.()

export function resolveWebhookEventId(provider: string, payload: any, fallback?: string | null): string {
  const directId = typeof payload?.id === "string" ? payload.id : null
  const nestedId = typeof payload?.data?.id === "string" ? payload.data.id : null
  const resourceId = typeof payload?.resource?.id === "string" ? payload.resource.id : null

  const selected = fallback || directId || nestedId || resourceId
  if (selected) {
    return selected
  }

  return `${provider}-${Date.now()}`
}

export async function touchWebhookEvent(input: {
  provider: string
  eventId: string
  eventType: string
  payload?: unknown
}): Promise<TrackedWebhookEvent> {
  const mapKey = keyFor(input.provider, input.eventId)
  const existing = webhookEvents.get(mapKey)

  if (existing) {
    const next: TrackedWebhookEvent = {
      ...existing,
      status: "received",
      attempts: existing.attempts + 1,
      updatedAt: nowIso(),
      error: undefined,
    }
    webhookEvents.set(mapKey, next)
    return next
  }

  const record: TrackedWebhookEvent = {
    id: mapKey,
    provider: input.provider,
    eventId: input.eventId,
    eventType: input.eventType,
    status: "received",
    attempts: 1,
    receivedAt: nowIso(),
    updatedAt: nowIso(),
  }

  webhookEvents.set(mapKey, record)
  return record
}

export async function markWebhookEventProcessed(id: string): Promise<void> {
  const existing = webhookEvents.get(id)
  if (!existing) {
    return
  }

  webhookEvents.set(id, {
    ...existing,
    status: "processed",
    updatedAt: nowIso(),
    error: undefined,
  })
}

export async function markWebhookEventFailed(id: string, error: unknown): Promise<void> {
  const existing = webhookEvents.get(id)
  if (!existing) {
    return
  }

  const message = error instanceof Error ? error.message : String(error)
  webhookEvents.set(id, {
    ...existing,
    status: "failed",
    updatedAt: nowIso(),
    error: message,
  })
}
