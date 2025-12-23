"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Navigation from "@/components/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
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
import { TrendingUp, TrendingDown, Flame, Eye, MessageSquare, Users, Activity, Coins, Search, Loader2, ArrowUpDown } from "lucide-react"
import { getMarketTrends, getPopularGames, getTopSellingItems, getMostViewedListings, getTopTraders, getTrendingListings, getRecentActivity } from "@/app/actions/trends"

export default function TrendsPage() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState("overview")
  const [marketTrends, setMarketTrends] = useState<Array<any>>([])
  const [popularGames, setPopularGames] = useState<Array<any>>([])
  const [topSellingItems, setTopSellingItems] = useState<Array<any>>([])
  const [mostViewedListings, setMostViewedListings] = useState<Array<any>>([])
  const [topTraders, setTopTraders] = useState<Array<any>>([])
  const [trendingListings, setTrendingListings] = useState<Array<any>>([])
  const [recentActivity, setRecentActivity] = useState<Array<any>>([])
  const [loading, setLoading] = useState(true)
  
  // Search states for each section
  const [viewedSearch, setViewedSearch] = useState("")
  const [gamesSearch, setGamesSearch] = useState("")
  const [sellersSearch, setSellersSearch] = useState("")
  const [trendingSearch, setTrendingSearch] = useState("")
  const [activitySearch, setActivitySearch] = useState("")

  // Load market data on mount
  useEffect(() => {
    const loadData = async () => {
      try {
        const [trendsResult, gamesResult, sellingResult, viewedResult, tradersResult, trendingResult, activityResult] = await Promise.all([
          getMarketTrends(30),
          getPopularGames(10),
          getTopSellingItems(10),
          getMostViewedListings(10),
          getTopTraders(10),
          getTrendingListings(10),
          getRecentActivity(50),
        ])

        if (trendsResult.success && trendsResult.data) setMarketTrends(trendsResult.data)
        if (gamesResult.success && gamesResult.data) setPopularGames(gamesResult.data)
        if (sellingResult.success && sellingResult.data) setTopSellingItems(sellingResult.data)
        if (viewedResult.success && viewedResult.data) setMostViewedListings(viewedResult.data)
        if (tradersResult.success && tradersResult.data) setTopTraders(tradersResult.data)
        if (trendingResult.success && trendingResult.data) setTrendingListings(trendingResult.data)
        if (activityResult.success && activityResult.data) setRecentActivity(activityResult.data)
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
    router.push(`/listing/${itemId}`)
  }

  // Filter functions for search
  const filteredViewedListings = mostViewedListings.filter((item) =>
    item.title.toLowerCase().includes(viewedSearch.toLowerCase())
  )

  const filteredGames = popularGames.filter((game) =>
    game.game.toLowerCase().includes(gamesSearch.toLowerCase())
  )

  const filteredTraders = topTraders.filter((trader) =>
    trader.username.toLowerCase().includes(sellersSearch.toLowerCase())
  )

  const filteredTrendingListings = trendingListings.filter((listing) =>
    listing.title.toLowerCase().includes(trendingSearch.toLowerCase()) ||
    listing.game.toLowerCase().includes(trendingSearch.toLowerCase())
  )

  const filteredActivity = recentActivity.filter((activity) =>
    activity.buyerUsername.toLowerCase().includes(activitySearch.toLowerCase()) ||
    activity.sellerUsername.toLowerCase().includes(activitySearch.toLowerCase()) ||
    activity.listingTitle.toLowerCase().includes(activitySearch.toLowerCase())
  )

  if (loading) {
    return (
      <>
        <Navigation />
        <main className="min-h-screen bg-background py-8">
          <div className="container mx-auto px-4">
            <div className="flex items-center justify-center h-[600px]">
              <div className="text-center">
                <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4 text-primary" />
                <p className="text-muted-foreground">Loading market trends...</p>
              </div>
            </div>
          </div>
        </main>
      </>
    )
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
              {/* Trending Listings */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <Flame className="w-5 h-5" />
                        Trending Listings
                      </CardTitle>
                      <CardDescription>Most viewed listings right now</CardDescription>
                    </div>
                    <div className="relative w-64">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        placeholder="Search trending..."
                        value={trendingSearch}
                        onChange={(e) => setTrendingSearch(e.target.value)}
                        className="pl-9"
                      />
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {filteredTrendingListings.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {filteredTrendingListings.map((listing) => (
                        <div
                          key={listing.id}
                          onClick={() => handleItemClick(listing.id)}
                          className="flex items-center gap-4 p-4 bg-card border rounded-lg hover:bg-accent/50 transition cursor-pointer hover:shadow-md hover:border-primary"
                        >
                          <img
                            src={listing.image || "/placeholder.svg"}
                            alt={listing.title}
                            className="w-16 h-16 rounded object-cover"
                          />
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold truncate">{listing.title}</p>
                            <p className="text-sm text-muted-foreground">{listing.game}</p>
                            <div className="flex items-center gap-3 mt-1">
                              <p className="text-sm font-bold text-primary">PHP {listing.price.toLocaleString()}</p>
                              <span className="text-xs text-muted-foreground flex items-center gap-1">
                                <Eye className="w-3 h-3" />
                                {listing.views.toLocaleString()} views
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <p className="text-muted-foreground">
                        {trendingSearch ? "No matching listings found" : "No trending listings yet"}
                      </p>
                    </div>
                  )}
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
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <Eye className="w-5 h-5" />
                        Most Viewed Items
                      </CardTitle>
                      <CardDescription>Items with highest engagement</CardDescription>
                    </div>
                    <div className="relative w-64">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        placeholder="Search items..."
                        value={viewedSearch}
                        onChange={(e) => setViewedSearch(e.target.value)}
                        className="pl-9"
                      />
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {filteredViewedListings.length > 0 ? (
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
                          {filteredViewedListings.map((item, idx) => (
                            <tr key={idx} className="border-b hover:bg-accent/50 transition">
                              <td className="py-3 font-semibold">{item.title}</td>
                              <td className="text-center">
                                <span className="flex items-center justify-center gap-1">
                                  <Eye className="w-4 h-4 text-muted-foreground" />
                                  {item.views.toLocaleString()}
                                </span>
                              </td>
                              <td className="text-center">
                                <span className="flex items-center justify-center gap-1">
                                  <MessageSquare className="w-4 h-4 text-muted-foreground" />
                                  {item.inquiries.toLocaleString()}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <p className="text-muted-foreground">
                        {viewedSearch ? "No matching items found" : "No data available yet"}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Popular Games */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <TrendingUp className="w-5 h-5" />
                        Most Popular Games
                      </CardTitle>
                      <CardDescription>Games with most active listings and engagement</CardDescription>
                    </div>
                    <div className="relative w-64">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        placeholder="Search games..."
                        value={gamesSearch}
                        onChange={(e) => setGamesSearch(e.target.value)}
                        className="pl-9"
                      />
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {filteredGames.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={filteredGames}>
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
                      <p className="text-muted-foreground">
                        {gamesSearch ? "No matching games found" : "No data available yet"}
                      </p>
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
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <Users className="w-5 h-5" />
                        Top Sellers
                      </CardTitle>
                      <CardDescription>Most active and trusted sellers</CardDescription>
                    </div>
                    <div className="relative w-64">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        placeholder="Search sellers..."
                        value={sellersSearch}
                        onChange={(e) => setSellersSearch(e.target.value)}
                        className="pl-9"
                      />
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {filteredTraders.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {filteredTraders.map((trader) => (
                        <div
                          key={trader.id}
                          onClick={() => handleSellerClick(trader.id)}
                          className="flex items-center gap-4 p-4 bg-card border rounded-lg hover:bg-accent/50 transition cursor-pointer hover:shadow-md hover:border-primary"
                        >
                          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center text-2xl font-bold">
                            {trader.avatar ? (
                              <img src={trader.avatar} alt={trader.username} className="w-16 h-16 rounded-full object-cover" />
                            ) : (
                              trader.username.charAt(0).toUpperCase()
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold flex items-center gap-2">
                              {trader.username}
                              {trader.verified && (
                                <span className="text-blue-500" title="Verified">✓</span>
                              )}
                            </p>
                            <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                              <span className="flex items-center gap-1">
                                ⭐ {trader.vouch} vouches
                              </span>
                              <span className="flex items-center gap-1">
                                📦 {trader.listings} listings
                              </span>
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                              Joined {new Date(trader.joinDate).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <p className="text-muted-foreground">
                        {sellersSearch ? "No matching sellers found" : "No sellers found"}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Activity Tab */}
            <TabsContent value="activity" className="space-y-6">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <Activity className="w-5 h-5" />
                        Recent Activity
                      </CardTitle>
                      <CardDescription>Latest completed transactions in the marketplace</CardDescription>
                    </div>
                    <div className="relative w-64">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        placeholder="Search activity..."
                        value={activitySearch}
                        onChange={(e) => setActivitySearch(e.target.value)}
                        className="pl-9"
                      />
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {filteredActivity.length > 0 ? (
                    <div className="space-y-3 max-h-[600px] overflow-y-auto">
                      {filteredActivity.map((activity) => (
                        <div
                          key={activity.id}
                          className="flex items-center justify-between p-4 bg-card border rounded-lg hover:bg-accent/50 transition"
                        >
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span
                                className="font-semibold hover:underline cursor-pointer"
                                onClick={() => handleSellerClick(activity.buyerId)}
                              >
                                {activity.buyerUsername}
                              </span>
                              <span className="text-muted-foreground">bought</span>
                              <span className="font-semibold truncate">{activity.listingTitle}</span>
                              <span className="text-muted-foreground">from</span>
                              <span
                                className="font-semibold hover:underline cursor-pointer"
                                onClick={() => handleSellerClick(activity.sellerId)}
                              >
                                {activity.sellerUsername}
                              </span>
                            </div>
                            <div className="flex items-center gap-4 text-sm text-muted-foreground">
                              <span className="font-bold text-primary">
                                PHP {activity.price.toLocaleString()}
                              </span>
                              {activity.amount && (
                                <span>Qty: {activity.amount.toLocaleString()}</span>
                              )}
                              <span>
                                {new Date(activity.completedAt).toLocaleDateString()} at{" "}
                                {new Date(activity.completedAt).toLocaleTimeString([], {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </span>
                            </div>
                          </div>
                          <div className="ml-4">
                            <ArrowUpDown className="w-5 h-5 text-green-500" />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <p className="text-muted-foreground">
                        {activitySearch ? "No matching activity found" : "No completed transactions yet"}
                      </p>
                    </div>
                  )}
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
