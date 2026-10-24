"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import TrendingGames from "@/components/trending-games"
import TopVouchedSellers from "@/components/top-vouched-sellers"
import { Container, Section, SectionHeader } from "@/components/site/container"
import { SearchInput } from "@/components/search/search-input"
import { ListingCard, ListingCardSkeleton, ListingGrid, formatPeso } from "@/components/listing/listing-card"
import { getLandingStats, getPopularGames, getTopTraders, getTrendingListings } from "@/app/actions/trends"
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

interface TrendingListing {
  id: string
  title: string
  game: string
  price: number
  image: string
  listingType?: "ITEM" | "CURRENCY"
  seller: { username: string; vouch: number }
  views: number
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

export interface HomeInitialData {
  stats: { totalUsers: number; totalListings: number; totalVolume: number; activeTraders: number }
  games: PopularGame[]
  traders: TopTrader[]
  trending: TrendingListing[]
}

export default function HomePage({ initialData }: { initialData?: HomeInitialData }) {
  const router = useRouter()
  const { data: session } = useSession()
  const { toast } = useToast()
  const [searchQuery, setSearchQuery] = useState("")
  const [stats, setStats] = useState(
    initialData?.stats ?? { totalUsers: 0, totalListings: 0, totalVolume: 0, activeTraders: 0 },
  )
  const [games, setGames] = useState<PopularGame[]>(initialData?.games ?? [])
  const [traders, setTraders] = useState<TopTrader[]>(initialData?.traders ?? [])
  const [gamesLoading, setGamesLoading] = useState(!initialData)
  const [tradersLoading, setTradersLoading] = useState(!initialData)
  const [trending, setTrending] = useState<TrendingListing[]>(initialData?.trending ?? [])
  const [trendingLoading, setTrendingLoading] = useState(!initialData)
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

  // Fallback only: the server normally provides this data (see app/page.tsx).
  useEffect(() => {
    if (initialData) return
    const loadHomepageData = async () => {
      try {
        const [statsResult, gamesResult, tradersResult, trendingResult] = await Promise.all([
          getLandingStats(),
          getPopularGames(8),
          getTopTraders(4),
          getTrendingListings(6),
        ])

        if (trendingResult.success && trendingResult.data) {
          setTrending(trendingResult.data)
        }

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
        setTrendingLoading(false)
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

  const spotlight = trending.find((l) => l.listingType !== "CURRENCY") ?? trending[0] ?? null
  const trendingGrid = trending.filter((l) => l.id !== spotlight?.id).slice(0, 5)
  const listingHref = (l: TrendingListing) =>
    l.listingType === "CURRENCY" ? `/currency/${l.id}` : `/listing/${l.id}`
  const joinDisabled =
    giveawayActionLoading ||
    Boolean(giveawayData?.joined) ||
    Boolean(session?.user?.id && giveawayData?.eligibility && !giveawayData.eligibility.eligible)

  return (
    <main className="min-h-screen bg-background">
      {/* Spotlight hero */}
      <section className="pt-12 pb-10 md:pt-20 md:pb-16">
        <Container className="grid items-center gap-10 md:grid-cols-2">
          <div className="flex flex-col gap-5">
            <p className="text-[15px] font-semibold text-link">
              {spotlight ? "Trending this week" : "Roblox marketplace Philippines"}
            </p>
            <h1 className="text-display text-sheen">
              The Roblox marketplace.
              <br />
              Traded with trust.
            </h1>
            <p className="max-w-[46ch] text-[19px] leading-snug text-muted-foreground">
              {spotlight ? (
                <>
                  {spotlight.title} from {spotlight.seller.username}
                  {spotlight.seller.vouch > 0 ? `, ${spotlight.seller.vouch} vouches` : ""}.{" "}
                  {spotlight.listingType === "CURRENCY" ? "" : `${formatPeso(spotlight.price)}.`}
                </>
              ) : (
                "Buy and sell MM2 knives, Adopt Me pets and Blox Fruits from vouched sellers. Pay with GCash or PayPal."
              )}
            </p>
            <form onSubmit={handleSearch} className="max-w-[520px]">
              <SearchInput
                size="lg"
                value={searchQuery}
                onValueChange={setSearchQuery}
                placeholder="Search items, pets, fruits…"
                aria-label="Search the marketplace"
              />
            </form>
            <div className="flex flex-wrap items-center gap-6">
              <Button asChild size="lg">
                <Link href={spotlight ? listingHref(spotlight) : "/marketplace"}>
                  {spotlight ? "View item" : "Browse items"}
                </Link>
              </Button>
              <Link
                href={spotlight ? "/marketplace" : "/sell"}
                className="text-[17px] text-link hover:underline underline-offset-2"
              >
                {spotlight ? "Browse all items ›" : "Sell an item ›"}
              </Link>
            </div>
          </div>

          <Link
            href={spotlight ? listingHref(spotlight) : "/marketplace"}
            aria-label={spotlight ? `View ${spotlight.title}` : "Browse items"}
            className="glow-spot relative mx-auto aspect-square w-full max-w-[520px] overflow-hidden rounded-[28px]"
          >
            {trendingLoading ? (
              <Skeleton className="absolute inset-[18%] rounded-3xl" />
            ) : spotlight?.image ? (
              <Image
                src={spotlight.image}
                alt={spotlight.title}
                fill
                priority
                sizes="(max-width: 768px) 90vw, 520px"
                className="drop-glow object-contain p-[16%]"
              />
            ) : (
              <span className="absolute inset-0 grid place-items-center text-sm text-muted-foreground">
                RbMarket
              </span>
            )}
          </Link>
        </Container>
      </section>

      {/* Games */}
      <Container>
        <TrendingGames games={games} isLoading={gamesLoading} />
      </Container>

      {/* Trending listings */}
      <Section className="pt-10 md:pt-14">
        <Container>
          <SectionHeader title="Trending now" href="/marketplace" />
          {trendingLoading ? (
            <ListingGrid>
              {Array.from({ length: 5 }).map((_, i) => (
                <ListingCardSkeleton key={i} />
              ))}
            </ListingGrid>
          ) : trendingGrid.length > 0 ? (
            <ListingGrid>
              {trendingGrid.map((l) => (
                <ListingCard
                  key={l.id}
                  id={l.id}
                  href={listingHref(l)}
                  title={l.title}
                  game={l.game}
                  price={l.price}
                  image={l.image}
                  sellerName={l.seller.username}
                  vouches={l.seller.vouch}
                  note={l.listingType === "CURRENCY" ? "Rate per peso" : `${l.views.toLocaleString()} views`}
                />
              ))}
            </ListingGrid>
          ) : (
            <p className="rounded-lg bg-card px-6 py-12 text-center text-muted-foreground">
              No listings yet. Be the first to{" "}
              <Link href="/sell" className="text-link hover:underline">
                sell an item
              </Link>
              .
            </p>
          )}
        </Container>
      </Section>

      {/* Trust band */}
      <Section surface>
        <Container className="grid gap-10 md:grid-cols-3">
          <div>
            <p className="text-[30px] font-semibold tracking-[-0.02em] tabular-nums">
              {stats.totalListings.toLocaleString()}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Live listings from {stats.activeTraders.toLocaleString()} active traders and{" "}
              {stats.totalUsers.toLocaleString()} members.
            </p>
          </div>
          <div>
            <p className="text-[30px] font-semibold tracking-[-0.02em]">Hall of Shame</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Reported scammers are public, with evidence.{" "}
              <Link href="/hall-of-shame" className="text-link hover:underline underline-offset-2">
                Check a trader ›
              </Link>
            </p>
          </div>
          <div>
            <p className="text-[30px] font-semibold tracking-[-0.02em]">GCash · PayPal</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Pay the way you already do, or cross-trade. Every completed trade earns a vouch.
            </p>
          </div>
        </Container>
      </Section>

      {/* Giveaway */}
      <Section>
        <Container>
          <SectionHeader title="Giveaways" href="/notifications" linkLabel="Your notifications" />
          {giveawayLoading ? (
            <Skeleton className="h-[320px] w-full rounded-lg" />
          ) : !giveawayData?.active ? (
            <div className="rounded-lg bg-card px-6 py-10">
              <p className="font-semibold">No giveaway is running right now.</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {giveawayData?.queued.length
                  ? `Next up: ${giveawayData.queued[0].title}${
                      giveawayData.queued[0].startsAt
                        ? `, starting ${new Date(giveawayData.queued[0].startsAt).toLocaleString()}`
                        : ""
                    }.`
                  : "Check back soon."}
              </p>
            </div>
          ) : (
            <div className="grid gap-[18px] lg:grid-cols-3">
              <div className="grid overflow-hidden rounded-lg bg-card md:grid-cols-5 lg:col-span-2">
                <div className="flex flex-col gap-4 p-6 md:col-span-3 md:p-8">
                  <div>
                    <p className="text-[13px] font-semibold text-link">Now running</p>
                    <h3 className="mt-1 text-[26px] font-semibold leading-tight tracking-[-0.02em]">
                      {giveawayData.active.title}
                    </h3>
                    {giveawayData.active.rewardLabel && (
                      <p className="mt-1 text-sm text-muted-foreground">Reward: {giveawayData.active.rewardLabel}</p>
                    )}
                  </div>
                  {giveawayData.active.description && (
                    <p className="text-sm text-muted-foreground">
                      {truncateCopy(giveawayData.active.description, 200)}
                    </p>
                  )}
                  <dl className="grid grid-cols-2 gap-4 border-t border-border pt-4 text-sm">
                    <div>
                      <dt className="text-muted-foreground">Time left</dt>
                      <dd className="mt-0.5 text-lg font-semibold tabular-nums">
                        {hoursLeft}h {minutesLeft}m
                      </dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">Entries</dt>
                      <dd className="mt-0.5 text-lg font-semibold tabular-nums">
                        {giveawayData.active.joinedCount.toLocaleString()}
                      </dd>
                    </div>
                  </dl>
                  {session?.user?.id && giveawayData.eligibility && !giveawayData.eligibility.eligible && (
                    <p className="text-sm text-warning">
                      You need {giveawayData.eligibility.requiredCount} completed trades in the last 7 days to enter (
                      {giveawayData.eligibility.completedTransactionsCount} so far).
                    </p>
                  )}
                  <div className="mt-auto pt-2">
                    <Button onClick={handleJoinGiveaway} disabled={joinDisabled}>
                      {giveawayData.joined ? "You're entered" : giveawayActionLoading ? "Joining…" : "Join giveaway"}
                    </Button>
                  </div>
                </div>
                <div className="glow-spot relative min-h-[220px] md:col-span-2">
                  {giveawayData.active.rewardImageUrl ? (
                    <Image
                      src={giveawayData.active.rewardImageUrl}
                      alt={giveawayData.active.title}
                      fill
                      sizes="(max-width: 768px) 100vw, 30vw"
                      className="drop-glow object-contain p-[12%]"
                    />
                  ) : (
                    <span className="absolute inset-0 grid place-items-center text-sm text-muted-foreground">
                      Reward image coming soon
                    </span>
                  )}
                </div>
              </div>

              <div className="flex flex-col gap-6 rounded-lg bg-card p-6">
                <div>
                  <p className="text-sm font-semibold">Up next</p>
                  {giveawayData.queued.length === 0 ? (
                    <p className="mt-1 text-sm text-muted-foreground">Nothing queued yet.</p>
                  ) : (
                    giveawayData.queued.slice(0, 2).map((queued) => (
                      <div key={queued.id} className="mt-3 flex items-center gap-3">
                        <GiveawayThumb src={queued.rewardImageUrl} alt={queued.title} />
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">{queued.title}</p>
                          <p className="text-xs text-muted-foreground">
                            {queued.startsAt ? `Starts ${new Date(queued.startsAt).toLocaleDateString()}` : "Date to be announced"}
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
                <div className="border-t border-border pt-5">
                  <p className="text-sm font-semibold">Latest winners</p>
                  {giveawayData.history.length === 0 ? (
                    <p className="mt-1 text-sm text-muted-foreground">No finished giveaways yet.</p>
                  ) : (
                    giveawayData.history.slice(0, 3).map((item) => (
                      <div key={item.id} className="mt-3 flex items-center gap-3">
                        <GiveawayThumb src={item.rewardImageUrl} alt={item.title} />
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">{item.title}</p>
                          <p className="text-xs text-muted-foreground">
                            {item.winnerUser?.username ? `Won by ${item.winnerUser.username}` : "No winner"}
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}
        </Container>
      </Section>

      {/* Top sellers */}
      <Section surface>
        <Container>
          <SectionHeader title="Top vouched sellers" />
          <TopVouchedSellers sellers={traders} isLoading={tradersLoading} />
        </Container>
      </Section>

      {/* Closing CTA */}
      <Section className="text-center">
        <Container className="flex flex-col items-center gap-5">
          <h2 className="text-title">Start selling today.</h2>
          <p className="max-w-[44ch] text-[17px] text-muted-foreground">
            List an item in a minute. Buyers message you directly, and every completed trade builds your vouches.
          </p>
          <Button asChild size="lg">
            <Link href={session?.user ? "/sell" : "/auth/signup"}>
              {session?.user ? "Sell an item" : "Create a free account"}
            </Link>
          </Button>
        </Container>
      </Section>
    </main>
  )
}

function GiveawayThumb({ src, alt }: { src?: string | null; alt: string }) {
  return (
    <span className="relative size-12 shrink-0 overflow-hidden rounded-xl bg-secondary">
      {src && <Image src={src} alt={alt} fill sizes="48px" className="object-cover" />}
    </span>
  )
}
