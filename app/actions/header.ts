"use server"

import { unstable_noStore } from "next/cache"
import { prisma } from "@/lib/prisma"
import { getSessionUser } from "@/lib/session-user"

/**
 * Unread notification and conversation counts for the site header, which loads on every
 * page for logged-in users. Uses the session id (no user lookup), runs both counts in
 * parallel, and skips rate limiting: two indexed COUNTs scoped to the caller are cheap.
 */
export async function getHeaderCounts(): Promise<{ notifications: number; messages: number } | null> {
  unstable_noStore()
  const user = await getSessionUser()
  if (!user) return null

  const [notifications, messages] = await Promise.all([
    prisma.notification.count({ where: { userId: user.id, isRead: false } }),
    prisma.conversation.count({
      where: {
        OR: [{ buyerId: user.id }, { sellerId: user.id }],
        messages: { some: { isRead: false, senderId: { not: user.id } } },
      },
    }),
  ])

  return { notifications, messages }
}
