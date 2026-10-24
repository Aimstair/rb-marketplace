"use client"

import { useState, useEffect, useRef } from "react"
import { ChevronLeft, ChevronRight, SlidersHorizontal } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/ui/select"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { useRouter, useSearchParams } from "next/navigation"
import { Container } from "@/components/site/container"
import { SearchInput } from "@/components/search/search-input"
import { Chip, ChipRow, Segmented } from "@/components/filters/chip"
import { ListingCard, ListingCardSkeleton, ListingGrid } from "@/components/listing/listing-card"
import { getListings, getFilterOptions } from "@/app/actions/listings"
import type { ListingResponse } from "@/lib/schemas"

// Define interface for filter options based on your schema
interface FilterOption {
  id: string
  label: string
  value: string
}

// Divisible by 4 and 5 so full grid rows at every desktop width
const ITEMS_PER_PAGE = 20

const sortOptions = [
  { label: "Newest", value: "newest" },
  { label: "Price: Low to High", value: "price-asc" },
  { label: "Price: High to Low", value: "price-desc" },
  { label: "Most Vouches", value: "vouch" },
  { label: "Most Upvoted", value: "upvotes" },
  { label: "Trending", value: "trending" },
]

interface MarketplacePageClientProps {
  initialSearchQuery: string
  initialListings: ListingResponse[]
  initialTotalListings: number
  initialCategoryOptions: FilterOption[]
  initialGameOptions: FilterOption[]
  initialItemTypeOptions: FilterOption[]
}

export default function MarketplacePageClient({
  initialSearchQuery,
  initialListings,
  initialTotalListings,
  initialCategoryOptions,
  initialGameOptions,
  initialItemTypeOptions,
}: MarketplacePageClientProps) {
  const searchParams = useSearchParams()
  const router = useRouter()
  const skipInitialListingsFetch = useRef(true)
  
  // Filter States
  const [searchQuery, setSearchQuery] = useState(initialSearchQuery)
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState(initialSearchQuery)
  const [mainCategory, setMainCategory] = useState("All")
  const [selectedGame, setSelectedGame] = useState("All Games")
  const [selectedItemType, setSelectedItemType] = useState("All")
  const [sortBy, setSortBy] = useState("newest")
  const [priceRange, setPriceRange] = useState({ min: 0, max: 1000000 })
  const [showFilters, setShowFilters] = useState(false)
  
  // Data States
  const [currentPage, setCurrentPage] = useState(1)
  const [listings, setListings] = useState<ListingResponse[]>(initialListings)
  const [totalListings, setTotalListings] = useState(initialTotalListings)
  const [isLoading, setIsLoading] = useState(false)
  
  // Dynamic Filter Options States
  const [categoryOptions, setCategoryOptions] = useState<FilterOption[]>(initialCategoryOptions)
  const [gameOptions, setGameOptions] = useState<FilterOption[]>(initialGameOptions)
  const [itemTypeOptions, setItemTypeOptions] = useState<FilterOption[]>(initialItemTypeOptions)
  const [areFiltersLoading, setAreFiltersLoading] = useState(
    initialCategoryOptions.length === 0 && initialGameOptions.length === 0 && initialItemTypeOptions.length === 0
  )

  // Initialize Search from URL
  useEffect(() => {
    const queryParam = searchParams.get("search") || searchParams.get("item")
    if (queryParam) {
      setSearchQuery(queryParam)
      setDebouncedSearchQuery(queryParam)
    }
  }, [searchParams])

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setDebouncedSearchQuery(searchQuery)
    }, 300)

    return () => window.clearTimeout(timeout)
  }, [searchQuery])

  // Fetch Dynamic Filter Options on Mount
  useEffect(() => {
    if (initialCategoryOptions.length > 0 || initialGameOptions.length > 0 || initialItemTypeOptions.length > 0) {
      return
    }

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

  // Apply ?game= (matched by name or display name) once the game options are known.
  // Declared after the category reset above so it wins on first render.
  const appliedGameParam = useRef<string | null>(null)
  useEffect(() => {
    const gameParam = searchParams.get("game")
    if (!gameParam || appliedGameParam.current === gameParam || gameOptions.length === 0) return
    const needle = gameParam.toLowerCase()
    const match = gameOptions.find((g) => g.value.toLowerCase() === needle || g.label.toLowerCase() === needle)
    if (match) {
      appliedGameParam.current = gameParam
      setSelectedGame(match.value)
    }
  }, [searchParams, gameOptions])

  useEffect(() => {
    setCurrentPage(1)
  }, [debouncedSearchQuery, mainCategory, selectedGame, selectedItemType, sortBy, priceRange])

  useEffect(() => {
    if (skipInitialListingsFetch.current) {
      skipInitialListingsFetch.current = false
      return
    }

    const fetchListings = async () => {
      setIsLoading(true)
      try {
        const result = await getListings({
          search: debouncedSearchQuery,
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
  }, [debouncedSearchQuery, mainCategory, selectedGame, selectedItemType, sortBy, priceRange, currentPage])

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

  const sortLabel = sortOptions.find((o) => o.value === sortBy)?.label ?? "Newest"
  const advancedFilterCount = [
    selectedGame !== "All Games",
    selectedItemType !== "All" && mainCategory === "Games",
    priceRange.min > 0 || priceRange.max < 1000000,
  ].filter(Boolean).length

  return (
    <main className="min-h-screen bg-background">
      <Container className="pt-10 pb-16 md:pt-14 md:pb-20">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h1 className="text-title">Roblox items</h1>
          <Segmented
            value="items"
            options={[
              { value: "items", label: "Items" },
              { value: "currency", label: "Currency" },
            ]}
            onChange={(v) => v === "currency" && router.push("/currency")}
          />
        </div>

        <SearchInput
          className="mt-6"
          value={searchQuery}
          onValueChange={setSearchQuery}
          placeholder={`Search ${totalListings.toLocaleString()} items`}
          aria-label="Search items"
        />

        {/* Filter bar */}
        <div className="mt-5 flex flex-wrap items-center gap-3">
          <ChipRow className="min-w-0 flex-1">
            {areFiltersLoading
              ? Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-9 w-24 rounded-full" />)
              : getDisplayCategories().map((cat) => (
                  <Chip key={cat.id} selected={mainCategory === cat.value} onClick={() => setMainCategory(cat.value)}>
                    {cat.label}
                  </Chip>
                ))}
            <Chip selected={advancedFilterCount > 0} onClick={() => setShowFilters(true)}>
              <SlidersHorizontal className="size-3.5" strokeWidth={1.75} />
              Filters{advancedFilterCount > 0 ? ` · ${advancedFilterCount}` : ""}
            </Chip>
          </ChipRow>

          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger
              aria-label="Sort listings"
              className="h-9 border-0 bg-transparent px-2 text-sm text-muted-foreground hover:text-foreground"
            >
              <span>
                Sort by <span className="text-foreground">{sortLabel}</span>
              </span>
            </SelectTrigger>
            <SelectContent align="end">
              {sortOptions.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Result line + active filters */}
        <div className="mt-5 mb-4 flex flex-wrap items-center gap-x-3 gap-y-2 text-[13px] text-muted-foreground">
          <span className="tabular-nums">
            {isLoading ? (
              <Skeleton className="inline-block h-3 w-16 align-middle" />
            ) : (
              `${totalListings.toLocaleString()} item${totalListings !== 1 ? "s" : ""}`
            )}
          </span>
          {activeFilters.map((filter, idx) =>
            filter ? (
              <span key={idx} className="rounded-full bg-secondary px-2.5 py-0.5 text-foreground/90">
                {filter.name}: {filter.value}
              </span>
            ) : null,
          )}
          {(activeFilters.length > 0 || searchQuery) && (
            <button onClick={clearFilters} className="text-link hover:underline underline-offset-2">
              Clear all
            </button>
          )}
        </div>

        {/* Listings */}
        {isLoading ? (
          <ListingGrid>
            {Array.from({ length: 10 }).map((_, i) => (
              <ListingCardSkeleton key={i} />
            ))}
          </ListingGrid>
        ) : listings.length > 0 ? (
          <>
            <ListingGrid>
              {listings.map((listing, i) => (
                <ListingCard
                  key={listing.id}
                  id={listing.id}
                  title={listing.title}
                  game={listing.game}
                  price={listing.price}
                  image={listing.image}
                  sellerName={listing.seller.username}
                  vouches={listing.vouch}
                  featured={listing.featured}
                  note={listing.condition || undefined}
                  priority={i < 4}
                />
              ))}
            </ListingGrid>

            {totalPages > 1 && (
              <nav aria-label="Pagination" className="mt-12 flex items-center justify-center gap-1.5">
                <Button
                  variant="secondary"
                  size="icon"
                  aria-label="Previous page"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="size-4" />
                </Button>
                {getPageWindow(currentPage, totalPages).map((page, i) =>
                  page === "gap" ? (
                    <span key={`gap-${i}`} className="px-1 text-muted-foreground">
                      …
                    </span>
                  ) : (
                    <Button
                      key={page}
                      variant={currentPage === page ? "default" : "ghost"}
                      size="icon"
                      aria-current={currentPage === page ? "page" : undefined}
                      onClick={() => setCurrentPage(page)}
                      className="tabular-nums"
                    >
                      {page}
                    </Button>
                  ),
                )}
                <Button
                  variant="secondary"
                  size="icon"
                  aria-label="Next page"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                >
                  <ChevronRight className="size-4" />
                </Button>
              </nav>
            )}
          </>
        ) : (
          <div className="rounded-lg bg-card px-6 py-16 text-center">
            <p className="text-lg font-semibold">No items match these filters</p>
            <p className="mt-1 text-sm text-muted-foreground">Try a different search, or clear the filters.</p>
            <Button onClick={clearFilters} variant="secondary" className="mt-5">
              Clear filters
            </Button>
          </div>
        )}
      </Container>

      {/* Filters sheet */}
      <Sheet open={showFilters} onOpenChange={setShowFilters}>
        <SheetContent side="right" className="w-full sm:max-w-md flex flex-col gap-0 p-0">
          <SheetHeader className="px-6 pt-6 pb-2">
            <SheetTitle className="text-xl font-semibold">Filters</SheetTitle>
          </SheetHeader>
          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-7">
            {(mainCategory === "Games" || mainCategory === "Accounts" || mainCategory === "All") && (
              <div>
                <p className="mb-3 text-sm font-medium">Game</p>
                <div className="flex flex-wrap gap-2">
                  {getDisplayGames().map((game) => (
                    <Chip key={game.id} selected={selectedGame === game.value} onClick={() => setSelectedGame(game.value)}>
                      {game.label}
                    </Chip>
                  ))}
                </div>
              </div>
            )}

            {mainCategory === "Games" && (
              <div>
                <p className="mb-3 text-sm font-medium">Item type</p>
                <div className="flex flex-wrap gap-2">
                  {getDisplayItemTypes().map((type) => (
                    <Chip
                      key={type.id}
                      selected={selectedItemType === type.value}
                      onClick={() => setSelectedItemType(type.value)}
                    >
                      {type.label}
                    </Chip>
                  ))}
                </div>
              </div>
            )}

            <div>
              <p className="mb-3 text-sm font-medium">Price</p>
              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="mb-1.5 block text-xs text-muted-foreground">Min (₱)</span>
                  <Input
                    type="number"
                    inputMode="numeric"
                    min={0}
                    max={1000000}
                    value={priceRange.min}
                    onChange={(e) => setPriceRange({ ...priceRange, min: Math.max(0, Number(e.target.value)) })}
                  />
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-xs text-muted-foreground">Max (₱)</span>
                  <Input
                    type="number"
                    inputMode="numeric"
                    min={0}
                    max={1000000}
                    value={priceRange.max}
                    onChange={(e) => setPriceRange({ ...priceRange, max: Math.min(1000000, Number(e.target.value)) })}
                  />
                </label>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 border-t border-border px-6 py-4">
            <Button variant="secondary" onClick={clearFilters}>
              Reset
            </Button>
            <Button onClick={() => setShowFilters(false)}>
              {isLoading ? "Updating…" : `Show ${totalListings.toLocaleString()} items`}
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </main>
  )
}

/** Page numbers to show: first, last, and a window around the current page. */
function getPageWindow(current: number, total: number): (number | "gap")[] {
  const pages = new Set([1, total, current - 1, current, current + 1].filter((p) => p >= 1 && p <= total))
  const sorted = [...pages].sort((a, b) => a - b)
  const out: (number | "gap")[] = []
  sorted.forEach((p, i) => {
    if (i > 0 && p - sorted[i - 1] > 1) out.push("gap")
    out.push(p)
  })
  return out
}
