"use client"

import Link from "next/link"
import {
  MessageCircle,
  User,
  Menu,
  X,
  LogOut,
  Settings,
  ShoppingBag,
  History,
  Gift,
  Bell,
  Shield,
  Search,
  Plus,
} from "lucide-react"
import { useState, useEffect } from "react"
import { usePathname, useRouter } from "next/navigation"
import { signOut, useSession } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu"
import { SiteSearch } from "@/components/site/site-search"
import { getNotifications, markAsRead, markAllAsRead } from "@/app/actions/notifications"
import type { NotificationData } from "@/app/actions/notifications"
import { getHeaderCounts } from "@/app/actions/header"
import { getPusherClient } from "@/lib/pusher-client"
import { isRealtimeMessagingFeatureEnabled } from "@/lib/feature-flags"
import { buildMessagingChannel, buildPrivateNotificationsChannel } from "@/lib/pusher-channels"
import { cn } from "@/lib/utils"

const NAV_LINKS = [
  { href: "/marketplace", label: "Items" },
  { href: "/currency", label: "Currency" },
  { href: "/games", label: "Games" },
  { href: "/trends", label: "Trends" },
  { href: "/hall-of-shame", label: "Hall of Shame" },
]

function CountDot({ count }: { count: number }) {
  if (count <= 0) return null
  return (
    <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 bg-destructive text-white text-[10px] leading-[18px] rounded-full text-center font-semibold tabular-nums">
      {count > 99 ? "99+" : count}
    </span>
  )
}

export function SiteHeader() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  const [unreadMessageCount, setUnreadMessageCount] = useState(0)
  const [notifications, setNotifications] = useState<NotificationData[]>([])
  const [loadingNotifications, setLoadingNotifications] = useState(false)
  const router = useRouter()
  const pathname = usePathname()
  const { data: session, status } = useSession()

  // Close the mobile menu on navigation
  useEffect(() => {
    setMobileMenuOpen(false)
  }, [pathname])

  // ⌘K / Ctrl+K opens search
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault()
        setSearchOpen((open) => !open)
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [])

  // Initial unread/message snapshot on authenticated load
  useEffect(() => {
    if (status !== "authenticated" || !session?.user?.id) return

    // One request for both badges instead of two sequential server actions
    getHeaderCounts()
      .then((counts) => {
        if (!counts) return
        setUnreadCount(counts.notifications)
        setUnreadMessageCount(counts.messages)
      })
      .catch((err) => console.error("Failed to fetch header counts:", err))
  }, [status, session?.user?.id])

  useEffect(() => {
    if (status !== "authenticated" || !session?.user?.id) return
    if (!isRealtimeMessagingFeatureEnabled()) return

    const pusher = getPusherClient()
    if (!pusher) return

    const notificationsChannelName = buildPrivateNotificationsChannel(session.user.id)
    const messagingChannelName = buildMessagingChannel(session.user.id)
    const notificationsChannel = pusher.subscribe(notificationsChannelName)
    const messagingChannel = pusher.subscribe(messagingChannelName)

    const onNotificationUpdated = (data: any) => {
      if (typeof data?.unreadCount === "number") {
        setUnreadCount(data.unreadCount)
      }

      if (data?.action === "created" && data?.notification) {
        const incoming = data.notification as NotificationData
        const normalized: NotificationData = {
          ...incoming,
          createdAt: new Date(incoming.createdAt),
        }

        setNotifications((prev) => {
          const filtered = prev.filter((item) => item.id !== normalized.id)
          return [normalized, ...filtered]
        })
      }
    }

    const onUnreadMessageCountUpdated = (data: any) => {
      if (typeof data?.unreadMessageCount === "number") {
        setUnreadMessageCount(data.unreadMessageCount)
      }
    }

    const onConversationUpdated = (data: any) => {
      if (typeof data?.unreadMessageCount === "number") {
        setUnreadMessageCount(data.unreadMessageCount)
      }
    }

    notificationsChannel.bind("notification-updated", onNotificationUpdated)
    messagingChannel.bind("unread-message-count-updated", onUnreadMessageCountUpdated)
    messagingChannel.bind("conversation-updated", onConversationUpdated)

    return () => {
      notificationsChannel.unbind("notification-updated", onNotificationUpdated)
      messagingChannel.unbind("unread-message-count-updated", onUnreadMessageCountUpdated)
      messagingChannel.unbind("conversation-updated", onConversationUpdated)
      pusher.unsubscribe(notificationsChannelName)
      pusher.unsubscribe(messagingChannelName)
    }
  }, [status, session?.user?.id])

  // Fetch notifications when dropdown is opened
  const fetchNotifications = async () => {
    setLoadingNotifications(true)
    try {
      const result = await getNotifications()
      if (result.success && result.notifications) {
        setNotifications(result.notifications)
        // Mark all as read when dropdown opens
        await markAllAsRead()
        setUnreadCount(0)
      }
    } catch (err) {
      console.error("Failed to fetch notifications:", err)
    } finally {
      setLoadingNotifications(false)
    }
  }

  const handleMarkAsRead = async (notificationId: string) => {
    try {
      const result = await markAsRead(notificationId)
      if (result.success) {
        setNotifications(notifications.map((n) => (n.id === notificationId ? { ...n, isRead: true } : n)))
        setUnreadCount(Math.max(0, unreadCount - 1))
      }
    } catch (err) {
      console.error("Failed to mark notification as read:", err)
    }
  }

  const handleNotificationClick = async (notification: NotificationData) => {
    await handleMarkAsRead(notification.id)
    if (notification.link) {
      router.push(notification.link)
    }
  }

  const handleLogout = async () => {
    await signOut({ redirect: true, callbackUrl: "/" })
  }

  const formatTimeAgo = (date: Date): string => {
    const now = new Date()
    const seconds = Math.floor((now.getTime() - new Date(date).getTime()) / 1000)

    if (seconds < 60) return "just now"
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
    if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`
    return new Date(date).toLocaleDateString()
  }

  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`)
  const isAdmin = session?.user?.role === "admin"

  return (
    <>
      <nav className="sticky top-0 z-50 border-b border-white/[0.08] bg-[#161617]/80 backdrop-blur-xl backdrop-saturate-[1.8]">
        <div className="mx-auto flex h-[52px] max-w-[1440px] items-center gap-8 px-5 md:px-8 lg:px-10">
          <Link href="/" className="text-[17px] font-semibold tracking-[-0.02em] text-foreground">
            RbMarket
          </Link>

          <div className="hidden md:flex items-center gap-7 text-[13px]">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "transition-colors hover:text-foreground",
                  isActive(link.href) ? "text-foreground" : "text-muted-foreground",
                )}
              >
                {link.label}
              </Link>
            ))}
            {isAdmin && (
              <Link
                href="/admin"
                className="text-muted-foreground transition-colors hover:text-foreground flex items-center gap-1"
              >
                <Shield className="size-3.5" strokeWidth={1.5} />
                Admin
              </Link>
            )}
          </div>

          <div className="ml-auto flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              aria-label="Search"
              onClick={() => setSearchOpen(true)}
              className="text-muted-foreground hover:text-foreground"
            >
              <Search className="size-[18px]" strokeWidth={1.5} />
            </Button>

            {status === "authenticated" && session?.user ? (
              <>
                <Button asChild size="sm" className="hidden md:inline-flex mx-1">
                  <Link href="/sell">
                    <Plus className="size-3.5" strokeWidth={2} />
                    Sell
                  </Link>
                </Button>

                <div className="hidden md:flex items-center gap-1">
                  <DropdownMenu onOpenChange={(open) => open && fetchNotifications()}>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label="Notifications"
                        className="relative text-muted-foreground hover:text-foreground"
                      >
                        <Bell className="size-[18px]" strokeWidth={1.5} />
                        <CountDot count={unreadCount} />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-80">
                      <div className="px-3 py-2">
                        <p className="text-sm font-semibold">Notifications</p>
                      </div>
                      <div className="max-h-[320px] overflow-y-auto">
                        {loadingNotifications ? (
                          Array.from({ length: 3 }).map((_, i) => (
                            <div key={i} className="px-3 py-3">
                              <Skeleton className="h-4 w-full mb-2" />
                              <Skeleton className="h-3 w-24" />
                            </div>
                          ))
                        ) : notifications.length > 0 ? (
                          notifications.slice(0, 5).map((notification) => (
                            <div
                              key={notification.id}
                              onClick={() => handleNotificationClick(notification)}
                              className="flex items-start gap-2.5 rounded-xl px-3 py-2.5 hover:bg-secondary cursor-pointer"
                            >
                              <span
                                className={cn(
                                  "mt-1.5 size-2 shrink-0 rounded-full",
                                  notification.isRead ? "bg-transparent" : "bg-link",
                                )}
                              />
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-sm truncate">{notification.title}</p>
                                <p className="text-xs text-muted-foreground truncate">{notification.message}</p>
                                <p className="text-xs text-muted-foreground mt-0.5">
                                  {formatTimeAgo(notification.createdAt)}
                                </p>
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="px-3 py-8 text-center text-muted-foreground text-sm">
                            You're all caught up.
                          </div>
                        )}
                      </div>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem asChild>
                        <Link href="/notifications" className="cursor-pointer justify-center text-link">
                          View all notifications
                        </Link>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>

                  <Button
                    asChild
                    variant="ghost"
                    size="icon"
                    className="relative text-muted-foreground hover:text-foreground"
                  >
                    <Link href="/messages" aria-label="Messages">
                      <MessageCircle className="size-[18px]" strokeWidth={1.5} />
                      <CountDot count={unreadMessageCount} />
                    </Link>
                  </Button>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" aria-label="Account" className="ml-1">
                        {session.user.image ? (
                          <img
                            src={session.user.image}
                            alt={session.user.name || "User"}
                            className="size-7 rounded-full object-cover"
                          />
                        ) : (
                          <span className="grid size-7 place-items-center rounded-full bg-secondary">
                            <User className="size-4" strokeWidth={1.5} />
                          </span>
                        )}
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-60">
                      <div className="px-2.5 py-2 flex items-center gap-2.5">
                        {session.user.image && (
                          <img
                            src={session.user.image}
                            alt={session.user.name || "User"}
                            className="size-9 rounded-full object-cover"
                          />
                        )}
                        <div className="min-w-0">
                          <p className="font-semibold text-sm truncate">{session.user.name || session.user.email}</p>
                          <p className="text-xs text-muted-foreground truncate">{session.user.email}</p>
                        </div>
                      </div>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem asChild>
                        <Link href={`/profile/${session.user.id}`} className="cursor-pointer">
                          <User strokeWidth={1.5} />
                          My Profile
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link href="/my-listings" className="cursor-pointer">
                          <ShoppingBag strokeWidth={1.5} />
                          My Listings
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link href="/my-transactions" className="cursor-pointer">
                          <History strokeWidth={1.5} />
                          My Transactions
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link href="/subscriptions" className="cursor-pointer">
                          <Gift strokeWidth={1.5} />
                          Subscriptions & Boosts
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem asChild>
                        <Link href="/settings" className="cursor-pointer">
                          <Settings strokeWidth={1.5} />
                          Settings
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={handleLogout} className="cursor-pointer text-destructive">
                        <LogOut strokeWidth={1.5} />
                        Log out
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </>
            ) : status === "unauthenticated" ? (
              <div className="hidden md:flex items-center gap-2 ml-1">
                <Button asChild variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
                  <Link href="/auth/login">Log in</Link>
                </Button>
                <Button asChild size="sm">
                  <Link href="/auth/signup">Sign up</Link>
                </Button>
              </div>
            ) : null}

            <Button
              variant="ghost"
              size="icon"
              className="md:hidden relative"
              aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? (
                <X className="size-5" strokeWidth={1.5} />
              ) : (
                <Menu className="size-5" strokeWidth={1.5} />
              )}
              {!mobileMenuOpen && <CountDot count={unreadCount + unreadMessageCount} />}
            </Button>
          </div>
        </div>
      </nav>

      {/* Mobile menu: full-screen sheet under the bar */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-x-0 top-[52px] bottom-0 z-40 overflow-y-auto bg-black">
          <div className="px-6 pt-6 pb-10 flex flex-col">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="py-2.5 text-[28px] font-semibold tracking-[-0.02em] text-foreground"
              >
                {link.label}
              </Link>
            ))}
            {status === "authenticated" && session?.user && (
              <>
                <Link
                  href="/sell"
                  className="py-2.5 text-[28px] font-semibold tracking-[-0.02em] text-link"
                >
                  Sell an item
                </Link>
                <div className="mt-6 border-t border-border pt-4 flex flex-col text-[17px]">
                  {isAdmin && (
                    <Link href="/admin" className="py-2.5 text-muted-foreground">
                      Admin dashboard
                    </Link>
                  )}
                  <Link href={`/profile/${session.user.id}`} className="py-2.5 text-muted-foreground">
                    My Profile
                  </Link>
                  <Link href="/my-listings" className="py-2.5 text-muted-foreground">
                    My Listings
                  </Link>
                  <Link href="/my-transactions" className="py-2.5 text-muted-foreground">
                    My Transactions
                  </Link>
                  <Link href="/notifications" className="py-2.5 text-muted-foreground flex items-center justify-between">
                    Notifications
                    {unreadCount > 0 && (
                      <span className="px-2 py-0.5 bg-destructive text-white text-xs rounded-full font-semibold tabular-nums">
                        {unreadCount > 99 ? "99+" : unreadCount}
                      </span>
                    )}
                  </Link>
                  <Link href="/messages" className="py-2.5 text-muted-foreground flex items-center justify-between">
                    Messages
                    {unreadMessageCount > 0 && (
                      <span className="px-2 py-0.5 bg-destructive text-white text-xs rounded-full font-semibold tabular-nums">
                        {unreadMessageCount > 99 ? "99+" : unreadMessageCount}
                      </span>
                    )}
                  </Link>
                  <Link href="/settings" className="py-2.5 text-muted-foreground">
                    Settings
                  </Link>
                  <button onClick={handleLogout} className="py-2.5 text-destructive w-full text-left">
                    Log out
                  </button>
                </div>
              </>
            )}
            {status === "unauthenticated" && (
              <div className="mt-8 grid grid-cols-2 gap-3">
                <Button asChild variant="secondary" size="lg">
                  <Link href="/auth/login">Log in</Link>
                </Button>
                <Button asChild size="lg">
                  <Link href="/auth/signup">Sign up</Link>
                </Button>
              </div>
            )}
          </div>
        </div>
      )}

      <SiteSearch open={searchOpen} onOpenChange={setSearchOpen} />
    </>
  )
}
