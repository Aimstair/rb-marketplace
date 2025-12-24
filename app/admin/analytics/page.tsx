"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Users, ShoppingBag, TrendingUp, DollarSign, ArrowUpRight, Loader2 } from "lucide-react"
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
} from "recharts"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { useState, useEffect } from "react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  getAnalyticsOverview,
  getUserGrowthData,
  getListingActivityData,
  getRevenueData,
  getCategoryDistribution,
  getTopSellers,
  getTopFlaggedUsers
} from "@/app/actions/admin-analytics"
import { useToast } from "@/hooks/use-toast"

const COLORS = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
]

export default function AnalyticsPage() {
  const { toast } = useToast()
  const [timeRange, setTimeRange] = useState("6m")
  const [loading, setLoading] = useState(true)
  
  // State for all data
  const [metrics, setMetrics] = useState({
    totalUsers: 0,
    userGrowth: "+0%",
    activeListings: 0,
    listingGrowth: "+0%",
    currentTrades: 0,
    tradeGrowth: "+0%",
    monthlyRevenue: 0,
    revenueGrowth: "+0%"
  })
  const [userGrowthData, setUserGrowthData] = useState<any[]>([])
  const [listingData, setListingData] = useState<any[]>([])
  const [revenueData, setRevenueData] = useState<any[]>([])
  const [categoryData, setCategoryData] = useState<any[]>([])
  const [topSellers, setTopSellers] = useState<any[]>([])
  const [topFlagged, setTopFlagged] = useState<any[]>([])

  // Load all data
  useEffect(() => {
    loadAllData()
  }, [timeRange])

  const loadAllData = async () => {
    setLoading(true)
    try {
      const [
        overviewResult,
        userGrowthResult,
        listingActivityResult,
        revenueResult,
        categoryResult,
        sellersResult,
        flaggedResult
      ] = await Promise.all([
        getAnalyticsOverview(timeRange),
        getUserGrowthData(timeRange),
        getListingActivityData(timeRange),
        getRevenueData(timeRange),
        getCategoryDistribution(),
        getTopSellers(5),
        getTopFlaggedUsers(4)
      ])

      console.log("Analytics Results:", {
        overviewResult,
        userGrowthResult,
        listingActivityResult,
        revenueResult,
        categoryResult,
        sellersResult,
        flaggedResult
      })

      if (overviewResult.success && overviewResult.metrics) {
        setMetrics(overviewResult.metrics)
      } else {
        console.error("Overview failed:", overviewResult.error)
      }
      
      if (userGrowthResult.success && userGrowthResult.data) {
        setUserGrowthData(userGrowthResult.data)
      } else {
        console.error("User growth failed:", userGrowthResult.error)
      }
      
      if (listingActivityResult.success && listingActivityResult.data) {
        setListingData(listingActivityResult.data)
      } else {
        console.error("Listing activity failed:", listingActivityResult.error)
      }
      
      if (revenueResult.success && revenueResult.data) {
        setRevenueData(revenueResult.data)
      } else {
        console.error("Revenue failed:", revenueResult.error)
      }
      
      if (categoryResult.success && categoryResult.data) {
        setCategoryData(categoryResult.data)
      } else {
        console.error("Category failed:", categoryResult.error)
      }
      
      if (sellersResult.success && sellersResult.data) {
        setTopSellers(sellersResult.data)
      } else {
        console.error("Sellers failed:", sellersResult.error)
      }
      
      if (flaggedResult.success && flaggedResult.data) {
        setTopFlagged(flaggedResult.data)
      } else {
        console.error("Flagged users failed:", flaggedResult.error)
      }
    } catch (error) {
      console.error("Failed to load analytics:", error)
      toast({
        title: "Error",
        description: "Failed to load analytics data",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center h-[600px]">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading analytics...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Analytics Dashboard</h1>
          <p className="text-muted-foreground">Marketplace performance and insights</p>
        </div>
        <Select value={timeRange} onValueChange={setTimeRange}>
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7d">Last 7 days</SelectItem>
            <SelectItem value="30d">Last 30 days</SelectItem>
            <SelectItem value="3m">Last 3 months</SelectItem>
            <SelectItem value="6m">Last 6 months</SelectItem>
            <SelectItem value="1y">Last year</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 bg-blue-500/10 rounded-lg">
                <Users className="h-5 w-5 text-blue-500" />
              </div>
              <div className="flex items-center text-green-500 text-sm">
                <ArrowUpRight className="h-4 w-4" />
                {metrics.userGrowth}
              </div>
            </div>
            <p className="text-2xl font-bold">{metrics.totalUsers.toLocaleString()}</p>
            <p className="text-sm text-muted-foreground">Total Users</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 bg-green-500/10 rounded-lg">
                <ShoppingBag className="h-5 w-5 text-green-500" />
              </div>
              <div className="flex items-center text-green-500 text-sm">
                <ArrowUpRight className="h-4 w-4" />
                {metrics.listingGrowth}
              </div>
            </div>
            <p className="text-2xl font-bold">{metrics.activeListings.toLocaleString()}</p>
            <p className="text-sm text-muted-foreground">Active Listings</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 bg-purple-500/10 rounded-lg">
                <TrendingUp className="h-5 w-5 text-purple-500" />
              </div>
              <div className="flex items-center text-green-500 text-sm">
                <ArrowUpRight className="h-4 w-4" />
                {metrics.tradeGrowth}
              </div>
            </div>
            <p className="text-2xl font-bold">{metrics.currentTrades.toLocaleString()}</p>
            <p className="text-sm text-muted-foreground">Trades This Month</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 bg-emerald-500/10 rounded-lg">
                <DollarSign className="h-5 w-5 text-emerald-500" />
              </div>
              <div className="flex items-center text-green-500 text-sm">
                <ArrowUpRight className="h-4 w-4" />
                {metrics.revenueGrowth}
              </div>
            </div>
            <p className="text-2xl font-bold">₱{metrics.monthlyRevenue.toLocaleString()}</p>
            <p className="text-sm text-muted-foreground">Revenue This Month</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>User Growth</CardTitle>
            <CardDescription>Total users and new registrations</CardDescription>
          </CardHeader>
          <CardContent className="overflow-hidden">
            <ChartContainer
              config={{
                users: { label: "Total Users", color: "hsl(var(--chart-1))" },
                newUsers: { label: "New Users", color: "hsl(var(--chart-2))" },
              }}
              className="h-[300px] w-full min-w-0"
            >
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={userGrowthData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--chart-1))" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(var(--chart-1))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="month" className="text-xs" tick={{ fontSize: 12 }} />
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

        <Card>
          <CardHeader>
            <CardTitle>Listings Activity</CardTitle>
            <CardDescription>Posted vs sold listings</CardDescription>
          </CardHeader>
          <CardContent className="overflow-hidden">
            <ChartContainer
              config={{
                posted: { label: "Posted", color: "hsl(var(--chart-1))" },
                sold: { label: "Sold", color: "hsl(var(--chart-2))" },
              }}
              className="h-[300px] w-full min-w-0"
            >
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={listingData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="month" className="text-xs" tick={{ fontSize: 12 }} />
                  <YAxis className="text-xs" tick={{ fontSize: 12 }} width={40} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="posted" fill="hsl(var(--chart-1))" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="sold" fill="hsl(var(--chart-2))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Revenue Breakdown</CardTitle>
            <CardDescription>Revenue by source</CardDescription>
          </CardHeader>
          <CardContent className="overflow-hidden">
            <ChartContainer
              config={{
                subscriptions: { label: "Subscriptions", color: "hsl(var(--chart-1))" },
                boosts: { label: "Boosts", color: "hsl(var(--chart-2))" },
                featured: { label: "Featured", color: "hsl(var(--chart-3))" },
              }}
              className="h-[300px] w-full min-w-0"
            >
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={revenueData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="month" className="text-xs" tick={{ fontSize: 12 }} />
                  <YAxis className="text-xs" tick={{ fontSize: 12 }} width={40} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Area
                    type="monotone"
                    dataKey="subscriptions"
                    stackId="1"
                    stroke="hsl(var(--chart-1))"
                    fill="hsl(var(--chart-1))"
                    fillOpacity={0.6}
                  />
                  <Area
                    type="monotone"
                    dataKey="boosts"
                    stackId="1"
                    stroke="hsl(var(--chart-2))"
                    fill="hsl(var(--chart-2))"
                    fillOpacity={0.6}
                  />
                  <Area
                    type="monotone"
                    dataKey="featured"
                    stackId="1"
                    stroke="hsl(var(--chart-3))"
                    fill="hsl(var(--chart-3))"
                    fillOpacity={0.6}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Listings by Category</CardTitle>
            <CardDescription>Distribution of active listings</CardDescription>
          </CardHeader>
          <CardContent className="overflow-hidden">
            <ChartContainer
              config={{
                value: { label: "Percentage", color: "hsl(var(--chart-1))" },
              }}
              className="h-[250px] w-full min-w-0"
            >
              <ResponsiveContainer width="100%" height="100%">
                <PieChart margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                  <Pie
                    data={categoryData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {categoryData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <ChartTooltip content={<ChartTooltipContent />} />
                </PieChart>
              </ResponsiveContainer>
            </ChartContainer>
            <div className="space-y-2 mt-4">
              {categoryData.map((item, index) => (
                <div key={item.name} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index] }} />
                    <span>{item.name}</span>
                  </div>
                  <span className="font-medium">{item.value}%</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Top Sellers</CardTitle>
            <CardDescription>Highest performing sellers this month</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {topSellers.map((seller, index) => (
                <div key={seller.username} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium text-muted-foreground w-5">#{index + 1}</span>
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={seller.avatar || "/placeholder.svg"} />
                      <AvatarFallback>{seller.username.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium text-sm">{seller.username}</p>
                      <p className="text-xs text-muted-foreground">{seller.vouches} vouches</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-sm">{seller.revenue}</p>
                    <p className="text-xs text-muted-foreground">{seller.sales} sales</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Top Flagged Users</CardTitle>
            <CardDescription>Users with most reports/flags</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {topFlagged.map((user, index) => (
                <div key={user.username} className="flex items-center justify-between p-3 bg-red-500/5 rounded-lg">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium text-muted-foreground w-5">#{index + 1}</span>
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={user.avatar || "/placeholder.svg"} />
                      <AvatarFallback>{user.username.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <p className="font-medium text-sm">{user.username}</p>
                  </div>
                  <div className="flex gap-2">
                    <Badge variant="destructive">{user.reports} reports</Badge>
                    <Badge variant="outline">{user.flags} flags</Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
