import type { Prisma } from "@prisma/client"
import { prisma } from "@/lib/prisma"

/** The form new emails are stored in: trimmed and lowercase. */
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase()
}

/**
 * Finds a user by email regardless of letter case. Older accounts may have been stored with
 * capitals, and one pair of accounts differs only by case, so an exact match is tried first.
 */
export async function findUserByEmail(email: string) {
  const trimmed = email.trim()
  if (!trimmed) return null

  const exact = await prisma.user.findUnique({ where: { email: trimmed } })
  if (exact) return exact

  const where: Prisma.UserWhereInput = { email: { equals: trimmed, mode: "insensitive" } }
  return prisma.user.findFirst({ where, orderBy: { createdAt: "asc" } })
}
