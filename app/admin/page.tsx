"use client"
import { useState, useEffect } from "react"
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
  Loader2,
} from "lucide-react"
import Link from "next/link"
import { Area, AreaChart, Bar, BarChart, ResponsiveContainer, XAxis, YAxis, CartesianGrid } from "recharts"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { getDashboardStats } from "@/app/actions/admin"

export default function AdminDashboard() {
  const [stats, setStats] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [recentActivityData, setRecentActivityData] = useState<any[]>([])
  const [recentReportsData, setRecentReportsData] = useState<any[]>([])
  const [trafficData, setTrafficData] = useState<any[]>([])
  const [revenueData, setRevenueData] = useState<any[]>([])

  useEffect(() => {
    const loadDashboard = async () => {
      try {
        setLoading(true)
        const result = await getDashboardStats()
        console.log("Dashboard stats result:", result)
        if (result.success && result.data) {
          console.log("Stats data:", result.data)
          console.log("Total Users:", result.data.totalUsers)
          console.log("Active Listings:", result.data.activeListings)
          console.log("Pending Reports:", result.data.pendingReports)
          console.log("Weekly Traffic:", result.data.weeklyTraffic)
          console.log("Recent Activity:", result.data.recentActivity)
          setStats(result.data)
          setRecentActivityData(result.data.recentActivity.slice(0, 5))
          setRecentReportsData(result.data.recentReports || [])
          setTrafficData(result.data.weeklyTraffic || [])
          setRevenueData(result.data.monthlyRevenue || [])
        } else {
          console.error("Dashboard stats failed:", result.error)
        }
      } catch (err) {
        console.error("Failed to load dashboard:", err)
      } finally {
        setLoading(false)
      }
    }

    loadDashboard()
  }, [])

  // Helper function to calculate percentage change
  const calculateChange = (current: number, previous: number) => {
    if (previous === 0) return { percent: "N/A", trend: "neutral" as const }
    const change = ((current - previous) / previous) * 100
    return {
      percent: `${change > 0 ? "+" : ""}${change.toFixed(1)}%`,
      trend: (change > 0 ? "up" : change < 0 ? "down" : "neutral") as const
    }
  }

  const usersChange = stats ? calculateChange(stats.totalUsers, stats.previousPeriod?.totalUsers || 0) : { percent: "N/A", trend: "neutral" as const }
  const listingsChange = stats ? calculateChange(stats.activeListings, stats.previousPeriod?.activeListings || 0) : { percent: "N/A", trend: "neutral" as const }
  const reportsChange = stats ? calculateChange(stats.pendingReports, stats.previousPeriod?.pendingReports || 0) : { percent: "N/A", trend: "neutral" as const }
  const revenueChange = stats ? calculateChange(stats.totalRevenue, stats.previousPeriod?.totalRevenue || 0) : { percent: "N/A", trend: "neutral" as const }

  const statCards = [
    {
      label: "Total Users",
      value: stats?.totalUsers?.toLocaleString() || "0",
      change: usersChange.percent,
      trend: usersChange.trend,
      icon: Users,
      color: "text-blue-500",
      bgColor: "bg-blue-500/10",
    },
    {
      label: "Active Listings",
      value: stats?.activeListings?.toLocaleString() || "0",
      change: listingsChange.percent,
      trend: listingsChange.trend,
      icon: ShoppingBag,
      color: "text-green-500",
      bgColor: "bg-green-500/10",
    },
    {
      label: "Pending Reports",
      value: stats?.pendingReports?.toString() || "0",
      change: reportsChange.percent,
      trend: reportsChange.trend,
      icon: AlertTriangle,
      color: "text-orange-500",
      bgColor: "bg-orange-500/10",
    },
    {
      label: "Revenue (Total)",
      value: `₱${(stats?.totalRevenue || 0).toLocaleString("en-PH")}`,
      change: revenueChange.percent,
      trend: revenueChange.trend,
      icon: DollarSign,
      color: "text-emerald-500",
      bgColor: "bg-emerald-500/10",
    },
  ]
  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Dashboard Overview</h1>
        <p className="text-muted-foreground">Welcome back, here's what's happening with RobloxTrade today.</p>
      </div>

      {/* Loading state */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : (
        <>
          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {statCards.map((stat) => {
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
                          stat.trend === "up" ? "text-green-500" : stat.trend === "down" ? "text-red-500" : "text-gray-500",
                        )}
                      >
                        {stat.trend === "up" ? (
                          <ArrowUpRight className="h-4 w-4" />
                        ) : stat.trend === "down" ? (
                          <ArrowDownRight className="h-4 w-4" />
                        ) : null}
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
                <CardDescription>Active users visiting and using the platform this week</CardDescription>
              </CardHeader>
              <CardContent className="overflow-hidden">
                <ChartContainer
                  config={{
                    users: { label: "Active Visitors", color: "hsl(var(--chart-1))" },
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
                <CardDescription>Platform monetization revenue (5% fee on transactions)</CardDescription>
              </CardHeader>
              <CardContent className="overflow-hidden">
                <ChartContainer
                  config={{
                    revenue: { label: "Platform Revenue (₱)", color: "hsl(var(--chart-2))" },
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
                  <CardTitle className="text-lg">Pending Reports</CardTitle>
                  <CardDescription>{stats?.pendingReports || 0} to review</CardDescription>
                </div>
                <Link href="/admin/reports">
                  <Button variant="ghost" size="sm">
                    View All
                  </Button>
                </Link>
              </CardHeader>
              <CardContent>
                {recentReportsData.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No pending reports
                  </p>
                ) : (
                  <div className="space-y-3">
                    {recentReportsData.map((report) => (
                      <div key={report.id} className="p-3 bg-muted/50 rounded-lg">
                        <div className="flex items-start justify-between mb-1">
                          <Badge variant="outline" className="text-xs">
                            {report.type === "user" ? "User" : "Listing"}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {new Date(report.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                        <p className="text-sm font-medium mb-1">{report.reason}</p>
                        <p className="text-xs text-muted-foreground">
                          By {report.reporterUsername}
                          {report.type === "user" && report.reportedUsername && (
                            <> → {report.reportedUsername}</>
                          )}
                          {report.type === "listing" && report.listingTitle && (
                            <> → {report.listingTitle}</>
                          )}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Recent Activity */}
            <Card className="lg:col-span-2">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-lg">Recent Activity</CardTitle>
                  <CardDescription>New users and completed transactions</CardDescription>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {recentActivityData.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <p>No recent activity to display</p>
                    </div>
                  ) : (
                    recentActivityData.map((activity) => (
                      <div key={activity.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                        <div className="flex items-center gap-3">
                          {activity.type === "user_joined" ? (
                            <>
                              <Badge className="bg-blue-500">New User</Badge>
                              <span className="font-medium">{activity.user?.username}</span>
                            </>
                          ) : (
                            <>
                              <Badge className="bg-green-500">Transaction</Badge>
                              <span className="text-sm">
                                <span className="font-medium">{activity.transaction?.buyer?.username}</span> bought{" "}
                                <span className="font-medium">{activity.transaction?.listing?.title}</span> from{" "}
                                <span className="font-medium">{activity.transaction?.seller?.username}</span>
                              </span>
                            </>
                          )}
                        </div>
                        <span className="text-sm text-muted-foreground">
                          {activity.type === "transaction_completed"
                            ? `₱${(activity.transaction?.price || 0).toLocaleString("en-PH")}`
                            : ""}
                        </span>
                      </div>
                    ))
                  )}
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
        </>
      )}
    </div>
  )
}

function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(" ")
}
