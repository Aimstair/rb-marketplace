"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard,
  Users,
  ShoppingBag,
  Flag,
  MessageSquare,
  Award,
  DollarSign,
  BarChart3,
  CreditCard,
  Megaphone,
  FileText,
  Shield,
  Settings,
  HelpCircle,
  Gavel,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Home,
} from "lucide-react"
import { useState } from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { useAuth } from "@/lib/auth-context"
import { useRouter } from "next/navigation"

const sidebarSections = [
  {
    title: "Core",
    items: [
      { label: "Dashboard", href: "/admin", icon: LayoutDashboard },
      { label: "Users", href: "/admin/users", icon: Users },
      { label: "Listings", href: "/admin/listings", icon: ShoppingBag },
      { label: "Reports", href: "/admin/reports", icon: Flag },
    ],
  },
  {
    title: "Moderation",
    items: [
      { label: "Chat Logs", href: "/admin/chat", icon: MessageSquare },
      { label: "Vouches", href: "/admin/vouches", icon: Award },
      { label: "Currency Trades", href: "/admin/currency", icon: DollarSign },
      { label: "Disputes", href: "/admin/disputes", icon: Gavel },
    ],
  },
  {
    title: "Operations",
    items: [
      { label: "Analytics", href: "/admin/analytics", icon: BarChart3 },
      { label: "Monetization", href: "/admin/monetization", icon: CreditCard },
      { label: "Announcements", href: "/admin/announcements", icon: Megaphone },
      { label: "Support Tickets", href: "/admin/support", icon: HelpCircle },
    ],
  },
  {
    title: "System",
    items: [
      { label: "Audit Logs", href: "/admin/audit", icon: FileText },
      { label: "Permissions", href: "/admin/permissions", icon: Shield },
      { label: "Settings", href: "/admin/settings", icon: Settings },
    ],
  },
]

export default function AdminSidebar() {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)
  const { user, logout } = useAuth()
  const router = useRouter()

  const handleLogout = () => {
    logout()
    router.push("/")
  }

  return (
    <TooltipProvider delayDuration={0}>
      <aside
        className={cn(
          "fixed top-0 left-0 h-screen bg-card border-r flex flex-col transition-all duration-300 z-40 overflow-y-auto",
          collapsed ? "w-16" : "w-64",
        )}
      >
        {/* Header */}
        <div
          className={cn(
            "p-4 border-b flex items-center sticky top-0 bg-card z-10",
            collapsed ? "justify-center" : "justify-between",
          )}
        >
          {!collapsed && (
            <div>
              <h1 className="font-bold text-lg text-primary">Admin Panel</h1>
              <p className="text-xs text-muted-foreground">RobloxTrade</p>
            </div>
          )}
          <Button variant="ghost" size="icon" onClick={() => setCollapsed(!collapsed)} className="h-8 w-8">
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </Button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-4 space-y-6 px-2">
          {sidebarSections.map((section) => (
            <div key={section.title}>
              {!collapsed && (
                <p className="px-3 mb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  {section.title}
                </p>
              )}
              <div className="space-y-1">
                {section.items.map((item) => {
                  const isActive = pathname === item.href
                  const Icon = item.icon

                  const linkContent = (
                    <Link
                      href={item.href}
                      className={cn(
                        "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                        isActive
                          ? "bg-primary text-primary-foreground"
                          : "text-muted-foreground hover:bg-muted hover:text-foreground",
                        collapsed && "justify-center px-2",
                      )}
                    >
                      <Icon className="h-4 w-4 flex-shrink-0" />
                      {!collapsed && <span>{item.label}</span>}
                    </Link>
                  )

                  if (collapsed) {
                    return (
                      <Tooltip key={item.href}>
                        <TooltipTrigger asChild>{linkContent}</TooltipTrigger>
                        <TooltipContent side="right">
                          <p>{item.label}</p>
                        </TooltipContent>
                      </Tooltip>
                    )
                  }

                  return <div key={item.href}>{linkContent}</div>
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Footer */}
        <div className="p-4 border-t space-y-2 sticky bottom-0 bg-card">
          {collapsed ? (
            <>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Link href="/">
                    <Button variant="ghost" size="icon" className="w-full">
                      <Home className="h-4 w-4" />
                    </Button>
                  </Link>
                </TooltipTrigger>
                <TooltipContent side="right">Back to Site</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" className="w-full" onClick={handleLogout}>
                    <LogOut className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right">Logout</TooltipContent>
              </Tooltip>
            </>
          ) : (
            <>
              <div className="flex items-center gap-3 px-2 py-2">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <span className="text-sm font-semibold text-primary">{user?.username?.charAt(0).toUpperCase()}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{user?.username}</p>
                  <p className="text-xs text-muted-foreground">Administrator</p>
                </div>
              </div>
              <div className="flex gap-2">
                <Link href="/" className="flex-1">
                  <Button variant="outline" size="sm" className="w-full bg-transparent">
                    <Home className="h-4 w-4 mr-2" />
                    Site
                  </Button>
                </Link>
                <Button variant="ghost" size="sm" onClick={handleLogout}>
                  <LogOut className="h-4 w-4" />
                </Button>
              </div>
            </>
          )}
        </div>
      </aside>
    </TooltipProvider>
  )
}
