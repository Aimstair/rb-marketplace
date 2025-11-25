"use client"
import { useState } from "react"
import { useRouter } from "next/navigation"
import Navigation from "@/components/navigation"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Star, Filter, ThumbsUp, ThumbsDown, MessageCircle } from "lucide-react"

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

const GAME_CATEGORIES = [
  { name: "Roblox", currency: "Robux" },
  { name: "Adopt Me", currency: "Coins" },
  { name: "Blox Fruits", currency: "Gems" },
  { name: "Pet Simulator", currency: "Tokens" },
]

const MOCK_LISTINGS: CurrencyListing[] = [
  {
    id: "1",
    game: "Roblox",
    currencyType: "Robux",
    ratePerPeso: 3,
    stock: 10000,
    sellerVouches: 24,
    status: "Available",
    deliveryMethods: ["In-game Trade", "Gift Card"],
    sellerId: "seller1",
    sellerName: "TrustTrader",
    sellerAvatar: "/user-avatar-master-trader.jpg",
    upvotes: 45,
    downvotes: 2,
  },
  {
    id: "2",
    game: "Roblox",
    currencyType: "Robux",
    ratePerPeso: 2.5,
    stock: 25000,
    sellerVouches: 18,
    status: "Available",
    deliveryMethods: ["Account Trade", "In-game Trade"],
    sellerId: "seller2",
    sellerName: "FastDelivery",
    sellerAvatar: "/user-avatar-profile.png",
    upvotes: 32,
    downvotes: 5,
  },
  {
    id: "3",
    game: "Adopt Me",
    currencyType: "Coins",
    ratePerPeso: 500,
    stock: 1000000,
    sellerVouches: 31,
    status: "Available",
    deliveryMethods: ["In-game Trade"],
    sellerId: "seller3",
    sellerName: "CoinMaster",
    sellerAvatar: "/user-avatar-trading.jpg",
    upvotes: 78,
    downvotes: 3,
  },
  {
    id: "4",
    game: "Blox Fruits",
    currencyType: "Gems",
    ratePerPeso: 10,
    stock: 5000,
    sellerVouches: 9,
    status: "Pending",
    deliveryMethods: ["Gift Card"],
    sellerId: "seller4",
    sellerName: "GemTrader",
    sellerAvatar: "/user-avatar-profile-trading.jpg",
    upvotes: 12,
    downvotes: 1,
  },
  {
    id: "5",
    game: "Pet Simulator",
    currencyType: "Tokens",
    ratePerPeso: 1000,
    stock: 5000000,
    sellerVouches: 42,
    status: "Available",
    deliveryMethods: ["Account Trade"],
    sellerId: "seller5",
    sellerName: "TokenKing",
    sellerAvatar: "/user-avatar-profile.png",
    upvotes: 89,
    downvotes: 4,
  },
  {
    id: "6",
    game: "Roblox",
    currencyType: "Robux",
    ratePerPeso: 2.8,
    stock: 15000,
    sellerVouches: 15,
    status: "Available",
    deliveryMethods: ["In-game Trade", "Gift Card"],
    sellerId: "seller6",
    sellerName: "RobuxPro",
    sellerAvatar: "/user-avatar-master-trader.jpg",
    upvotes: 56,
    downvotes: 8,
  },
]

export default function CurrencyMarketplace() {
  const router = useRouter()
  const [selectedGame, setSelectedGame] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [sortBy, setSortBy] = useState("rate-high")
  const [rateRange, setRateRange] = useState({ min: 0, max: 1000 })

  const filteredListings = MOCK_LISTINGS.filter((listing) => {
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
          <div className="container mx-auto px-4">
            <h1 className="text-4xl font-bold mb-2">Currency Marketplace</h1>
            <p className="text-muted-foreground">
              Buy and sell in-game currencies safely and securely with our trusted community
            </p>
          </div>
        </section>

        {/* Main Content */}
        <div className="container mx-auto px-4 py-8">
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
                  <div className="space-y-2">
                    <button
                      onClick={() => setSelectedGame(null)}
                      className={`w-full text-left px-3 py-2 rounded transition ${
                        !selectedGame ? "bg-primary text-primary-foreground" : "hover:bg-secondary"
                      }`}
                    >
                      All Games
                    </button>
                    {GAME_CATEGORIES.map((game) => (
                      <button
                        key={game.name}
                        onClick={() => setSelectedGame(game.name)}
                        className={`w-full text-left px-3 py-2 rounded transition ${
                          selectedGame === game.name ? "bg-primary text-primary-foreground" : "hover:bg-secondary"
                        }`}
                      >
                        {game.name}
                      </button>
                    ))}
                  </div>
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
                          {listing.ratePerPeso} {listing.currencyType} per ₱1
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
            </div>
          </div>
        </div>
      </main>
    </>
  )
}
