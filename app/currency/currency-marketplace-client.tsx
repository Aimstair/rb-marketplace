"use client"
import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/ui/select"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { ArrowRight, SlidersHorizontal, ThumbsUp } from "lucide-react"
import { Container } from "@/components/site/container"
import { SearchInput } from "@/components/search/search-input"
import { Chip, ChipRow, Segmented } from "@/components/filters/chip"
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

interface CurrencyMarketplaceClientProps {
  initialListings: CurrencyListing[]
  initialGames: GameOption[]
}

// No mock data - use real database only

export default function CurrencyMarketplaceClient({ initialListings, initialGames }: CurrencyMarketplaceClientProps) {
  const router = useRouter()
  const skipInitialListingsFetch = useRef(initialListings.length > 0)
  const [selectedGame, setSelectedGame] = useState<string | null>(null)
  const [listings, setListings] = useState<CurrencyListing[]>(initialListings)
  const [games, setGames] = useState<GameOption[]>(initialGames)
  const [isLoading, setIsLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [sortBy, setSortBy] = useState("rate-high")
  const [rateRange, setRateRange] = useState({ min: 0, max: 1000 })
  const [showFilters, setShowFilters] = useState(false)
  const [quickPay, setQuickPay] = useState("100")
  const [totalListings, setTotalListings] = useState(initialListings.filter((l) => l.status === "Available").length)

  // Fetch games for filtering
  useEffect(() => {
    if (initialGames.length > 0) {
      return
    }

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
    if (skipInitialListingsFetch.current) {
      skipInitialListingsFetch.current = false
      return
    }

    const fetchListings = async () => {
      try {
        setIsLoading(true)
        
        // Try to use new CurrencyListing model, fallback to old if not available
        let dbListings
        try {
          dbListings = await getNewCurrencyListings()
          
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
          // Fallback to old model
          dbListings = await getCurrencyListings()

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

  const gameLabel = (name: string) => games.find((g) => g.name === name)?.displayName ?? name
  const gamesWithListings = [...games]
    .filter((g) => listings.some((l) => l.game === g.name && l.status === "Available"))
    .sort((a, b) => a.displayName.localeCompare(b.displayName))

  // Best rate per currency type: rates are only comparable within one currency.
  const bestRateByCurrency = new Map<string, number>()
  for (const l of filteredListings) {
    const key = `${l.game}:${l.currencyType}`
    bestRateByCurrency.set(key, Math.max(bestRateByCurrency.get(key) ?? 0, l.ratePerPeso))
  }
  const singleCurrency = bestRateByCurrency.size === 1 ? filteredListings[0] : null
  const bestRate = singleCurrency ? bestRateByCurrency.values().next().value ?? 0 : 0
  const bestSeller = singleCurrency ? filteredListings.find((l) => l.ratePerPeso === bestRate) : null
  const payAmount = Math.max(0, Number(quickPay) || 0)
  const rateFiltered = rateRange.min > 0 || rateRange.max < 1000

  const sortLabels: Record<string, string> = {
    "rate-high": "Best rate",
    "rate-low": "Lowest rate",
    "stock-high": "Most stock",
    vouches: "Most vouched",
    upvotes: "Most upvoted",
  }

  return (
    <main className="min-h-screen bg-background">
      <Container className="pt-10 pb-16 md:pt-14 md:pb-20">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h1 className="text-title">Roblox currency</h1>
          <Segmented
            value="currency"
            options={[
              { value: "items", label: "Items" },
              { value: "currency", label: "Currency" },
            ]}
            onChange={(v) => v === "items" && router.push("/marketplace")}
          />
        </div>

        <ChipRow className="mt-6">
          <Chip selected={!selectedGame} onClick={() => setSelectedGame(null)}>
            All games
          </Chip>
          {gamesWithListings.map((game) => (
            <Chip key={game.name} selected={selectedGame === game.name} onClick={() => setSelectedGame(game.name)}>
              {game.displayName}
            </Chip>
          ))}
          <Chip selected={rateFiltered} onClick={() => setShowFilters(true)}>
            <SlidersHorizontal className="size-3.5" strokeWidth={1.75} />
            Rate{rateFiltered ? " · 1" : ""}
          </Chip>
        </ChipRow>

        {/* Summary panels */}
        <div className="mt-6 grid gap-[18px] md:grid-cols-[1fr_1.2fr]">
          <div className="rounded-lg bg-card p-5">
            <p className="text-[13px] text-muted-foreground">Best rate right now</p>
            {singleCurrency && bestSeller ? (
              <>
                <p className="mt-1 text-[30px] font-semibold tracking-[-0.02em] tabular-nums">
                  {bestRate.toLocaleString()}
                  <span className="ml-2 text-base font-medium text-muted-foreground">
                    {singleCurrency.currencyType} per ₱1
                  </span>
                </p>
                <p className="text-[13px] text-muted-foreground">
                  From {bestSeller.sellerName}
                  {bestSeller.sellerVouches > 0 && (
                    <span className="text-success"> · ✓ {bestSeller.sellerVouches} vouches</span>
                  )}
                </p>
              </>
            ) : (
              <p className="mt-2 text-[17px] text-muted-foreground">
                {filteredListings.length === 0
                  ? "No sellers match these filters."
                  : "Pick a game to compare rates for one currency."}
              </p>
            )}
          </div>

          <div className="rounded-lg bg-card p-5">
            <p className="mb-3 text-[13px] text-muted-foreground">Quick estimate</p>
            <div className="grid grid-cols-[1fr_auto_1fr] items-end gap-3">
              <label className="block rounded-xl bg-background px-3.5 py-2.5">
                <span className="block text-xs text-muted-foreground">You pay</span>
                <span className="flex items-baseline text-[22px] font-semibold">
                  ₱
                  <input
                    type="number"
                    inputMode="numeric"
                    min={0}
                    value={quickPay}
                    onChange={(e) => setQuickPay(e.target.value)}
                    aria-label="Amount in pesos"
                    className="w-full min-w-0 bg-transparent tabular-nums outline-none"
                  />
                </span>
              </label>
              <ArrowRight className="mb-5 size-4 text-muted-foreground" />
              <div className="rounded-xl bg-background px-3.5 py-2.5">
                <span className="block text-xs text-muted-foreground">You get about</span>
                <span className="block truncate text-[22px] font-semibold tabular-nums">
                  {singleCurrency ? compactNumber(payAmount * bestRate) : "—"}
                  {singleCurrency && (
                    <span className="ml-1.5 text-sm font-medium text-muted-foreground">{singleCurrency.currencyType}</span>
                  )}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Toolbar */}
        <div className="mt-8 mb-4 flex flex-wrap items-center justify-between gap-3">
          <SearchInput
            className="max-w-sm"
            value={searchQuery}
            onValueChange={setSearchQuery}
            placeholder="Search currency or game"
            aria-label="Search currency listings"
          />
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger
              aria-label="Sort sellers"
              className="h-9 border-0 bg-transparent px-2 text-sm text-muted-foreground hover:text-foreground"
            >
              <span>
                Sort by <span className="text-foreground">{sortLabels[sortBy]}</span>
              </span>
            </SelectTrigger>
            <SelectContent align="end">
              {Object.entries(sortLabels).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Seller table */}
        {isLoading ? (
          <div className="space-y-2 rounded-lg bg-card p-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-14 w-full rounded-xl" />
            ))}
          </div>
        ) : sortedListings.length === 0 ? (
          <div className="rounded-lg bg-card px-6 py-14 text-center">
            <p className="text-lg font-semibold">No sellers match these filters</p>
            <Button
              variant="secondary"
              className="mt-5"
              onClick={() => {
                setSelectedGame(null)
                setSearchQuery("")
                setRateRange({ min: 0, max: 1000 })
              }}
            >
              Clear filters
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-lg bg-card">
            <table className="w-full min-w-[680px] text-sm">
              <thead>
                <tr className="text-left text-xs text-muted-foreground">
                  <th className="px-4 pt-4 pb-3 font-medium">Seller</th>
                  <th className="px-4 pt-4 pb-3 font-medium">Currency</th>
                  <th className="px-4 pt-4 pb-3 text-right font-medium">Rate per ₱1</th>
                  <th className="px-4 pt-4 pb-3 text-right font-medium">In stock</th>
                  <th className="px-4 pt-4 pb-3 text-right font-medium">Votes</th>
                  <th className="px-4 pt-4 pb-3" />
                </tr>
              </thead>
              <tbody>
                {sortedListings.map((listing) => {
                  const isBest =
                    listing.ratePerPeso > 0 &&
                    bestRateByCurrency.get(`${listing.game}:${listing.currencyType}`) === listing.ratePerPeso
                  return (
                    <tr
                      key={listing.id}
                      onClick={() => handleListingClick(listing.id)}
                      className="cursor-pointer border-t border-border transition-colors hover:bg-white/[0.03]"
                    >
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-3">
                          <span className="grid size-8 shrink-0 place-items-center rounded-full bg-secondary text-xs font-semibold">
                            {listing.sellerName.charAt(0).toUpperCase()}
                          </span>
                          <div className="min-w-0">
                            <p className="truncate font-semibold">{listing.sellerName}</p>
                            <p className="text-xs text-success tabular-nums">✓ {listing.sellerVouches} vouches</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        <p className="font-medium">{listing.currencyType}</p>
                        <p className="text-xs text-muted-foreground">{gameLabel(listing.game)}</p>
                      </td>
                      <td className="px-4 py-3.5 text-right tabular-nums whitespace-nowrap">
                        <span className="font-semibold">{listing.ratePerPeso.toLocaleString()}</span>
                        {isBest && <span className="ml-1.5 text-[11px] font-semibold text-success">BEST</span>}
                      </td>
                      <td className="px-4 py-3.5 text-right tabular-nums">{compactNumber(listing.stock)}</td>
                      <td className="px-4 py-3.5 text-right text-muted-foreground tabular-nums">
                        <span className="inline-flex items-center gap-1">
                          <ThumbsUp className="size-3.5" strokeWidth={1.75} />
                          {listing.upvotes}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <Button
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            router.push(`/currency/${listing.id}?contact=true`)
                          }}
                        >
                          Buy
                        </Button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
        {!isLoading && sortedListings.length > 0 && (
          <p className="mt-3 text-[13px] text-muted-foreground tabular-nums">
            {sortedListings.length} seller{sortedListings.length !== 1 ? "s" : ""} · {totalListings} available
            listings in total
          </p>
        )}
      </Container>

      <Sheet open={showFilters} onOpenChange={setShowFilters}>
        <SheetContent side="right" className="w-full sm:max-w-md flex flex-col gap-0 p-0">
          <SheetHeader className="px-6 pt-6 pb-2">
            <SheetTitle className="text-xl font-semibold">Rate per ₱1</SheetTitle>
          </SheetHeader>
          <div className="grid grid-cols-2 gap-3 px-6 py-4">
            <label className="block">
              <span className="mb-1.5 block text-xs text-muted-foreground">Minimum</span>
              <Input
                type="number"
                inputMode="decimal"
                value={rateRange.min}
                onChange={(e) => setRateRange({ ...rateRange, min: Number.parseFloat(e.target.value) || 0 })}
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-xs text-muted-foreground">Maximum</span>
              <Input
                type="number"
                inputMode="decimal"
                value={rateRange.max}
                onChange={(e) => setRateRange({ ...rateRange, max: Number.parseFloat(e.target.value) || 1000 })}
              />
            </label>
          </div>
          <div className="mt-auto grid grid-cols-2 gap-3 border-t border-border px-6 py-4">
            <Button variant="secondary" onClick={() => setRateRange({ min: 0, max: 1000 })}>
              Reset
            </Button>
            <Button onClick={() => setShowFilters(false)}>Show {sortedListings.length} sellers</Button>
          </div>
        </SheetContent>
      </Sheet>
    </main>
  )
}

/** 1250000 → "1.25M". Keeps small numbers exact. */
function compactNumber(value: number) {
  if (!Number.isFinite(value)) return "0"
  if (Math.abs(value) < 10000) return Math.round(value).toLocaleString()
  return new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 2 }).format(value)
}
