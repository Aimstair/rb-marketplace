"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { Search, TrendingUp, Shield, Users, Zap, Gift, Clock3 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import Navigation from "@/components/navigation"
import FeaturedListings from "@/components/featured-listings"
import TrendingGames from "@/components/trending-games"
import TopVouchedSellers from "@/components/top-vouched-sellers"
import { getLandingStats, getPopularGames, getTopTraders } from "@/app/actions/trends"
import { checkAndExpireSubscriptions } from "@/app/actions/subscriptions"
import { getGiveawayHomeData, joinGiveaway } from "@/app/actions/giveaways"
import { useSession } from "next-auth/react"
import { useToast } from "@/hooks/use-toast"

interface PopularGame {
  game: string
  listings: number
  avgPrice: number
  totalViews: number
}

interface TopTrader {
  id: string
  username: string
  avatar: string | null
  vouch: number
  joinDate: Date
  listings: number
  verified: boolean
}

interface GiveawayActiveData {
  id: string
  title: string
  description?: string | null
  rewardLabel?: string | null
  rewardImageUrl?: string | null
  status: string
  startsAt?: string | null
  endsAt?: string | null
  joinedCount: number
}

interface GiveawayQueuedData {
  id: string
  title: string
  description?: string | null
  rewardLabel?: string | null
  rewardImageUrl?: string | null
  startsAt?: string | null
  endsAt?: string | null
  joinedCount: number
}

interface GiveawayHistoryData {
  id: string
  title: string
  description?: string | null
  rewardLabel?: string | null
  rewardImageUrl?: string | null
  joinedCount: number
  endsAt?: string | null
  winnerUser?: {
    id?: string
    username?: string
    profilePicture?: string | null
  } | null
}

function truncateCopy(value: string | null | undefined, max = 120): string {
  if (!value) {
    return ""
  }

  if (value.length <= max) {
    return value
  }

  return `${value.slice(0, max)}...`
}

export default function HomePage() {
  const router = useRouter()
  const { data: session } = useSession()
  const { toast } = useToast()
  const [searchQuery, setSearchQuery] = useState("")
  const [stats, setStats] = useState({ totalUsers: 0, totalListings: 0, totalVolume: 0, activeTraders: 0 })
  const [games, setGames] = useState<PopularGame[]>([])
  const [traders, setTraders] = useState<TopTrader[]>([])
  const [gamesLoading, setGamesLoading] = useState(true)
  const [tradersLoading, setTradersLoading] = useState(true)
  const [giveawayLoading, setGiveawayLoading] = useState(true)
  const [giveawayActionLoading, setGiveawayActionLoading] = useState(false)
  const [giveawayData, setGiveawayData] = useState<{
    active: GiveawayActiveData | null
    queued: GiveawayQueuedData[]
    history: GiveawayHistoryData[]
    joined: boolean
    eligibility: {
      eligible: boolean
      completedTransactionsCount: number
      requiredCount: number
    } | null
  } | null>(null)
  const [nowMs, setNowMs] = useState(Date.now())

  // Avoid checking subscription expiry too often during quick route hops.
  useEffect(() => {
    if (session?.user?.id) {
      const key = `sub-exp-check:${session.user.id}`
      const lastCheck = Number(window.sessionStorage.getItem(key) || "0")
      const now = Date.now()

      if (lastCheck > 0 && now - lastCheck < 15 * 60 * 1000) {
        return
      }

      window.sessionStorage.setItem(key, String(now))
      checkAndExpireSubscriptions(session.user.id).catch(err => {
        console.error("Failed to check subscription expiration:", err)
      })
    }
  }, [session?.user?.id])

  // Load homepage payload in one batch to reduce mount-time render churn.
  useEffect(() => {
    const loadHomepageData = async () => {
      try {
        const [statsResult, gamesResult, tradersResult] = await Promise.all([
          getLandingStats(),
          getPopularGames(6),
          getTopTraders(4),
        ])

        if (statsResult.success && statsResult.data) {
          setStats(statsResult.data)
        }

        if (gamesResult.success && gamesResult.data) {
          setGames(gamesResult.data)
        }

        if (tradersResult.success && tradersResult.data) {
          setTraders(tradersResult.data)
        }
      } catch (err) {
        console.error("Failed to load homepage data:", err)
      } finally {
        setGamesLoading(false)
        setTradersLoading(false)
      }
    }

    loadHomepageData()
  }, [])

  useEffect(() => {
    const loadGiveaway = async () => {
      try {
        setGiveawayLoading(true)
        const result = await getGiveawayHomeData()
        if (result.success && result.data) {
          setGiveawayData(result.data)
        }
      } catch (err) {
        console.error("Failed to load giveaway data:", err)
      } finally {
        setGiveawayLoading(false)
      }
    }

    loadGiveaway()
  }, [session?.user?.id])

  useEffect(() => {
    if (!giveawayData?.active?.endsAt) {
      return
    }

    const timer = window.setInterval(() => setNowMs(Date.now()), 1000)
    return () => window.clearInterval(timer)
  }, [giveawayData?.active?.endsAt])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      router.push(`/marketplace?search=${encodeURIComponent(searchQuery)}`)
    } else {
      router.push("/marketplace")
    }
  }

  const handleJoinGiveaway = async () => {
    if (!session?.user?.id) {
      toast({
        title: "Login required",
        description: "Please log in to join giveaways.",
        variant: "destructive",
      })
      router.push("/auth/login")
      return
    }

    if (!giveawayData?.active?.id) {
      return
    }

    setGiveawayActionLoading(true)
    const result = await joinGiveaway(giveawayData.active.id)

    if (!result.success) {
      toast({
        title: "Unable to join giveaway",
        description: result.error || "Please try again.",
        variant: "destructive",
      })
      setGiveawayActionLoading(false)
      return
    }

    toast({ title: "Giveaway joined", description: "Your entry has been recorded." })
    const refreshed = await getGiveawayHomeData()
    if (refreshed.success && refreshed.data) {
      setGiveawayData(refreshed.data)
    }
    setGiveawayActionLoading(false)
  }

  const activeEndsAt = giveawayData?.active?.endsAt ? new Date(giveawayData.active.endsAt).getTime() : null
  const timeLeftMs = activeEndsAt ? Math.max(0, activeEndsAt - nowMs) : 0
  const hoursLeft = Math.floor(timeLeftMs / (1000 * 60 * 60))
  const minutesLeft = Math.floor((timeLeftMs % (1000 * 60 * 60)) / (1000 * 60))

  return (
    <main className="min-h-screen bg-background">
      <Navigation />

      {/* Hero Section with Search */}
      <section className="bg-linear-to-br from-primary/10 to-primary/5 py-12 md:py-20">
        <div className="container max-w-[1920px] mx-auto px-6">
          <div className="max-w-3xl mx-auto">
            <h1 className="text-4xl md:text-5xl font-bold text-center mb-4 text-balance">
              Trade In-Game Items Safely & Anonymously
            </h1>
            <p className="text-center text-muted-foreground mb-8 text-lg">
              Connect with buyers and sellers in the gaming community. No hidden fees, just trusted trading.
            </p>

            {/* Search Bar */}
            <form onSubmit={handleSearch} className="relative mb-8">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search items, games, or sellers..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-12 pr-4 py-3 text-lg"
              />
            </form>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/marketplace">
                <Button size="lg" className="w-full sm:w-auto">
                  Browse Items
                </Button>
              </Link>
              <Link href="/sell">
                <Button size="lg" variant="outline" className="w-full sm:w-auto bg-transparent">
                  Start Selling
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Quick Stats */}
      <section className="py-8 border-b bg-card/50">
        <div className="container max-w-[1920px] mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="text-3xl font-bold text-primary mb-2">{stats.totalListings.toLocaleString()}</div>
              <p className="text-muted-foreground">Active Listings</p>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-primary mb-2">{stats.totalUsers.toLocaleString()}</div>
              <p className="text-muted-foreground">Community Members</p>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-primary mb-2">₱{(stats.totalVolume / 1000).toFixed(1)}k</div>
              <p className="text-muted-foreground">Trade Volume</p>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-primary mb-2">{stats.activeTraders.toLocaleString()}</div>
              <p className="text-muted-foreground">Active Traders</p>
            </div>
          </div>
        </div>
      </section>

      {/* Giveaway Panel */}
      <section className="py-10 border-b bg-linear-to-br from-amber-50 to-rose-50 dark:from-card dark:to-card/60">
        <div className="container max-w-[1920px] mx-auto px-6">
          <div className="mb-6">
            <h2 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
              <Gift className="w-7 h-7 text-amber-500" />
              Giveaway Hub
            </h2>
            <p className="text-muted-foreground">Join active giveaways, track queue, and view latest winners.</p>
          </div>

          {giveawayLoading ? (
            <Card className="p-6">
              <p className="text-sm text-muted-foreground">Loading giveaway data...</p>
            </Card>
          ) : !giveawayData?.active ? (
            <Card className="p-6">
              <p className="font-medium">No active giveaway right now.</p>
              <p className="text-sm text-muted-foreground mt-1">Check back soon or watch queued giveaways below.</p>
            </Card>
          ) : (
            <div className="grid gap-4 lg:grid-cols-3">
              <Card className="p-6 lg:col-span-2 border-amber-200/80 lg:h-[540px]">
                <div className="grid h-full gap-4 md:grid-cols-5">
                  <div className="md:col-span-2 md:h-full">
                    <div className="relative aspect-video md:aspect-auto md:h-full rounded-lg border overflow-hidden bg-muted">
                      {giveawayData.active.rewardImageUrl ? (
                        <Image
                          src={giveawayData.active.rewardImageUrl}
                          alt={giveawayData.active.title}
                          fill
                          sizes="(max-width: 768px) 100vw, 40vw"
                          className="object-cover"
                        />
                      ) : (
                        <div className="h-full w-full flex items-center justify-center text-sm text-muted-foreground">
                          Reward image coming soon
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="md:col-span-3 flex h-full flex-col">
                    <div className="space-y-4">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="text-xs uppercase tracking-wide text-muted-foreground">Active Giveaway</p>
                          <h3 className="text-xl font-bold mt-1">{giveawayData.active.title}</h3>
                          {giveawayData.active.rewardLabel && (
                            <p className="text-sm text-muted-foreground mt-1">Reward: {giveawayData.active.rewardLabel}</p>
                          )}
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-muted-foreground">Joined</p>
                          <p className="text-2xl font-bold">{giveawayData.active.joinedCount}</p>
                        </div>
                      </div>

                      {giveawayData.active.description && (
                        <p className="text-sm text-muted-foreground">{truncateCopy(giveawayData.active.description, 200)}</p>
                      )}

                      <div className="flex flex-wrap items-center gap-3 text-sm">
                        <span className="inline-flex items-center gap-1 rounded-full border px-3 py-1 bg-background">
                          <Clock3 className="w-4 h-4" />
                          {hoursLeft}h {minutesLeft}m left
                        </span>
                        <span className="text-muted-foreground">
                          Ends: {giveawayData.active.endsAt ? new Date(giveawayData.active.endsAt).toLocaleString() : "-"}
                        </span>
                      </div>

                      {session?.user?.id && giveawayData.eligibility && !giveawayData.eligibility.eligible && (
                        <p className="text-sm text-amber-700 dark:text-amber-300">
                          Eligibility: {giveawayData.eligibility.completedTransactionsCount}/{giveawayData.eligibility.requiredCount} completed trades in the last 7 days.
                        </p>
                      )}
                    </div>

                    <div className="mt-auto pt-4 flex flex-wrap gap-2">
                      <Button
                        onClick={handleJoinGiveaway}
                        disabled={
                          giveawayActionLoading ||
                          giveawayData.joined ||
                          Boolean(session?.user?.id && giveawayData.eligibility && !giveawayData.eligibility.eligible)
                        }
                      >
                        {giveawayData.joined
                          ? "Already Joined"
                          : giveawayActionLoading
                            ? "Joining..."
                            : "Join Giveaway"}
                      </Button>
                      <Link href="/notifications">
                        <Button variant="outline">Check Notifications</Button>
                      </Link>
                    </div>
                  </div>
                </div>
              </Card>

              <Card className="p-6 lg:h-[540px] overflow-hidden flex flex-col gap-4">
                <div className="min-h-0">
                  <p className="font-semibold">Queued Next</p>
                  {giveawayData.queued.length === 0 ? (
                    <p className="text-sm text-muted-foreground mt-1">No queued giveaways.</p>
                  ) : (
                    <div className="space-y-2 mt-2 overflow-y-auto max-h-[220px] pr-1">
                      {giveawayData.queued.slice(0, 1).map((queued) => (
                        <div key={queued.id} className="p-2 border rounded-md text-sm space-y-2 bg-background/80">
                          <div className="relative h-20 w-full overflow-hidden rounded border bg-muted">
                            {queued.rewardImageUrl ? (
                              <Image
                                src={queued.rewardImageUrl}
                                alt={queued.title}
                                fill
                                sizes="(max-width: 1024px) 100vw, 20vw"
                                className="object-cover"
                              />
                            ) : (
                              <div className="h-full w-full flex items-center justify-center text-xs text-muted-foreground">
                                No reward image
                              </div>
                            )}
                          </div>
                          <p className="font-medium">{queued.title}</p>
                          {queued.description && (
                            <p className="text-xs text-muted-foreground">{truncateCopy(queued.description, 80)}</p>
                          )}
                          <p className="text-xs text-muted-foreground">Starts: {queued.startsAt ? new Date(queued.startsAt).toLocaleString() : "TBA"}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="min-h-0 flex-1">
                  <p className="font-semibold">Latest Winners</p>
                  {giveawayData.history.length === 0 ? (
                    <p className="text-sm text-muted-foreground mt-1">No recent completed giveaways.</p>
                  ) : (
                    <div className="space-y-2 mt-2 overflow-y-auto max-h-[220px] pr-1">
                      {giveawayData.history.slice(0, 2).map((item) => (
                        <div key={item.id} className="p-2 border rounded-md text-sm space-y-2 bg-background/80">
                          {item.rewardImageUrl && (
                            <div className="relative h-16 w-full overflow-hidden rounded border bg-muted">
                              <Image
                                src={item.rewardImageUrl}
                                alt={item.title}
                                fill
                                sizes="(max-width: 1024px) 100vw, 20vw"
                                className="object-cover"
                              />
                            </div>
                          )}
                          <p className="font-medium">{item.title}</p>
                          {item.description && (
                            <p className="text-xs text-muted-foreground">{truncateCopy(item.description, 72)}</p>
                          )}
                          <p className="text-xs text-muted-foreground">
                            Winner: {item.winnerUser?.username || "No winner"}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </Card>
            </div>
          )}
        </div>
      </section>

      {/* Featured Listings Section */}
      <section className="py-16">
        <div className="container max-w-[1920px] mx-auto px-6">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-3xl font-bold mb-2">Featured Listings</h2>
              <p className="text-muted-foreground">Popular items trending now</p>
            </div>
            <Link href="/marketplace?sort=featured">
              <Button variant="ghost">View All</Button>
            </Link>
          </div>
          <FeaturedListings />
        </div>
      </section>

      {/* Trending Games Section */}
      <section className="py-16 bg-card/50">
        <div className="container max-w-[1920px] mx-auto px-6">
          <div className="mb-8">
            <h2 className="text-3xl font-bold mb-2 flex items-center gap-2">
              <TrendingUp className="w-8 h-8" />
              Trending Games
            </h2>
            <p className="text-muted-foreground">Most popular items being traded</p>
          </div>
          <TrendingGames games={games} isLoading={gamesLoading} />
        </div>
      </section>

      {/* Top Vouched Sellers Section */}
      <section className="py-16">
        <div className="container max-w-[1920px] mx-auto px-6">
          <div className="mb-8">
            <h2 className="text-3xl font-bold mb-2 flex items-center gap-2">
              <Shield className="w-8 h-8" />
              Top Vouched Sellers
            </h2>
            <p className="text-muted-foreground">Trusted community members</p>
          </div>
          <TopVouchedSellers sellers={traders} isLoading={tradersLoading} />
        </div>
      </section>

      {/* Trust & Safety Features */}
      <section className="py-16 bg-linear-to-br from-primary/5 to-primary/10">
        <div className="container max-w-[1920px] mx-auto px-6">
          <h2 className="text-3xl font-bold text-center mb-12">Why Trade Here?</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <Card className="p-6 text-center hover:shadow-lg transition-shadow">
              <Shield className="w-12 h-12 mx-auto mb-4 text-primary" />
              <h3 className="text-xl font-bold mb-2">Anonymous & Safe</h3>
              <p className="text-muted-foreground">Keep your identity private while trading with confidence</p>
            </Card>

            <Card className="p-6 text-center hover:shadow-lg transition-shadow">
              <Users className="w-12 h-12 mx-auto mb-4 text-primary" />
              <h3 className="text-xl font-bold mb-2">Community Vouches</h3>
              <p className="text-muted-foreground">Build reputation through verified trades and vouch count</p>
            </Card>

            <Card className="p-6 text-center hover:shadow-lg transition-shadow">
              <Zap className="w-12 h-12 mx-auto mb-4 text-primary" />
              <h3 className="text-xl font-bold mb-2">Your Terms</h3>
              <p className="text-muted-foreground">Choose your payment method: GCash, PayPal, Robux, or cross-trade</p>
            </Card>
          </div>
        </div>
      </section>

      {/* Footer CTA */}
      <section className="py-16 bg-primary text-primary-foreground">
        <div className="container max-w-[1920px] mx-auto px-6 text-center">
          <h2 className="text-3xl font-bold mb-4">Ready to Start Trading?</h2>
          <p className="mb-8 text-lg opacity-90 max-w-2xl mx-auto">
            Join thousands of Roblox players buying and selling items securely every day.
          </p>
          <Link href="/auth/signup">
            <Button size="lg" variant="secondary">
              Create Free Account
            </Button>
          </Link>
        </div>
      </section>
    </main>
  )
}
