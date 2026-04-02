type CampaignDispatchState = "sent" | "in_flight"

interface MemoryCampaignEntry {
  state: CampaignDispatchState
  expiresAt: number
}

interface UpstashPipelineResponse {
  result: number | string | null
  error?: string
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

function hasUpstashConfig(): boolean {
  return Boolean(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN)
}

async function runUpstashPipeline(commands: Array<Array<string | number>>): Promise<UpstashPipelineResponse[]> {
  const upstashRestUrl = process.env.UPSTASH_REDIS_REST_URL
  const upstashRestToken = process.env.UPSTASH_REDIS_REST_TOKEN
  if (!upstashRestUrl || !upstashRestToken) {
    throw new Error("Upstash Redis configuration is missing")
  }

  const response = await fetch(`${upstashRestUrl}/pipeline`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${upstashRestToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(commands),
    cache: "no-store",
  })

  if (!response.ok) {
    throw new Error(`Upstash request failed with status ${response.status}`)
  }

  return (await response.json()) as UpstashPipelineResponse[]
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

export async function tryAcquireCampaignDispatchGuard(key: string, ttlMs: number): Promise<boolean> {
  const safeTtlMs = toPositiveMs(ttlMs)
  const durableKey = namespacedKey(key)

  if (!hasUpstashConfig()) {
    return tryAcquireMemory(durableKey, safeTtlMs)
  }

  try {
    const [setResponse] = await runUpstashPipeline([
      ["SET", durableKey, "in_flight", "PX", safeTtlMs, "NX"],
    ])

    if (setResponse?.error) {
      throw new Error(setResponse.error)
    }

    return setResponse?.result === "OK"
  } catch (error) {
    console.error("Campaign dedupe Redis acquire failed, falling back to memory store:", error)
    return tryAcquireMemory(durableKey, safeTtlMs)
  }
}

export async function markCampaignDispatchDelivered(key: string, ttlMs: number): Promise<void> {
  const safeTtlMs = toPositiveMs(ttlMs)
  const durableKey = namespacedKey(key)

  if (!hasUpstashConfig()) {
    markMemoryDelivered(durableKey, safeTtlMs)
    return
  }

  try {
    const [setResponse] = await runUpstashPipeline([["SET", durableKey, "sent", "PX", safeTtlMs]])
    if (setResponse?.error) {
      throw new Error(setResponse.error)
    }
  } catch (error) {
    console.error("Campaign dedupe Redis mark-delivered failed, falling back to memory store:", error)
    markMemoryDelivered(durableKey, safeTtlMs)
  }
}

export async function clearCampaignDispatchGuard(key: string): Promise<void> {
  const durableKey = namespacedKey(key)

  if (!hasUpstashConfig()) {
    clearMemory(durableKey)
    return
  }

  try {
    const [deleteResponse] = await runUpstashPipeline([["DEL", durableKey]])
    if (deleteResponse?.error) {
      throw new Error(deleteResponse.error)
    }
  } catch (error) {
    console.error("Campaign dedupe Redis clear failed, falling back to memory store:", error)
    clearMemory(durableKey)
  }
}
