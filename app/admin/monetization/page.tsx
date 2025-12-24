"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { getSubscriptionStats } from "@/app/actions/subscriptions"
import {
  getMonetizationOverview,
  getSubscriptionPlanStats,
  getRevenueChartData,
  getDailyRevenueData,
  getUserSubscriptions,
  extendSubscription,
  upgradeUserPlan,
  cancelUserSubscription,
  issueRefund
} from "@/app/actions/admin-monetization"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import {
  CreditCard,
  DollarSign,
  Users,
  ArrowUpRight,
  Search,
  MoreHorizontal,
  Zap,
  Star,
  Crown,
  RefreshCcw,
  ArrowUp,
  Receipt,
  Calendar,
  Clock,
  Check,
} from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Area, AreaChart, Bar, BarChart, ResponsiveContainer, XAxis, YAxis, CartesianGrid } from "recharts"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"

export default function MonetizationPage() {
  const { toast } = useToast()
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [planFilter, setPlanFilter] = useState("all")
  const [adjustDialogOpen, setAdjustDialogOpen] = useState(false)
  const [selectedUser, setSelectedUser] = useState<any | null>(null)
  const [adjustAction, setAdjustAction] = useState<"extend" | "refund" | "upgrade" | "cancel">("extend")
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  
  // Extension/refund form state
  const [extensionDays, setExtensionDays] = useState("30")
  const [newPlan, setNewPlan] = useState("PRO")
  const [refundAmount, setRefundAmount] = useState("")
  const [refundReason, setRefundReason] = useState("request")

  // State for all data
  const [stats, setStats] = useState({
    subscriptionRevenue: 0,
    subscriptionGrowth: "+0%",
    activeSubscribers: 0,
    subscriberGrowth: "+0%",
    boostRevenue: 0,
    boostGrowth: "+0%",
    featuredRevenue: 0,
    featuredGrowth: "+0%"
  })
  const [subscriptionPlans, setSubscriptionPlans] = useState<any[]>([])
  const [revenueData, setRevenueData] = useState<any[]>([])
  const [dailyRevenueData, setDailyRevenueData] = useState<any[]>([])
  const [userSubscriptions, setUserSubscriptions] = useState<any[]>([])
  const [recentSales, setRecentSales] = useState<any[]>([])

  // Load all data on mount
  useEffect(() => {
    loadAllData()
  }, [])

  // Reload subscriptions when filters change
  useEffect(() => {
    loadUserSubscriptions()
  }, [searchQuery, statusFilter, planFilter])

  const loadAllData = async () => {
    setLoading(true)
    try {
      const [overviewResult, planStatsResult, revenueChartResult, dailyRevenueResult, subscriptionsResult, recentSalesResult] = await Promise.all([
        getMonetizationOverview(),
        getSubscriptionPlanStats(),
        getRevenueChartData(),
        getDailyRevenueData(),
        getUserSubscriptions(),
        getSubscriptionStats()
      ])

      if (overviewResult.success && overviewResult.data) {
        setStats(overviewResult.data)
      }
      if (planStatsResult.success && planStatsResult.data) {
        setSubscriptionPlans(planStatsResult.data)
      }
      if (revenueChartResult.success && revenueChartResult.data) {
        setRevenueData(revenueChartResult.data)
      }
      if (dailyRevenueResult.success && dailyRevenueResult.data) {
        setDailyRevenueData(dailyRevenueResult.data)
      }
      if (subscriptionsResult.success && subscriptionsResult.data) {
        setUserSubscriptions(subscriptionsResult.data)
      }
      if (recentSalesResult.success && recentSalesResult.data) {
        setRecentSales(recentSalesResult.data.recentSales)
      }
    } catch (error) {
      console.error("Failed to load monetization data:", error)
      toast({
        title: "Error",
        description: "Failed to load monetization data",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const loadUserSubscriptions = async () => {
    try {
      const result = await getUserSubscriptions({
        search: searchQuery,
        plan: planFilter,
        status: statusFilter
      })
      if (result.success && result.data) {
        setUserSubscriptions(result.data)
      }
    } catch (error) {
      console.error("Failed to load subscriptions:", error)
    }
  }

  const handleAdjustPlan = (user: any, action: "extend" | "refund" | "upgrade" | "cancel") => {
    setSelectedUser(user)
    setAdjustAction(action)
    // Reset form values
    setExtensionDays("30")
    setNewPlan("PRO")
    setRefundAmount(user.spent.replace("₱", "").replace(",", ""))
    setRefundReason("request")
    setAdjustDialogOpen(true)
  }

  const executeAdjustAction = async () => {
    if (!selectedUser) return
    
    setActionLoading(true)
    try {
      let result
      
      if (adjustAction === "extend") {
        result = await extendSubscription(selectedUser.id, parseInt(extensionDays))
      } else if (adjustAction === "upgrade") {
        result = await upgradeUserPlan(selectedUser.id, newPlan as "PRO" | "ELITE")
      } else if (adjustAction === "cancel") {
        result = await cancelUserSubscription(selectedUser.id)
      } else if (adjustAction === "refund") {
        const amount = parseFloat(refundAmount)
        result = await issueRefund(selectedUser.id, amount, refundReason)
      }

      if (result?.success) {
        toast({
          title: "Success",
          description: result.message || "Action completed successfully"
        })
        setAdjustDialogOpen(false)
        // Reload data
        loadAllData()
      } else {
        toast({
          title: "Error",
          description: result?.error || "Action failed",
          variant: "destructive"
        })
      }
    } catch (error) {
      console.error("Failed to execute action:", error)
      toast({
        title: "Error",
        description: "Failed to execute action",
        variant: "destructive"
      })
    } finally {
      setActionLoading(false)
    }
  }

  const getPlanBadgeColor = (plan: string) => {
    switch (plan) {
      case "Elite":
        return "bg-amber-500/10 text-amber-500 border-amber-500/20"
      case "Pro":
        return "bg-blue-500/10 text-blue-500 border-blue-500/20"
      case "Free":
        return "bg-gray-500/10 text-gray-500 border-gray-500/20"
      default:
        return "bg-gray-500/10 text-gray-500 border-gray-500/20"
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return <Badge className="bg-green-500/10 text-green-500 border-green-500/20">Active</Badge>
      case "expiring":
        return <Badge className="bg-orange-500/10 text-orange-500 border-orange-500/20">Expiring Soon</Badge>
      case "cancelled":
        return <Badge className="bg-red-500/10 text-red-500 border-red-500/20">Cancelled</Badge>
      case "expired":
        return <Badge className="bg-gray-500/10 text-gray-500 border-gray-500/20">Expired</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Monetization & Billing</h1>
        <p className="text-muted-foreground">Manage subscriptions, purchases, and revenue</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 bg-emerald-500/10 rounded-lg">
                <DollarSign className="h-5 w-5 text-emerald-500" />
              </div>
              <div className="flex items-center text-green-500 text-sm">
                <ArrowUpRight className="h-4 w-4" />
                {stats.subscriptionGrowth}
              </div>
            </div>
            <p className="text-2xl font-bold">₱{(stats.subscriptionRevenue / 100).toLocaleString()}</p>
            <p className="text-sm text-muted-foreground">Total Subscription Revenue</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 bg-blue-500/10 rounded-lg">
                <Users className="h-5 w-5 text-blue-500" />
              </div>
              <div className="flex items-center text-green-500 text-sm">
                <ArrowUpRight className="h-4 w-4" />
                {stats.subscriberGrowth}
              </div>
            </div>
            <p className="text-2xl font-bold">{stats.activeSubscribers}</p>
            <p className="text-sm text-muted-foreground">Active Subscribers</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 bg-purple-500/10 rounded-lg">
                <Zap className="h-5 w-5 text-purple-500" />
              </div>
              <div className="flex items-center text-green-500 text-sm">
                <ArrowUpRight className="h-4 w-4" />
                {stats.boostGrowth}
              </div>
            </div>
            <p className="text-2xl font-bold">₱{stats.boostRevenue.toLocaleString()}</p>
            <p className="text-sm text-muted-foreground">Boost Revenue</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 bg-amber-500/10 rounded-lg">
                <Star className="h-5 w-5 text-amber-500" />
              </div>
              <div className="flex items-center text-green-500 text-sm">
                <ArrowUpRight className="h-4 w-4" />
                {stats.featuredGrowth}
              </div>
            </div>
            <p className="text-2xl font-bold">₱{stats.featuredRevenue.toLocaleString()}</p>
            <p className="text-sm text-muted-foreground">Featured Revenue</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">Sales Dashboard</TabsTrigger>
          <TabsTrigger value="plans">Subscription Plans</TabsTrigger>
          <TabsTrigger value="subscribers">User Subscriptions</TabsTrigger>
        </TabsList>

        {/* Sales Dashboard Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Revenue Breakdown</CardTitle>
                <CardDescription>Monthly revenue by source</CardDescription>
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
                      <YAxis className="text-xs" tick={{ fontSize: 12 }} width={50} tickFormatter={(v) => `₱${v}`} />
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
                <CardTitle>Daily Revenue</CardTitle>
                <CardDescription>Revenue this week</CardDescription>
              </CardHeader>
              <CardContent className="overflow-hidden">
                <ChartContainer
                  config={{
                    revenue: { label: "Revenue", color: "hsl(var(--chart-2))" },
                  }}
                  className="h-[300px] w-full min-w-0"
                >
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={dailyRevenueData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="day" className="text-xs" tick={{ fontSize: 12 }} />
                      <YAxis className="text-xs" tick={{ fontSize: 12 }} width={50} tickFormatter={(v) => `₱${v}`} />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Bar dataKey="revenue" fill="hsl(var(--chart-2))" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </ChartContainer>
              </CardContent>
            </Card>
          </div>

          {/* Recent Transactions */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Subscriptions</CardTitle>
              <CardDescription>Latest subscription purchases</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentSales.slice(0, 5).map((sale) => (
                  <div key={sale.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarFallback>{sale.username.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">{sale.username}</p>
                        <p className="text-sm text-muted-foreground">Upgraded to {sale.plan}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-green-500">₱{(sale.amount / 100).toLocaleString()}</p>
                      <p className="text-xs text-muted-foreground">{new Date(sale.createdAt).toLocaleDateString()}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="plans" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {subscriptionPlans.map((plan) => {
              const planColor = plan.id === "free" ? "bg-gray-500" : plan.id === "pro" ? "bg-blue-500" : "bg-amber-500"
              return (
                <Card
                  key={plan.id}
                  className={`relative ${plan.id === "pro" ? "border-primary border-2" : ""} ${plan.id === "elite" ? "border-amber-500/50" : ""}`}
                >
                  {plan.id === "pro" && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <Badge className="bg-primary text-white">Most Popular</Badge>
                    </div>
                  )}
                  {plan.id === "elite" && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <Badge className="bg-amber-500 text-white">Best Value</Badge>
                    </div>
                  )}
                  <CardHeader>
                    <div className="flex items-center gap-2">
                      <div className={`w-3 h-3 rounded-full ${planColor}`} />
                      <CardTitle>{plan.name}</CardTitle>
                      {plan.id === "pro" && <Zap className="h-4 w-4 text-primary" />}
                      {plan.id === "elite" && <Crown className="h-4 w-4 text-amber-500" />}
                    </div>
                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl font-bold">{plan.price}</span>
                      <span className="text-muted-foreground">{plan.period}</span>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2 mb-4">
                      {plan.features.map((feature: string, index: number) => (
                        <li key={index} className="flex items-center gap-2 text-sm">
                          <Check className="w-4 h-4 text-green-500" />
                          {feature}
                        </li>
                      ))}
                    </ul>
                    <div className="pt-4 border-t">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Subscribers</span>
                        <span className="font-bold">{plan.subscribers.toLocaleString()}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </TabsContent>

        {/* User Subscriptions Tab */}
        <TabsContent value="subscribers" className="space-y-4">
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by username or email..."
                className="pl-9"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Select value={planFilter} onValueChange={setPlanFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Plan" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Plans</SelectItem>
                <SelectItem value="elite">Elite</SelectItem>
                <SelectItem value="pro">Pro</SelectItem>
                <SelectItem value="free">Free</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="expiring">Expiring</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Subscribers List */}
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="text-left p-4 font-medium">User</th>
                      <th className="text-left p-4 font-medium">Plan</th>
                      <th className="text-left p-4 font-medium">Status</th>
                      <th className="text-left p-4 font-medium">Start Date</th>
                      <th className="text-left p-4 font-medium">Renewal</th>
                      <th className="text-left p-4 font-medium">Total Spent</th>
                      <th className="text-left p-4 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {userSubscriptions.map((user) => (
                      <tr key={user.id} className="border-b hover:bg-muted/30">
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            <Avatar className="h-9 w-9">
                              <AvatarFallback>{user.avatar}</AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium">{user.username}</p>
                              <p className="text-sm text-muted-foreground">{user.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="p-4">
                          <Badge variant="outline" className={getPlanBadgeColor(user.plan)}>
                            {user.plan === "Elite" && <Crown className="h-3 w-3 mr-1" />}
                            {user.plan === "Pro" && <Zap className="h-3 w-3 mr-1" />}
                            {user.plan}
                          </Badge>
                        </td>
                        <td className="p-4">{getStatusBadge(user.status)}</td>
                        <td className="p-4 text-sm">{user.startDate}</td>
                        <td className="p-4 text-sm">{user.renewDate}</td>
                        <td className="p-4 font-medium">{user.spent}</td>
                        <td className="p-4">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleAdjustPlan(user, "extend")}>
                                <Calendar className="h-4 w-4 mr-2" />
                                Extend Subscription
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleAdjustPlan(user, "upgrade")}>
                                <ArrowUp className="h-4 w-4 mr-2" />
                                Upgrade Plan
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleAdjustPlan(user, "refund")}>
                                <RefreshCcw className="h-4 w-4 mr-2" />
                                Issue Refund
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => handleAdjustPlan(user, "cancel")}
                                className="text-red-500"
                              >
                                <CreditCard className="h-4 w-4 mr-2" />
                                Cancel Subscription
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Adjust Plan Dialog */}
      <Dialog open={adjustDialogOpen} onOpenChange={setAdjustDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {adjustAction === "extend" && "Extend Subscription"}
              {adjustAction === "upgrade" && "Upgrade Plan"}
              {adjustAction === "refund" && "Issue Refund"}
              {adjustAction === "cancel" && "Cancel Subscription"}
            </DialogTitle>
            <DialogDescription>
              {adjustAction === "extend" && `Extend subscription for ${selectedUser?.username}`}
              {adjustAction === "upgrade" && `Upgrade plan for ${selectedUser?.username}`}
              {adjustAction === "refund" && `Issue refund to ${selectedUser?.username}`}
              {adjustAction === "cancel" && `Cancel subscription for ${selectedUser?.username}`}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {adjustAction === "extend" && (
              <div className="space-y-2">
                <Label>Extension Period</Label>
                <Select value={extensionDays} onValueChange={setExtensionDays}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="7">7 days</SelectItem>
                    <SelectItem value="14">14 days</SelectItem>
                    <SelectItem value="30">30 days</SelectItem>
                    <SelectItem value="90">90 days</SelectItem>
                    <SelectItem value="365">1 year</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {adjustAction === "upgrade" && (
              <div className="space-y-2">
                <Label>New Plan</Label>
                <Select value={newPlan} onValueChange={setNewPlan}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PRO">Pro (₱199/mo)</SelectItem>
                    <SelectItem value="ELITE">Elite (₱499/mo)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {adjustAction === "refund" && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Refund Amount (in pesos)</Label>
                  <Input 
                    type="number" 
                    placeholder="0.00" 
                    value={refundAmount}
                    onChange={(e) => setRefundAmount(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Reason</Label>
                  <Select value={refundReason} onValueChange={setRefundReason}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="request">Customer Request</SelectItem>
                      <SelectItem value="error">Billing Error</SelectItem>
                      <SelectItem value="service">Service Issue</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            {adjustAction === "cancel" && (
              <div className="p-4 bg-red-500/10 rounded-lg border border-red-500/20">
                <p className="text-sm text-red-500">
                  This will immediately cancel the subscription for {selectedUser?.username}. They will lose access to
                  premium features at the end of their billing period.
                </p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setAdjustDialogOpen(false)} disabled={actionLoading}>
              Cancel
            </Button>
            <Button
              variant={adjustAction === "cancel" || adjustAction === "refund" ? "destructive" : "default"}
              onClick={executeAdjustAction}
              disabled={actionLoading}
            >
              {actionLoading ? "Processing..." : (
                <>
                  {adjustAction === "extend" && "Extend"}
                  {adjustAction === "upgrade" && "Upgrade"}
                  {adjustAction === "refund" && "Issue Refund"}
                  {adjustAction === "cancel" && "Cancel Subscription"}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
