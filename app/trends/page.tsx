"use client"

import { useState, useEffect } from "react"
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
import { getMarketTrends, getPopularGames, getTopSellingItems, getMostViewedListings } from "@/app/actions/trends"

export default function TrendsPage() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState("overview")
  const [marketTrends, setMarketTrends] = useState<Array<any>>([])
  const [popularGames, setPopularGames] = useState<Array<any>>([])
  const [topSellingItems, setTopSellingItems] = useState<Array<any>>([])
  const [mostViewedListings, setMostViewedListings] = useState<Array<any>>([])
  const [loading, setLoading] = useState(true)

  // Load market data on mount
  useEffect(() => {
    const loadData = async () => {
      try {
        const [trendsResult, gamesResult, sellingResult, viewedResult] = await Promise.all([
          getMarketTrends(30),
          getPopularGames(5),
          getTopSellingItems(5),
          getMostViewedListings(5),
        ])

        if (trendsResult.success && trendsResult.data) setMarketTrends(trendsResult.data)
        if (gamesResult.success && gamesResult.data) setPopularGames(gamesResult.data)
        if (sellingResult.success && sellingResult.data) setTopSellingItems(sellingResult.data)
        if (viewedResult.success && viewedResult.data) setMostViewedListings(viewedResult.data)
      } catch (err) {
        console.error("Failed to load market data:", err)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [])

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


            </TabsContent>

            {/* Trends Tab */}
            <TabsContent value="trends" className="space-y-6">
              {/* Price Trends Chart */}
              <Card>
                <CardHeader>
                  <CardTitle>Market Volume Trends (30 Days)</CardTitle>
                  <CardDescription>Average transaction price and daily volume</CardDescription>
                </CardHeader>
                <CardContent>
                  {marketTrends.length > 0 ? (
                    <ResponsiveContainer width="100%" height={400}>
                      <AreaChart data={marketTrends}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" />
                        <YAxis yAxisId="left" />
                        <YAxis yAxisId="right" orientation="right" />
                        <Tooltip formatter={(value) => `₱${value.toLocaleString()}`} />
                        <Legend />
                        <Area
                          yAxisId="left"
                          type="monotone"
                          dataKey="avgPrice"
                          stroke="#3b82f6"
                          fill="#3b82f6"
                          fillOpacity={0.2}
                          name="Avg Price"
                        />
                        <Area
                          yAxisId="right"
                          type="monotone"
                          dataKey="transactions"
                          stroke="#10b981"
                          fill="#10b981"
                          fillOpacity={0.2}
                          name="Transactions"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="text-center py-12">
                      <p className="text-muted-foreground">No data available yet</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Most Viewed Items */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Eye className="w-5 h-5" />
                    Most Viewed Items
                  </CardTitle>
                  <CardDescription>Items with highest engagement</CardDescription>
                </CardHeader>
                <CardContent>
                  {mostViewedListings.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="border-b">
                          <tr>
                            <th className="text-left py-2 font-semibold">Item</th>
                            <th className="text-center py-2 font-semibold">Views</th>
                            <th className="text-center py-2 font-semibold">Inquiries</th>
                          </tr>
                        </thead>
                        <tbody>
                          {mostViewedListings.map((item, idx) => (
                            <tr key={idx} className="border-b hover:bg-accent/50 transition">
                              <td className="py-3 font-semibold">{item.title}</td>
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
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <p className="text-muted-foreground">No data available yet</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Popular Games */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="w-5 h-5" />
                    Most Popular Games
                  </CardTitle>
                  <CardDescription>Games with most active listings and engagement</CardDescription>
                </CardHeader>
                <CardContent>
                  {popularGames.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={popularGames}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="game" angle={-45} textAnchor="end" height={100} interval={0} />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="listings" fill="#3b82f6" name="Active Listings" />
                        <Bar dataKey="totalViews" fill="#10b981" name="Total Views" />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="text-center py-12">
                      <p className="text-muted-foreground">No data available yet</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="currency" className="space-y-6">
              {/* Currency Rate Trends - Placeholder for now */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Coins className="w-5 h-5" />
                    Currency Trading Info
                  </CardTitle>
                  <CardDescription>Information about game currency trading</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-12">
                    <p className="text-muted-foreground">Currency trading features coming soon</p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Sellers Tab */}
            <TabsContent value="sellers" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Top Sellers</CardTitle>
                  <CardDescription>Most active and trusted sellers</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-12">
                    <p className="text-muted-foreground">Seller rankings coming soon</p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Activity Tab */}
            <TabsContent value="activity" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Recent Activity</CardTitle>
                  <CardDescription>Latest marketplace activity</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-12">
                    <p className="text-muted-foreground">Activity feed coming soon</p>
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
                  <div className="text-center py-12">
                    <p className="text-muted-foreground">Market report coming soon</p>
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
