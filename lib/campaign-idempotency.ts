import {
  deleteKey,
  isExpiringKeyStoreAvailable,
  reportExpiringKeyStoreFailure,
  setIfAbsent,
  setValue,
} from "@/lib/expiring-keys"

type CampaignDispatchState = "sent" | "in_flight"

interface MemoryCampaignEntry {
  state: CampaignDispatchState
  expiresAt: number
}

const campaignDispatchStore = new Map<string, MemoryCampaignEntry>()

function namespacedKey(key: string): string {
  return `campaign-idempotency:${key.trim()}`
}

function pruneExpiredMemoryEntries() {
  const now = Date.now()
  for (const [key, entry] of campaignDispatchStore.entries()) {
    if (entry.expiresAt <= now) {
      campaignDispatchStore.delete(key)
    }
  }
}

function toPositiveMs(value: number): number {
  return Math.max(60_000, Math.floor(value))
}

function tryAcquireMemory(key: string, ttlMs: number): boolean {
  const now = Date.now()
  pruneExpiredMemoryEntries()

  const entry = campaignDispatchStore.get(key)
  if (entry && entry.expiresAt > now) {
    return false
  }

  campaignDispatchStore.set(key, {
    state: "in_flight",
    expiresAt: now + ttlMs,
  })
  return true
}

function markMemoryDelivered(key: string, ttlMs: number) {
  campaignDispatchStore.set(key, {
    state: "sent",
    expiresAt: Date.now() + ttlMs,
  })
}

function clearMemory(key: string) {
  campaignDispatchStore.delete(key)
}

// Guards live in Postgres (expiring_keys) so every server instance sees them;
// the in-memory store is only a fallback when the database is unavailable.

export async function tryAcquireCampaignDispatchGuard(key: string, ttlMs: number): Promise<boolean> {
  const safeTtlMs = toPositiveMs(ttlMs)
  const durableKey = namespacedKey(key)

  if (!isExpiringKeyStoreAvailable()) {
    return tryAcquireMemory(durableKey, safeTtlMs)
  }

  try {
    return await setIfAbsent(durableKey, "in_flight", safeTtlMs)
  } catch (error) {
    reportExpiringKeyStoreFailure("Campaign dedupe", error)
    return tryAcquireMemory(durableKey, safeTtlMs)
  }
}

export async function markCampaignDispatchDelivered(key: string, ttlMs: number): Promise<void> {
  const safeTtlMs = toPositiveMs(ttlMs)
  const durableKey = namespacedKey(key)

  if (!isExpiringKeyStoreAvailable()) {
    markMemoryDelivered(durableKey, safeTtlMs)
    return
  }

  try {
    await setValue(durableKey, "sent", safeTtlMs)
  } catch (error) {
    reportExpiringKeyStoreFailure("Campaign dedupe", error)
    markMemoryDelivered(durableKey, safeTtlMs)
  }
}

export async function clearCampaignDispatchGuard(key: string): Promise<void> {
  const durableKey = namespacedKey(key)
  // Always clear the memory copy too, in case it was written during a database outage
  clearMemory(durableKey)

  if (!isExpiringKeyStoreAvailable()) {
    return
  }

  try {
    await deleteKey(durableKey)
  } catch (error) {
    reportExpiringKeyStoreFailure("Campaign dedupe", error)
  }
}
