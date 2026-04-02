"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { useRouter } from "next/navigation"
import Navigation from "@/components/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
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
import { TrendingUp, TrendingDown, Flame, Eye, MessageSquare, Users, Activity, Coins, Search, Loader2, ArrowUpDown, ShoppingBag, Wallet, BarChart3, FileText } from "lucide-react"
import {
  dispatchRetentionWatchlistAlerts,
  getCurrencyMarketTrends,
  getMarketTrends,
  getMostViewedListings,
  getPopularGames,
  getRecentActivity,
  getRetentionWatchlist,
  getTrendsAlertSignals,
  getTopSellingItems,
  getTopTraders,
  getTrendingListings,
  getTrendsOverviewMetrics,
  trackTrendsInteractionsBatch,
  trackTrendsInteraction,
} from "@/app/actions/trends"
import { getUserPreferences, updateUserPreferences } from "@/app/actions/profile"

type TimeRangeKey = "7d" | "30d" | "90d"

const RANGE_TO_DAYS: Record<TimeRangeKey, number> = {
  "7d": 7,
  "30d": 30,
  "90d": 90,
}

const RANGE_LABEL: Record<TimeRangeKey, string> = {
  "7d": "Last 7 days",
  "30d": "Last 30 days",
  "90d": "Last 90 days",
}

interface TrendsOverviewMetrics {
  activeListings: { value: number; change: number }
  activeTraders: { value: number; change: number }
  completedTransactions: { value: number; change: number }
  tradeVolume: { value: number; change: number }
  averagePrice: { value: number; change: number }
}

interface TrendsAlertSignals {
  followedSellers: Array<{
    sellerId: string
    sellerUsername: string
    completedTrades: number
    tradeVolume: number
    change: number
  }>
  watchedGames: Array<{
    gameId: string
    game: string
    completedTrades: number
    change: number
  }>
  priceMoves: Array<{
    gameId: string
    game: string
    currentAvgPrice: number
    previousAvgPrice: number
    change: number
  }>
}

interface TrendsAlertPreferences {
  followedSellerAlerts: boolean
  watchedGameAlerts: boolean
  priceMoveAlerts: boolean
}

interface CurrencyMarketOverview {
  summary: {
    activeListings: number
    avgRate: number
    totalStock: number
    completedTrades: number
    tradedUnits: number
    tradedValue: number
  }
  trends: Array<{
    date: string
    avgRate: number
    listings: number
  }>
  topCurrencies: Array<{
    currencyId: string
    currency: string
    game: string
    listings: number
    avgRate: number
    minRate: number
    maxRate: number
    stock: number
    views: number
  }>
}

interface RetentionWatchItem {
  listingId: string
  listingType: "ITEM" | "CURRENCY"
  title: string
  game: string
  views: number
  inquiries: number
  sellerId: string
  sellerUsername: string
}

interface RecentlyViewedListing {
  id: string
  title: string
  game: string
  price: number
  listingType: "ITEM" | "CURRENCY"
  viewedAt: string
}

type TrendsInteractionType =
  | "tab_change"
  | "time_range_change"
  | "view_listing"
  | "view_seller_profile"
  | "browse_seller_listings"
  | "browse_game_market"
  | "browse_similar_listings"
  | "message_seller"
  | "resume_previous_session"
  | "configure_trend_alerts"
  | "enable_weekly_digest"
  | "dispatch_retention_alerts"

type TopSellingSortKey = "sales" | "price"
type MostViewedSortKey = "views" | "inquiries"
type ActivitySortKey = "recent" | "price"

type LoadedTabsState = {
  overview: boolean
  trends: boolean
  currency: boolean
  sellers: boolean
  activity: boolean
  report: boolean
}

const INITIAL_LOADED_TABS: LoadedTabsState = {
  overview: false,
  trends: false,
  currency: false,
  sellers: false,
  activity: false,
  report: false,
}

const LAST_SESSION_STORAGE_KEY = "trends:last-session"
const RECENTLY_VIEWED_STORAGE_KEY = "trends:recently-viewed"
const WATCHED_GAMES_STORAGE_KEY = "trends:watched-games"

export default function TrendsPage() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState("overview")
  const [timeRange, setTimeRange] = useState<TimeRangeKey>("30d")
  const [marketTrends, setMarketTrends] = useState<Array<any>>([])
  const [popularGames, setPopularGames] = useState<Array<any>>([])
  const [topSellingItems, setTopSellingItems] = useState<Array<any>>([])
  const [mostViewedListings, setMostViewedListings] = useState<Array<any>>([])
  const [topTraders, setTopTraders] = useState<Array<any>>([])
  const [trendingListings, setTrendingListings] = useState<Array<any>>([])
  const [recentActivity, setRecentActivity] = useState<Array<any>>([])
  const [overviewMetrics, setOverviewMetrics] = useState<TrendsOverviewMetrics | null>(null)
  const [currencyOverview, setCurrencyOverview] = useState<CurrencyMarketOverview | null>(null)
  const [retentionWatchlist, setRetentionWatchlist] = useState<RetentionWatchItem[]>([])
  const [trendAlertSignals, setTrendAlertSignals] = useState<TrendsAlertSignals>({
    followedSellers: [],
    watchedGames: [],
    priceMoves: [],
  })
  const [watchedGames, setWatchedGames] = useState<string[]>([])
  const [watchedGameInput, setWatchedGameInput] = useState("")
  const [trendAlertPreferences, setTrendAlertPreferences] = useState<TrendsAlertPreferences>({
    followedSellerAlerts: true,
    watchedGameAlerts: true,
    priceMoveAlerts: false,
  })
  const [savingTrendAlertPreferences, setSavingTrendAlertPreferences] = useState(false)
  const [trendAlertPreferencesMessage, setTrendAlertPreferencesMessage] = useState<string | null>(null)
  const [recentlyViewedListings, setRecentlyViewedListings] = useState<RecentlyViewedListing[]>([])
  const [wasSessionRestored, setWasSessionRestored] = useState(false)
  const [dispatchingRetentionAlerts, setDispatchingRetentionAlerts] = useState(false)
  const [retentionDispatchResult, setRetentionDispatchResult] = useState<string | null>(null)
  const [weeklyDigestEnabled, setWeeklyDigestEnabled] = useState<boolean | null>(null)
  const [weeklyDigestMessage, setWeeklyDigestMessage] = useState<string | null>(null)
  const [updatingWeeklyDigest, setUpdatingWeeklyDigest] = useState(false)
  const [loading, setLoading] = useState(true)
  const [tabLoading, setTabLoading] = useState(false)
  const [loadedTabs, setLoadedTabs] = useState<LoadedTabsState>(INITIAL_LOADED_TABS)
  const [topSellingSort, setTopSellingSort] = useState<TopSellingSortKey>("sales")
  const [mostViewedSort, setMostViewedSort] = useState<MostViewedSortKey>("views")
  const [activitySort, setActivitySort] = useState<ActivitySortKey>("recent")

  const interactionQueueRef = useRef<Array<{
    interactionType: TrendsInteractionType
    metadata: Record<string, unknown>
    at: string
  }>>([])
  const interactionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  
  // Search states for each section
  const [viewedSearch, setViewedSearch] = useState("")
  const [gamesSearch, setGamesSearch] = useState("")
  const [sellersSearch, setSellersSearch] = useState("")
  const [trendingSearch, setTrendingSearch] = useState("")
  const [activitySearch, setActivitySearch] = useState("")

  const flushInteractionQueue = useCallback(async () => {
    const events = interactionQueueRef.current.splice(0, interactionQueueRef.current.length)
    if (events.length === 0) return

    const result = await trackTrendsInteractionsBatch(events)
    if (result.success) return

    await Promise.all(
      events.map((event) =>
        trackTrendsInteraction(event.interactionType, event.metadata),
      ),
    )
  }, [])

  const trackInteraction = useCallback(
    (interactionType: TrendsInteractionType, metadata: Record<string, unknown> = {}) => {
      interactionQueueRef.current.push({
        interactionType,
        metadata: {
          activeTab,
          timeRange,
          ...metadata,
        },
        at: new Date().toISOString(),
      })

      if (interactionQueueRef.current.length >= 8) {
        if (interactionTimerRef.current) {
          clearTimeout(interactionTimerRef.current)
          interactionTimerRef.current = null
        }

        void flushInteractionQueue()
        return
      }

      if (!interactionTimerRef.current) {
        interactionTimerRef.current = setTimeout(() => {
          interactionTimerRef.current = null
          void flushInteractionQueue()
        }, 1200)
      }
    },
    [activeTab, flushInteractionQueue, timeRange],
  )

  const refreshTrendAlertSignals = useCallback(
    async (gamesOverride?: string[]) => {
      const result = await getTrendsAlertSignals({
        watchedGames: gamesOverride ?? watchedGames,
        days: RANGE_TO_DAYS[timeRange],
        limit: 6,
      })

      if (result.success && result.data) {
        setTrendAlertSignals(result.data)
      }
    },
    [timeRange, watchedGames],
  )

  useEffect(() => {
    if (typeof window === "undefined") return

    try {
      const storedSessionRaw = window.localStorage.getItem(LAST_SESSION_STORAGE_KEY)
      if (storedSessionRaw) {
        const storedSession = JSON.parse(storedSessionRaw) as {
          tab?: string
          timeRange?: TimeRangeKey
        }

        const allowedTabs = new Set(["overview", "trends", "currency", "sellers", "activity", "report"])
        if (storedSession.tab && allowedTabs.has(storedSession.tab)) {
          setActiveTab(storedSession.tab)
          setWasSessionRestored(true)
        }

        if (storedSession.timeRange && RANGE_TO_DAYS[storedSession.timeRange]) {
          setTimeRange(storedSession.timeRange)
          setWasSessionRestored(true)
        }
      }

      const recentListingsRaw = window.localStorage.getItem(RECENTLY_VIEWED_STORAGE_KEY)
      if (recentListingsRaw) {
        const parsed = JSON.parse(recentListingsRaw) as RecentlyViewedListing[]
        if (Array.isArray(parsed)) {
          setRecentlyViewedListings(parsed.slice(0, 6))
        }
      }

      const watchedGamesRaw = window.localStorage.getItem(WATCHED_GAMES_STORAGE_KEY)
      if (watchedGamesRaw) {
        const parsed = JSON.parse(watchedGamesRaw) as string[]
        if (Array.isArray(parsed)) {
          setWatchedGames(parsed.slice(0, 8))
        }
      }
    } catch (error) {
      console.error("Failed to restore Trends session state:", error)
    }
  }, [])

  useEffect(() => {
    if (typeof window === "undefined") return

    window.localStorage.setItem(
      LAST_SESSION_STORAGE_KEY,
      JSON.stringify({
        tab: activeTab,
        timeRange,
        updatedAt: new Date().toISOString(),
      }),
    )
  }, [activeTab, timeRange])

  useEffect(
    () => () => {
      if (interactionTimerRef.current) {
        clearTimeout(interactionTimerRef.current)
        interactionTimerRef.current = null
      }

      void flushInteractionQueue()
    },
    [flushInteractionQueue],
  )

  useEffect(() => {
    setLoadedTabs(INITIAL_LOADED_TABS)
    setMarketTrends([])
    setPopularGames([])
    setTopSellingItems([])
    setMostViewedListings([])
    setTopTraders([])
    setTrendingListings([])
    setRecentActivity([])
    setOverviewMetrics(null)
    setCurrencyOverview(null)
    setRetentionWatchlist([])
    setRetentionDispatchResult(null)
    setWeeklyDigestMessage(null)
    setTrendAlertPreferencesMessage(null)
    setLoading(true)
  }, [timeRange])

  useEffect(() => {
    const days = RANGE_TO_DAYS[timeRange]

    const loadOverviewData = async () => {
      const [trendingResult, metricsResult] = await Promise.all([
        getTrendingListings(10),
        getTrendsOverviewMetrics(days),
      ])

      if (trendingResult.success && trendingResult.data) setTrendingListings(trendingResult.data)
      if (metricsResult.success && metricsResult.data) setOverviewMetrics(metricsResult.data)
    }

    const loadTrendsData = async () => {
      const [trendsResult, gamesResult, sellingResult, viewedResult] = await Promise.all([
        getMarketTrends(days),
        getPopularGames(10),
        getTopSellingItems(10),
        getMostViewedListings(10),
      ])

      if (trendsResult.success && trendsResult.data) setMarketTrends(trendsResult.data)
      if (gamesResult.success && gamesResult.data) setPopularGames(gamesResult.data)
      if (sellingResult.success && sellingResult.data) setTopSellingItems(sellingResult.data)
      if (viewedResult.success && viewedResult.data) setMostViewedListings(viewedResult.data)
    }

    const loadSellersData = async () => {
      const tradersResult = await getTopTraders(10)
      if (tradersResult.success && tradersResult.data) setTopTraders(tradersResult.data)
    }

    const loadActivityData = async () => {
      const activityResult = await getRecentActivity(50)
      if (activityResult.success && activityResult.data) setRecentActivity(activityResult.data)
    }

    const loadCurrencyData = async () => {
      const currencyResult = await getCurrencyMarketTrends(days, 10)
      if (currencyResult.success && currencyResult.data) setCurrencyOverview(currencyResult.data)
    }

    const loadReportData = async () => {
      const [watchlistResult, preferencesResult, trendAlertsResult] = await Promise.all([
        getRetentionWatchlist(8),
        getUserPreferences(),
        getTrendsAlertSignals({
          watchedGames,
          days,
          limit: 6,
        }),
      ])

      if (watchlistResult.success && watchlistResult.data) setRetentionWatchlist(watchlistResult.data)

      if (trendAlertsResult.success && trendAlertsResult.data) {
        setTrendAlertSignals(trendAlertsResult.data)
      }

      if (preferencesResult.success && preferencesResult.preferences) {
          setWeeklyDigestEnabled(preferencesResult.preferences.notifyMarketingEmails === true)
        setTrendAlertPreferences({
          followedSellerAlerts: preferencesResult.preferences.notifyTradeUpdates ?? true,
          watchedGameAlerts: preferencesResult.preferences.notifyListingViews ?? true,
          priceMoveAlerts: preferencesResult.preferences.notifyPriceAlerts ?? false,
        })
      }
    }

    const run = async () => {
      const requiredTabs: Record<string, Array<keyof LoadedTabsState>> = {
        overview: ["overview"],
        trends: ["trends"],
        currency: ["currency"],
        sellers: ["sellers"],
        activity: ["activity"],
        report: ["overview", "trends", "report"],
      }

      const required = requiredTabs[activeTab] || ["overview"]
      const missing = required.filter((tab) => !loadedTabs[tab])

      if (missing.length === 0) {
        setLoading(false)
        return
      }

      setTabLoading(true)
      try {
        await Promise.all(
          missing.map(async (tab) => {
            if (tab === "overview") {
              await loadOverviewData()
              return
            }
            if (tab === "trends") {
              await loadTrendsData()
              return
            }
            if (tab === "sellers") {
              await loadSellersData()
              return
            }
            if (tab === "activity") {
              await loadActivityData()
              return
            }
            if (tab === "currency") {
              await loadCurrencyData()
              return
            }
            if (tab === "report") {
              await loadReportData()
            }
          }),
        )

        setLoadedTabs((prev) => {
          const next = { ...prev }
          missing.forEach((tab) => {
            next[tab] = true
          })
          return next
        })
      } catch (err) {
        console.error("Failed to load tab data:", err)
      } finally {
        setLoading(false)
        setTabLoading(false)
      }
    }

    void run()
  }, [activeTab, loadedTabs, timeRange, watchedGames])

  const handleSellerClick = (sellerId: string) => {
    trackInteraction("view_seller_profile", { sellerId })
    router.push(`/profile/${sellerId}`)
  }

  const handleBrowseSellerListings = (sellerId: string) => {
    trackInteraction("browse_seller_listings", { sellerId })
    router.push(`/profile/${sellerId}`)
  }

  const saveRecentlyViewedListing = (listing: RecentlyViewedListing) => {
    setRecentlyViewedListings((previous) => {
      const next = [
        listing,
        ...previous.filter(
          (entry) => !(entry.id === listing.id && entry.listingType === listing.listingType),
        ),
      ].slice(0, 6)

      if (typeof window !== "undefined") {
        window.localStorage.setItem(RECENTLY_VIEWED_STORAGE_KEY, JSON.stringify(next))
      }

      return next
    })
  }

  const handleItemClick = (listing: {
    id: string
    title: string
    game: string
    price: number
    listingType: "ITEM" | "CURRENCY"
  }) => {
    trackInteraction("view_listing", { itemId: listing.id, listingType: listing.listingType })

    saveRecentlyViewedListing({
      id: listing.id,
      title: listing.title,
      game: listing.game,
      price: listing.price,
      listingType: listing.listingType,
      viewedAt: new Date().toISOString(),
    })

    const listingPath = listing.listingType === "CURRENCY" ? `/currency/${listing.id}` : `/listing/${listing.id}`
    router.push(listingPath)
  }

  const handleMessageSeller = (listing: {
    id: string
    title: string
    listingType: "ITEM" | "CURRENCY"
    seller: { id: string }
  }) => {
    trackInteraction("message_seller", {
      itemId: listing.id,
      listingType: listing.listingType,
      sellerId: listing.seller.id,
    })

    const typeQuery = listing.listingType === "CURRENCY" ? "currency" : "item"
    router.push(`/messages?sellerId=${listing.seller.id}&itemId=${listing.id}&type=${typeQuery}`)
  }

  const handleSimilarListingsClick = (gameName: string) => {
    trackInteraction("browse_similar_listings", { gameName })
    router.push(`/marketplace?item=${encodeURIComponent(gameName)}`)
  }

  const handleResumeSession = () => {
    trackInteraction("resume_previous_session", { activeTab, timeRange })
    setWasSessionRestored(false)
  }

  const handleEnableWeeklyDigest = async () => {
    setUpdatingWeeklyDigest(true)
    setWeeklyDigestMessage(null)

    try {
      const result = await updateUserPreferences({
        notifyMarketingEmails: true,
      })

      if (!result.success) {
        setWeeklyDigestMessage(result.error || "Failed to update digest preference")
        return
      }

      setWeeklyDigestEnabled(true)
      setWeeklyDigestMessage("Weekly Trends digest enabled. You will receive a recurring market summary email.")
      trackInteraction("enable_weekly_digest", { source: "trends_report" })
    } catch (error) {
      console.error("Failed to enable weekly digest:", error)
      setWeeklyDigestMessage("Failed to update digest preference")
    } finally {
      setUpdatingWeeklyDigest(false)
    }
  }

  const handleAddWatchedGame = async () => {
    const nextGame = watchedGameInput.trim()
    if (!nextGame) return

    const exists = watchedGames.some((game) => game.toLowerCase() === nextGame.toLowerCase())
    if (exists) {
      setWatchedGameInput("")
      return
    }

    const nextGames = [nextGame, ...watchedGames].slice(0, 8)
    setWatchedGames(nextGames)
    setWatchedGameInput("")

    if (typeof window !== "undefined") {
      window.localStorage.setItem(WATCHED_GAMES_STORAGE_KEY, JSON.stringify(nextGames))
    }

    await refreshTrendAlertSignals(nextGames)
  }

  const handleRemoveWatchedGame = async (gameName: string) => {
    const nextGames = watchedGames.filter((game) => game !== gameName)
    setWatchedGames(nextGames)

    if (typeof window !== "undefined") {
      window.localStorage.setItem(WATCHED_GAMES_STORAGE_KEY, JSON.stringify(nextGames))
    }

    await refreshTrendAlertSignals(nextGames)
  }

  const handleSaveTrendAlertPreferences = async () => {
    setSavingTrendAlertPreferences(true)
    setTrendAlertPreferencesMessage(null)

    try {
      const result = await updateUserPreferences({
        notifyTradeUpdates: trendAlertPreferences.followedSellerAlerts,
        notifyListingViews: trendAlertPreferences.watchedGameAlerts,
        notifyPriceAlerts: trendAlertPreferences.priceMoveAlerts,
      })

      if (!result.success) {
        setTrendAlertPreferencesMessage(result.error || "Failed to update trend alert preferences")
        return
      }

      setTrendAlertPreferencesMessage("Trend alert preferences saved.")
      trackInteraction("configure_trend_alerts", {
        followedSellerAlerts: trendAlertPreferences.followedSellerAlerts,
        watchedGameAlerts: trendAlertPreferences.watchedGameAlerts,
        priceMoveAlerts: trendAlertPreferences.priceMoveAlerts,
      })
    } catch (error) {
      console.error("Failed to save trend alert preferences:", error)
      setTrendAlertPreferencesMessage("Failed to update trend alert preferences")
    } finally {
      setSavingTrendAlertPreferences(false)
    }
  }

  const handleGameClick = (gameName: string) => {
    trackInteraction("browse_game_market", { gameName })
    router.push(`/marketplace?item=${encodeURIComponent(gameName)}`)
  }

  const handleTabChange = (tabValue: string) => {
    setActiveTab(tabValue)
    trackInteraction("tab_change", { tabValue })
  }

  const handleTimeRangeChange = (value: TimeRangeKey) => {
    setTimeRange(value)
    trackInteraction("time_range_change", { nextRange: value })
  }

  const handleDispatchRetentionAlerts = async () => {
    setDispatchingRetentionAlerts(true)
    setRetentionDispatchResult(null)
    trackInteraction("dispatch_retention_alerts", { watchlistSize: retentionWatchlist.length })

    try {
      const result = await dispatchRetentionWatchlistAlerts({
        limit: retentionWatchlist.length || 8,
        sendEmail: true,
      })

      if (!result.success || !result.data) {
        setRetentionDispatchResult(result.error || "Failed to dispatch alerts")
        return
      }

      const summary =
        result.data.alertsCreated === 0
          ? "No new seller alerts were sent (all recently notified or no eligible listings)."
          : `Sent ${result.data.alertsCreated} alert(s), skipped ${result.data.duplicateAlerts} duplicate(s), and sent/queued ${result.data.emailsSent + result.data.emailsQueued} email(s).`

      setRetentionDispatchResult(summary)
    } catch (error) {
      console.error("Failed to dispatch retention alerts:", error)
      setRetentionDispatchResult("Failed to dispatch alerts")
    } finally {
      setDispatchingRetentionAlerts(false)
    }
  }

  const formatDelta = (value: number) => {
    if (value === 0) return "0%"
    return `${value > 0 ? "+" : ""}${value.toFixed(1)}%`
  }

  const getDeltaColor = (value: number) => {
    if (value > 0) return "text-green-500"
    if (value < 0) return "text-red-500"
    return "text-muted-foreground"
  }

  const getDeltaIcon = (value: number) => {
    if (value > 0) return <TrendingUp className="h-4 w-4" />
    if (value < 0) return <TrendingDown className="h-4 w-4" />
    return <ArrowUpDown className="h-4 w-4" />
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

  const sortedTopSellingItems = [...topSellingItems].sort((a, b) => {
    if (topSellingSort === "price") return b.price - a.price
    return b.sales - a.sales
  })

  const sortedViewedListings = [...filteredViewedListings].sort((a, b) => {
    if (mostViewedSort === "inquiries") return b.inquiries - a.inquiries
    return b.views - a.views
  })

  const sortedActivity = [...filteredActivity].sort((a, b) => {
    if (activitySort === "price") return b.price - a.price
    return new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime()
  })

  const getPricePositionLabel = (price: number) => {
    const marketAverage = overviewMetrics?.averagePrice.value || 0
    if (marketAverage <= 0) return "No benchmark"

    const ratio = price / marketAverage
    if (ratio <= 0.9) return "Below avg price"
    if (ratio >= 1.1) return "Premium pricing"
    return "Near market avg"
  }

  const getDemandSignalLabel = (views: number, inquiries: number) => {
    if (views === 0) return "No traffic yet"

    const conversionRate = (inquiries / views) * 100
    if (views >= 120 && conversionRate <= 3) return "Hot traffic, low conversion"
    if (views >= 60 && conversionRate >= 8) return "High-intent demand"
    return "Steady demand"
  }

  const isInitialLoading = loading && !Object.values(loadedTabs).some(Boolean)

  if (isInitialLoading) {
    return (
      <>
        <Navigation />
        <main className="min-h-screen bg-background py-8">
          <div className="container max-w-[1920px] mx-auto px-6">
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
        <div className="container max-w-[1920px] mx-auto px-6">
          <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <h1 className="text-4xl font-bold text-balance">Marketplace Trends</h1>
              <p className="text-muted-foreground mt-2">
                Real-time insights and trends from the Roblox trading marketplace
              </p>
            </div>
            <Select value={timeRange} onValueChange={handleTimeRangeChange}>
              <SelectTrigger className="w-[200px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7d">Last 7 days</SelectItem>
                <SelectItem value="30d">Last 30 days</SelectItem>
                <SelectItem value="90d">Last 90 days</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {wasSessionRestored && (
            <div className="mb-4 rounded-lg border bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
              Resumed where you left off: {activeTab} tab • {RANGE_LABEL[timeRange]}.
              <Button variant="link" className="h-auto px-2 text-sm" onClick={handleResumeSession}>
                Dismiss
              </Button>
            </div>
          )}

          <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
            <TabsList className="grid w-full grid-cols-3 lg:grid-cols-6 mb-6">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="trends">Trends</TabsTrigger>
              <TabsTrigger value="currency">Currency</TabsTrigger>
              <TabsTrigger value="sellers">Top Sellers</TabsTrigger>
              <TabsTrigger value="activity">Activity</TabsTrigger>
              <TabsTrigger value="report">Report</TabsTrigger>
            </TabsList>

            {tabLoading && (
              <div className="mb-4 inline-flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading tab data...
              </div>
            )}

            {/* Overview Tab */}
            <TabsContent value="overview" className="space-y-6">
              {overviewMetrics && (
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                  {[
                    {
                      label: "Listings Added",
                      value: overviewMetrics.activeListings.value.toLocaleString(),
                      change: overviewMetrics.activeListings.change,
                      icon: ShoppingBag,
                    },
                    {
                      label: "Active Traders",
                      value: overviewMetrics.activeTraders.value.toLocaleString(),
                      change: overviewMetrics.activeTraders.change,
                      icon: Users,
                    },
                    {
                      label: "Completed Trades",
                      value: overviewMetrics.completedTransactions.value.toLocaleString(),
                      change: overviewMetrics.completedTransactions.change,
                      icon: BarChart3,
                    },
                    {
                      label: "Trade Volume",
                      value: `₱${overviewMetrics.tradeVolume.value.toLocaleString()}`,
                      change: overviewMetrics.tradeVolume.change,
                      icon: Wallet,
                    },
                    {
                      label: "Avg Deal Price",
                      value: `₱${overviewMetrics.averagePrice.value.toLocaleString()}`,
                      change: overviewMetrics.averagePrice.change,
                      icon: Coins,
                    },
                  ].map((metric) => (
                    <Card key={metric.label}>
                      <CardContent className="p-5">
                        <div className="mb-4 flex items-center justify-between">
                          <div className="rounded-lg bg-primary/10 p-2">
                            <metric.icon className="h-5 w-5 text-primary" />
                          </div>
                          <div className={`flex items-center gap-1 text-sm ${getDeltaColor(metric.change)}`}>
                            {getDeltaIcon(metric.change)}
                            <span>{formatDelta(metric.change)}</span>
                          </div>
                        </div>
                        <p className="text-2xl font-bold">{metric.value}</p>
                        <p className="text-sm text-muted-foreground">{metric.label}</p>
                        <p className="text-xs text-muted-foreground mt-1">vs previous {RANGE_LABEL[timeRange].toLowerCase()}</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}

              {recentlyViewedListings.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Recently Viewed In Trends</CardTitle>
                    <CardDescription>Jump back into listings you opened during previous sessions.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                      {recentlyViewedListings.map((listing) => (
                        <button
                          key={`${listing.listingType}:${listing.id}`}
                          className="rounded-lg border p-3 text-left hover:bg-accent/50 transition"
                          onClick={() =>
                            handleItemClick({
                              id: listing.id,
                              title: listing.title,
                              game: listing.game,
                              price: listing.price,
                              listingType: listing.listingType,
                            })
                          }
                        >
                          <p className="font-semibold truncate">{listing.title}</p>
                          <p className="text-xs text-muted-foreground mt-1">{listing.game} • {listing.listingType}</p>
                          <p className="text-xs text-primary mt-2">PHP {listing.price.toLocaleString()}</p>
                        </button>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

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
                          onClick={() =>
                            handleItemClick({
                              id: listing.id,
                              title: listing.title,
                              game: listing.game,
                              price: listing.price,
                              listingType: listing.listingType,
                            })
                          }
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
                              <span className="text-xs text-muted-foreground">
                                {listing.inquiries.toLocaleString()} inquiries
                              </span>
                            </div>
                            <div className="mt-2 flex flex-wrap gap-2 text-[11px]">
                              <span className="rounded-full bg-primary/10 px-2 py-1 text-primary">
                                {getPricePositionLabel(listing.price)}
                              </span>
                              <span className="rounded-full bg-muted px-2 py-1 text-muted-foreground">
                                {getDemandSignalLabel(listing.views, listing.inquiries)}
                              </span>
                            </div>
                          </div>
                          <div className="flex flex-col items-end gap-2">
                            <span className="text-xs text-muted-foreground">⭐ {listing.seller.vouch} vouches</span>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={(event) => {
                                event.stopPropagation()
                                handleItemClick({
                                  id: listing.id,
                                  title: listing.title,
                                  game: listing.game,
                                  price: listing.price,
                                  listingType: listing.listingType,
                                })
                              }}
                            >
                              View Listing
                            </Button>
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={(event) => {
                                event.stopPropagation()
                                handleMessageSeller({
                                  id: listing.id,
                                  title: listing.title,
                                  listingType: listing.listingType,
                                  seller: { id: listing.seller.id },
                                })
                              }}
                            >
                              Message Seller
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={(event) => {
                                event.stopPropagation()
                                handleSimilarListingsClick(listing.game)
                              }}
                            >
                              See Similar
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={(event) => {
                                event.stopPropagation()
                                handleBrowseSellerListings(listing.seller.id)
                              }}
                            >
                              Browse Seller Listings
                            </Button>
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
                  <CardTitle>Market Volume Trends ({RANGE_LABEL[timeRange]})</CardTitle>
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
                        <Tooltip
                          formatter={(value: number, name: string) => {
                            if (name === "Transactions") {
                              return value.toLocaleString()
                            }
                            return `₱${value.toLocaleString()}`
                          }}
                        />
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

              {/* Top Selling Items */}
              <Card>
                <CardHeader>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <TrendingUp className="w-5 h-5" />
                        Top Selling Items
                      </CardTitle>
                      <CardDescription>Listings with the most completed transactions</CardDescription>
                    </div>
                    <Select value={topSellingSort} onValueChange={(value: TopSellingSortKey) => setTopSellingSort(value)}>
                      <SelectTrigger className="w-[170px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="sales">Sort by Sales</SelectItem>
                        <SelectItem value="price">Sort by Price</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardHeader>
                <CardContent>
                  {topSellingItems.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="border-b">
                          <tr>
                            <th className="text-left py-2 font-semibold">Listing</th>
                            <th className="text-center py-2 font-semibold">Sales</th>
                            <th className="text-center py-2 font-semibold">Avg Price</th>
                          </tr>
                        </thead>
                        <tbody>
                          {sortedTopSellingItems.map((item, idx) => (
                            <tr key={`${item.listing}-${idx}`} className="border-b hover:bg-accent/50 transition">
                              <td className="py-3 font-semibold">{item.listing}</td>
                              <td className="text-center">{item.sales.toLocaleString()}</td>
                              <td className="text-center font-semibold text-primary">₱{item.price.toLocaleString()}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <p className="text-muted-foreground">No sales data available yet</p>
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
                    <div className="flex items-center gap-3">
                      <Select value={mostViewedSort} onValueChange={(value: MostViewedSortKey) => setMostViewedSort(value)}>
                        <SelectTrigger className="w-[170px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="views">Sort by Views</SelectItem>
                          <SelectItem value="inquiries">Sort by Inquiries</SelectItem>
                        </SelectContent>
                      </Select>
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
                  </div>
                </CardHeader>
                <CardContent>
                  {sortedViewedListings.length > 0 ? (
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
                          {sortedViewedListings.map((item, idx) => (
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

                  {filteredGames.length > 0 ? (
                    <div className="mt-5 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {filteredGames.slice(0, 6).map((game) => (
                        <button
                          key={game.game}
                          onClick={() => handleGameClick(game.game)}
                          className="rounded-lg border p-3 text-left hover:bg-accent/50 transition"
                        >
                          <p className="font-semibold truncate">{game.game}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {game.listings.toLocaleString()} listings • {game.totalViews.toLocaleString()} views
                          </p>
                          <p className="text-xs text-primary mt-2">Browse related listings</p>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <></>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="currency" className="space-y-6">
              {currencyOverview ? (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                    <Card>
                      <CardContent className="p-5">
                        <p className="text-sm text-muted-foreground">Active Currency Listings</p>
                        <p className="text-2xl font-bold mt-1">{currencyOverview.summary.activeListings.toLocaleString()}</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-5">
                        <p className="text-sm text-muted-foreground">Average Rate Per Peso</p>
                        <p className="text-2xl font-bold mt-1">{currencyOverview.summary.avgRate.toLocaleString()}</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-5">
                        <p className="text-sm text-muted-foreground">Stock Available</p>
                        <p className="text-2xl font-bold mt-1">{currencyOverview.summary.totalStock.toLocaleString()}</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-5">
                        <p className="text-sm text-muted-foreground">Completed Currency Trades</p>
                        <p className="text-2xl font-bold mt-1">{currencyOverview.summary.completedTrades.toLocaleString()}</p>
                      </CardContent>
                    </Card>
                  </div>

                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Coins className="w-5 h-5" />
                        Currency Rate Trend ({RANGE_LABEL[timeRange]})
                      </CardTitle>
                      <CardDescription>Average posted rate and listing velocity</CardDescription>
                    </CardHeader>
                    <CardContent>
                      {currencyOverview.trends.length > 0 ? (
                        <ResponsiveContainer width="100%" height={320}>
                          <LineChart data={currencyOverview.trends}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="date" />
                            <YAxis yAxisId="left" />
                            <YAxis yAxisId="right" orientation="right" />
                            <Tooltip />
                            <Legend />
                            <Line yAxisId="left" type="monotone" dataKey="avgRate" stroke="#3b82f6" strokeWidth={2} name="Avg Rate" />
                            <Line yAxisId="right" type="monotone" dataKey="listings" stroke="#10b981" strokeWidth={2} name="Listings" />
                          </LineChart>
                        </ResponsiveContainer>
                      ) : (
                        <div className="text-center py-10 text-muted-foreground">No recent currency listing data available</div>
                      )}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Top Currency Markets</CardTitle>
                      <CardDescription>Most active game currency pairs right now</CardDescription>
                    </CardHeader>
                    <CardContent>
                      {currencyOverview.topCurrencies.length > 0 ? (
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead className="border-b">
                              <tr>
                                <th className="text-left py-2 font-semibold">Currency</th>
                                <th className="text-left py-2 font-semibold">Game</th>
                                <th className="text-center py-2 font-semibold">Listings</th>
                                <th className="text-center py-2 font-semibold">Avg Rate</th>
                                <th className="text-center py-2 font-semibold">Stock</th>
                                <th className="text-center py-2 font-semibold">Views</th>
                              </tr>
                            </thead>
                            <tbody>
                              {currencyOverview.topCurrencies.map((currency) => (
                                <tr key={`${currency.currencyId}-${currency.game}`} className="border-b hover:bg-accent/50 transition">
                                  <td className="py-3 font-semibold">{currency.currency}</td>
                                  <td className="py-3 text-muted-foreground">{currency.game}</td>
                                  <td className="text-center">{currency.listings.toLocaleString()}</td>
                                  <td className="text-center font-semibold">{currency.avgRate.toLocaleString()}</td>
                                  <td className="text-center">{currency.stock.toLocaleString()}</td>
                                  <td className="text-center">{currency.views.toLocaleString()}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <div className="text-center py-8 text-muted-foreground">No active currency markets found</div>
                      )}
                    </CardContent>
                  </Card>
                </>
              ) : (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Coins className="w-5 h-5" />
                      Currency Trading Info
                    </CardTitle>
                    <CardDescription>Currency market analytics are loading</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="text-center py-12">
                      <p className="text-muted-foreground">No currency data available yet</p>
                    </div>
                  </CardContent>
                </Card>
              )}
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
                              <span className="flex items-center gap-1">
                                ✅ {Number(trader.completedTrades || 0).toLocaleString()} completed
                              </span>
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                              Joined {new Date(trader.joinDate).toLocaleDateString()}
                              {trader.recentSaleAt
                                ? ` • last sale ${new Date(trader.recentSaleAt).toLocaleDateString()}`
                                : " • no recent completed sale"}
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
                    <div className="flex items-center gap-3">
                      <Select value={activitySort} onValueChange={(value: ActivitySortKey) => setActivitySort(value)}>
                        <SelectTrigger className="w-[170px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="recent">Sort by Recent</SelectItem>
                          <SelectItem value="price">Sort by Price</SelectItem>
                        </SelectContent>
                      </Select>
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
                  </div>
                </CardHeader>
                <CardContent>
                  {sortedActivity.length > 0 ? (
                    <div className="space-y-3 max-h-[600px] overflow-y-auto">
                      {sortedActivity.map((activity) => (
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
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="w-5 h-5" />
                    Market Report ({RANGE_LABEL[timeRange]})
                  </CardTitle>
                  <CardDescription>Auto-generated conversion-focused snapshot for marketplace operations</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4">
                    <Card>
                      <CardContent className="p-4">
                        <p className="text-xs text-muted-foreground">Listings Added</p>
                        <p className="text-xl font-bold mt-1">{overviewMetrics?.activeListings.value.toLocaleString() || 0}</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-4">
                        <p className="text-xs text-muted-foreground">Active Traders</p>
                        <p className="text-xl font-bold mt-1">{overviewMetrics?.activeTraders.value.toLocaleString() || 0}</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-4">
                        <p className="text-xs text-muted-foreground">Completed Trades</p>
                        <p className="text-xl font-bold mt-1">{overviewMetrics?.completedTransactions.value.toLocaleString() || 0}</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-4">
                        <p className="text-xs text-muted-foreground">Trade Volume</p>
                        <p className="text-xl font-bold mt-1">PHP {(overviewMetrics?.tradeVolume.value || 0).toLocaleString()}</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-4">
                        <p className="text-xs text-muted-foreground">Avg Deal Price</p>
                        <p className="text-xl font-bold mt-1">PHP {(overviewMetrics?.averagePrice.value || 0).toLocaleString()}</p>
                      </CardContent>
                    </Card>
                  </div>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Top Conversion Drivers</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3 text-sm">
                      <p>
                        Most sold listing: <span className="font-semibold">{topSellingItems[0]?.listing || "No data"}</span>
                        {topSellingItems[0] ? ` (${topSellingItems[0].sales.toLocaleString()} sales)` : ""}
                      </p>
                      <p>
                        Highest visibility listing: <span className="font-semibold">{mostViewedListings[0]?.title || "No data"}</span>
                        {mostViewedListings[0] ? ` (${mostViewedListings[0].views.toLocaleString()} views)` : ""}
                      </p>
                      <p>
                        Most active game segment: <span className="font-semibold">{popularGames[0]?.game || "No data"}</span>
                        {popularGames[0] ? ` (${popularGames[0].listings.toLocaleString()} listings)` : ""}
                      </p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Trend Alert Opt-ins</CardTitle>
                      <CardDescription>Configure followed-seller, watched-game, and price-move alerts with current signal previews.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <Button
                          variant={trendAlertPreferences.followedSellerAlerts ? "default" : "outline"}
                          onClick={() =>
                            setTrendAlertPreferences((prev) => ({
                              ...prev,
                              followedSellerAlerts: !prev.followedSellerAlerts,
                            }))
                          }
                        >
                          {trendAlertPreferences.followedSellerAlerts ? "Followed Seller Alerts: On" : "Followed Seller Alerts: Off"}
                        </Button>
                        <Button
                          variant={trendAlertPreferences.watchedGameAlerts ? "default" : "outline"}
                          onClick={() =>
                            setTrendAlertPreferences((prev) => ({
                              ...prev,
                              watchedGameAlerts: !prev.watchedGameAlerts,
                            }))
                          }
                        >
                          {trendAlertPreferences.watchedGameAlerts ? "Watched Game Alerts: On" : "Watched Game Alerts: Off"}
                        </Button>
                        <Button
                          variant={trendAlertPreferences.priceMoveAlerts ? "default" : "outline"}
                          onClick={() =>
                            setTrendAlertPreferences((prev) => ({
                              ...prev,
                              priceMoveAlerts: !prev.priceMoveAlerts,
                            }))
                          }
                        >
                          {trendAlertPreferences.priceMoveAlerts ? "Price Move Alerts: On" : "Price Move Alerts: Off"}
                        </Button>
                      </div>

                      <div>
                        <p className="text-xs font-medium text-muted-foreground mb-2">Watched Games</p>
                        <div className="flex gap-2">
                          <Input
                            value={watchedGameInput}
                            onChange={(event) => setWatchedGameInput(event.target.value)}
                            placeholder="Add a game (example: Blox Fruits)"
                          />
                          <Button
                            type="button"
                            onClick={handleAddWatchedGame}
                            disabled={!watchedGameInput.trim()}
                          >
                            Add
                          </Button>
                        </div>
                        {watchedGames.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-2">
                            {watchedGames.map((game) => (
                              <button
                                key={game}
                                type="button"
                                onClick={() => {
                                  void handleRemoveWatchedGame(game)
                                }}
                                className="rounded-full border px-3 py-1 text-xs hover:bg-accent/50"
                                title="Remove watched game"
                              >
                                {game} ×
                              </button>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-3">
                        <Button
                          size="sm"
                          onClick={handleSaveTrendAlertPreferences}
                          disabled={savingTrendAlertPreferences}
                        >
                          {savingTrendAlertPreferences ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Saving...
                            </>
                          ) : (
                            "Save Alert Preferences"
                          )}
                        </Button>
                        {trendAlertPreferencesMessage && (
                          <p className="text-xs text-muted-foreground">{trendAlertPreferencesMessage}</p>
                        )}
                      </div>

                      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
                        <div className="rounded-lg border p-3">
                          <p className="text-xs font-semibold text-muted-foreground mb-2">Followed Seller Signals</p>
                          {trendAlertSignals.followedSellers.length > 0 ? (
                            <div className="space-y-2 text-sm">
                              {trendAlertSignals.followedSellers.slice(0, 4).map((seller) => (
                                <div key={seller.sellerId} className="flex items-center justify-between gap-2">
                                  <div className="min-w-0">
                                    <p className="font-semibold truncate">{seller.sellerUsername}</p>
                                    <p className="text-xs text-muted-foreground">
                                      {seller.completedTrades.toLocaleString()} trades • {seller.change > 0 ? "+" : ""}{seller.change.toFixed(1)}%
                                    </p>
                                  </div>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => handleBrowseSellerListings(seller.sellerId)}
                                  >
                                    View
                                  </Button>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-xs text-muted-foreground">No followed seller trend signals yet.</p>
                          )}
                        </div>

                        <div className="rounded-lg border p-3">
                          <p className="text-xs font-semibold text-muted-foreground mb-2">Watched Game Signals</p>
                          {trendAlertSignals.watchedGames.length > 0 ? (
                            <div className="space-y-2 text-sm">
                              {trendAlertSignals.watchedGames.slice(0, 4).map((game) => (
                                <div key={game.gameId} className="flex items-center justify-between gap-2">
                                  <div className="min-w-0">
                                    <p className="font-semibold truncate">{game.game}</p>
                                    <p className="text-xs text-muted-foreground">
                                      {game.completedTrades.toLocaleString()} trades • {game.change > 0 ? "+" : ""}{game.change.toFixed(1)}%
                                    </p>
                                  </div>
                                  <Button size="sm" variant="ghost" onClick={() => handleGameClick(game.game)}>
                                    Browse
                                  </Button>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-xs text-muted-foreground">Add watched games to receive trend signals.</p>
                          )}
                        </div>

                        <div className="rounded-lg border p-3">
                          <p className="text-xs font-semibold text-muted-foreground mb-2">Price Move Signals</p>
                          {trendAlertSignals.priceMoves.length > 0 ? (
                            <div className="space-y-2 text-sm">
                              {trendAlertSignals.priceMoves.slice(0, 4).map((entry) => (
                                <div key={entry.gameId}>
                                  <p className="font-semibold truncate">{entry.game}</p>
                                  <p className={`text-xs ${entry.change >= 0 ? "text-rose-500" : "text-emerald-500"}`}>
                                    {entry.change >= 0 ? "+" : ""}{entry.change.toFixed(1)}% • ₱{entry.previousAvgPrice.toLocaleString()}{" -> "}₱{entry.currentAvgPrice.toLocaleString()}
                                  </p>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-xs text-muted-foreground">No significant price moves for watched games in this period.</p>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <CardTitle className="text-base">Retention Watchlist</CardTitle>
                          <CardDescription>High-view listings with weak inquiry conversion that need seller follow-up</CardDescription>
                        </div>
                        <Button
                          size="sm"
                          onClick={handleDispatchRetentionAlerts}
                          disabled={dispatchingRetentionAlerts || retentionWatchlist.length === 0}
                        >
                          {dispatchingRetentionAlerts ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Dispatching...
                            </>
                          ) : (
                            "Dispatch Alerts"
                          )}
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {retentionDispatchResult && (
                        <p className="mb-3 text-xs text-muted-foreground">{retentionDispatchResult}</p>
                      )}
                      {retentionWatchlist.length > 0 ? (
                        <div className="space-y-3">
                          {retentionWatchlist.map((listing) => (
                            <div key={`${listing.listingType}:${listing.listingId}`} className="rounded-lg border p-3">
                              <div className="flex items-center justify-between gap-3">
                                <div className="min-w-0">
                                  <p className="font-semibold truncate">{listing.title}</p>
                                  <p className="text-xs text-muted-foreground">{listing.game} • {listing.listingType}</p>
                                </div>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleSellerClick(listing.sellerId)}
                                >
                                  Contact Seller
                                </Button>
                              </div>
                              <div className="mt-2 text-xs text-muted-foreground">
                                {listing.views.toLocaleString()} views • {listing.inquiries.toLocaleString()} inquiries • seller: {listing.sellerUsername}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground">No urgent re-engagement targets for this period.</p>
                      )}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Recommended Next Actions</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2 text-sm text-muted-foreground">
                      <p>Promote top-selling listings in homepage featured slots to increase buyer intent.</p>
                      <p>Prioritize fast-response outreach for the most viewed listings to convert inquiries into trades.</p>
                      <p>Expand inventory around the top game segment where demand concentration is strongest.</p>
                      <div className="pt-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <Button
                            size="sm"
                            variant={weeklyDigestEnabled ? "outline" : "default"}
                            disabled={updatingWeeklyDigest || weeklyDigestEnabled === true}
                            onClick={handleEnableWeeklyDigest}
                          >
                            {updatingWeeklyDigest ? (
                              <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Updating...
                              </>
                            ) : weeklyDigestEnabled ? (
                              "Weekly Digest Enabled"
                            ) : (
                              "Enable Weekly Trends Digest"
                            )}
                          </Button>
                          {watchedGames.length > 0 && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleGameClick(watchedGames[0])}
                            >
                              View Hot In {watchedGames[0]}
                            </Button>
                          )}
                        </div>
                        {weeklyDigestMessage && (
                          <p className="mt-2 text-xs text-muted-foreground">{weeklyDigestMessage}</p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </>
  )
}
