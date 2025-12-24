"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Search, TrendingUp, Shield, Users, Zap } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import Navigation from "@/components/navigation"
import FeaturedListings from "@/components/featured-listings"
import TrendingGames from "@/components/trending-games"
import TopVouchedSellers from "@/components/top-vouched-sellers"
import { getLandingStats, getPopularGames, getTopTraders } from "@/app/actions/trends"

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

export default function HomePage() {
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState("")
  const [stats, setStats] = useState({ totalUsers: 0, totalListings: 0, totalVolume: 0, activeTraders: 0 })
  const [games, setGames] = useState<PopularGame[]>([])
  const [traders, setTraders] = useState<TopTrader[]>([])
  const [loading, setLoading] = useState(true)
  const [gamesLoading, setGamesLoading] = useState(true)
  const [tradersLoading, setTradersLoading] = useState(true)

  // Load stats on mount
  useEffect(() => {
    const loadStats = async () => {
      try {
        const result = await getLandingStats()
        if (result.success && result.data) {
          setStats(result.data)
        }
      } catch (err) {
        console.error("Failed to load stats:", err)
      } finally {
        setLoading(false)
      }
    }

    loadStats()
  }, [])

  // Load trending games
  useEffect(() => {
    const loadGames = async () => {
      try {
        const result = await getPopularGames(6)
        if (result.success && result.data) {
          setGames(result.data)
        }
      } catch (err) {
        console.error("Failed to load games:", err)
      } finally {
        setGamesLoading(false)
      }
    }

    loadGames()
  }, [])

  // Load top traders
  useEffect(() => {
    const loadTraders = async () => {
      try {
        const result = await getTopTraders(4)
        if (result.success && result.data) {
          setTraders(result.data)
        }
      } catch (err) {
        console.error("Failed to load traders:", err)
      } finally {
        setTradersLoading(false)
      }
    }

    loadTraders()
  }, [])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      router.push(`/marketplace?search=${encodeURIComponent(searchQuery)}`)
    } else {
      router.push("/marketplace")
    }
  }

  return (
    <main className="min-h-screen bg-background">
      <Navigation />

      {/* Hero Section with Search */}
      <section className="bg-gradient-to-br from-primary/10 to-primary/5 py-12 md:py-20">
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
      <section className="py-16 bg-gradient-to-br from-primary/5 to-primary/10">
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
