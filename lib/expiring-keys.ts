import { prisma } from "@/lib/prisma"

/**
 * Short-lived keys stored in Postgres (`expiring_keys`), shared by every server instance.
 * Used for rate limiting and campaign send guards in place of Redis.
 *
 * Every operation is a single atomic statement (one round trip). If the database is
 * unavailable, or the table has not been migrated yet, callers fall back to their
 * in-memory stores: `isExpiringKeyStoreAvailable()` turns false for a few minutes
 * after a failure so requests don't keep paying for a failing query.
 */

const FAILURE_BACKOFF_MS = 5 * 60 * 1000
const PRUNE_PROBABILITY = 0.01

let disabledUntil = 0

export function isExpiringKeyStoreAvailable(): boolean {
  return Date.now() >= disabledUntil
}

export function reportExpiringKeyStoreFailure(context: string, error: unknown) {
  disabledUntil = Date.now() + FAILURE_BACKOFF_MS
  const reason = error instanceof Error ? error.message.split("\n").filter(Boolean).pop() : String(error)
  console.warn(
    `${context}: Postgres key store unavailable (${reason}); using in-memory store for ${FAILURE_BACKOFF_MS / 60000} minutes.`,
  )
}

/** Occasionally delete expired rows. Best effort and never awaited by callers. */
function maybePrune(now: Date) {
  if (Math.random() >= PRUNE_PROBABILITY) return
  prisma.expiringKey.deleteMany({ where: { expiresAt: { lt: now } } }).catch(() => {})
}

/**
 * Increment a counter that resets when its window expires.
 * Returns the count after this hit and when the window ends.
 */
export async function incrementWindowCounter(
  key: string,
  windowMs: number,
): Promise<{ count: number; expiresAt: Date }> {
  const now = new Date()
  const windowEnd = new Date(now.getTime() + windowMs)

  const rows = await prisma.$queryRaw<{ count: number; expiresAt: Date }[]>`
    INSERT INTO "expiring_keys" ("key", "count", "expiresAt")
    VALUES (${key}, 1, ${windowEnd})
    ON CONFLICT ("key") DO UPDATE SET
      "count" = CASE WHEN "expiring_keys"."expiresAt" <= ${now} THEN 1 ELSE "expiring_keys"."count" + 1 END,
      "expiresAt" = CASE WHEN "expiring_keys"."expiresAt" <= ${now} THEN EXCLUDED."expiresAt" ELSE "expiring_keys"."expiresAt" END
    RETURNING "count", "expiresAt"
  `

  maybePrune(now)
  const row = rows[0]
  return { count: Number(row.count), expiresAt: new Date(row.expiresAt) }
}

/** Set `key` to `value` only if it is absent or expired (Redis `SET NX PX`). Returns true if set. */
export async function setIfAbsent(key: string, value: string, ttlMs: number): Promise<boolean> {
  const now = new Date()
  const expiresAt = new Date(now.getTime() + ttlMs)

  const rows = await prisma.$queryRaw<{ key: string }[]>`
    INSERT INTO "expiring_keys" ("key", "value", "expiresAt")
    VALUES (${key}, ${value}, ${expiresAt})
    ON CONFLICT ("key") DO UPDATE SET
      "value" = EXCLUDED."value",
      "expiresAt" = EXCLUDED."expiresAt",
      "count" = 0
    WHERE "expiring_keys"."expiresAt" <= ${now}
    RETURNING "key"
  `

  maybePrune(now)
  return rows.length > 0
}

/** Set `key` to `value` unconditionally with a new expiry (Redis `SET PX`). */
export async function setValue(key: string, value: string, ttlMs: number): Promise<void> {
  const expiresAt = new Date(Date.now() + ttlMs)
  await prisma.expiringKey.upsert({
    where: { key },
    create: { key, value, expiresAt },
    update: { value, expiresAt },
  })
}

export async function deleteKey(key: string): Promise<void> {
  await prisma.expiringKey.deleteMany({ where: { key } })
}
