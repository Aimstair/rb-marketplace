"use client"

import { useState } from "react"
import Navigation from "@/components/navigation"
import { useAuth } from "@/lib/auth-context"
import { useRouter } from "next/navigation"
import { useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Bell, MessageCircle, ThumbsUp, Eye, Star, Check, Trash2 } from "lucide-react"

interface Notification {
  id: string
  type: "message" | "vouch" | "view" | "upvote" | "transaction"
  title: string
  description: string
  time: string
  read: boolean
  link?: string
}

const mockNotifications: Notification[] = [
  {
    id: "1",
    type: "message",
    title: "New message from TrustTrader",
    description: "Hey, I'm interested in your listing...",
    time: "5 minutes ago",
    read: false,
    link: "/messages",
  },
  {
    id: "2",
    type: "vouch",
    title: "You received a vouch!",
    description: "CoinMaster left you a positive vouch after your recent transaction.",
    time: "1 hour ago",
    read: false,
  },
  {
    id: "3",
    type: "upvote",
    title: "Your listing got 10 upvotes",
    description: "Golden Dragon Pet is getting popular!",
    time: "3 hours ago",
    read: true,
    link: "/listing/1",
  },
  {
    id: "4",
    type: "view",
    title: "50 new views on your listing",
    description: "Dominus Astrorum has been viewed 50 times today.",
    time: "5 hours ago",
    read: true,
  },
  {
    id: "5",
    type: "transaction",
    title: "Transaction completed",
    description: "Your trade with FastDelivery has been marked as complete.",
    time: "1 day ago",
    read: true,
  },
]

export default function NotificationsPage() {
  const { user } = useAuth()
  const router = useRouter()
  const [notifications, setNotifications] = useState(mockNotifications)
  const [filter, setFilter] = useState<"all" | "unread">("all")

  useEffect(() => {
    if (!user) {
      router.push("/auth/login")
    }
  }, [user, router])

  if (!user) return null

  const filteredNotifications = notifications.filter((n) => (filter === "all" ? true : !n.read))

  const unreadCount = notifications.filter((n) => !n.read).length

  const markAsRead = (id: string) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)))
  }

  const markAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
  }

  const deleteNotification = (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id))
  }

  const getIcon = (type: Notification["type"]) => {
    switch (type) {
      case "message":
        return <MessageCircle className="w-5 h-5 text-blue-500" />
      case "vouch":
        return <Star className="w-5 h-5 text-yellow-500" />
      case "upvote":
        return <ThumbsUp className="w-5 h-5 text-green-500" />
      case "view":
        return <Eye className="w-5 h-5 text-purple-500" />
      case "transaction":
        return <Check className="w-5 h-5 text-emerald-500" />
      default:
        return <Bell className="w-5 h-5" />
    }
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
            <Button variant="outline" onClick={markAllAsRead}>
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
          {filteredNotifications.length > 0 ? (
            filteredNotifications.map((notification) => (
              <Card
                key={notification.id}
                className={`p-4 transition cursor-pointer hover:shadow-md ${
                  !notification.read ? "border-l-4 border-l-primary bg-primary/5" : ""
                }`}
                onClick={() => {
                  markAsRead(notification.id)
                  if (notification.link) {
                    router.push(notification.link)
                  }
                }}
              >
                <div className="flex items-start gap-4">
                  <div className="p-2 rounded-full bg-muted">{getIcon(notification.type)}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold">{notification.title}</h3>
                      {!notification.read && <span className="w-2 h-2 bg-primary rounded-full" />}
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-1">{notification.description}</p>
                    <p className="text-xs text-muted-foreground mt-1">{notification.time}</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="shrink-0"
                    onClick={(e) => {
                      e.stopPropagation()
                      deleteNotification(notification.id)
                    }}
                  >
                    <Trash2 className="w-4 h-4 text-muted-foreground" />
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
