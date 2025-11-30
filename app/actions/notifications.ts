"use server"

import { prisma } from "@/lib/prisma"
import { auth } from "@/auth"

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
      select: { id: true },
    })

    if (!user) {
      console.error(`User ${userId} not found for notification creation`)
      return { success: false, error: "User not found" }
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

    // Mark all unread notifications as read
    await (prisma.notification as any).updateMany({
      where: {
        userId: currentUser.id,
        isRead: false,
      },
      data: { isRead: true },
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
