"use client"

import { useState, useEffect } from "react"
import Navigation from "@/components/navigation"
import { useAuth } from "@/lib/auth-context"
import { useRouter } from "next/navigation"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Bell, MessageCircle, ShoppingBag, AlertCircle, CheckCircle, Loader2, Trash2 } from "lucide-react"
import { getNotifications, markAsRead, markAllAsRead } from "@/app/actions/notifications"
import type { NotificationData } from "@/app/actions/notifications"

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

  if (!user) return null

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
        return <MessageCircle className="w-5 h-5 text-blue-500" />
      case "ORDER_NEW":
        return <ShoppingBag className="w-5 h-5 text-purple-500" />
      case "ORDER_UPDATE":
        return <CheckCircle className="w-5 h-5 text-emerald-500" />
      case "SYSTEM":
        return <AlertCircle className="w-5 h-5 text-orange-500" />
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
      <Navigation />
      <main className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold">Notifications</h1>
            <p className="text-muted-foreground">
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
            <Card className="p-12 text-center">
              <Loader2 className="w-8 h-8 mx-auto text-muted-foreground mb-4 animate-spin" />
              <p className="text-sm text-muted-foreground">Loading notifications...</p>
            </Card>
          ) : filteredNotifications.length > 0 ? (
            filteredNotifications.map((notification) => (
              <Card
                key={notification.id}
                className={`p-4 transition cursor-pointer hover:shadow-md ${
                  !notification.isRead ? "border-l-4 border-l-primary bg-primary/5" : ""
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
