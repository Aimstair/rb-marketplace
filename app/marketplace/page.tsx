"use client"

import { useState, useMemo, useEffect } from "react"
import { Search, Filter, ThumbsUp, ThumbsDown, ChevronLeft, ChevronRight, StarIcon } from "lucide-react"
import Navigation from "@/components/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"
import { Star, MessageCircle } from "lucide-react"
import { useSearchParams } from "next/navigation"

const mockListings = [
  // Accessories (Roblox Catalog Items)
  {
    id: 1,
    title: "Dominus Astrorum",
    game: "Roblox Catalog",
    price: 8999,
    image: "/dominus-astrorum-roblox-limited.jpg",
    seller: "PixelVault",
    vouch: 89,
    status: "available",
    category: "Accessories",
    itemType: "Limited",
    condition: "Mint",
    upvotes: 124,
    downvotes: 5,
    featured: true,
  },
  {
    id: 2,
    title: "Party Hat",
    game: "Roblox Catalog",
    price: 4200,
    image: "/roblox-party-hat-accessory.jpg",
    seller: "LegitTrader",
    vouch: 134,
    status: "available",
    category: "Accessories",
    itemType: "Limited",
    condition: "Mint",
    upvotes: 98,
    downvotes: 4,
    featured: false,
  },
  {
    id: 3,
    title: "UGC Accessory Bundle",
    game: "Roblox Catalog",
    price: 890,
    image: "/roblox-ugc-accessories-bundle.jpg",
    seller: "UGCMaster",
    vouch: 201,
    status: "available",
    category: "Accessories",
    itemType: "UGC",
    condition: "New",
    upvotes: 145,
    downvotes: 7,
    featured: false,
  },
  {
    id: 4,
    title: "Sparkle Time Fedora",
    game: "Roblox Catalog",
    price: 3500,
    image: "/roblox-sparkle-fedora-hat.jpg",
    seller: "HatCollector",
    vouch: 67,
    status: "available",
    category: "Accessories",
    itemType: "Limited",
    condition: "Mint",
    upvotes: 76,
    downvotes: 2,
    featured: true,
  },
  // Games - In-Game Items
  {
    id: 5,
    title: "Golden Dragon Pet",
    game: "Adopt Me",
    price: 2500,
    image: "/golden-dragon-pet-roblox.jpg",
    seller: "NinjaTrader",
    vouch: 42,
    status: "available",
    category: "Games",
    itemType: "In-Game Items",
    condition: "New",
    upvotes: 67,
    downvotes: 3,
    featured: true,
  },
  {
    id: 6,
    title: "Royal Winged Dragon",
    game: "Adopt Me",
    price: 5500,
    image: "/adopt-me-royal-dragon-pet.jpg",
    seller: "SafeTrader99",
    vouch: 78,
    status: "available",
    category: "Games",
    itemType: "In-Game Items",
    condition: "New",
    upvotes: 56,
    downvotes: 2,
    featured: false,
  },
  {
    id: 7,
    title: "Pet Simulator X Huge Pets Bundle",
    game: "Pet Simulator X",
    price: 3800,
    image: "/pet-simulator-x-huge-pets-bundle.jpg",
    seller: "CasualPlayer",
    vouch: 23,
    status: "available",
    category: "Games",
    itemType: "In-Game Items",
    condition: "Used",
    upvotes: 34,
    downvotes: 8,
    featured: false,
  },
  // Games - Gamepasses
  {
    id: 8,
    title: "Blox Fruits Zoan Tier 3",
    game: "Blox Fruits",
    price: 1200,
    image: "/blox-fruits-zoan-tier.jpg",
    seller: "TradeMaster",
    vouch: 156,
    status: "available",
    category: "Games",
    itemType: "Gamepasses",
    condition: "New",
    upvotes: 89,
    downvotes: 12,
    featured: false,
  },
  {
    id: 9,
    title: "2x EXP Gamepass",
    game: "Blox Fruits",
    price: 800,
    image: "/blox-fruits-gamepass-exp-boost.jpg",
    seller: "GamepassKing",
    vouch: 45,
    status: "available",
    category: "Games",
    itemType: "Gamepasses",
    condition: "New",
    upvotes: 62,
    downvotes: 4,
    featured: false,
  },
  {
    id: 10,
    title: "VIP Gamepass",
    game: "Pet Simulator X",
    price: 650,
    image: "/pet-simulator-vip-gamepass.jpg",
    seller: "VIPSeller",
    vouch: 89,
    status: "available",
    category: "Games",
    itemType: "Gamepasses",
    condition: "New",
    upvotes: 78,
    downvotes: 3,
    featured: false,
  },
  // Games - Services
  {
    id: 11,
    title: "Level Boosting Service",
    game: "Blox Fruits",
    price: 500,
    image: "/blox-fruits-leveling-service.jpg",
    seller: "BoostPro",
    vouch: 234,
    status: "available",
    category: "Games",
    itemType: "Services",
    condition: "New",
    upvotes: 156,
    downvotes: 8,
    featured: false,
  },
  {
    id: 12,
    title: "Account Recovery Help",
    game: "Adopt Me",
    price: 300,
    image: "/account-help-service.jpg",
    seller: "HelpDesk",
    vouch: 112,
    status: "available",
    category: "Games",
    itemType: "Services",
    condition: "New",
    upvotes: 89,
    downvotes: 5,
    featured: false,
  },
  // Accounts
  {
    id: 13,
    title: "Starter Account - Pet Sim X",
    game: "Pet Simulator X",
    price: 2100,
    image: "/pet-simulator-x-account.jpg",
    seller: "AccountSeller",
    vouch: 45,
    status: "available",
    category: "Accounts",
    itemType: "Account",
    condition: "New",
    upvotes: 23,
    downvotes: 6,
    featured: false,
  },
  {
    id: 14,
    title: "Max Level Account",
    game: "Blox Fruits",
    price: 4500,
    image: "/blox-fruits-max-level-account.jpg",
    seller: "ProAccounts",
    vouch: 67,
    status: "available",
    category: "Accounts",
    itemType: "Account",
    condition: "Used",
    upvotes: 45,
    downvotes: 3,
    featured: true,
  },
  {
    id: 15,
    title: "Rich Adopt Me Account",
    game: "Adopt Me",
    price: 8000,
    image: "/adopt-me-rich-account-pets.jpg",
    seller: "PremiumAccs",
    vouch: 156,
    status: "available",
    category: "Accounts",
    itemType: "Account",
    condition: "Used",
    upvotes: 112,
    downvotes: 7,
    featured: false,
  },
  {
    id: 16,
    title: "Beginner Blox Fruits Account",
    game: "Blox Fruits",
    price: 1200,
    image: "/blox-fruits-starter-account.jpg",
    seller: "StarterAccs",
    vouch: 34,
    status: "available",
    category: "Accounts",
    itemType: "Account",
    condition: "New",
    upvotes: 28,
    downvotes: 2,
    featured: false,
  },
]

const mainCategories = ["All", "Featured", "Accessories", "Games", "Accounts"]

const gamesList = ["All Games", "Adopt Me", "Pet Simulator X", "Blox Fruits", "Murder Mystery 2", "Jailbreak"]

const gameItemTypes = ["All", "In-Game Items", "Gamepasses", "Services"]

const sortOptions = [
  { label: "Newest", value: "newest" },
  { label: "Price: Low to High", value: "price-asc" },
  { label: "Price: High to Low", value: "price-desc" },
  { label: "Most Vouches", value: "vouch" },
  { label: "Most Upvoted", value: "upvotes" },
  { label: "Trending", value: "trending" },
]

const ITEMS_PER_PAGE = 9

export default function MarketplacePage() {
  const searchParams = useSearchParams()
  const [searchQuery, setSearchQuery] = useState("")
  const [mainCategory, setMainCategory] = useState("All")
  const [selectedGame, setSelectedGame] = useState("All Games")
  const [selectedItemType, setSelectedItemType] = useState("All")
  const [sortBy, setSortBy] = useState("newest")
  const [priceRange, setPriceRange] = useState({ min: 0, max: 1000000 })
  const [showFilters, setShowFilters] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)

  useEffect(() => {
    const itemParam = searchParams.get("item")
    if (itemParam) {
      setSearchQuery(itemParam)
    }
  }, [searchParams])

  useEffect(() => {
    setSelectedGame("All Games")
    setSelectedItemType("All")
  }, [mainCategory])

  useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery, mainCategory, selectedGame, selectedItemType, sortBy, priceRange])

  const filteredListings = useMemo(() => {
    const results = mockListings.filter((listing) => {
      const matchesSearch =
        listing.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        listing.seller.toLowerCase().includes(searchQuery.toLowerCase())

      let matchesMainCategory = true
      if (mainCategory === "Featured") {
        matchesMainCategory = listing.featured === true
      } else if (mainCategory === "Accessories") {
        matchesMainCategory = listing.category === "Accessories"
      } else if (mainCategory === "Games") {
        matchesMainCategory = listing.category === "Games"
      } else if (mainCategory === "Accounts") {
        matchesMainCategory = listing.category === "Accounts"
      }

      // Game filter (for Games and Accounts categories)
      const matchesGame = selectedGame === "All Games" || listing.game === selectedGame

      // Item type filter (only for Games category)
      const matchesItemType =
        mainCategory !== "Games" || selectedItemType === "All" || listing.itemType === selectedItemType

      const matchesPrice = listing.price >= priceRange.min && listing.price <= priceRange.max

      return matchesSearch && matchesMainCategory && matchesGame && matchesItemType && matchesPrice
    })

    // Sort
    results.sort((a, b) => {
      switch (sortBy) {
        case "price-asc":
          return a.price - b.price
        case "price-desc":
          return b.price - a.price
        case "vouch":
          return b.vouch - a.vouch
        case "upvotes":
          return b.upvotes - a.upvotes
        case "trending":
          return Math.random() - 0.5
        default:
          return 0
      }
    })

    return results
  }, [searchQuery, mainCategory, selectedGame, selectedItemType, sortBy, priceRange])

  const totalPages = Math.ceil(filteredListings.length / ITEMS_PER_PAGE)
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE
  const paginatedListings = filteredListings.slice(startIndex, startIndex + ITEMS_PER_PAGE)

  const availableGames = useMemo(() => {
    if (mainCategory === "Accessories" || mainCategory === "Featured") return []
    const gamesInCategory = mockListings
      .filter((l) => l.category === mainCategory || mainCategory === "All")
      .map((l) => l.game)
    return ["All Games", ...Array.from(new Set(gamesInCategory.filter((g) => g !== "Roblox Catalog")))]
  }, [mainCategory])

  const activeFilters = [
    mainCategory !== "All" ? { name: "Category", value: mainCategory } : null,
    selectedGame !== "All Games" ? { name: "Game", value: selectedGame } : null,
    selectedItemType !== "All" && mainCategory === "Games" ? { name: "Type", value: selectedItemType } : null,
    priceRange.min > 0 || priceRange.max < 1000000
      ? { name: "Price", value: `₱${priceRange.min.toLocaleString()} - ₱${priceRange.max.toLocaleString()}` }
      : null,
  ].filter(Boolean)

  const clearFilters = () => {
    setSearchQuery("")
    setMainCategory("All")
    setSelectedGame("All Games")
    setSelectedItemType("All")
    setPriceRange({ min: 0, max: 1000000 })
  }

  return (
    <main className="min-h-screen bg-background">
      <Navigation />

      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Marketplace</h1>
          <p className="text-muted-foreground">
            Browse {filteredListings.length} available listing{filteredListings.length !== 1 ? "s" : ""}
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Filters Sidebar - Desktop */}
          <div className="hidden lg:block lg:col-span-1">
            <Card className="p-6 sticky top-24">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Filter className="w-4 h-4" />
                Filters
              </h3>

              {/* Search */}
              <div className="mb-6">
                <label className="text-sm font-medium mb-2 block">Search</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    type="text"
                    placeholder="Search items..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>

              {/* Main Categories */}
              <div className="mb-6">
                <label className="text-sm font-medium mb-3 block">Categories</label>
                <div className="space-y-1">
                  {mainCategories.map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setMainCategory(cat)}
                      className={`w-full text-left px-3 py-2 rounded transition flex items-center gap-2 ${
                        mainCategory === cat ? "bg-primary text-primary-foreground" : "hover:bg-secondary"
                      }`}
                    >
                      {cat === "Featured" && <StarIcon className="w-4 h-4" />}
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              {/* Game Selection - only show for Games/Accounts/All categories */}
              {(mainCategory === "Games" || mainCategory === "Accounts" || mainCategory === "All") &&
                availableGames.length > 0 && (
                  <div className="mb-6">
                    <label className="text-sm font-medium mb-3 block">Game</label>
                    <div className="space-y-1">
                      {availableGames.map((game) => (
                        <button
                          key={game}
                          onClick={() => setSelectedGame(game)}
                          className={`w-full text-left px-3 py-2 rounded transition text-sm ${
                            selectedGame === game ? "bg-primary text-primary-foreground" : "hover:bg-secondary"
                          }`}
                        >
                          {game}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

              {/* Item Type Selection - only show for Games category */}
              {mainCategory === "Games" && (
                <div className="mb-6">
                  <label className="text-sm font-medium mb-3 block">Item Type</label>
                  <div className="space-y-1">
                    {gameItemTypes.map((type) => (
                      <button
                        key={type}
                        onClick={() => setSelectedItemType(type)}
                        className={`w-full text-left px-3 py-2 rounded transition text-sm ${
                          selectedItemType === type ? "bg-primary text-primary-foreground" : "hover:bg-secondary"
                        }`}
                      >
                        {type}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Price Range - input fields for 0 to 1 million */}
              <div className="mb-6">
                <label className="text-sm font-medium mb-3 block">Price Range</label>
                <div className="space-y-2">
                  <div>
                    <label className="text-xs text-muted-foreground">Min (₱)</label>
                    <Input
                      type="number"
                      min={0}
                      max={1000000}
                      value={priceRange.min}
                      onChange={(e) => setPriceRange({ ...priceRange, min: Math.max(0, Number(e.target.value)) })}
                      className="text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">Max (₱)</label>
                    <Input
                      type="number"
                      min={0}
                      max={1000000}
                      value={priceRange.max}
                      onChange={(e) => setPriceRange({ ...priceRange, max: Math.min(1000000, Number(e.target.value)) })}
                      className="text-sm"
                    />
                  </div>
                </div>
              </div>

              {/* Sort */}
              <div className="border-t pt-6">
                <label className="text-sm font-medium mb-3 block">Sort By</label>
                <div className="space-y-1">
                  {sortOptions.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => setSortBy(opt.value)}
                      className={`w-full text-left px-3 py-2 rounded transition text-sm ${
                        sortBy === opt.value ? "bg-primary text-primary-foreground" : "hover:bg-secondary"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            </Card>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            {/* Mobile Filter Toggle & Sort */}
            <div className="lg:hidden flex gap-2 mb-6">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center gap-2"
              >
                <Filter className="w-4 h-4" />
                Filters
              </Button>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="flex-1 px-3 py-2 rounded-md border border-border bg-background text-foreground text-sm"
              >
                {sortOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Mobile Filters Dropdown */}
            {showFilters && (
              <div className="lg:hidden mb-6 p-6 border rounded-lg bg-card">
                <div className="space-y-4">
                  {/* Search */}
                  <div>
                    <label className="text-sm font-medium mb-2 block">Search</label>
                    <Input
                      type="text"
                      placeholder="Search items..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>

                  {/* Categories */}
                  <div>
                    <label className="text-sm font-medium mb-2 block">Category</label>
                    <div className="flex flex-wrap gap-2">
                      {mainCategories.map((cat) => (
                        <Button
                          key={cat}
                          size="sm"
                          variant={mainCategory === cat ? "default" : "outline"}
                          onClick={() => setMainCategory(cat)}
                        >
                          {cat}
                        </Button>
                      ))}
                    </div>
                  </div>

                  {/* Game */}
                  {availableGames.length > 0 && (
                    <div>
                      <label className="text-sm font-medium mb-2 block">Game</label>
                      <select
                        value={selectedGame}
                        onChange={(e) => setSelectedGame(e.target.value)}
                        className="w-full px-3 py-2 rounded-md border bg-background text-sm"
                      >
                        {availableGames.map((game) => (
                          <option key={game} value={game}>
                            {game}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Item Type */}
                  {mainCategory === "Games" && (
                    <div>
                      <label className="text-sm font-medium mb-2 block">Item Type</label>
                      <div className="flex flex-wrap gap-2">
                        {gameItemTypes.map((type) => (
                          <Button
                            key={type}
                            size="sm"
                            variant={selectedItemType === type ? "default" : "outline"}
                            onClick={() => setSelectedItemType(type)}
                          >
                            {type}
                          </Button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Price Range */}
                  <div>
                    <label className="text-sm font-medium mb-2 block">Price Range (₱0 - ₱1,000,000)</label>
                    <div className="flex gap-2">
                      <Input
                        type="number"
                        placeholder="Min"
                        value={priceRange.min}
                        onChange={(e) => setPriceRange({ ...priceRange, min: Math.max(0, Number(e.target.value)) })}
                      />
                      <Input
                        type="number"
                        placeholder="Max"
                        value={priceRange.max}
                        onChange={(e) =>
                          setPriceRange({ ...priceRange, max: Math.min(1000000, Number(e.target.value)) })
                        }
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Active Filters Display */}
            {activeFilters.length > 0 && (
              <div className="mb-6 flex flex-wrap items-center gap-2">
                <span className="text-sm text-muted-foreground">Active filters:</span>
                {activeFilters.map((filter, idx) => (
                  <Badge key={idx} variant="secondary">
                    {filter.name}: {filter.value}
                  </Badge>
                ))}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearFilters}
                  className="text-destructive hover:text-destructive"
                >
                  Clear all
                </Button>
              </div>
            )}

            {/* Results count */}
            <div className="flex justify-between items-center mb-6">
              <p className="text-sm text-muted-foreground">
                Showing {paginatedListings.length > 0 ? startIndex + 1 : 0}-
                {Math.min(startIndex + ITEMS_PER_PAGE, filteredListings.length)} of {filteredListings.length} results
              </p>
            </div>

            {/* Listings Grid */}
            {paginatedListings.length > 0 ? (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {paginatedListings.map((listing) => (
                    <Link key={listing.id} href={`/listing/${listing.id}`}>
                      <Card className="overflow-hidden hover:shadow-lg transition-all duration-300 cursor-pointer group h-full flex flex-col">
                        {/* Image */}
                        <div className="relative h-48 bg-muted overflow-hidden">
                          <img
                            src={listing.image || "/placeholder.svg"}
                            alt={listing.title}
                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                          />
                          <Badge className="absolute top-3 right-3 bg-primary text-primary-foreground">
                            {listing.condition}
                          </Badge>
                          {listing.featured && (
                            <Badge className="absolute top-3 left-3 bg-yellow-500 text-white">
                              <StarIcon className="w-3 h-3 mr-1" />
                              Featured
                            </Badge>
                          )}
                        </div>

                        {/* Content */}
                        <div className="p-4 flex flex-col flex-grow">
                          <h3 className="font-bold line-clamp-2 mb-2 group-hover:text-primary transition">
                            {listing.title}
                          </h3>

                          <div className="flex gap-2 mb-3 flex-wrap">
                            <Badge variant="secondary" className="text-xs">
                              {listing.category}
                            </Badge>
                            <Badge variant="outline" className="text-xs">
                              {listing.game}
                            </Badge>
                            {listing.itemType && listing.category === "Games" && (
                              <Badge variant="outline" className="text-xs">
                                {listing.itemType}
                              </Badge>
                            )}
                          </div>

                          {/* Price */}
                          <div className="mb-3">
                            <p className="text-2xl font-bold text-primary">₱{listing.price.toLocaleString()}</p>
                          </div>

                          {/* Seller Info & Votes */}
                          <div className="flex items-center justify-between text-sm mb-4 pb-4 border-b mt-auto">
                            <span className="text-muted-foreground">{listing.seller}</span>
                            <div className="flex items-center gap-1">
                              <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                              <span className="font-semibold text-sm">{listing.vouch}</span>
                            </div>
                          </div>

                          <div className="flex items-center justify-between text-sm mb-4">
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

                          {/* Contact Button */}
                          <button className="w-full flex items-center justify-center gap-2 py-2 rounded-md bg-primary/10 text-primary hover:bg-primary/20 transition text-sm font-medium">
                            <MessageCircle className="w-4 h-4" />
                            Message
                          </button>
                        </div>
                      </Card>
                    </Link>
                  ))}
                </div>

                {totalPages > 1 && (
                  <div className="flex items-center justify-center gap-2 mt-8">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                      <Button
                        key={page}
                        variant={currentPage === page ? "default" : "outline"}
                        size="sm"
                        onClick={() => setCurrentPage(page)}
                        className="w-8"
                      >
                        {page}
                      </Button>
                    ))}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-12">
                <p className="text-lg text-muted-foreground mb-4">No listings found</p>
                <Button onClick={clearFilters} variant="outline">
                  Clear Filters
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  )
}
