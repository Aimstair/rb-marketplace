"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/lib/auth-context"
import { useRouter } from "next/navigation"
import { Card } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Bell, MessageCircle, ShoppingBag, AlertCircle, CheckCircle, Loader2, Trash2 } from "lucide-react"
import { getNotifications, markAsRead, markAllAsRead } from "@/app/actions/notifications"
import type { NotificationData } from "@/app/actions/notifications"
import { ListPageSkeleton } from "@/components/site/skeletons"

export default function NotificationsPage() {
  const { user } = useAuth()
  const router = useRouter()
  const [notifications, setNotifications] = useState<NotificationData[]>([])
  const [filter, setFilter] = useState<"all" | "unread">("all")
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState<string | null>(null)

  useEffect(() => {
    if (!user) {
      router.push("/auth/login")
      return
    }

    fetchNotifications()
  }, [user, router])

  const fetchNotifications = async () => {
    setLoading(true)
    const result = await getNotifications()
    if (result.success && result.notifications) {
      setNotifications(result.notifications)
    }
    setLoading(false)
  }

  // Session still loading (or redirecting to login): keep the page shape instead of a blank gap
  if (!user) return <ListPageSkeleton />

  const filteredNotifications = notifications.filter((n) => (filter === "all" ? true : !n.isRead))
  const unreadCount = notifications.filter((n) => !n.isRead).length

  const handleMarkAsRead = async (notificationId: string, link?: string) => {
    setDeleting(notificationId)
    const result = await markAsRead(notificationId)
    if (result.success) {
      setNotifications((prev) => prev.map((n) => (n.id === notificationId ? { ...n, isRead: true } : n)))
      if (link) {
        router.push(link)
      }
    }
    setDeleting(null)
  }

  const handleMarkAllAsRead = async () => {
    const result = await markAllAsRead()
    if (result.success) {
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })))
    }
  }

  const handleDeleteNotification = async (e: React.MouseEvent, notificationId: string) => {
    e.stopPropagation()
    setDeleting(notificationId)
    // Mark as read to remove from unread
    const result = await markAsRead(notificationId)
    if (result.success) {
      setNotifications((prev) => prev.filter((n) => n.id !== notificationId))
    }
    setDeleting(null)
  }

  const getIcon = (type: string) => {
    switch (type) {
      case "MESSAGE":
        return <MessageCircle className="w-5 h-5 text-link" />
      case "ORDER_NEW":
        return <ShoppingBag className="w-5 h-5 text-link" />
      case "ORDER_UPDATE":
        return <CheckCircle className="w-5 h-5 text-success" />
      case "SYSTEM":
        return <AlertCircle className="w-5 h-5 text-warning" />
      default:
        return <Bell className="w-5 h-5" />
    }
  }

  const formatTime = (date: Date) => {
    const now = new Date()
    const seconds = Math.floor((now.getTime() - new Date(date).getTime()) / 1000)

    if (seconds < 60) return "just now"
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
    if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`
    return new Date(date).toLocaleDateString()
  }

  return (
    <>
      <main className="mx-auto w-full max-w-[1440px] px-5 md:px-8 lg:px-10 pt-10 pb-16 md:pt-14 md:pb-20">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-title">Notifications</h1>
            <p className="mt-2 text-[17px] text-muted-foreground">
              {unreadCount > 0
                ? `You have ${unreadCount} unread notification${unreadCount !== 1 ? "s" : ""}`
                : "You're all caught up!"}
            </p>
          </div>
          {unreadCount > 0 && (
            <Button variant="outline" onClick={handleMarkAllAsRead}>
              Mark all as read
            </Button>
          )}
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-2 mb-6">
          <Button variant={filter === "all" ? "default" : "outline"} size="sm" onClick={() => setFilter("all")}>
            All
          </Button>
          <Button variant={filter === "unread" ? "default" : "outline"} size="sm" onClick={() => setFilter("unread")}>
            Unread
            {unreadCount > 0 && (
              <Badge variant="secondary" className="ml-2">
                {unreadCount}
              </Badge>
            )}
          </Button>
        </div>

        {/* Notifications List */}
        <div className="space-y-3">
          {loading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-start gap-4 rounded-[20px] bg-card p-4" aria-hidden="true">
                <Skeleton className="size-10 shrink-0 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-1/2" />
                  <Skeleton className="h-3 w-4/5" />
                  <Skeleton className="h-3 w-24" />
                </div>
              </div>
            ))
          ) : filteredNotifications.length > 0 ? (
            filteredNotifications.map((notification) => (
              <Card
                key={notification.id}
                className={`p-4 transition cursor-pointer ${
                  !notification.isRead ? "border-l-4 border-l-primary bg-link/[0.06]" : ""
                }`}
                onClick={() => handleMarkAsRead(notification.id, notification.link)}
              >
                <div className="flex items-start gap-4">
                  <div className="p-2 rounded-full bg-muted">{getIcon(notification.type)}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold">{notification.title}</h3>
                      {!notification.isRead && <span className="w-2 h-2 bg-primary rounded-full" />}
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-1">{notification.message}</p>
                    <p className="text-xs text-muted-foreground mt-1">{formatTime(notification.createdAt)}</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="shrink-0"
                    disabled={deleting === notification.id}
                    onClick={(e) => handleDeleteNotification(e, notification.id)}
                  >
                    {deleting === notification.id ? (
                      <Loader2 className="w-4 h-4 text-muted-foreground animate-spin" />
                    ) : (
                      <Trash2 className="w-4 h-4 text-muted-foreground" />
                    )}
                  </Button>
                </div>
              </Card>
            ))
          ) : (
            <Card className="p-12 text-center">
              <Bell className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-lg font-medium">No notifications</p>
              <p className="text-sm text-muted-foreground">
                {filter === "unread" ? "You've read all your notifications!" : "You don't have any notifications yet."}
              </p>
            </Card>
          )}
        </div>
      </main>
    </>
  )
}
