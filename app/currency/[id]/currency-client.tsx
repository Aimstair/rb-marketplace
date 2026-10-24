"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { BadgeCheck, Ban, Check, ChevronRight, Crown, Flag, Loader2, Share2, ThumbsDown, ThumbsUp } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useAuth } from "@/lib/auth-context"
import { useToast } from "@/hooks/use-toast"
import { JsonLd } from "@/components/json-ld"
import { Container, Section } from "@/components/site/container"
import { Segmented } from "@/components/filters/chip"
import { getListing, getListingViewers, nudgeViewer, reportListing, toggleListingVote } from "@/app/actions/listings"
import { cn } from "@/lib/utils"

type ListingResult = Awaited<ReturnType<typeof getListing>>
type BuyMode = "amount" | "pesos"

const compact = new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 2 })
const fmt = (n: number) => n.toLocaleString("en-PH")
/** Large currency amounts read better compacted (12.5M); small ones stay exact. */
const fmtUnits = (n: number) => (n >= 100_000 ? compact.format(n) : fmt(n))

export default function CurrencyListingClient({ id, initialResult }: { id: string; initialResult: ListingResult }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user } = useAuth()
  const { toast } = useToast()
  const amountInputRef = useRef<HTMLInputElement>(null)

  const listing: any = initialResult.success ? initialResult.listing : null
  const currency = listing?.itemType || "units"
  const rate: number = listing?.price || 0 // units per ₱1
  const stock: number = listing?.stock || 0
  const minOrder: number | undefined = listing?.minOrder || undefined
  const maxOrder: number | undefined = listing?.maxOrder || undefined
  const isOwner = Boolean(user?.id && listing?.seller?.id === user.id)
  const isAvailable = listing && listing.status !== "banned" && listing.status !== "sold"

  const [mode, setMode] = useState<BuyMode>("amount")
  const [input, setInput] = useState("")
  const [userVote, setUserVote] = useState<"up" | "down" | null>(
    listing?.userVote ? (listing.userVote.toLowerCase() as "up" | "down") : null,
  )
  const [votes, setVotes] = useState({ upvotes: listing?.upvotes || 0, downvotes: listing?.downvotes || 0 })
  const [isVoting, setIsVoting] = useState(false)
  const [showReportDialog, setShowReportDialog] = useState(false)
  const [reportReason, setReportReason] = useState("")
  const [reportDetails, setReportDetails] = useState("")
  const [isReporting, setIsReporting] = useState(false)
  const [copied, setCopied] = useState(false)

  const [viewers, setViewers] = useState<any[]>([])
  const [viewersLoading, setViewersLoading] = useState(false)
  const [requiresUpgrade, setRequiresUpgrade] = useState(false)
  const [nudgeCooldowns, setNudgeCooldowns] = useState<Record<string, Date>>({})
  const [nudgingViewerId, setNudgingViewerId] = useState<string | null>(null)

  // Old "Buy" links use ?contact=true: bring the calculator into focus instead of a dialog
  useEffect(() => {
    if (searchParams.get("contact") === "true" && amountInputRef.current) {
      amountInputRef.current.scrollIntoView({ behavior: "smooth", block: "center" })
      amountInputRef.current.focus({ preventScroll: true })
    }
  }, [searchParams])

  useEffect(() => {
    if (!isOwner) return
    ;(async () => {
      setViewersLoading(true)
      try {
        const result = await getListingViewers(id, "CURRENCY")
        if (result.success) {
          if (result.requiresUpgrade) {
            setRequiresUpgrade(true)
          } else {
            setViewers(result.viewers || [])
            const cooldowns: Record<string, Date> = {}
            for (const viewer of result.viewers || []) {
              if (!viewer.lastNudgedAt) continue
              const until = new Date(new Date(viewer.lastNudgedAt).getTime() + 60 * 60 * 1000)
              if (until > new Date()) cooldowns[viewer.id] = until
            }
            setNudgeCooldowns(cooldowns)
          }
        }
      } catch (err) {
        console.error("Failed to fetch viewers:", err)
      } finally {
        setViewersLoading(false)
      }
    })()
  }, [isOwner, id])

  // Calculator: both modes resolve to a currency amount and its peso cost
  const raw = Number.parseFloat(input) || 0
  const amount = mode === "amount" ? Math.floor(raw) : Math.floor(raw * rate)
  const cost = rate > 0 ? Math.ceil(amount / rate) : 0
  const amountError = (() => {
    if (!input || amount <= 0) return null
    if (amount > stock) return `Only ${fmt(stock)} ${currency} in stock.`
    if (minOrder && amount < minOrder) return `Minimum order is ${fmt(minOrder)} ${currency}.`
    if (maxOrder && amount > maxOrder) return `Maximum order is ${fmt(maxOrder)} ${currency}.`
    return null
  })()
  const canBuy = amount > 0 && !amountError

  const quickPicks = [50, 100, 500, 1000].filter((pesos) => {
    const units = pesos * rate
    return units <= stock && (!minOrder || units >= minOrder) && (!maxOrder || units <= maxOrder)
  })

  const handleBuy = () => {
    if (!canBuy || !listing) return
    const msgParams = new URLSearchParams({
      sellerId: listing.seller.id,
      sellerName: listing.seller.username,
      sellerAvatar: listing.seller.profilePicture || "",
      itemId: listing.id,
      itemTitle: `${rate} ${currency} per ₱1`,
      itemPrice: listing.price.toString(),
      itemImage: listing.image,
      type: "currency",
      currencyType: currency,
      amount: amount.toString(),
      cost: cost.toString(),
    })
    router.push(`/messages?${msgParams.toString()}`)
  }

  const handleVote = async (type: "up" | "down") => {
    if (!user) {
      router.push(`/auth/login?redirect=/currency/${id}`)
      return
    }
    setIsVoting(true)
    try {
      const result = await toggleListingVote(id, type, "CURRENCY")
      if (result.success) {
        setVotes({ upvotes: result.upvotes || 0, downvotes: result.downvotes || 0 })
        setUserVote(userVote === type ? null : type)
      } else {
        toast({ title: "Vote not saved", description: result.error || "Try again.", variant: "destructive" })
      }
    } catch (err) {
      console.error("Error voting:", err)
      toast({ title: "Vote not saved", description: "Try again.", variant: "destructive" })
    } finally {
      setIsVoting(false)
    }
  }

  const handleShare = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast({ title: "Couldn't copy the link", description: "Copy it from the address bar instead.", variant: "destructive" })
    }
  }

  const handleReport = async () => {
    if (!reportReason) return
    setIsReporting(true)
    try {
      const result = await reportListing(id, reportReason, reportDetails, "CURRENCY")
      if (result.success) {
        toast({ title: "Report sent", description: "Moderators will review this listing." })
        setShowReportDialog(false)
        setReportReason("")
        setReportDetails("")
      } else {
        toast({ title: "Report not sent", description: result.error || "Try again.", variant: "destructive" })
      }
    } catch (err) {
      console.error("Error reporting:", err)
      toast({ title: "Report not sent", description: "Try again.", variant: "destructive" })
    } finally {
      setIsReporting(false)
    }
  }

  const handleNudgeViewer = async (viewerId: string, viewerUsername: string) => {
    const cooldown = nudgeCooldowns[viewerId]
    if (cooldown && new Date() < cooldown) return
    setNudgingViewerId(viewerId)
    try {
      const result = await nudgeViewer(viewerId, id, "CURRENCY", `${rate} ${currency} per ₱1`)
      if (result.success) {
        toast({ title: "Nudge sent", description: `${viewerUsername} was notified about your listing.` })
        setNudgeCooldowns((prev) => ({ ...prev, [viewerId]: new Date(Date.now() + 60 * 60 * 1000) }))
      } else {
        toast({ title: "Nudge not sent", description: result.error || "Try again later.", variant: "destructive" })
        if (result.canNudgeAgainAt) setNudgeCooldowns((prev) => ({ ...prev, [viewerId]: result.canNudgeAgainAt! }))
      }
    } catch (error) {
      console.error("Error nudging viewer:", error)
    } finally {
      setNudgingViewerId(null)
    }
  }

  if (!listing) {
    return (
      <main className="min-h-screen bg-background">
        <Container className="pt-16 pb-20">
          <div className="mx-auto max-w-lg rounded-[20px] bg-card px-8 py-14 text-center">
            <p className="text-lg font-semibold">{initialResult.error || "This listing isn't available"}</p>
            <p className="mt-2 text-muted-foreground">It may have been removed by the seller.</p>
            <Button asChild variant="secondary" className="mt-6">
              <Link href="/currency">Browse currency sellers</Link>
            </Button>
          </div>
        </Container>
      </main>
    )
  }

  const seller = listing.seller || {}

  return (
    <main className="min-h-screen bg-background">
      <JsonLd
        listing={{
          id: listing.id,
          title: listing.title,
          image: listing.image,
          description: listing.description,
          ratePerPeso: rate,
          stock,
          listingType: "CURRENCY",
          gameName: listing.game || null,
          currencyName: currency,
          sellerName: seller.username || null,
          sellerUrl: seller.id ? `/profile/${seller.id}` : null,
        }}
        urlPath={`/currency/${listing.id}`}
      />

      <Container className="pt-6 pb-14 md:pt-8 md:pb-20">
        <nav aria-label="Breadcrumb" className="mb-6 flex flex-wrap items-center gap-1.5 text-[13px] text-muted-foreground">
          <Link href="/currency" className="text-link hover:underline">
            Currency
          </Link>
          <ChevronRight className="size-3" />
          <span>
            {listing.game ? `${listing.game} · ` : ""}
            {currency}
          </span>
        </nav>

        {listing.status === "banned" && (
          <div className="mb-6 flex items-start gap-3 rounded-lg bg-destructive/10 px-5 py-4">
            <Ban className="mt-0.5 size-5 shrink-0 text-destructive" strokeWidth={1.75} />
            <div>
              <p className="font-semibold text-destructive">This listing was banned</p>
              <p className="text-sm text-muted-foreground">It broke our marketplace rules and can't be bought.</p>
            </div>
          </div>
        )}
        {listing.status === "sold" && (
          <div className="mb-6 flex items-start gap-3 rounded-lg bg-success/10 px-5 py-4">
            <Check className="mt-0.5 size-5 shrink-0 text-success" strokeWidth={2} />
            <div>
              <p className="font-semibold text-success">Sold out</p>
              <p className="text-sm text-muted-foreground">
                This seller has no stock left.{" "}
                <Link href="/currency" className="text-link hover:underline">
                  Compare other sellers
                </Link>
                .
              </p>
            </div>
          </div>
        )}

        {/* Mobile order: what it is → buy box → details. Desktop: buy box is a sticky sidebar. */}
        <div className="grid items-start gap-x-10 gap-y-8 lg:grid-cols-[minmax(0,1fr)_420px]">
          {/* Offer header */}
          <div className="lg:col-start-1 lg:row-start-1">
            <header className="flex items-center gap-5">
              <span className="size-20 shrink-0 overflow-hidden rounded-[22px] bg-card">
                {listing.image && (
                  <img src={listing.image} alt="" className="h-full w-full object-contain p-2.5" />
                )}
              </span>
              <div className="min-w-0">
                <p className="text-[13px] text-muted-foreground">{listing.game || "In-game currency"}</p>
                <h1 className="text-title break-words">{currency}</h1>
              </div>
            </header>

            <p className="mt-6 text-[32px] font-semibold tracking-[-0.02em] tabular-nums">
              {fmt(rate)}
              <span className="ml-2 text-[17px] font-normal text-muted-foreground">{currency} per ₱1</span>
            </p>
          </div>

          {/* Buy box */}
          <aside className="space-y-[18px] lg:sticky lg:top-[76px] lg:col-start-2 lg:row-span-2 lg:row-start-1">
            <section className="rounded-[24px] bg-card p-6">
              {isAvailable && !isOwner ? (
                <>
                  <div className="flex items-center justify-between gap-3">
                    <h2 className="text-[17px] font-semibold">Buy {currency}</h2>
                    <Segmented
                      value={mode}
                      onChange={(next) => {
                        setMode(next)
                        setInput("")
                      }}
                      options={[
                        { value: "amount", label: currency.length > 10 ? "Amount" : currency },
                        { value: "pesos", label: "Pesos" },
                      ]}
                      className="text-[13px]"
                    />
                  </div>

                  <label htmlFor="buy-amount" className="mt-5 block text-[13px] text-muted-foreground">
                    {mode === "amount" ? `How many ${currency} do you want?` : "How much do you want to spend?"}
                  </label>
                  <div className="relative mt-1.5">
                    {mode === "pesos" && (
                      <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[22px] font-semibold text-muted-foreground">
                        ₱
                      </span>
                    )}
                    <Input
                      id="buy-amount"
                      ref={amountInputRef}
                      type="number"
                      inputMode="numeric"
                      min={0}
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      placeholder="0"
                      aria-invalid={Boolean(amountError)}
                      className={cn("h-14 rounded-2xl text-[22px] md:text-[22px] font-semibold tabular-nums placeholder:text-muted-foreground/60", mode === "pesos" ? "pl-9" : "pl-4")}
                    />
                  </div>

                  {quickPicks.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {quickPicks.map((pesos) => (
                        <button
                          key={pesos}
                          type="button"
                          onClick={() => {
                            setMode("pesos")
                            setInput(String(pesos))
                          }}
                          className="rounded-full bg-secondary px-3 py-1 text-[13px] font-medium transition-colors hover:bg-[#3a3a3c]"
                        >
                          ₱{fmt(pesos)}
                        </button>
                      ))}
                    </div>
                  )}

                  <dl className="mt-5 space-y-2 rounded-2xl bg-background/60 p-4 text-[15px]">
                    <div className="flex justify-between gap-3">
                      <dt className="text-muted-foreground">You get</dt>
                      <dd className="font-medium tabular-nums">
                        {amount > 0 ? `${fmtUnits(amount)} ${currency}` : "—"}
                      </dd>
                    </div>
                    <div className="flex items-baseline justify-between gap-3 border-t border-white/[0.08] pt-2">
                      <dt className="font-medium">You pay</dt>
                      <dd className="text-[22px] font-semibold tabular-nums">{amount > 0 ? `₱${fmt(cost)}` : "₱0"}</dd>
                    </div>
                  </dl>

                  <p className={cn("mt-2 min-h-5 text-[13px]", amountError ? "text-destructive" : "text-muted-foreground")} aria-live="polite">
                    {amountError ||
                      (minOrder || maxOrder
                        ? `Orders from ${minOrder ? fmt(minOrder) : "any amount"}${maxOrder ? ` up to ${fmt(maxOrder)}` : ""} ${currency}.`
                        : `${fmtUnits(stock)} ${currency} available.`)}
                  </p>

                  {user ? (
                    <Button size="lg" className="mt-3 w-full" disabled={!canBuy} onClick={handleBuy}>
                      Message seller to buy
                    </Button>
                  ) : (
                    <Button asChild size="lg" className="mt-3 w-full">
                      <Link href={`/auth/login?redirect=/currency/${id}`}>Log in to buy</Link>
                    </Button>
                  )}
                  <p className="mt-2 text-center text-[13px] text-muted-foreground">
                    You'll agree on payment and delivery in chat. Nothing is charged here.
                  </p>
                </>
              ) : (
                <div>
                  <p className="text-[17px] font-semibold">
                    {isOwner ? "This is your listing" : listing.status === "sold" ? "Sold out" : "Not available"}
                  </p>
                  <p className="mt-1 text-[15px] text-muted-foreground">
                    {isOwner ? "Buyers will message you from this page." : "This seller isn't taking orders right now."}
                  </p>
                  {!isOwner && (
                    <Button asChild variant="secondary" className="mt-4 w-full">
                      <Link href="/currency">Compare other sellers</Link>
                    </Button>
                  )}
                </div>
              )}
            </section>

            {/* Seller */}
            <Link
              href={`/profile/${seller.id || listing.sellerId}`}
              className="flex items-center gap-3 rounded-[20px] bg-card px-4 py-3.5 transition-colors hover:bg-[#232325]"
            >
              <img src={seller.profilePicture || "/placeholder.svg"} alt="" className="size-11 shrink-0 rounded-full bg-secondary object-cover" />
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-1 font-semibold">
                  <span className="truncate">{seller.username || "Unknown seller"}</span>
                  {seller.isVerified && <BadgeCheck className="size-4 shrink-0 text-link" strokeWidth={1.75} aria-label="Verified" />}
                </p>
                <p className="truncate text-[13px] text-muted-foreground">
                  <span className="text-success tabular-nums">✓ {seller.vouchCount || 0} {seller.vouchCount === 1 ? "vouch" : "vouches"}</span>
                  {seller.joinDate &&
                    ` · Since ${new Date(seller.joinDate).toLocaleDateString("en-US", { month: "short", year: "numeric" })}`}
                </p>
              </div>
              <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
            </Link>

            {/* Secondary actions */}
            <div className="flex items-center justify-between gap-2 px-1 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant={userVote === "up" ? "default" : "secondary"}
                  aria-pressed={userVote === "up"}
                  aria-label="Good listing"
                  onClick={() => handleVote("up")}
                  disabled={isVoting || isOwner}
                >
                  <ThumbsUp strokeWidth={1.75} />
                  <span className="tabular-nums">{votes.upvotes}</span>
                </Button>
                <Button
                  size="sm"
                  variant={userVote === "down" ? "destructive" : "secondary"}
                  aria-pressed={userVote === "down"}
                  aria-label="Bad listing"
                  onClick={() => handleVote("down")}
                  disabled={isVoting || isOwner}
                >
                  <ThumbsDown strokeWidth={1.75} />
                  <span className="tabular-nums">{votes.downvotes}</span>
                </Button>
              </div>
              <div className="flex items-center gap-1">
                <Button size="sm" variant="ghost" onClick={handleShare}>
                  {copied ? <Check className="text-success" /> : <Share2 strokeWidth={1.75} />}
                  {copied ? "Copied" : "Share"}
                </Button>
                {!isOwner && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => (user ? setShowReportDialog(true) : router.push(`/auth/login?redirect=/currency/${id}`))}
                  >
                    <Flag strokeWidth={1.75} />
                    Report
                  </Button>
                )}
              </div>
            </div>
          </aside>

          {/* Offer details */}
          <div className="lg:col-start-1 lg:row-start-2">

            <dl className="border-t border-border text-[15px]">
              {[
                ["In stock", `${fmt(stock)} ${currency}`],
                ["Order limits", minOrder || maxOrder
                  ? `${minOrder ? fmt(minOrder) : "No minimum"} – ${maxOrder ? fmt(maxOrder) : "no maximum"}`
                  : "Any amount"],
                ["Posted", new Date(listing.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })],
                ["Views", fmt(listing.views || 0)],
              ].map(([label, value]) => (
                <div key={label} className="flex justify-between gap-4 border-b border-border py-3">
                  <dt className="text-muted-foreground">{label}</dt>
                  <dd className="text-right tabular-nums">{value}</dd>
                </div>
              ))}
            </dl>

            {listing.description && (
              <section className="mt-10">
                <h2 className="text-[21px] font-semibold tracking-[-0.015em]">From the seller</h2>
                <p className="mt-3 max-w-[62ch] whitespace-pre-line text-[17px] leading-relaxed text-foreground/90">
                  {listing.description}
                </p>
              </section>
            )}

            <section className="mt-10 grid gap-6 border-t border-white/[0.08] pt-8 text-[15px] sm:grid-cols-3">
              <div>
                <p className="font-semibold">Ask for proof</p>
                <p className="mt-1 text-muted-foreground">Get a screenshot of their balance before paying.</p>
              </div>
              <div>
                <p className="font-semibold">Pay in parts</p>
                <p className="mt-1 text-muted-foreground">For big orders, split payment and delivery.</p>
              </div>
              <div>
                <p className="font-semibold">Check first</p>
                <p className="mt-1 text-muted-foreground">
                  Search their name in the{" "}
                  <Link href="/hall-of-shame" className="text-link hover:underline">
                    Hall of Shame
                  </Link>
                  .
                </p>
              </div>
            </section>
          </div>

        </div>
      </Container>

      {/* Owner: who viewed this listing (Elite) */}
      {isOwner && (
        <Section surface>
          <Container>
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-section">Who viewed this listing</h2>
              <Badge variant="secondary">
                <Crown strokeWidth={1.75} />
                Elite
              </Badge>
            </div>
            {viewersLoading ? (
              <div className="flex justify-center py-10">
                <Loader2 className="size-6 animate-spin text-muted-foreground" />
              </div>
            ) : requiresUpgrade ? (
              <div className="rounded-[20px] bg-card px-6 py-12 text-center">
                <p className="text-lg font-semibold">See who's interested in your listing</p>
                <p className="mx-auto mt-2 max-w-md text-muted-foreground">
                  Elite members can see everyone who viewed a listing and nudge them to buy.
                </p>
                <Button asChild size="lg" className="mt-6">
                  <Link href="/subscriptions">Upgrade to Elite</Link>
                </Button>
              </div>
            ) : viewers.length === 0 ? (
              <p className="rounded-[20px] bg-card px-6 py-10 text-center text-muted-foreground">No views yet.</p>
            ) : (
              <ul className="divide-y divide-white/[0.06] overflow-hidden rounded-[20px] bg-card">
                {[...viewers]
                  .sort((a, b) => new Date(b.viewedAt).getTime() - new Date(a.viewedAt).getTime())
                  .map((viewer) => {
                    const cooling = nudgeCooldowns[viewer.id] && new Date() < nudgeCooldowns[viewer.id]
                    return (
                      <li key={viewer.id} className="flex items-center justify-between gap-3 px-4 py-3">
                        <Link href={`/profile/${viewer.id}`} className="flex min-w-0 flex-1 items-center gap-3">
                          <img src={viewer.profilePicture || "/placeholder.svg"} alt="" className="size-10 shrink-0 rounded-full bg-secondary object-cover" />
                          <span className="min-w-0">
                            <span className="block truncate font-medium">{viewer.username}</span>
                            <span className="text-[13px] text-muted-foreground">
                              Viewed {new Date(viewer.viewedAt).toLocaleString()}
                            </span>
                          </span>
                        </Link>
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => handleNudgeViewer(viewer.id, viewer.username)}
                          disabled={nudgingViewerId === viewer.id || Boolean(cooling)}
                        >
                          {nudgingViewerId === viewer.id && <Loader2 className="animate-spin" />}
                          {cooling
                            ? `Nudge in ${Math.ceil((nudgeCooldowns[viewer.id].getTime() - Date.now()) / 60000)}m`
                            : "Nudge"}
                        </Button>
                      </li>
                    )
                  })}
              </ul>
            )}
          </Container>
        </Section>
      )}

      {/* Report */}
      <Dialog open={showReportDialog} onOpenChange={setShowReportDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Report this listing</DialogTitle>
            <DialogDescription>Tell us what's wrong. Reports are reviewed by moderators.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="reason">Reason</Label>
              <Select value={reportReason} onValueChange={setReportReason}>
                <SelectTrigger id="reason" className="w-full">
                  <SelectValue placeholder="Choose a reason" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="scam">Scam or fraud</SelectItem>
                  <SelectItem value="fake">Fake or misleading rate</SelectItem>
                  <SelectItem value="inappropriate">Inappropriate content</SelectItem>
                  <SelectItem value="spam">Spam</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="details">
                Details <span className="font-normal text-muted-foreground">(optional)</span>
              </Label>
              <Textarea
                id="details"
                placeholder="Anything that helps us review it, like what the seller said."
                value={reportDetails}
                onChange={(e) => setReportDetails(e.target.value)}
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setShowReportDialog(false)} disabled={isReporting}>
              Cancel
            </Button>
            <Button onClick={handleReport} disabled={isReporting || !reportReason}>
              {isReporting && <Loader2 className="animate-spin" />}
              {isReporting ? "Sending…" : "Send report"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  )
}
