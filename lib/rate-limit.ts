interface RateLimitEntry {
  count: number
  resetTime: number
}

const rateLimitStore = new Map<string, RateLimitEntry>()
const upstashRestUrl = process.env.UPSTASH_REDIS_REST_URL
const upstashRestToken = process.env.UPSTASH_REDIS_REST_TOKEN

type UpstashValue = string | number

interface UpstashPipelineResponse {
  result: number | string | null
  error?: string
}

export interface RateLimitResult {
  allowed: boolean
  remaining: number
  resetTime: number
  retryAfterSeconds: number
}

interface RateLimitOptions {
  namespace?: string
}

// Clean up old entries every 5 minutes
setInterval(() => {
  const now = Date.now()
  for (const [key, entry] of rateLimitStore.entries()) {
    if (now > entry.resetTime) {
      rateLimitStore.delete(key)
    }
  }
}, 5 * 60 * 1000)

export async function checkRateLimit(
  identifier: string,
  maxRequests: number = 60,
  windowMs: number = 60 * 1000,
  options: RateLimitOptions = {}
): Promise<RateLimitResult> {
  const key = buildRateLimitKey(identifier, options.namespace)

  if (upstashRestUrl && upstashRestToken) {
    try {
      return await checkUpstashRateLimit(key, maxRequests, windowMs)
    } catch (error) {
      console.error("Upstash rate-limit failed, falling back to memory store:", error)
    }
  }

  return checkMemoryRateLimit(key, maxRequests, windowMs)
}

function checkMemoryRateLimit(
  key: string,
  maxRequests: number,
  windowMs: number
): RateLimitResult {
  const now = Date.now()
  const entry = rateLimitStore.get(key)

  if (!entry || now > entry.resetTime) {
    const newEntry: RateLimitEntry = {
      count: 1,
      resetTime: now + windowMs,
    }
    rateLimitStore.set(key, newEntry)
    return {
      allowed: true,
      remaining: maxRequests - 1,
      resetTime: newEntry.resetTime,
      retryAfterSeconds: Math.max(1, Math.ceil(windowMs / 1000)),
    }
  }

  entry.count++
  rateLimitStore.set(key, entry)

  const ttlMs = Math.max(0, entry.resetTime - now)

  if (entry.count > maxRequests) {
    return {
      allowed: false,
      remaining: 0,
      resetTime: entry.resetTime,
      retryAfterSeconds: Math.max(1, Math.ceil(ttlMs / 1000)),
    }
  }

  return {
    allowed: true,
    remaining: maxRequests - entry.count,
    resetTime: entry.resetTime,
    retryAfterSeconds: Math.max(1, Math.ceil(ttlMs / 1000)),
  }
}

async function checkUpstashRateLimit(
  key: string,
  maxRequests: number,
  windowMs: number
): Promise<RateLimitResult> {
  const now = Date.now()
  const [incrResponse, ttlResponse] = await runUpstashPipeline([
    ["INCR", key],
    ["PTTL", key],
  ])

  if (incrResponse.error || ttlResponse.error) {
    throw new Error(incrResponse.error || ttlResponse.error || "Unknown Upstash pipeline error")
  }

  const count = Number(incrResponse.result || 0)
  let ttlMs = Number(ttlResponse.result || -1)

  if (count === 1 || ttlMs < 0) {
    const [expireResponse] = await runUpstashPipeline([["PEXPIRE", key, windowMs]])
    if (expireResponse.error) {
      throw new Error(expireResponse.error)
    }
    ttlMs = windowMs
  }

  const safeTtlMs = Math.max(0, ttlMs)

  return {
    allowed: count <= maxRequests,
    remaining: Math.max(0, maxRequests - count),
    resetTime: now + safeTtlMs,
    retryAfterSeconds: Math.max(1, Math.ceil(safeTtlMs / 1000)),
  }
}

async function runUpstashPipeline(commands: UpstashValue[][]): Promise<UpstashPipelineResponse[]> {
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

function buildRateLimitKey(identifier: string, namespace?: string): string {
  const safeIdentifier = (identifier || "unknown").trim().toLowerCase()
  const safeNamespace = (namespace || "global").trim().toLowerCase()
  return `rate-limit:${safeNamespace}:${safeIdentifier}`
}

export function getRateLimitIdentifier(params: {
  headers?: Pick<Headers, "get"> | null
  userId?: string | null
  email?: string | null
  fallback?: string
}): string {
  if (params.userId) {
    return `user:${params.userId}`
  }

  if (params.email) {
    return `email:${params.email.trim().toLowerCase()}`
  }

  const ip = getClientIp(params.headers)
  if (ip !== "unknown") {
    return `ip:${ip}`
  }

  return params.fallback || "anonymous"
}

export function getClientIp(headers: Pick<Headers, "get"> | null | undefined): string {
  if (!headers || typeof headers.get !== "function") {
    return "unknown"
  }

  const forwarded = headers.get("x-forwarded-for") || headers.get("x-vercel-forwarded-for")
  if (forwarded) {
    return forwarded.split(",")[0].trim()
  }

  const realIp = headers.get("x-real-ip") || headers.get("cf-connecting-ip")
  if (realIp) {
    return realIp
  }

  return "unknown"
}
