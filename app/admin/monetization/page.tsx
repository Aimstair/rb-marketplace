"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
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

const subscriptionPlans = [
  {
    id: "free",
    name: "Free",
    price: "₱0",
    period: "forever",
    features: ["3 listings", "Basic profile", "Standard search visibility", "Standard support"],
    subscribers: 6234,
    color: "bg-gray-500",
  },
  {
    id: "pro",
    name: "Pro",
    price: "₱199",
    period: "/month",
    features: [
      "Up to 10 listings",
      "1 Featured Listing",
      "Priority messaging",
      "Enhanced visibility",
      "Featured badge",
    ],
    subscribers: 1456,
    color: "bg-blue-500",
  },
  {
    id: "elite",
    name: "Elite",
    price: "₱499",
    period: "/month",
    features: ["Up to 30 listings", "3 Featured Listings", "Priority support", "Top visibility", "Elite badge"],
    subscribers: 534,
    color: "bg-amber-500",
  },
]

const revenueData = [
  { month: "Jan", subscriptions: 3200, boosts: 1800, featured: 900 },
  { month: "Feb", subscriptions: 3800, boosts: 2100, featured: 1100 },
  { month: "Mar", subscriptions: 4200, boosts: 2400, featured: 1300 },
  { month: "Apr", subscriptions: 4800, boosts: 2900, featured: 1500 },
  { month: "May", subscriptions: 5400, boosts: 3200, featured: 1700 },
  { month: "Jun", subscriptions: 6100, boosts: 3600, featured: 1900 },
]

const dailyRevenueData = [
  { day: "Mon", revenue: 420 },
  { day: "Tue", revenue: 380 },
  { day: "Wed", revenue: 510 },
  { day: "Thu", revenue: 470 },
  { day: "Fri", revenue: 590 },
  { day: "Sat", revenue: 680 },
  { day: "Sun", revenue: 520 },
]

const userSubscriptions = [
  {
    id: 1,
    username: "EliteTrader99",
    email: "elite@example.com",
    plan: "Elite",
    status: "active",
    startDate: "2024-01-15",
    renewDate: "2025-01-15",
    spent: "₱5,988",
    avatar: "E",
  },
  {
    id: 2,
    username: "NinjaTrader",
    email: "ninja@example.com",
    plan: "Pro",
    status: "active",
    startDate: "2024-03-22",
    renewDate: "2025-03-22",
    spent: "₱1,791",
    avatar: "N",
  },
  {
    id: 3,
    username: "TrustyShopper",
    email: "trusty@example.com",
    plan: "Pro",
    status: "expiring",
    startDate: "2024-06-01",
    renewDate: "2024-12-01",
    spent: "₱1,194",
    avatar: "T",
  },
  {
    id: 4,
    username: "ProTrader2024",
    email: "pro@example.com",
    plan: "Elite",
    status: "cancelled",
    startDate: "2024-02-10",
    renewDate: "-",
    spent: "₱4,990",
    avatar: "P",
  },
  {
    id: 5,
    username: "FastSeller123",
    email: "fast@example.com",
    plan: "Pro",
    status: "active",
    startDate: "2024-05-15",
    renewDate: "2025-05-15",
    spent: "₱1,393",
    avatar: "F",
  },
]

const boostPurchases = [
  {
    id: 1,
    username: "EliteTrader99",
    type: "24h Boost",
    listing: "Mega Neon Dragon",
    amount: "₱59",
    date: "2024-11-24 14:32",
    status: "active",
  },
  {
    id: 2,
    username: "NinjaTrader",
    type: "7-day Boost",
    listing: "Leopard Blox Fruits",
    amount: "₱199",
    date: "2024-11-24 12:15",
    status: "active",
  },
  {
    id: 3,
    username: "TrustyShopper",
    type: "24h Boost",
    listing: "Godly Knife Bundle",
    amount: "₱59",
    date: "2024-11-23 18:45",
    status: "expired",
  },
  {
    id: 4,
    username: "ProTrader2024",
    type: "Featured Spot",
    listing: "Dominus Empyreus",
    amount: "₱299",
    date: "2024-11-23 10:20",
    status: "active",
  },
  {
    id: 5,
    username: "FastSeller123",
    type: "24h Boost",
    listing: "Shadow Dragon",
    amount: "₱59",
    date: "2024-11-22 22:10",
    status: "expired",
  },
]

const featuredPayments = [
  {
    id: 1,
    username: "EliteTrader99",
    listing: "Mega Neon Dragon",
    slot: "Homepage Banner",
    amount: "₱999",
    duration: "7 days",
    startDate: "2024-11-20",
    endDate: "2024-11-27",
    status: "active",
  },
  {
    id: 2,
    username: "NinjaTrader",
    listing: "Leopard Blox Fruits",
    slot: "Category Featured",
    amount: "₱499",
    duration: "7 days",
    startDate: "2024-11-22",
    endDate: "2024-11-29",
    status: "active",
  },
  {
    id: 3,
    username: "ProTrader2024",
    listing: "Dominus Empyreus",
    slot: "Search Priority",
    amount: "₱299",
    duration: "3 days",
    startDate: "2024-11-21",
    endDate: "2024-11-24",
    status: "expiring",
  },
]

export default function MonetizationPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [planFilter, setPlanFilter] = useState("all")
  const [adjustDialogOpen, setAdjustDialogOpen] = useState(false)
  const [selectedUser, setSelectedUser] = useState<(typeof userSubscriptions)[0] | null>(null)
  const [adjustAction, setAdjustAction] = useState<"extend" | "refund" | "upgrade" | "cancel">("extend")

  const handleAdjustPlan = (
    user: (typeof userSubscriptions)[0],
    action: "extend" | "refund" | "upgrade" | "cancel",
  ) => {
    setSelectedUser(user)
    setAdjustAction(action)
    setAdjustDialogOpen(true)
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
                +18.7%
              </div>
            </div>
            <p className="text-2xl font-bold">₱232,000</p>
            <p className="text-sm text-muted-foreground">Revenue This Month</p>
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
                +12.3%
              </div>
            </div>
            <p className="text-2xl font-bold">1,990</p>
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
                +24.5%
              </div>
            </div>
            <p className="text-2xl font-bold">₱72,000</p>
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
                +15.8%
              </div>
            </div>
            <p className="text-2xl font-bold">₱38,000</p>
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
          <TabsTrigger value="boosts">Boost Purchases</TabsTrigger>
          <TabsTrigger value="featured">Featured Payments</TabsTrigger>
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
              <CardTitle>Recent Transactions</CardTitle>
              <CardDescription>Latest purchases and subscriptions</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[...boostPurchases.slice(0, 3), ...featuredPayments.slice(0, 2)].map((item, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarFallback>{item.username.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">{item.username}</p>
                        <p className="text-sm text-muted-foreground">
                          {"type" in item ? item.type : item.slot} - {"listing" in item ? item.listing : ""}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-green-500">{item.amount}</p>
                      <p className="text-xs text-muted-foreground">{"date" in item ? item.date : item.startDate}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="plans" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {subscriptionPlans.map((plan) => (
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
                    <div className={`w-3 h-3 rounded-full ${plan.color}`} />
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
                    {plan.features.map((feature, index) => (
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
            ))}
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

        {/* Boost Purchases Tab */}
        <TabsContent value="boosts" className="space-y-4">
          <div className="flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search boost purchases..." className="pl-9" />
            </div>
            <Select defaultValue="all">
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="expired">Expired</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="text-left p-4 font-medium">User</th>
                      <th className="text-left p-4 font-medium">Type</th>
                      <th className="text-left p-4 font-medium">Listing</th>
                      <th className="text-left p-4 font-medium">Amount</th>
                      <th className="text-left p-4 font-medium">Date</th>
                      <th className="text-left p-4 font-medium">Status</th>
                      <th className="text-left p-4 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {boostPurchases.map((purchase) => (
                      <tr key={purchase.id} className="border-b hover:bg-muted/30">
                        <td className="p-4">
                          <div className="flex items-center gap-2">
                            <Avatar className="h-8 w-8">
                              <AvatarFallback>{purchase.username.charAt(0)}</AvatarFallback>
                            </Avatar>
                            <span className="font-medium">{purchase.username}</span>
                          </div>
                        </td>
                        <td className="p-4">
                          <Badge variant="outline" className="bg-purple-500/10 text-purple-500 border-purple-500/20">
                            <Zap className="h-3 w-3 mr-1" />
                            {purchase.type}
                          </Badge>
                        </td>
                        <td className="p-4 text-sm max-w-[200px] truncate">{purchase.listing}</td>
                        <td className="p-4 font-medium text-green-500">{purchase.amount}</td>
                        <td className="p-4 text-sm text-muted-foreground">{purchase.date}</td>
                        <td className="p-4">{getStatusBadge(purchase.status)}</td>
                        <td className="p-4">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem>
                                <Receipt className="h-4 w-4 mr-2" />
                                View Receipt
                              </DropdownMenuItem>
                              <DropdownMenuItem>
                                <Clock className="h-4 w-4 mr-2" />
                                Extend Boost
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem className="text-red-500">
                                <RefreshCcw className="h-4 w-4 mr-2" />
                                Refund
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

        {/* Featured Payments Tab */}
        <TabsContent value="featured" className="space-y-4">
          <div className="flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search featured listings..." className="pl-9" />
            </div>
            <Select defaultValue="all">
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Slot" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Slots</SelectItem>
                <SelectItem value="banner">Homepage Banner</SelectItem>
                <SelectItem value="category">Category Featured</SelectItem>
                <SelectItem value="search">Search Priority</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="text-left p-4 font-medium">User</th>
                      <th className="text-left p-4 font-medium">Listing</th>
                      <th className="text-left p-4 font-medium">Slot</th>
                      <th className="text-left p-4 font-medium">Amount</th>
                      <th className="text-left p-4 font-medium">Duration</th>
                      <th className="text-left p-4 font-medium">End Date</th>
                      <th className="text-left p-4 font-medium">Status</th>
                      <th className="text-left p-4 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {featuredPayments.map((payment) => (
                      <tr key={payment.id} className="border-b hover:bg-muted/30">
                        <td className="p-4">
                          <div className="flex items-center gap-2">
                            <Avatar className="h-8 w-8">
                              <AvatarFallback>{payment.username.charAt(0)}</AvatarFallback>
                            </Avatar>
                            <span className="font-medium">{payment.username}</span>
                          </div>
                        </td>
                        <td className="p-4 text-sm max-w-[150px] truncate">{payment.listing}</td>
                        <td className="p-4">
                          <Badge variant="outline" className="bg-amber-500/10 text-amber-500 border-amber-500/20">
                            <Star className="h-3 w-3 mr-1" />
                            {payment.slot}
                          </Badge>
                        </td>
                        <td className="p-4 font-medium text-green-500">{payment.amount}</td>
                        <td className="p-4 text-sm">{payment.duration}</td>
                        <td className="p-4 text-sm text-muted-foreground">{payment.endDate}</td>
                        <td className="p-4">{getStatusBadge(payment.status)}</td>
                        <td className="p-4">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem>
                                <Receipt className="h-4 w-4 mr-2" />
                                View Receipt
                              </DropdownMenuItem>
                              <DropdownMenuItem>
                                <Clock className="h-4 w-4 mr-2" />
                                Extend Featured
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem className="text-red-500">
                                <RefreshCcw className="h-4 w-4 mr-2" />
                                Refund
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
                <Select defaultValue="30">
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
                <Select defaultValue="pro">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pro">Pro (₱199/mo)</SelectItem>
                    <SelectItem value="elite">Elite (₱499/mo)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {adjustAction === "refund" && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Refund Amount</Label>
                  <Input type="text" placeholder="₱0.00" defaultValue={selectedUser?.spent} />
                </div>
                <div className="space-y-2">
                  <Label>Reason</Label>
                  <Select defaultValue="request">
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
            <Button variant="outline" onClick={() => setAdjustDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant={adjustAction === "cancel" || adjustAction === "refund" ? "destructive" : "default"}
              onClick={() => setAdjustDialogOpen(false)}
            >
              {adjustAction === "extend" && "Extend"}
              {adjustAction === "upgrade" && "Upgrade"}
              {adjustAction === "refund" && "Issue Refund"}
              {adjustAction === "cancel" && "Cancel Subscription"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
