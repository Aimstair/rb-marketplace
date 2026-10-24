import {
  incrementWindowCounter,
  isExpiringKeyStoreAvailable,
  reportExpiringKeyStoreFailure,
} from "@/lib/expiring-keys"

interface RateLimitEntry {
  count: number
  resetTime: number
}

const rateLimitStore = new Map<string, RateLimitEntry>()

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

  // Shared counter in Postgres so limits hold across all server instances;
  // the in-memory store is only a fallback when the database is unavailable.
  if (isExpiringKeyStoreAvailable()) {
    try {
      return await checkDatabaseRateLimit(key, maxRequests, windowMs)
    } catch (error) {
      reportExpiringKeyStoreFailure("Rate limit", error)
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

async function checkDatabaseRateLimit(
  key: string,
  maxRequests: number,
  windowMs: number
): Promise<RateLimitResult> {
  const { count, expiresAt } = await incrementWindowCounter(key, windowMs)
  const ttlMs = Math.max(0, expiresAt.getTime() - Date.now())

  return {
    allowed: count <= maxRequests,
    remaining: Math.max(0, maxRequests - count),
    resetTime: expiresAt.getTime(),
    retryAfterSeconds: Math.max(1, Math.ceil(ttlMs / 1000)),
  }
}

function buildRateLimitKey(identifier: string, namespace?: string): string {
  const safeIdentifier = (identifier || "unknown").trim().toLowerCase()
  const safeNamespace = (namespace || "global").trim().toLowerCase()
  return `rate-limit:${safeNamespace}:${safeIdentifier}`
}

/**
 * True when the current request is a server action invoked from the browser (Next.js sends
 * a "next-action" header), as opposed to a server component render calling the same code.
 * Read-only rate limits only need to apply to the former: that's the path scrapers can hit
 * directly, while page renders are already bounded by page requests.
 */
export function isClientActionRequest(headers: Pick<Headers, "get"> | null | undefined): boolean {
  return Boolean(headers?.get("next-action"))
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
