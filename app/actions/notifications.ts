"use server"

import { prisma } from "@/lib/prisma"
import { auth } from "@/auth"
import { headers } from "next/headers"
import { checkRateLimit, getRateLimitIdentifier } from "@/lib/rate-limit"
import { isRealtimeMessagingFeatureEnabled } from "@/lib/feature-flags"
import { buildPrivateNotificationsChannel } from "@/lib/pusher-channels"

const ONE_MINUTE_MS = 60 * 1000
const ONE_HOUR_MS = 60 * ONE_MINUTE_MS

const NOTIFICATION_RATE_LIMITS = {
  read: { maxRequests: 120, windowMs: ONE_MINUTE_MS },
  markAsRead: { maxRequests: 120, windowMs: ONE_HOUR_MS },
  markAllAsRead: { maxRequests: 20, windowMs: ONE_HOUR_MS },
} as const

async function enforceNotificationRateLimit(params: {
  namespace: string
  maxRequests: number
  windowMs: number
  userId?: string | null
  email?: string | null
  message: string
}): Promise<{ success: true } | { success: false; error: string }> {
  const requestHeaders = await headers()
  const rate = await checkRateLimit(
    getRateLimitIdentifier({
      headers: requestHeaders,
      userId: params.userId,
      email: params.email,
    }),
    params.maxRequests,
    params.windowMs,
    { namespace: params.namespace }
  )

  if (rate.allowed) {
    return { success: true }
  }

  return {
    success: false,
    error: `${params.message} Please try again in ${rate.retryAfterSeconds} seconds.`,
  }
}

async function emitNotificationRealtimeUpdate(
  userId: string,
  payload: Record<string, unknown>
): Promise<void> {
  if (!isRealtimeMessagingFeatureEnabled()) {
    return
  }

  try {
    const unreadCount = await prisma.notification.count({
      where: {
        userId,
        isRead: false,
      },
    })

    const { pusherServer } = await import("@/lib/pusher")
    await pusherServer.trigger(
      buildPrivateNotificationsChannel(userId),
      "notification-updated",
      {
        unreadCount,
        ...payload,
      }
    )
  } catch (error) {
    console.error("Failed to emit notification realtime update:", error)
  }
}

export interface NotificationData {
  id: string
  userId: string
  type: "MESSAGE" | "ORDER_NEW" | "ORDER_UPDATE" | "SYSTEM"
  title: string
  message: string
  link?: string
  isRead: boolean
  createdAt: Date
}

export interface GetNotificationsResult {
  success: boolean
  notifications?: NotificationData[]
  error?: string
}

export interface MarkAsReadResult {
  success: boolean
  error?: string
}

export interface GetUnreadCountResult {
  success: boolean
  count?: number
  error?: string
}

/**
 * Create a notification for a user
 * Used internally by other server actions to notify users
 * Intentionally doesn't fail the original operation if notification creation fails
 */
export async function createNotification(
  userId: string,
  type: "MESSAGE" | "ORDER_NEW" | "ORDER_UPDATE" | "SYSTEM",
  title: string,
  message: string,
  link?: string
): Promise<{ success: boolean; notificationId?: string; error?: string }> {
  try {
    // Verify user exists
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        preferences: {
          select: {
            notifyNewMessages: true,
            notifyTradeUpdates: true,
          },
        },
      },
    })

    if (!user) {
      console.error(`User ${userId} not found for notification creation`)
      return { success: false, error: "User not found" }
    }

    if (type === "MESSAGE" && user.preferences && !user.preferences.notifyNewMessages) {
      return { success: true }
    }

    if (
      (type === "ORDER_NEW" || type === "ORDER_UPDATE") &&
      user.preferences &&
      !user.preferences.notifyTradeUpdates
    ) {
      return { success: true }
    }

    const notification = await (prisma.notification as any).create({
      data: {
        userId,
        type,
        title,
        message,
        link,
      },
    })

    await emitNotificationRealtimeUpdate(userId, {
      action: "created",
      notification: {
        id: notification.id,
        type: notification.type,
        title: notification.title,
        message: notification.message,
        link: notification.link,
        isRead: notification.isRead,
        createdAt: notification.createdAt,
      },
    })

    return {
      success: true,
      notificationId: notification.id,
    }
  } catch (error) {
    console.error("Error creating notification:", error)
    return { success: false, error: "Failed to create notification" }
  }
}

/**
 * Get all notifications for the current user
 */
export async function getNotifications(): Promise<GetNotificationsResult> {
  try {
    // Get the current authenticated user
    const session = await auth()
    if (!session?.user?.email) {
      return {
        success: false,
        error: "You must be logged in to view notifications",
      }
    }

    // Find the current user by email from session
    const currentUser = await prisma.user.findUnique({
      where: { email: session.user.email },
    })

    if (!currentUser) {
      return {
        success: false,
        error: "User not found",
      }
    }

    const notificationsReadRate = await enforceNotificationRateLimit({
      namespace: "notifications-read",
      maxRequests: NOTIFICATION_RATE_LIMITS.read.maxRequests,
      windowMs: NOTIFICATION_RATE_LIMITS.read.windowMs,
      userId: currentUser.id,
      email: session.user.email,
      message: "Too many notification requests.",
    })

    if (!notificationsReadRate.success) {
      return {
        success: false,
        error: notificationsReadRate.error,
      }
    }

    const notifications = await (prisma.notification as any).findMany({
      where: { userId: currentUser.id },
      orderBy: { createdAt: "desc" },
    })

    // Transform to response format
    const transformedNotifications: NotificationData[] = notifications.map((notif: any) => ({
      id: notif.id,
      userId: notif.userId,
      type: notif.type,
      title: notif.title,
      message: notif.message,
      link: notif.link,
      isRead: notif.isRead,
      createdAt: notif.createdAt,
    }))

    return {
      success: true,
      notifications: transformedNotifications,
    }
  } catch (error) {
    console.error("Error fetching notifications:", error)
    return {
      success: false,
      error: "Failed to fetch notifications",
    }
  }
}

/**
 * Mark a specific notification as read
 */
export async function markAsRead(notificationId: string): Promise<MarkAsReadResult> {
  try {
    if (!notificationId) {
      return {
        success: false,
        error: "Notification ID is required",
      }
    }

    // Get the current authenticated user
    const session = await auth()
    if (!session?.user?.email) {
      return {
        success: false,
        error: "You must be logged in",
      }
    }

    const currentUser = await prisma.user.findUnique({
      where: { email: session.user.email },
    })

    if (!currentUser) {
      return {
        success: false,
        error: "User not found",
      }
    }

    const markAsReadRate = await enforceNotificationRateLimit({
      namespace: "notifications-mark-read",
      maxRequests: NOTIFICATION_RATE_LIMITS.markAsRead.maxRequests,
      windowMs: NOTIFICATION_RATE_LIMITS.markAsRead.windowMs,
      userId: currentUser.id,
      email: session.user.email,
      message: "You are marking notifications too quickly.",
    })

    if (!markAsReadRate.success) {
      return {
        success: false,
        error: markAsReadRate.error,
      }
    }

    // Verify notification belongs to current user
    const notification = await (prisma.notification as any).findUnique({
      where: { id: notificationId },
    })

    if (!notification) {
      return {
        success: false,
        error: "Notification not found",
      }
    }

    if (notification.userId !== currentUser.id) {
      return {
        success: false,
        error: "You don't have access to this notification",
      }
    }

    // Mark as read
    await (prisma.notification as any).update({
      where: { id: notificationId },
      data: { isRead: true },
    })

    await emitNotificationRealtimeUpdate(currentUser.id, {
      action: "read",
      notificationId,
    })

    return { success: true }
  } catch (error) {
    console.error("Error marking notification as read:", error)
    return {
      success: false,
      error: "Failed to mark notification as read",
    }
  }
}

/**
 * Mark all notifications as read for the current user
 */
export async function markAllAsRead(): Promise<MarkAsReadResult> {
  try {
    // Get the current authenticated user
    const session = await auth()
    if (!session?.user?.email) {
      return {
        success: false,
        error: "You must be logged in",
      }
    }

    const currentUser = await prisma.user.findUnique({
      where: { email: session.user.email },
    })

    if (!currentUser) {
      return {
        success: false,
        error: "User not found",
      }
    }

    const markAllReadRate = await enforceNotificationRateLimit({
      namespace: "notifications-mark-all-read",
      maxRequests: NOTIFICATION_RATE_LIMITS.markAllAsRead.maxRequests,
      windowMs: NOTIFICATION_RATE_LIMITS.markAllAsRead.windowMs,
      userId: currentUser.id,
      email: session.user.email,
      message: "You are marking all notifications too quickly.",
    })

    if (!markAllReadRate.success) {
      return {
        success: false,
        error: markAllReadRate.error,
      }
    }

    // Mark all unread notifications as read
    await (prisma.notification as any).updateMany({
      where: {
        userId: currentUser.id,
        isRead: false,
      },
      data: { isRead: true },
    })

    await emitNotificationRealtimeUpdate(currentUser.id, {
      action: "read-all",
    })

    return { success: true }
  } catch (error) {
    console.error("Error marking all notifications as read:", error)
    return {
      success: false,
      error: "Failed to mark all notifications as read",
    }
  }
}

/**
 * Get the count of unread notifications for the current user
 */
export async function getUnreadCount(): Promise<GetUnreadCountResult> {
  try {
    // Get the current authenticated user
    const session = await auth()
    if (!session?.user?.email) {
      return {
        success: false,
        error: "You must be logged in",
      }
    }

    const currentUser = await prisma.user.findUnique({
      where: { email: session.user.email },
    })

    if (!currentUser) {
      return {
        success: false,
        error: "User not found",
      }
    }

    const unreadCountReadRate = await enforceNotificationRateLimit({
      namespace: "notifications-unread-count",
      maxRequests: NOTIFICATION_RATE_LIMITS.read.maxRequests,
      windowMs: NOTIFICATION_RATE_LIMITS.read.windowMs,
      userId: currentUser.id,
      email: session.user.email,
      message: "Too many unread count requests.",
    })

    if (!unreadCountReadRate.success) {
      return {
        success: false,
        error: unreadCountReadRate.error,
      }
    }

    const count = await (prisma.notification as any).count({
      where: {
        userId: currentUser.id,
        isRead: false,
      },
    })

    return {
      success: true,
      count,
    }
  } catch (error) {
    console.error("Error fetching unread count:", error)
    return {
      success: false,
      error: "Failed to fetch unread count",
    }
  }
}
