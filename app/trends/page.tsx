"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Navigation from "@/components/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  AreaChart,
  Area,
  LineChart,
  Line,
} from "recharts"
import { TrendingUp, TrendingDown, Flame, Eye, MessageSquare, Users, Activity, Coins } from "lucide-react"

export default function TrendsPage() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState("overview")

  const topSellingItems = [
    { rank: 1, item: "Rogue Blade", price: "12,000", sales: 142, trend: "up", change: 12, id: "rogue-blade" },
    { rank: 2, item: "Dominus Astrorum", price: "25,000", sales: 98, trend: "up", change: 8, id: "dominus-astrorum" },
    {
      rank: 3,
      item: "Golden Dragon Pet",
      price: "8,000",
      sales: 76,
      trend: "down",
      change: -3,
      id: "golden-dragon-pet",
    },
    {
      rank: 4,
      item: "Slime Spinner Wheel",
      price: "150",
      sales: 234,
      trend: "up",
      change: 15,
      id: "slime-spinner-wheel",
    },
    {
      rank: 5,
      item: "Sparkle Time Fedora",
      price: "3,500",
      sales: 89,
      trend: "up",
      change: 5,
      id: "sparkle-time-fedora",
    },
  ]

  const topRisingItems = [
    {
      item: "Neon Cat Pet",
      price: "9,000",
      momentum: 87,
      viewsChange: "+245%",
      inquiriesChange: "+178%",
      badge: true,
      id: "neon-cat-pet",
    },
    {
      item: "Galaxy Cape",
      price: "10,000",
      momentum: 82,
      viewsChange: "+198%",
      inquiriesChange: "+156%",
      badge: true,
      id: "galaxy-cape",
    },
    {
      item: "Cyber Wings",
      price: "7,500",
      momentum: 75,
      viewsChange: "+142%",
      inquiriesChange: "+112%",
      badge: true,
      id: "cyber-wings",
    },
    {
      item: "Mystical Staff",
      price: "6,800",
      momentum: 68,
      viewsChange: "+118%",
      inquiriesChange: "+95%",
      badge: false,
      id: "mystical-staff",
    },
    {
      item: "Diamond Crown",
      price: "6,200",
      momentum: 62,
      viewsChange: "+89%",
      inquiriesChange: "+76%",
      badge: false,
      id: "diamond-crown",
    },
  ]

  const mostListedItems = [
    {
      item: "Rogue Blade",
      price: "12,000",
      listings: 342,
      lowestPrice: "11,000",
      highestPrice: "15,000",
      id: "rogue-blade",
    },
    {
      item: "Slime Spinner Wheel",
      price: "150",
      listings: 289,
      lowestPrice: "120",
      highestPrice: "200",
      id: "slime-spinner-wheel",
    },
    {
      item: "Sparkle Time Fedora",
      price: "3,500",
      listings: 256,
      lowestPrice: "300",
      highestPrice: "450",
      id: "sparkle-time-fedora",
    },
    {
      item: "Classic Fedora",
      price: "50",
      listings: 198,
      lowestPrice: "50",
      highestPrice: "150",
      id: "classic-fedora",
    },
    {
      item: "Cat Bloxy Award",
      price: "8,000",
      listings: 167,
      lowestPrice: "800",
      highestPrice: "1,200",
      id: "cat-bloxy-award",
    },
  ]

  const priceTrendData = [
    { date: "Mon", price: 1100, floor: 950, volume: 45 },
    { date: "Tue", price: 1150, floor: 980, volume: 52 },
    { date: "Wed", price: 1180, floor: 1000, volume: 48 },
    { date: "Thu", price: 1220, floor: 1050, volume: 61 },
    { date: "Fri", price: 1250, floor: 1100, volume: 72 },
    { date: "Sat", price: 1280, floor: 1120, volume: 89 },
    { date: "Sun", price: 1300, floor: 1150, volume: 95 },
  ]

  const mostViewedItems = [
    { item: "Rogue Blade", views: 3420, inquiries: 287, conversion: "8.4%" },
    { item: "Dominus Astrorum", views: 2890, inquiries: 198, conversion: "6.8%" },
    { item: "Golden Dragon Pet", views: 2456, inquiries: 156, conversion: "6.3%" },
    { item: "Galaxy Cape", views: 2234, inquiries: 189, conversion: "8.5%" },
    { item: "Neon Cat Pet", views: 1987, inquiries: 167, conversion: "8.4%" },
  ]

  const categoryData = [
    { category: "Limited Items", listings: 892, sales: 156, avgPrice: 1450 },
    { category: "UGC Items", listings: 1234, sales: 203, avgPrice: 620 },
    { category: "Clothes", listings: 2456, sales: 412, avgPrice: 280 },
    { category: "Game Passes", listings: 567, sales: 89, avgPrice: 450 },
    { category: "In-Game Items", listings: 3421, sales: 678, avgPrice: 380 },
    { category: "Services", listings: 234, sales: 34, avgPrice: 1200 },
  ]

  const activityFeed = [
    { event: "A seller just listed Rogue Blade for 12,000 Robux", time: "2 minutes ago" },
    { event: "Someone marked Dominus Astrorum as sold", time: "5 minutes ago" },
    { event: "Galaxy Cape just reached 500+ views", time: "8 minutes ago" },
    { event: "A seller reached 50 vouches milestone", time: "12 minutes ago" },
    { event: "A seller just listed Neon Cat Pet for 850 Robux", time: "15 minutes ago" },
  ]

  const topSellers = [
    { rank: 1, id: "seller-001", username: "Seller_Alpha", vouches: 287, sales: 542, rating: 4.9 },
    { rank: 2, id: "seller-002", username: "Seller_Beta", vouches: 234, sales: 489, rating: 4.8 },
    { rank: 3, id: "seller-003", username: "Seller_Gamma", vouches: 198, sales: 412, rating: 4.7 },
    { rank: 4, id: "seller-004", username: "Seller_Delta", vouches: 176, sales: 356, rating: 4.6 },
    { rank: 5, id: "seller-005", username: "Seller_Epsilon", vouches: 154, sales: 298, rating: 4.5 },
  ]

  const marketReport = {
    topSellingItem: "Rogue Blade",
    highestPriceIncrease: "Neon Cat Pet (+34%)",
    fastestGrowingCategory: "Limited Items",
    userMostVouches: "Seller_Alpha",
    mostViewedListing: "Rogue Blade",
  }

  const currencyRateTrends = [
    { date: "Mon", robux: 2.8, adoptMe: 450, bloxFruits: 8, petSim: 950 },
    { date: "Tue", robux: 2.9, adoptMe: 460, bloxFruits: 8.5, petSim: 980 },
    { date: "Wed", robux: 3.0, adoptMe: 480, bloxFruits: 9, petSim: 1000 },
    { date: "Thu", robux: 2.95, adoptMe: 470, bloxFruits: 9.2, petSim: 1020 },
    { date: "Fri", robux: 3.1, adoptMe: 490, bloxFruits: 9.5, petSim: 1050 },
    { date: "Sat", robux: 3.2, adoptMe: 500, bloxFruits: 10, petSim: 1080 },
    { date: "Sun", robux: 3.15, adoptMe: 495, bloxFruits: 9.8, petSim: 1100 },
  ]

  const topCurrencySellers = [
    {
      rank: 1,
      seller: "TrustTrader",
      currency: "Robux",
      rate: 3.2,
      stock: 50000,
      vouches: 156,
      trend: "up",
      change: 8,
    },
    {
      rank: 2,
      seller: "CoinMaster",
      currency: "Adopt Me Coins",
      rate: 500,
      stock: 2000000,
      vouches: 134,
      trend: "up",
      change: 12,
    },
    {
      rank: 3,
      seller: "TokenKing",
      currency: "Pet Sim Tokens",
      rate: 1100,
      stock: 8000000,
      vouches: 198,
      trend: "up",
      change: 5,
    },
    {
      rank: 4,
      seller: "GemTrader",
      currency: "Blox Fruits Gems",
      rate: 10,
      stock: 25000,
      vouches: 89,
      trend: "down",
      change: -3,
    },
    {
      rank: 5,
      seller: "FastDelivery",
      currency: "Robux",
      rate: 2.8,
      stock: 35000,
      vouches: 112,
      trend: "stable",
      change: 0,
    },
  ]

  const currencyVolume = [
    { currency: "Robux", volume: 2450000, transactions: 892, avgRate: 3.0 },
    { currency: "Adopt Me Coins", volume: 15000000, transactions: 456, avgRate: 480 },
    { currency: "Blox Fruits Gems", volume: 180000, transactions: 234, avgRate: 9.2 },
    { currency: "Pet Sim Tokens", volume: 45000000, transactions: 178, avgRate: 1020 },
  ]

  const currencyPriceHistory = [
    { week: "Week 1", robux: 2.5, change: 0 },
    { week: "Week 2", robux: 2.6, change: 4 },
    { week: "Week 3", robux: 2.8, change: 7.7 },
    { week: "Week 4", robux: 3.0, change: 7.1 },
    { week: "Week 5", robux: 3.1, change: 3.3 },
    { week: "Week 6", robux: 3.15, change: 1.6 },
  ]

  const handleSellerClick = (sellerId: string) => {
    router.push(`/profile/${sellerId}`)
  }

  const handleItemClick = (itemId: string) => {
    router.push(`/marketplace?item=${encodeURIComponent(itemId)}`)
  }

  return (
    <>
      <Navigation />
      <main className="min-h-screen bg-background py-8">
        <div className="container mx-auto px-4">
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-balance">Marketplace Trends</h1>
            <p className="text-muted-foreground mt-2">
              Real-time insights and trends from the Roblox trading marketplace
            </p>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-3 lg:grid-cols-6 mb-6">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="trends">Trends</TabsTrigger>
              <TabsTrigger value="currency">Currency</TabsTrigger>
              <TabsTrigger value="sellers">Top Sellers</TabsTrigger>
              <TabsTrigger value="activity">Activity</TabsTrigger>
              <TabsTrigger value="report">Report</TabsTrigger>
            </TabsList>

            {/* Overview Tab */}
            <TabsContent value="overview" className="space-y-6">
              {/* Top Selling Items */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="w-5 h-5" />
                    Top Selling Items (24h)
                  </CardTitle>
                  <CardDescription>Items ranked by number of successful sales today</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {topSellingItems.map((item) => (
                      <div
                        key={item.rank}
                        onClick={() => handleItemClick(item.id)}
                        className="flex items-center justify-between p-3 bg-card border rounded-lg hover:bg-accent/50 transition cursor-pointer hover:shadow-md hover:border-primary"
                      >
                        <div className="flex items-center gap-4 flex-1">
                          <div className="font-bold text-lg text-primary">{item.rank}</div>
                          <div>
                            <p className="font-semibold">{item.item}</p>
                            <p className="text-sm text-muted-foreground">{item.price} Robux</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-bold">{item.sales} sales</p>
                          <p
                            className={`text-sm flex items-center justify-end gap-1 ${item.trend === "up" ? "text-green-600" : "text-red-600"}`}
                          >
                            {item.trend === "up" ? (
                              <TrendingUp className="w-4 h-4" />
                            ) : (
                              <TrendingDown className="w-4 h-4" />
                            )}
                            {Math.abs(item.change)}% vs yesterday
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Top Rising Items */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Flame className="w-5 h-5 text-orange-500" />
                    Top Rising Items (Momentum)
                  </CardTitle>
                  <CardDescription>Items with rapidly increasing activity and interest</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {topRisingItems.map((item, idx) => (
                      <div
                        key={idx}
                        onClick={() => handleItemClick(item.id)}
                        className="flex items-center justify-between p-3 bg-card border rounded-lg hover:bg-accent/50 transition cursor-pointer hover:shadow-md hover:border-primary"
                      >
                        <div className="flex items-center gap-3 flex-1">
                          {item.badge && (
                            <span className="px-2 py-1 bg-orange-100 text-orange-800 text-xs font-bold rounded dark:bg-orange-900 dark:text-orange-200">
                              TRENDING
                            </span>
                          )}
                          <div>
                            <p className="font-semibold">{item.item}</p>
                            <p className="text-sm text-muted-foreground">
                              {item.viewsChange} views, {item.inquiriesChange} inquiries
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="w-12 h-8 bg-gradient-to-r from-primary/20 to-primary rounded flex items-center justify-center">
                            <p className="font-bold text-sm">{item.momentum}</p>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">Momentum Score</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Most Listed Items */}
              <Card>
                <CardHeader>
                  <CardTitle>Most Listed Items</CardTitle>
                  <CardDescription>Items with the highest number of active listings</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="border-b">
                        <tr>
                          <th className="text-left py-2 font-semibold">Item</th>
                          <th className="text-center py-2 font-semibold">Listings</th>
                          <th className="text-right py-2 font-semibold">Price Range</th>
                        </tr>
                      </thead>
                      <tbody>
                        {mostListedItems.map((item, idx) => (
                          <tr
                            key={idx}
                            onClick={() => handleItemClick(item.id)}
                            className="border-b hover:bg-accent/50 transition cursor-pointer"
                          >
                            <td className="py-3">{item.item}</td>
                            <td className="text-center font-semibold text-primary">{item.listings}</td>
                            <td className="text-right text-muted-foreground">
                              {item.lowestPrice} - {item.highestPrice} Robux
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Trends Tab */}
            <TabsContent value="trends" className="space-y-6">
              {/* Price Trends Chart */}
              <Card>
                <CardHeader>
                  <CardTitle>Price Trends - Rogue Blade (7 Days)</CardTitle>
                  <CardDescription>Average selling price vs floor price and sales volume</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={400}>
                    <AreaChart data={priceTrendData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis yAxisId="left" />
                      <YAxis yAxisId="right" orientation="right" />
                      <Tooltip />
                      <Legend />
                      <Area
                        yAxisId="left"
                        type="monotone"
                        dataKey="price"
                        stroke="#3b82f6"
                        fill="#3b82f6"
                        fillOpacity={0.2}
                        name="Avg Price"
                      />
                      <Area
                        yAxisId="left"
                        type="monotone"
                        dataKey="floor"
                        stroke="#10b981"
                        fill="#10b981"
                        fillOpacity={0.2}
                        name="Floor Price"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Most Viewed Items */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Eye className="w-5 h-5" />
                    Most Viewed & Inquired Items
                  </CardTitle>
                  <CardDescription>Items with highest engagement and conversion rates</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="border-b">
                        <tr>
                          <th className="text-left py-2 font-semibold">Item</th>
                          <th className="text-center py-2 font-semibold">Views</th>
                          <th className="text-center py-2 font-semibold">Inquiries</th>
                          <th className="text-right py-2 font-semibold">Conversion</th>
                        </tr>
                      </thead>
                      <tbody>
                        {mostViewedItems.map((item, idx) => (
                          <tr key={idx} className="border-b hover:bg-accent/50 transition">
                            <td className="py-3 font-semibold">{item.item}</td>
                            <td className="text-center">
                              <span className="flex items-center justify-center gap-1">
                                <Eye className="w-4 h-4 text-muted-foreground" />
                                {item.views}
                              </span>
                            </td>
                            <td className="text-center">
                              <span className="flex items-center justify-center gap-1">
                                <MessageSquare className="w-4 h-4 text-muted-foreground" />
                                {item.inquiries}
                              </span>
                            </td>
                            <td className="text-right font-semibold text-primary">{item.conversion}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>

              {/* Category Heatmap */}
              <Card>
                <CardHeader>
                  <CardTitle>Category Heat Map</CardTitle>
                  <CardDescription>Activity and sales performance by item category</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={categoryData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="category" angle={-45} textAnchor="end" height={100} interval={0} />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="listings" fill="#3b82f6" name="Listings" />
                      <Bar dataKey="sales" fill="#10b981" name="Sales" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="currency" className="space-y-6">
              {/* Currency Rate Trends */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Coins className="w-5 h-5" />
                    Currency Rate Trends (7 Days)
                  </CardTitle>
                  <CardDescription>Average rates per ₱1 PHP across different game currencies</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={400}>
                    <LineChart data={currencyRateTrends}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis yAxisId="left" />
                      <YAxis yAxisId="right" orientation="right" />
                      <Tooltip />
                      <Legend />
                      <Line
                        yAxisId="left"
                        type="monotone"
                        dataKey="robux"
                        stroke="#3b82f6"
                        strokeWidth={2}
                        name="Robux/₱1"
                      />
                      <Line
                        yAxisId="right"
                        type="monotone"
                        dataKey="adoptMe"
                        stroke="#10b981"
                        strokeWidth={2}
                        name="Adopt Me Coins/₱1"
                      />
                      <Line
                        yAxisId="left"
                        type="monotone"
                        dataKey="bloxFruits"
                        stroke="#f59e0b"
                        strokeWidth={2}
                        name="Blox Fruits Gems/₱1"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Currency Volume Stats */}
              <div className="grid md:grid-cols-4 gap-4">
                {currencyVolume.map((currency, idx) => (
                  <Card key={idx}>
                    <CardContent className="pt-6">
                      <div className="text-center">
                        <p className="text-sm text-muted-foreground">{currency.currency}</p>
                        <p className="text-2xl font-bold text-primary mt-1">{currency.volume.toLocaleString()}</p>
                        <p className="text-xs text-muted-foreground mt-1">Total Volume (24h)</p>
                        <div className="mt-3 pt-3 border-t">
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Transactions</span>
                            <span className="font-semibold">{currency.transactions}</span>
                          </div>
                          <div className="flex justify-between text-sm mt-1">
                            <span className="text-muted-foreground">Avg Rate</span>
                            <span className="font-semibold">{currency.avgRate}/₱1</span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Top Currency Sellers */}
              <Card>
                <CardHeader>
                  <CardTitle>Top Currency Sellers</CardTitle>
                  <CardDescription>Most active and trusted currency sellers this week</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {topCurrencySellers.map((seller) => (
                      <div
                        key={seller.rank}
                        className="flex items-center justify-between p-4 bg-card border rounded-lg hover:bg-accent/50 transition"
                      >
                        <div className="flex items-center gap-4 flex-1">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-primary/50 flex items-center justify-center">
                            <span className="font-bold text-primary-foreground">{seller.rank}</span>
                          </div>
                          <div>
                            <p className="font-semibold">{seller.seller}</p>
                            <p className="text-sm text-muted-foreground">{seller.currency}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-6">
                          <div className="text-center">
                            <p className="text-sm text-muted-foreground">Rate</p>
                            <p className="font-bold text-primary">{seller.rate}/₱1</p>
                          </div>
                          <div className="text-center">
                            <p className="text-sm text-muted-foreground">Stock</p>
                            <p className="font-bold">{seller.stock.toLocaleString()}</p>
                          </div>
                          <div className="text-center">
                            <p className="text-sm text-muted-foreground">Vouches</p>
                            <p className="font-bold">{seller.vouches}</p>
                          </div>
                          <div className="text-right min-w-[80px]">
                            <p
                              className={`text-sm flex items-center justify-end gap-1 ${
                                seller.trend === "up"
                                  ? "text-green-600"
                                  : seller.trend === "down"
                                    ? "text-red-600"
                                    : "text-muted-foreground"
                              }`}
                            >
                              {seller.trend === "up" ? (
                                <TrendingUp className="w-4 h-4" />
                              ) : seller.trend === "down" ? (
                                <TrendingDown className="w-4 h-4" />
                              ) : null}
                              {seller.change !== 0 ? `${Math.abs(seller.change)}%` : "Stable"}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Robux Price History */}
              <Card>
                <CardHeader>
                  <CardTitle>Robux Rate History (6 Weeks)</CardTitle>
                  <CardDescription>Historical average Robux per ₱1 PHP rate</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <AreaChart data={currencyPriceHistory}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="week" />
                      <YAxis domain={[2, 4]} />
                      <Tooltip />
                      <Area
                        type="monotone"
                        dataKey="robux"
                        stroke="#3b82f6"
                        fill="#3b82f6"
                        fillOpacity={0.2}
                        name="Robux/₱1"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                  <div className="mt-4 grid grid-cols-3 gap-4 text-center">
                    <div className="p-3 bg-muted rounded-lg">
                      <p className="text-sm text-muted-foreground">6-Week Low</p>
                      <p className="text-xl font-bold text-red-600">2.5/₱1</p>
                    </div>
                    <div className="p-3 bg-muted rounded-lg">
                      <p className="text-sm text-muted-foreground">Current Rate</p>
                      <p className="text-xl font-bold text-primary">3.15/₱1</p>
                    </div>
                    <div className="p-3 bg-muted rounded-lg">
                      <p className="text-sm text-muted-foreground">6-Week High</p>
                      <p className="text-xl font-bold text-green-600">3.2/₱1</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Sellers Tab */}
            <TabsContent value="sellers" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="w-5 h-5" />
                    Top Sellers Leaderboard (Anonymous)
                  </CardTitle>
                  <CardDescription>This month's most successful sellers by sales volume</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {topSellers.map((seller) => (
                      <div
                        key={seller.rank}
                        onClick={() => handleSellerClick(seller.id)}
                        className="flex items-center justify-between p-4 bg-card border rounded-lg hover:bg-accent/50 transition cursor-pointer hover:shadow-md hover:border-primary"
                      >
                        <div className="flex items-center gap-4 flex-1">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-primary/50 flex items-center justify-center">
                            <span className="font-bold text-primary-foreground">{seller.rank}</span>
                          </div>
                          <div>
                            <p className="font-semibold">{seller.username}</p>
                            <p className="text-sm text-muted-foreground">Verified Seller</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="flex items-center gap-6">
                            <div>
                              <p className="text-sm text-muted-foreground">Vouches</p>
                              <p className="font-bold text-primary">{seller.vouches}</p>
                            </div>
                            <div>
                              <p className="text-sm text-muted-foreground">Sales</p>
                              <p className="font-bold">{seller.sales}</p>
                            </div>
                            <div>
                              <p className="text-sm text-muted-foreground">Rating</p>
                              <p className="font-bold flex items-center gap-1">
                                <span className="text-yellow-500">★</span> {seller.rating}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Activity Tab */}
            <TabsContent value="activity" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="w-5 h-5" />
                    Real-Time Activity Feed
                  </CardTitle>
                  <CardDescription>Live marketplace events (anonymized for privacy)</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {activityFeed.map((activity, idx) => (
                      <div key={idx} className="flex gap-4 p-4 bg-card border rounded-lg hover:bg-accent/50 transition">
                        <div className="w-2 h-2 rounded-full bg-primary mt-2 flex-shrink-0" />
                        <div className="flex-1">
                          <p className="text-foreground">{activity.event}</p>
                          <p className="text-xs text-muted-foreground mt-1">{activity.time}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Report Tab */}
            <TabsContent value="report" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Market Report</CardTitle>
                  <CardDescription>Auto-generated summary of today's marketplace activity</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="p-4 bg-primary/10 rounded-lg border border-primary/20">
                      <p className="text-sm text-muted-foreground">Top Selling Item</p>
                      <p className="text-2xl font-bold text-primary mt-1">{marketReport.topSellingItem}</p>
                    </div>
                    <div className="p-4 bg-green-500/10 rounded-lg border border-green-500/20">
                      <p className="text-sm text-muted-foreground">Highest Price Increase</p>
                      <p className="text-2xl font-bold text-green-600 mt-1">{marketReport.highestPriceIncrease}</p>
                    </div>
                    <div className="p-4 bg-orange-500/10 rounded-lg border border-orange-500/20">
                      <p className="text-sm text-muted-foreground">Fastest Growing Category</p>
                      <p className="text-2xl font-bold text-orange-600 mt-1">{marketReport.fastestGrowingCategory}</p>
                    </div>
                    <div className="p-4 bg-blue-500/10 rounded-lg border border-blue-500/20">
                      <p className="text-sm text-muted-foreground">User with Most Vouches Gained</p>
                      <p className="text-2xl font-bold text-blue-600 mt-1">{marketReport.userMostVouches}</p>
                    </div>
                  </div>

                  <div className="p-4 bg-card border rounded-lg">
                    <h3 className="font-semibold mb-3">Report Summary</h3>
                    <ul className="space-y-2 text-sm text-muted-foreground">
                      <li>
                        • {topSellingItems[0].sales} units of {topSellingItems[0].item} sold today
                      </li>
                      <li>• {marketReport.highestPriceIncrease} shows strong market momentum</li>
                      <li>• {categoryData[4].listings} total listings in most popular category</li>
                      <li>• Average marketplace activity up 15% compared to yesterday</li>
                      <li>• Most viewed item received {mostViewedItems[0].views} impressions</li>
                      <li>• Currency market: Robux rate increased to 3.15/₱1 (+1.6% this week)</li>
                    </ul>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </>
  )
}
