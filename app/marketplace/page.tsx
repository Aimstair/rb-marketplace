"use client"

import { useState, useEffect } from "react"
import { Search, Filter, ThumbsUp, ThumbsDown, ChevronLeft, ChevronRight, StarIcon, Star, MessageCircle } from "lucide-react"
import Navigation from "@/components/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { getListings, getFilterOptions } from "@/app/actions/listings"
import type { ListingResponse } from "@/lib/schemas"

// Define interface for filter options based on your schema
interface FilterOption {
  id: string
  label: string
  value: string
}

const ITEMS_PER_PAGE = 9

const sortOptions = [
  { label: "Newest", value: "newest" },
  { label: "Price: Low to High", value: "price-asc" },
  { label: "Price: High to Low", value: "price-desc" },
  { label: "Most Vouches", value: "vouch" },
  { label: "Most Upvoted", value: "upvotes" },
  { label: "Trending", value: "trending" },
]

export default function MarketplacePage() {
  const searchParams = useSearchParams()
  
  // Filter States
  const [searchQuery, setSearchQuery] = useState("")
  const [mainCategory, setMainCategory] = useState("All")
  const [selectedGame, setSelectedGame] = useState("All Games")
  const [selectedItemType, setSelectedItemType] = useState("All")
  const [sortBy, setSortBy] = useState("newest")
  const [priceRange, setPriceRange] = useState({ min: 0, max: 1000000 })
  const [showFilters, setShowFilters] = useState(false)
  
  // Data States
  const [currentPage, setCurrentPage] = useState(1)
  const [listings, setListings] = useState<ListingResponse[]>([])
  const [totalListings, setTotalListings] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  
  // Dynamic Filter Options States
  const [categoryOptions, setCategoryOptions] = useState<FilterOption[]>([])
  const [gameOptions, setGameOptions] = useState<FilterOption[]>([])
  const [itemTypeOptions, setItemTypeOptions] = useState<FilterOption[]>([])
  const [areFiltersLoading, setAreFiltersLoading] = useState(true)

  // Initialize Search from URL
  useEffect(() => {
    const itemParam = searchParams.get("item")
    if (itemParam) {
      setSearchQuery(itemParam)
    }
  }, [searchParams])

  // Fetch Dynamic Filter Options on Mount
  useEffect(() => {
    const loadFilters = async () => {
      setAreFiltersLoading(true)
      try {
        const [categories, games, itemTypes] = await Promise.all([
          getFilterOptions("CATEGORY"),
          getFilterOptions("GAME"),
          getFilterOptions("ITEM_TYPE"),
        ])
        setCategoryOptions(categories)
        setGameOptions(games)
        setItemTypeOptions(itemTypes)
      } catch (error) {
        console.error("Error loading filter options:", error)
      } finally {
        setAreFiltersLoading(false)
      }
    }
    loadFilters()
  }, [])

  // Reset dependent filters when parent filter changes
  useEffect(() => {
    setSelectedGame("All Games")
    setSelectedItemType("All")
  }, [mainCategory])

  useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery, mainCategory, selectedGame, selectedItemType, sortBy, priceRange])

  // Fetch listings
  useEffect(() => {
    const fetchListings = async () => {
      setIsLoading(true)
      try {
        const result = await getListings({
          search: searchQuery,
          mainCategory,
          selectedGame,
          selectedItemType,
          sortBy,
          priceRange,
          page: currentPage,
          itemsPerPage: ITEMS_PER_PAGE,
        })
        setListings(result.listings)
        setTotalListings(result.total)
      } catch (error) {
        console.error("Error fetching listings:", error)
        setListings([])
      } finally {
        setIsLoading(false)
      }
    }

    fetchListings()
  }, [searchQuery, mainCategory, selectedGame, selectedItemType, sortBy, priceRange, currentPage])

  const totalPages = Math.ceil(totalListings / ITEMS_PER_PAGE)

  // Helper to get display list with "All" option
  const getDisplayCategories = () => {
    return [{ id: "all", label: "All", value: "All" }, ...categoryOptions]
  }

  const getDisplayGames = () => {
    return [{ id: "all-games", label: "All Games", value: "All Games" }, ...gameOptions]
  }

  const getDisplayItemTypes = () => {
    return [{ id: "all-types", label: "All", value: "All" }, ...itemTypeOptions]
  }

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
      {/* Header */}
      <section className="bg-gradient-to-r from-primary/10 to-primary/5 py-12">
          <div className="container max-w-[1920px] mx-auto px-6">
            <h1 className="text-4xl font-bold mb-2">Item Marketplace</h1>
            <p className="text-muted-foreground">
              {isLoading ? "Loading..." : `Buy and sell in-game items safely and securely with our trusted community from over ${totalListings} available listing${totalListings !== 1 ? "s" : ""}`}
            </p>
          </div>
        </section>
        
      <div className="container max-w-[1920px] mx-auto px-6 py-8">
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

              {/* Main Categories - Dynamic */}
              <div className="mb-6">
                <label className="text-sm font-medium mb-3 block">Categories</label>
                <div className="space-y-1">
                  {areFiltersLoading ? (
                    <div className="h-20 animate-pulse bg-muted rounded" />
                  ) : (
                    getDisplayCategories().map((cat) => (
                      <button
                        key={cat.id}
                        onClick={() => setMainCategory(cat.value)}
                        className={`w-full text-left px-3 py-2 rounded transition flex items-center gap-2 ${
                          mainCategory === cat.value ? "bg-primary text-primary-foreground" : "hover:bg-secondary"
                        }`}
                      >
                        {cat.value === "Featured" && <StarIcon className="w-4 h-4" />}
                        {cat.label}
                      </button>
                    ))
                  )}
                </div>
              </div>

              {/* Game Selection - Dynamic */}
              {(mainCategory === "Games" || mainCategory === "Accounts" || mainCategory === "All") && (
                <div className="mb-6">
                  <label className="text-sm font-medium mb-3 block">Game</label>
                  {areFiltersLoading ? (
                    <div className="h-10 animate-pulse bg-muted rounded" />
                  ) : (
                    <select
                      value={selectedGame}
                      onChange={(e) => setSelectedGame(e.target.value)}
                      className="w-full px-3 py-2 border rounded-lg bg-background text-sm"
                    >
                      {getDisplayGames().map((game) => (
                        <option key={game.id} value={game.value}>
                          {game.label}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              )}

              {/* Item Type Selection - Dynamic */}
              {mainCategory === "Games" && (
                <div className="mb-6">
                  <label className="text-sm font-medium mb-3 block">Item Type</label>
                  {areFiltersLoading ? (
                    <div className="h-10 animate-pulse bg-muted rounded" />
                  ) : (
                    <select
                      value={selectedItemType}
                      onChange={(e) => setSelectedItemType(e.target.value)}
                      className="w-full px-3 py-2 border rounded-lg bg-background text-sm"
                    >
                      {getDisplayItemTypes().map((type) => (
                        <option key={type.id} value={type.value}>
                          {type.label}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              )}

              {/* Price Range */}
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
                      {getDisplayCategories().map((cat) => (
                        <Button
                          key={cat.id}
                          size="sm"
                          variant={mainCategory === cat.value ? "default" : "outline"}
                          onClick={() => setMainCategory(cat.value)}
                        >
                          {cat.label}
                        </Button>
                      ))}
                    </div>
                  </div>

                  {/* Game */}
                  {(mainCategory === "Games" || mainCategory === "Accounts" || mainCategory === "All") && (
                    <div>
                      <label className="text-sm font-medium mb-2 block">Game</label>
                      <select
                        value={selectedGame}
                        onChange={(e) => setSelectedGame(e.target.value)}
                        className="w-full px-3 py-2 rounded-md border bg-background text-sm"
                      >
                        {getDisplayGames().map((game) => (
                          <option key={game.id} value={game.value}>
                            {game.label}
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
                        {getDisplayItemTypes().map((type) => (
                          <Button
                            key={type.id}
                            size="sm"
                            variant={selectedItemType === type.value ? "default" : "outline"}
                            onClick={() => setSelectedItemType(type.value)}
                          >
                            {type.label}
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
                {activeFilters.map((filter, idx) => 
                  filter ? (
                    <Badge key={idx} variant="secondary">
                      {filter.name}: {filter.value}
                    </Badge>
                  ) : null
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearFilters}
                  className="text-xs"
                >
                  Clear All
                </Button>
              </div>
            )}

            {/* Results count */}
            <div className="flex justify-between items-center mb-6">
              <p className="text-sm text-muted-foreground">
                {isLoading ? "Loading..." : `Showing ${listings.length > 0 ? (currentPage - 1) * ITEMS_PER_PAGE + 1 : 0}-${Math.min(currentPage * ITEMS_PER_PAGE, totalListings)} of ${totalListings} results`}
              </p>
            </div>

            {/* Listings Grid */}
            {isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {Array.from({ length: ITEMS_PER_PAGE }).map((_, i) => (
                  <Card key={i} className="overflow-hidden animate-pulse h-96">
                    <div className="h-48 bg-muted"></div>
                    <div className="p-4 space-y-3">
                      <div className="h-4 bg-muted rounded w-3/4"></div>
                      <div className="h-3 bg-muted rounded w-1/2"></div>
                      <div className="h-8 bg-muted rounded"></div>
                    </div>
                  </Card>
                ))}
              </div>
            ) : listings.length > 0 ? (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {listings.map((listing) => (
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
                            <span className="text-muted-foreground">{listing.seller.username}</span>
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
