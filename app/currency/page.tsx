"use client"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Navigation from "@/components/navigation"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Star, Filter, ThumbsUp, ThumbsDown, MessageCircle } from "lucide-react"
import { getCurrencyListings, getNewCurrencyListings, type CurrencyListing as DBCurrencyListing } from "@/app/actions/listings"
import { getGames, type GameOption } from "@/app/actions/games"

interface CurrencyListing {
  id: string
  game: string
  currencyType: string
  ratePerPeso: number
  stock: number
  sellerVouches: number
  status: "Available" | "Sold" | "Pending"
  deliveryMethods: string[]
  sellerId: string
  sellerName: string
  sellerAvatar: string
  upvotes: number
  downvotes: number
}

// No mock data - use real database only

export default function CurrencyMarketplace() {
  const router = useRouter()
  const [selectedGame, setSelectedGame] = useState<string | null>(null)
  const [listings, setListings] = useState<CurrencyListing[]>([])
  const [games, setGames] = useState<GameOption[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [sortBy, setSortBy] = useState("rate-high")
  const [rateRange, setRateRange] = useState({ min: 0, max: 1000 })
  const [totalListings, setTotalListings] = useState(0)

  // Fetch games for filtering
  useEffect(() => {
    const fetchGames = async () => {
      try {
        const dbGames = await getGames()
        setGames(dbGames)
      } catch (error) {
        console.error("[Currency Page] Error fetching games:", error)
      }
    }
    fetchGames()
  }, [])

  // Fetch currency listings from database
  useEffect(() => {
    const fetchListings = async () => {
      try {
        console.log("[Currency Page] Fetching listings from database...")
        setIsLoading(true)
        
        // Try to use new CurrencyListing model, fallback to old if not available
        let dbListings
        try {
          dbListings = await getNewCurrencyListings()
          console.log("[Currency Page] Fetched from new model:", dbListings)
          
          // Transform new model listings to UI format
          const mapped: CurrencyListing[] = dbListings.map((listing) => ({
            id: listing.id,
            game: listing.gameName,
            currencyType: listing.currencyName,
            ratePerPeso: listing.ratePerPeso,
            stock: listing.stock,
            sellerVouches: listing.sellerVouches,
            status: listing.status === "available" ? "Available" : listing.status as "Available" | "Sold" | "Pending",
            deliveryMethods: ["Instant", "Manual"],
            sellerId: listing.sellerId,
            sellerName: listing.sellerUsername,
            sellerAvatar: "/placeholder-user.jpg",
            upvotes: listing.upvotes,
            downvotes: listing.downvotes,
          }))
          
          setListings(mapped)
          setTotalListings(mapped.filter(l => l.status === "Available").length)
        } catch (newModelError) {
          console.log("[Currency Page] New model not ready, using old model...")
          // Fallback to old model
          dbListings = await getCurrencyListings()
          console.log("[Currency Page] Fetched from old model:", dbListings)

          // Transform old model listings to UI format
          const mapped: CurrencyListing[] = (dbListings || []).map((listing: DBCurrencyListing) => {
            const description = listing.description || ""
            const currencyMatch = description.match(/Currency: (.+?)(?:\n|$)/)
            const rateMatch = description.match(/Rate: ₱([\d.]+)/)
            const currencyType = currencyMatch ? currencyMatch[1].trim() : "Unknown"
            const ratePerPeso = rateMatch ? parseFloat(rateMatch[1]) : 0
            const stock = listing.stock || 0

            return {
              id: listing.id,
              game: listing.game,
              currencyType,
              ratePerPeso,
              stock,
              sellerVouches: listing.sellerVouches || 0,
              status: listing.status as "Available" | "Sold" | "Pending",
              deliveryMethods: ["Instant", "Manual"],
              sellerId: listing.sellerId,
              sellerName: listing.sellerUsername || "Unknown Seller",
              sellerAvatar: "/placeholder-user.jpg",
              upvotes: listing.upvotes || 0,
              downvotes: listing.downvotes || 0,
            }
          })
          
          setListings(mapped)
          setTotalListings(mapped.filter(l => l.status === "Available").length)
        }
      } catch (error) {
        console.error("[Currency Page] Error fetching listings:", error)
        setListings([])
      } finally {
        setIsLoading(false)
      }
    }

    fetchListings()
  }, [])

  const filteredListings = listings.filter((listing) => {
    const matchesGame = !selectedGame || listing.game === selectedGame
    const matchesSearch =
      searchQuery === "" ||
      listing.currencyType.toLowerCase().includes(searchQuery.toLowerCase()) ||
      listing.game.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesRate = listing.ratePerPeso >= rateRange.min && listing.ratePerPeso <= rateRange.max
    const matchesStatus = listing.status === "Available"

    return matchesGame && matchesSearch && matchesRate && matchesStatus
  })

  const sortedListings = [...filteredListings].sort((a, b) => {
    switch (sortBy) {
      case "rate-high":
        return b.ratePerPeso - a.ratePerPeso
      case "rate-low":
        return a.ratePerPeso - b.ratePerPeso
      case "stock-high":
        return b.stock - a.stock
      case "vouches":
        return b.sellerVouches - a.sellerVouches
      case "upvotes":
        return b.upvotes - a.upvotes
      default:
        return 0
    }
  })

  const handleListingClick = (listingId: string) => {
    router.push(`/currency/${listingId}`)
  }

  return (
    <>
      <Navigation />
      <main className="min-h-screen bg-background">
        {/* Hero Section */}
        <section className="bg-gradient-to-r from-primary/10 to-primary/5 py-12">
          <div className="container max-w-[1920px] mx-auto px-6">
            <h1 className="text-4xl font-bold mb-2">Currency Marketplace</h1>
            <p className="text-muted-foreground">
              {isLoading ? "Loading..." : `Buy and sell in-game currencies safely and securely with our trusted community from over ${totalListings} available listing${totalListings !== 1 ? "s" : ""}`}
            </p>
          </div>
        </section>

        {/* Main Content */}
        <div className="container max-w-[1920px] mx-auto px-6 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Sidebar Filters */}
            <div className="lg:col-span-1">
              <Card className="p-6 sticky top-24">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <Filter className="w-4 h-4" />
                  Filters
                </h3>

                {/* Search */}
                <div className="mb-6">
                  <label className="text-sm font-medium mb-2 block">Search</label>
                  <Input
                    placeholder="Search currency..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>

                {/* Game Categories */}
                <div className="mb-6">
                  <label className="text-sm font-medium mb-3 block">Games</label>
                  <select
                    value={selectedGame || ""}
                    onChange={(e) => setSelectedGame(e.target.value || null)}
                    className="w-full px-3 py-2 border rounded-lg bg-background text-sm"
                  >
                    <option value="">All Games</option>
                    {[...games].sort((a, b) => a.displayName.localeCompare(b.displayName)).map((game) => (
                      <option key={game.name} value={game.name}>
                        {game.displayName}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Rate Range */}
                <div className="mb-6">
                  <label className="text-sm font-medium mb-3 block">Rate Range (per ₱1)</label>
                  <div className="space-y-2">
                    <input
                      type="number"
                      placeholder="Min"
                      value={rateRange.min}
                      onChange={(e) => setRateRange({ ...rateRange, min: Number.parseFloat(e.target.value) || 0 })}
                      className="w-full px-3 py-2 border rounded bg-background text-sm"
                    />
                    <input
                      type="number"
                      placeholder="Max"
                      value={rateRange.max}
                      onChange={(e) => setRateRange({ ...rateRange, max: Number.parseFloat(e.target.value) || 1000 })}
                      className="w-full px-3 py-2 border rounded bg-background text-sm"
                    />
                  </div>
                </div>

                {/* Sort */}
                <div>
                  <label className="text-sm font-medium mb-2 block">Sort By</label>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="w-full px-3 py-2 border rounded bg-background text-sm"
                  >
                    <option value="rate-high">Rate: High to Low</option>
                    <option value="rate-low">Rate: Low to High</option>
                    <option value="stock-high">Stock: High to Low</option>
                    <option value="vouches">Most Vouched</option>
                    <option value="upvotes">Most Upvoted</option>
                  </select>
                </div>
              </Card>
            </div>

            {/* Listings */}
            <div className="lg:col-span-3">
              {isLoading ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mb-4"></div>
                  <p className="text-muted-foreground">Loading currency listings...</p>
                </div>
              ) : (
                <>
                  <div className="mb-4 text-sm text-muted-foreground">
                    Found {sortedListings.length} listing{sortedListings.length !== 1 ? "s" : ""}
                  </div>

                  <div className="space-y-4">
                    {sortedListings.map((listing) => (
                      <Card
                        key={listing.id}
                        className="p-4 hover:shadow-md transition cursor-pointer border-l-4 border-primary"
                        onClick={() => handleListingClick(listing.id)}
                      >
                        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-start">
                          {/* Currency Info */}
                          <div className="md:col-span-3">
                            <div className="font-semibold text-lg">{listing.game}</div>
                            <div className="text-sm text-muted-foreground">{listing.currencyType}</div>
                            <div className="text-sm font-medium mt-2 text-primary">
                              {listing.ratePerPeso} per ₱1
                            </div>
                          </div>

                          {/* Stock */}
                          <div className="md:col-span-2">
                            <div className="text-sm text-muted-foreground">Stock</div>
                            <div className="text-2xl font-bold text-primary">{listing.stock.toLocaleString()}</div>
                          </div>

                          {/* Seller Info */}
                          <div className="md:col-span-2">
                            <div className="text-sm text-muted-foreground">Seller</div>
                            <div className="flex items-center gap-1 mt-1">
                              <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                              <span className="font-medium">{listing.sellerVouches}</span>
                              <span className="text-xs text-muted-foreground">vouches</span>
                            </div>
                          </div>

                          <div className="md:col-span-2">
                            <div className="text-sm text-muted-foreground mb-1">Votes</div>
                            <div className="flex items-center gap-3">
                              <span className="flex items-center gap-1 text-green-600">
                                <ThumbsUp className="w-4 h-4" />
                                {listing.upvotes}
                              </span>
                              <span className="flex items-center gap-1 text-red-600">
                                <ThumbsDown className="w-4 h-4" />
                                {listing.downvotes}
                              </span>
                            </div>
                          </div>

                          {/* Action - Message button */}
                          <div className="md:col-span-3 flex gap-2">
                            <Button
                              className="w-full"
                              onClick={(e) => {
                                e.stopPropagation()
                                router.push(`/currency/${listing.id}?contact=true`)
                              }}
                            >
                              <MessageCircle className="w-4 h-4 mr-2" />
                              Message
                            </Button>
                          </div>
                        </div>
                      </Card>
                    ))}

                    {sortedListings.length === 0 && (
                      <Card className="p-12 text-center">
                        <p className="text-muted-foreground mb-4">No listings found matching your filters</p>
                        <Button variant="outline" onClick={() => setSelectedGame(null)}>
                          Clear Filters
                        </Button>
                      </Card>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </main>
    </>
  )
}
