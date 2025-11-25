"use client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Users,
  ShoppingBag,
  AlertTriangle,
  DollarSign,
  MessageSquare,
  Flag,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react"
import Link from "next/link"
import { Area, AreaChart, Bar, BarChart, ResponsiveContainer, XAxis, YAxis, CartesianGrid } from "recharts"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"

// Mock data for analytics
const trafficData = [
  { date: "Mon", users: 1200, listings: 340, trades: 89 },
  { date: "Tue", users: 1400, listings: 420, trades: 102 },
  { date: "Wed", users: 1100, listings: 380, trades: 78 },
  { date: "Thu", users: 1600, listings: 510, trades: 134 },
  { date: "Fri", users: 1800, listings: 590, trades: 156 },
  { date: "Sat", users: 2100, listings: 680, trades: 189 },
  { date: "Sun", users: 1900, listings: 620, trades: 167 },
]

const revenueData = [
  { month: "Jan", revenue: 4200, subscriptions: 89 },
  { month: "Feb", revenue: 5100, subscriptions: 102 },
  { month: "Mar", revenue: 4800, subscriptions: 95 },
  { month: "Apr", revenue: 6200, subscriptions: 128 },
  { month: "May", revenue: 7100, subscriptions: 145 },
  { month: "Jun", revenue: 8400, subscriptions: 172 },
]

const recentReports = [
  { id: 1, user: "ScammerJoe", reason: "Fake items", severity: "high", time: "2 min ago" },
  { id: 2, user: "SpamBot123", reason: "Spam listings", severity: "medium", time: "15 min ago" },
  { id: 3, user: "FakeAccount", reason: "Impersonation", severity: "high", time: "1 hour ago" },
  { id: 4, user: "SusTrader", reason: "Price manipulation", severity: "low", time: "2 hours ago" },
]

const recentActivity = [
  { id: 1, action: "User banned", target: "ScammerJoe", admin: "AdminMod", time: "5 min ago" },
  { id: 2, action: "Listing removed", target: "Fake Dominus", admin: "ModeratorX", time: "12 min ago" },
  { id: 3, action: "Warning issued", target: "SpamBot123", admin: "AdminMod", time: "30 min ago" },
  { id: 4, action: "Vouch invalidated", target: "AltAccount", admin: "ModeratorX", time: "1 hour ago" },
]

const stats = [
  {
    label: "Total Users",
    value: "8,324",
    change: "+12.5%",
    trend: "up",
    icon: Users,
    color: "text-blue-500",
    bgColor: "bg-blue-500/10",
  },
  {
    label: "Active Listings",
    value: "12,457",
    change: "+8.2%",
    trend: "up",
    icon: ShoppingBag,
    color: "text-green-500",
    bgColor: "bg-green-500/10",
  },
  {
    label: "Pending Reports",
    value: "23",
    change: "-5.3%",
    trend: "down",
    icon: AlertTriangle,
    color: "text-orange-500",
    bgColor: "bg-orange-500/10",
  },
  {
    label: "Revenue (MTD)",
    value: "$8,420",
    change: "+18.7%",
    trend: "up",
    icon: DollarSign,
    color: "text-emerald-500",
    bgColor: "bg-emerald-500/10",
  },
]

export default function AdminDashboard() {
  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Dashboard Overview</h1>
        <p className="text-muted-foreground">Welcome back, here's what's happening with RobloxTrade today.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => {
          const Icon = stat.icon
          return (
            <Card key={stat.label}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className={cn("p-2 rounded-lg", stat.bgColor)}>
                    <Icon className={cn("h-5 w-5", stat.color)} />
                  </div>
                  <div
                    className={cn(
                      "flex items-center gap-1 text-sm font-medium",
                      stat.trend === "up" ? "text-green-500" : "text-red-500",
                    )}
                  >
                    {stat.trend === "up" ? (
                      <ArrowUpRight className="h-4 w-4" />
                    ) : (
                      <ArrowDownRight className="h-4 w-4" />
                    )}
                    {stat.change}
                  </div>
                </div>
                <div className="mt-4">
                  <p className="text-2xl font-bold">{stat.value}</p>
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Traffic Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Weekly Traffic</CardTitle>
            <CardDescription>User activity and engagement this week</CardDescription>
          </CardHeader>
          <CardContent className="overflow-hidden">
            <ChartContainer
              config={{
                users: { label: "Active Users", color: "hsl(var(--chart-1))" },
                listings: { label: "New Listings", color: "hsl(var(--chart-2))" },
                trades: { label: "Trades", color: "hsl(var(--chart-3))" },
              }}
              className="h-[300px] w-full min-w-0"
            >
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trafficData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--chart-1))" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(var(--chart-1))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="date" className="text-xs" tick={{ fontSize: 12 }} />
                  <YAxis className="text-xs" tick={{ fontSize: 12 }} width={40} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Area
                    type="monotone"
                    dataKey="users"
                    stroke="hsl(var(--chart-1))"
                    fillOpacity={1}
                    fill="url(#colorUsers)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Revenue Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Revenue Overview</CardTitle>
            <CardDescription>Monthly revenue and subscription growth</CardDescription>
          </CardHeader>
          <CardContent className="overflow-hidden">
            <ChartContainer
              config={{
                revenue: { label: "Revenue", color: "hsl(var(--chart-2))" },
              }}
              className="h-[300px] w-full min-w-0"
            >
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={revenueData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="month" className="text-xs" tick={{ fontSize: 12 }} />
                  <YAxis className="text-xs" tick={{ fontSize: 12 }} width={40} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="revenue" fill="hsl(var(--chart-2))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Reports */}
        <Card className="lg:col-span-1">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-lg">Recent Reports</CardTitle>
              <CardDescription>Requires attention</CardDescription>
            </div>
            <Link href="/admin/reports">
              <Button variant="ghost" size="sm">
                View All
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentReports.map((report) => (
                <div key={report.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className={cn(
                        "w-2 h-2 rounded-full",
                        report.severity === "high"
                          ? "bg-red-500"
                          : report.severity === "medium"
                            ? "bg-orange-500"
                            : "bg-yellow-500",
                      )}
                    />
                    <div>
                      <p className="font-medium text-sm">{report.user}</p>
                      <p className="text-xs text-muted-foreground">{report.reason}</p>
                    </div>
                  </div>
                  <span className="text-xs text-muted-foreground">{report.time}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Recent Admin Activity */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-lg">Recent Admin Activity</CardTitle>
              <CardDescription>Actions taken by moderators</CardDescription>
            </div>
            <Link href="/admin/audit">
              <Button variant="ghost" size="sm">
                View All
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentActivity.map((activity) => (
                <div key={activity.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Badge variant="outline">{activity.action}</Badge>
                    <span className="font-medium">{activity.target}</span>
                    <span className="text-muted-foreground">by {activity.admin}</span>
                  </div>
                  <span className="text-sm text-muted-foreground">{activity.time}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Common moderation tasks</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Link href="/admin/reports">
              <Button variant="outline" className="w-full h-20 flex flex-col gap-2 bg-transparent">
                <Flag className="h-5 w-5" />
                <span>Review Reports</span>
              </Button>
            </Link>
            <Link href="/admin/users">
              <Button variant="outline" className="w-full h-20 flex flex-col gap-2 bg-transparent">
                <Users className="h-5 w-5" />
                <span>Manage Users</span>
              </Button>
            </Link>
            <Link href="/admin/listings">
              <Button variant="outline" className="w-full h-20 flex flex-col gap-2 bg-transparent">
                <ShoppingBag className="h-5 w-5" />
                <span>Moderate Listings</span>
              </Button>
            </Link>
            <Link href="/admin/announcements">
              <Button variant="outline" className="w-full h-20 flex flex-col gap-2 bg-transparent">
                <MessageSquare className="h-5 w-5" />
                <span>Send Announcement</span>
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(" ")
}
