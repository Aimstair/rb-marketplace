"use client"

import Link from "next/link"
import { MessageCircle, User, Menu, X, LogOut, Settings, ShoppingBag, History, Gift, Bell, Shield } from "lucide-react"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/lib/auth-context"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu"
import { getUnreadCount } from "@/app/actions/notifications"

const mockNotifications = [
  {
    id: 1,
    title: "New message from FastSeller123",
    description: "Thanks for trading!",
    time: "2 min ago",
    read: false,
  },
  {
    id: 2,
    title: "Your listing was viewed",
    description: "Golden Dragon Pet received 15 views",
    time: "1 hour ago",
    read: false,
  },
  {
    id: 3,
    title: "Price drop alert",
    description: "Dominus Infernus price dropped by 10%",
    time: "3 hours ago",
    read: true,
  },
]

export default function Navigation() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  const [loadingUnread, setLoadingUnread] = useState(false)
  const router = useRouter()
  const { user, logout } = useAuth()

  useEffect(() => {
    if (user) {
      fetchUnreadCount()
      // Refresh unread count every 30 seconds
      const interval = setInterval(fetchUnreadCount, 30000)
      return () => clearInterval(interval)
    }
  }, [user])

  const fetchUnreadCount = async () => {
    setLoadingUnread(true)
    const result = await getUnreadCount()
    if (result.success && result.count !== undefined) {
      setUnreadCount(result.count)
    }
    setLoadingUnread(false)
  }

  const handleLogout = () => {
    logout()
    router.push("/")
  }

  return (
    <nav className="sticky top-0 z-50 bg-background border-b">
      <div className="container mx-auto px-4 py-4 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="text-2xl font-bold text-primary">
          RobloxTrade
        </Link>

        {/* Desktop Menu */}
        <div className="hidden md:flex items-center gap-8">
          <Link href="/marketplace" className="text-muted-foreground hover:text-foreground transition">
            Marketplace
          </Link>
          <Link href="/currency" className="text-muted-foreground hover:text-foreground transition">
            Currency
          </Link>
          <Link href="/trends" className="text-muted-foreground hover:text-foreground transition">
            Trends
          </Link>
          {user?.role === "admin" && (
            <Link
              href="/admin"
              className="text-muted-foreground hover:text-foreground transition flex items-center gap-1"
            >
              <Shield className="w-4 h-4" />
              Admin
            </Link>
          )}
        </div>

        {/* Right Actions */}
        <div className="hidden md:flex items-center gap-4">
          {user ? (
            <>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="relative">
                    <Bell className="w-5 h-5" />
                    {unreadCount > 0 && (
                      <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold">
                        {unreadCount > 99 ? "99+" : unreadCount}
                      </span>
                    )}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-80 bg-popover border shadow-lg">
                  <div className="px-3 py-2 border-b">
                    <p className="font-semibold">Notifications</p>
                  </div>
                  <div className="max-h-[300px] overflow-y-auto">
                    {mockNotifications.slice(0, 5).map((notification) => (
                      <div
                        key={notification.id}
                        className={`px-3 py-3 border-b last:border-b-0 hover:bg-muted cursor-pointer ${
                          !notification.read ? "bg-primary/5" : ""
                        }`}
                      >
                        <div className="flex items-start gap-2">
                          {!notification.read && <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0" />}
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate">{notification.title}</p>
                            <p className="text-xs text-muted-foreground truncate">{notification.description}</p>
                            <p className="text-xs text-muted-foreground mt-1">{notification.time}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href="/notifications" className="cursor-pointer justify-center font-medium text-primary">
                      View all notifications
                    </Link>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Messages Icon - only visible when logged in */}
              <Link href="/messages">
                <Button variant="ghost" size="icon">
                  <MessageCircle className="w-5 h-5" />
                </Button>
              </Link>

              {/* Profile Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <User className="w-5 h-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 bg-popover border shadow-lg">
                  <div className="px-2 py-1.5">
                    <p className="font-semibold text-sm">{user.username}</p>
                    <p className="text-xs text-muted-foreground">{user.email}</p>
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href={`/profile/${user.id}`} className="cursor-pointer">
                      <User className="w-4 h-4 mr-2" />
                      My Profile
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/my-listings" className="cursor-pointer">
                      <ShoppingBag className="w-4 h-4 mr-2" />
                      My Listings
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/my-transactions" className="cursor-pointer">
                      <History className="w-4 h-4 mr-2" />
                      My Transactions
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/subscriptions" className="cursor-pointer">
                      <Gift className="w-4 h-4 mr-2" />
                      Subscriptions / Boosts
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href="/settings" className="cursor-pointer">
                      <Settings className="w-4 h-4 mr-2" />
                      Settings
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleLogout} className="cursor-pointer text-red-600">
                    <LogOut className="w-4 h-4 mr-2" />
                    Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            <>
              <Link href="/auth/login">
                <Button variant="ghost" size="icon">
                  <User className="w-5 h-5" />
                </Button>
              </Link>
              <Link href="/auth/signup">
                <Button>Sign Up</Button>
              </Link>
            </>
          )}
        </div>

        {/* Mobile Menu Button */}
        <button className="md:hidden" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
          {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t bg-background">
          <div className="container mx-auto px-4 py-4 flex flex-col gap-4">
            <Link href="/marketplace" className="py-2 text-muted-foreground hover:text-foreground">
              Marketplace
            </Link>
            <Link href="/currency" className="py-2 text-muted-foreground hover:text-foreground">
              Currency
            </Link>
            <Link href="/trends" className="py-2 text-muted-foreground hover:text-foreground">
              Trends
            </Link>
            {user && (
              <>
                {user.role === "admin" && (
                  <Link
                    href="/admin"
                    className="py-2 text-muted-foreground hover:text-foreground flex items-center gap-2"
                  >
                    <Shield className="w-4 h-4" />
                    Admin Dashboard
                  </Link>
                )}
                <div className="border-t pt-4">
                  <Link href={`/profile/${user.id}`} className="py-2 text-muted-foreground hover:text-foreground block">
                    My Profile
                  </Link>
                  <Link href="/my-listings" className="py-2 text-muted-foreground hover:text-foreground block">
                    My Listings
                  </Link>
                  <Link href="/notifications" className="py-2 text-muted-foreground hover:text-foreground block flex items-center justify-between">
                    Notifications
                    {unreadCount > 0 && (
                      <span className="ml-2 px-2 py-0.5 bg-red-500 text-white text-xs rounded-full font-bold">
                        {unreadCount > 99 ? "99+" : unreadCount}
                      </span>
                    )}
                  </Link>
                  <Link href="/messages" className="py-2 text-muted-foreground hover:text-foreground block">
                    Messages
                  </Link>
                  <Link href="/settings" className="py-2 text-muted-foreground hover:text-foreground block">
                    Settings
                  </Link>
                  <button onClick={handleLogout} className="py-2 text-red-600 hover:text-red-700 w-full text-left">
                    Logout
                  </button>
                </div>
              </>
            )}
            {!user && (
              <div className="flex gap-2 pt-4 border-t">
                <Link href="/auth/login" className="flex-1">
                  <Button variant="outline" className="w-full bg-transparent">
                    Log In
                  </Button>
                </Link>
                <Link href="/auth/signup" className="flex-1">
                  <Button className="w-full">Sign Up</Button>
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </nav>
  )
}
