"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Share2, Flag, Check, ThumbsUp, ThumbsDown, Loader2, Crown, Ban, BadgeCheck, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Container, Section } from "@/components/site/container"
import Link from "next/link"
import { useAuth } from "@/lib/auth-context"
import { JsonLd } from "@/components/json-ld"
import { gamePath } from "@/lib/seo"
import { ListingGallery } from "@/components/listing/listing-gallery"
import { getListing, toggleListingVote, reportListing, getListingViewers, nudgeViewer } from "@/app/actions/listings"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { useToast } from "@/hooks/use-toast"
import { Skeleton } from "@/components/ui/skeleton"

type ListingResult = Awaited<ReturnType<typeof getListing>>

interface ListingClientProps {
  id: string
  /** Loaded on the server, so the page renders with data instead of fetching after hydration */
  initialResult: ListingResult
}

function initialErrorFor(result: ListingResult): string | null {
  if (!result.success || !result.listing) return result.error || "Listing not found"
  if (result.listing.status === "deleted") return "deleted"
  return null
}

export default function ListingClient({ id, initialResult }: ListingClientProps) {
  const initialListing = initialErrorFor(initialResult) ? null : (initialResult.listing ?? null)

  // ALL hooks declared before any conditional logic
  const { user } = useAuth()
  const router = useRouter()
  const { toast } = useToast()
  const [listing] = useState<any>(initialListing)
  const loading = false
  const [error] = useState<string | null>(initialErrorFor(initialResult))
  const [isSaved, setIsSaved] = useState(false)
  const [userVote, setUserVote] = useState<"up" | "down" | null>(
    initialListing?.userVote ? (initialListing.userVote.toLowerCase() as "up" | "down") : null,
  )
  const [votes, setVotes] = useState({
    upvotes: initialListing?.upvotes || 0,
    downvotes: initialListing?.downvotes || 0,
  })
  const [votingLoading, setVotingLoading] = useState(false)
  const [showReportModal, setShowReportModal] = useState(false)
  const [reportReason, setReportReason] = useState("")
  const [reportDetails, setReportDetails] = useState("")
  const [reportLoading, setReportLoading] = useState(false)
  const [showQuantityModal, setShowQuantityModal] = useState(false)
  const [buyQuantity, setBuyQuantity] = useState("1")
  const [quantityError, setQuantityError] = useState("")
  const [viewers, setViewers] = useState<any[]>([])
  const [viewersLoading, setViewersLoading] = useState(false)
  const [requiresUpgrade, setRequiresUpgrade] = useState(false)
  const [showViewers, setShowViewers] = useState(false)
  const [viewerSearch, setViewerSearch] = useState("")
  const [viewerSort, setViewerSort] = useState("newest")
  const [nudgeCooldowns, setNudgeCooldowns] = useState<Record<string, Date>>({})
  const [nudgingViewerId, setNudgingViewerId] = useState<string | null>(null)

  // Deleted listing: send the visitor back to the marketplace after a moment
  useEffect(() => {
    if (error !== "deleted") return
    const timer = setTimeout(() => router.push("/marketplace"), 5000)
    return () => clearTimeout(timer)
  }, [error])

  // The owner sees who viewed the listing once their session is known
  useEffect(() => {
    if (user && listing?.seller?.id === user.id) {
      setShowViewers(true)
      fetchViewers()
    }
  }, [user?.id, listing?.seller?.id])

  const fetchViewers = async () => {
    if (!id) return
    
    setViewersLoading(true)
    try {
      const result = await getListingViewers(id, "ITEM")
      if (result.success) {
        if (result.requiresUpgrade) {
          setRequiresUpgrade(true)
        } else {
          setViewers(result.viewers || [])
          setRequiresUpgrade(false)
          
          // Initialize cooldowns from server data
          if (result.viewers) {
            const cooldowns: Record<string, Date> = {}
            for (const viewer of result.viewers) {
              if (viewer.lastNudgedAt) {
                const nudgeTime = new Date(viewer.lastNudgedAt)
                const cooldownUntil = new Date(nudgeTime.getTime() + 60 * 60 * 1000)
                if (cooldownUntil > new Date()) {
                  cooldowns[viewer.id] = cooldownUntil
                }
              }
            }
            setNudgeCooldowns(cooldowns)
          }
        }
      }
    } catch (err) {
      console.error("Failed to fetch viewers:", err)
    } finally {
      setViewersLoading(false)
    }
  }

  const requireAuth = (action: () => void) => {
    if (!user) {
      router.push(`/auth/login?redirect=/listing/${id}`)
      return
    }
    action()
  }

  const handleVote = (type: "up" | "down") => {
    requireAuth(async () => {
      setVotingLoading(true)
      try {
        if (userVote === type) {
          // Remove vote
          setUserVote(null)
          setVotes((prev) => ({
            upvotes: type === "up" ? prev.upvotes - 1 : prev.upvotes,
            downvotes: type === "down" ? prev.downvotes - 1 : prev.downvotes,
          }))
        } else {
          // Add or switch vote
          setVotes((prev) => ({
            upvotes: type === "up" ? prev.upvotes + 1 : userVote === "up" ? prev.upvotes - 1 : prev.upvotes,
            downvotes: type === "down" ? prev.downvotes + 1 : userVote === "down" ? prev.downvotes - 1 : prev.downvotes,
          }))
          setUserVote(type)
        }

        // Call server action
        const result = await toggleListingVote(id, type, "ITEM")
        if (!result.success) {
          console.error("Failed to record vote:", result.error)
        }
      } catch (error) {
        console.error("Error voting:", error)
      } finally {
        setVotingLoading(false)
      }
    })
  }

  const handleBuyNow = () => {
    requireAuth(() => {
      if (!listing) return
      
      // If stock is 1, redirect directly to chat
      if (listing.stock === 1) {
        const params = new URLSearchParams({
          sellerId: listing.seller?.id || listing.sellerId,
          itemId: listing.id,
          itemTitle: listing.title,
          type: "item",
          amount: "1",
          cost: listing.price.toString(),
        })
        router.push(`/messages?${params.toString()}`)
      } else {
        // Show quantity modal if stock > 1
        setShowQuantityModal(true)
        setBuyQuantity("1")
        setQuantityError("")
      }
    })
  }

  const handleConfirmQuantity = () => {
    if (!listing) return
    
    setQuantityError("")
    const quantity = parseInt(buyQuantity)
    
    if (!buyQuantity || buyQuantity.trim() === "") {
      setQuantityError("Quantity is required")
      return
    }
    
    if (isNaN(quantity)) {
      setQuantityError("Please enter a valid number")
      return
    }
    
    if (quantity < 1) {
      setQuantityError("Quantity must be at least 1")
      return
    }
    
    if (quantity > listing.stock) {
      setQuantityError(`Maximum available quantity is ${listing.stock}`)
      return
    }

    // Calculate total cost based on pricing mode
    const totalCost = listing.pricingMode === "per-peso"
      ? Math.ceil(quantity / listing.price) // For per-peso: quantity of items / items per peso = pesos
      : listing.price * quantity // For per-item: price per item * quantity

    const params = new URLSearchParams({
      sellerId: listing.seller?.id || listing.sellerId,
      itemId: listing.id,
      itemTitle: listing.title,
      type: "item",
      amount: quantity.toString(),
      cost: totalCost.toString(),
    })
    router.push(`/messages?${params.toString()}`)
  }

  const handleSaveItem = () => {
    requireAuth(() => setIsSaved(!isSaved))
  }

  const handleReport = () => {
    requireAuth(() => {
      setShowReportModal(true)
    })
  }

  const handleSubmitReport = async () => {
    if (!reportReason) return

    setReportLoading(true)
    try {
      const result = await reportListing(id, reportReason, reportDetails, "ITEM")
      if (result.success) {
        toast({
          title: "Success",
          description: "Report submitted successfully. Thank you for helping keep our community safe!",
        })
        setShowReportModal(false)
        setReportReason("")
        setReportDetails("")
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to submit report",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error submitting report:", error)
      toast({
        title: "Error",
        description: "Failed to submit report",
        variant: "destructive",
      })
    } finally {
      setReportLoading(false)
    }
  }

  const handleNudgeViewer = async (viewerId: string, viewerUsername: string) => {
    if (!listing) return

    // Check cooldown
    const cooldownTime = nudgeCooldowns[viewerId]
    if (cooldownTime && new Date() < cooldownTime) {
      const remainingMinutes = Math.ceil((cooldownTime.getTime() - Date.now()) / 60000)
      toast({
        title: "Cooldown Active",
        description: `You can nudge ${viewerUsername} again in ${remainingMinutes} minute${remainingMinutes > 1 ? 's' : ''}`,
        variant: "destructive",
      })
      return
    }

    setNudgingViewerId(viewerId)
    try {
      const result = await nudgeViewer(viewerId, listing.id, "ITEM", listing.title)
      if (result.success) {
        toast({
          title: "Nudge sent",
          description: `${viewerUsername} has been notified about your listing`,
        })
        // Set cooldown for 1 hour
        const cooldownUntil = new Date(Date.now() + 60 * 60 * 1000)
        setNudgeCooldowns(prev => ({ ...prev, [viewerId]: cooldownUntil }))
      } else {
        toast({
          title: "Failed to Nudge",
          description: result.error || "Could not send nudge",
          variant: "destructive",
        })
        if (result.canNudgeAgainAt) {
          const nextNudgeTime = result.canNudgeAgainAt
          setNudgeCooldowns(prev => ({ ...prev, [viewerId]: nextNudgeTime }))
        }
      }
    } catch (error) {
      console.error("Error nudging viewer:", error)
      toast({
        title: "Error",
        description: "Failed to send nudge",
        variant: "destructive",
      })
    } finally {
      setNudgingViewerId(null)
    }
  }

  const isOwner = Boolean(user?.id && listing?.seller?.id === user.id)
  const isAvailable = listing && listing.status !== "banned" && listing.status !== "sold"
  const sellerHref = `/profile/${listing?.seller?.id || listing?.sellerId}`

  const handleShare = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href)
      toast({ title: "Link copied", description: "Share it with a buyer or friend." })
    } catch {
      toast({ title: "Couldn't copy the link", description: "Copy it from the address bar instead.", variant: "destructive" })
    }
  }

  return (
    <main className="min-h-screen bg-background">
      <Container className="pt-6 pb-14 md:pt-8 md:pb-20">
        {loading && (
          <div className="grid gap-10 lg:grid-cols-[1.1fr_1fr]">
            <div className="space-y-3">
              <Skeleton className="aspect-square w-full rounded-[24px]" />
              <div className="flex gap-2.5">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="size-16 rounded-xl" />
                ))}
              </div>
            </div>
            <div className="space-y-5 pt-4">
              <Skeleton className="h-4 w-1/3" />
              <Skeleton className="h-10 w-3/4" />
              <Skeleton className="h-8 w-1/4" />
              <Skeleton className="h-40 w-full rounded-lg" />
              <Skeleton className="h-12 w-full rounded-full" />
            </div>
          </div>
        )}

        {error === "deleted" && (
          <div className="mx-auto mt-12 max-w-xl rounded-lg bg-card px-8 py-14 text-center">
            <h1 className="text-title">This listing was removed</h1>
            <p className="mt-3 text-[17px] text-muted-foreground">
              The seller took it down, so it's no longer for sale. Taking you to the marketplace in 5 seconds.
            </p>
            <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
              <Button onClick={() => router.push("/marketplace")} size="lg">
                Browse items
              </Button>
              <Button onClick={() => router.back()} variant="secondary" size="lg">
                Go back
              </Button>
            </div>
          </div>
        )}

        {error && error !== "deleted" && !listing && (
          <div className="mx-auto mt-12 max-w-xl rounded-lg bg-card px-8 py-14 text-center">
            <p className="text-lg font-semibold">{error}</p>
            <Button onClick={() => router.push("/marketplace")} className="mt-6">
              Back to items
            </Button>
          </div>
        )}

        {listing && (
          <>
            <JsonLd
              listing={{
                id: listing.id,
                title: listing.title,
                image: listing.image,
                images: listing.images,
                description: listing.description,
                price: listing.price,
                stock: listing.stock,
                listingType: listing.listingType || "ITEM",
                gameName: listing.game || null,
                condition: listing.condition || null,
                sellerName: listing.seller?.username || null,
                sellerUrl: listing.seller?.id ? `/profile/${listing.seller.id}` : null,
              }}
              urlPath={`/listing/${listing.id}`}
            />

            <nav aria-label="Breadcrumb" className="mb-6 flex flex-wrap items-center gap-1.5 text-[13px] text-muted-foreground">
              <Link href="/marketplace" className="text-link hover:underline">
                Items
              </Link>
              {listing.game && (
                <>
                  <ChevronRight className="size-3" />
                  <Link
                    href={gamePath(listing.game)}
                    className="text-link hover:underline"
                  >
                    {listing.game}
                  </Link>
                </>
              )}
              <ChevronRight className="size-3" />
              <span className="truncate">{listing.title}</span>
            </nav>

            {listing.status === "banned" && (
              <div className="mb-6 flex items-start gap-3 rounded-lg bg-destructive/10 px-5 py-4">
                <Ban className="mt-0.5 size-5 shrink-0 text-destructive" strokeWidth={1.75} />
                <div>
                  <p className="font-semibold text-destructive">This listing was banned</p>
                  <p className="text-sm text-muted-foreground">
                    It broke our marketplace rules and can't be bought.
                  </p>
                </div>
              </div>
            )}

            {listing.status === "sold" && (
              <div className="mb-6 flex items-start gap-3 rounded-lg bg-success/10 px-5 py-4">
                <Check className="mt-0.5 size-5 shrink-0 text-success" strokeWidth={2} />
                <div>
                  <p className="font-semibold text-success">Sold</p>
                  <p className="text-sm text-muted-foreground">
                    This item is gone. See what else {listing.seller?.username || "the seller"} has, or browse similar items.
                  </p>
                </div>
              </div>
            )}

            <div className="grid items-start gap-10 lg:grid-cols-[1.1fr_1fr]">
              {/* Gallery */}
              <div className="lg:sticky lg:top-[76px]">
                <ListingGallery
                  images={listing.images?.length ? listing.images : listing.image ? [listing.image] : []}
                  alt={listing.title}
                />
              </div>

              {/* Buy panel */}
              <div>
                <p className="text-[13px] text-muted-foreground">
                  {[listing.game, listing.itemType || listing.category].filter(Boolean).join(" · ")}
                </p>
                <h1 className="mt-1 text-[34px] font-semibold leading-tight tracking-[-0.025em]">{listing.title}</h1>

                <div className="mt-3 mb-6">
                  {listing.pricingMode === "per-peso" ? (
                    <p className="text-[32px] font-semibold tracking-[-0.02em] tabular-nums">
                      {listing.price?.toLocaleString() || "0"}
                      <span className="ml-2 text-base font-normal text-muted-foreground">items per ₱1</span>
                    </p>
                  ) : (
                    <p className="text-[32px] font-semibold tracking-[-0.02em] tabular-nums">
                      ₱{listing.price?.toLocaleString() || "0"}
                      {listing.stock > 1 && (
                        <span className="ml-2 text-base font-normal text-muted-foreground">each</span>
                      )}
                    </p>
                  )}
                </div>

                <dl className="border-t border-border text-[15px]">
                  {[
                    ["Condition", listing.condition || "New"],
                    ["In stock", listing.stock?.toLocaleString() || "0"],
                    ["Category", listing.category],
                    ["Posted", new Date(listing.createdAt).toLocaleDateString()],
                    ["Views", (listing.views || 0).toLocaleString()],
                  ]
                    .filter(([, v]) => v)
                    .map(([label, value]) => (
                      <div key={label} className="flex justify-between gap-4 border-b border-border py-3">
                        <dt className="text-muted-foreground">{label}</dt>
                        <dd className="text-right tabular-nums">{value}</dd>
                      </div>
                    ))}
                </dl>

                {isAvailable && (
                  <div className="mt-6 grid gap-2.5">
                    <Button size="lg" className="w-full" disabled={isOwner} onClick={handleBuyNow}>
                      {isOwner ? "This is your listing" : "Message seller to buy"}
                    </Button>
                    <div className="grid grid-cols-2 gap-2.5">
                      <Button size="lg" variant="secondary" onClick={handleShare}>
                        <Share2 strokeWidth={1.75} />
                        Share
                      </Button>
                      <Button size="lg" variant="secondary" disabled={isOwner} onClick={handleReport}>
                        <Flag strokeWidth={1.75} />
                        Report
                      </Button>
                    </div>
                  </div>
                )}

                {/* Seller */}
                <Link
                  href={sellerHref}
                  className="mt-5 flex items-center gap-3 rounded-lg bg-card px-4 py-3.5 transition-colors hover:bg-[#232325]"
                >
                  <img
                    src={listing.seller?.profilePicture || "/placeholder.svg"}
                    alt=""
                    className="size-11 shrink-0 rounded-full bg-secondary object-cover"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-1 font-semibold">
                      <span className="truncate">{listing.seller?.username || "Unknown seller"}</span>
                      {listing.seller?.isVerified && (
                        <BadgeCheck className="size-4 shrink-0 text-link" strokeWidth={1.75} aria-label="Verified" />
                      )}
                    </p>
                    <p className="truncate text-[13px] text-muted-foreground">
                      <span className="text-success tabular-nums">✓ {listing.seller?.vouchCount || 0} {listing.seller?.vouchCount === 1 ? "vouch" : "vouches"}</span>
                      {listing.seller?.joinDate &&
                        ` · Since ${new Date(listing.seller.joinDate).toLocaleDateString("en-US", { month: "short", year: "numeric" })}`}
                      {listing.seller?.lastActive &&
                        ` · Active ${new Date(listing.seller.lastActive).toLocaleDateString()}`}
                    </p>
                  </div>
                  <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
                </Link>

                {/* Votes */}
                {isAvailable && (
                  <div className="mt-5 flex items-center gap-3 text-sm text-muted-foreground">
                    <span>Is this a good listing?</span>
                    <Button
                      size="sm"
                      variant={userVote === "up" ? "default" : "secondary"}
                      aria-pressed={userVote === "up"}
                      onClick={() => handleVote("up")}
                      disabled={votingLoading}
                    >
                      <ThumbsUp strokeWidth={1.75} />
                      <span className="tabular-nums">{votes.upvotes}</span>
                    </Button>
                    <Button
                      size="sm"
                      variant={userVote === "down" ? "destructive" : "secondary"}
                      aria-pressed={userVote === "down"}
                      onClick={() => handleVote("down")}
                      disabled={votingLoading}
                    >
                      <ThumbsDown strokeWidth={1.75} />
                      <span className="tabular-nums">{votes.downvotes}</span>
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </Container>

      {listing && (
        <>
          <Section surface>
            <Container className="grid gap-12 lg:grid-cols-[1.4fr_1fr]">
              <div>
                <h2 className="text-section mb-4">About this item</h2>
                <p className="max-w-[62ch] whitespace-pre-line text-[17px] leading-relaxed text-foreground/90">
                  {listing.description || "The seller didn't add a description."}
                </p>
              </div>
              <div>
                <h2 className="text-section mb-4">Trade safely</h2>
                <ul className="space-y-4 text-[15px]">
                  <li>
                    <p className="font-semibold">Ask for proof</p>
                    <p className="text-muted-foreground">Get screenshots or a video of the item before you pay.</p>
                  </li>
                  <li>
                    <p className="font-semibold">Agree on terms first</p>
                    <p className="text-muted-foreground">Settle payment method, delivery and timing in chat.</p>
                  </li>
                  <li>
                    <p className="font-semibold">Vouch after the trade</p>
                    <p className="text-muted-foreground">
                      It helps the next buyer. Check the{" "}
                      <Link href="/hall-of-shame" className="text-link hover:underline">
                        Hall of Shame
                      </Link>{" "}
                      if something feels off.
                    </p>
                  </li>
                </ul>
              </div>
            </Container>
          </Section>

          {/* Listing viewers (owner only, Elite feature) */}
          {showViewers && (
            <Section>
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
                  <div className="rounded-lg bg-card px-6 py-12 text-center">
                    <p className="text-lg font-semibold">See who's interested in your listing</p>
                    <p className="mx-auto mt-2 max-w-md text-muted-foreground">
                      Elite members can see everyone who viewed a listing and nudge them to buy.
                    </p>
                    <Button asChild size="lg" className="mt-6">
                      <Link href="/subscriptions">Upgrade to Elite</Link>
                    </Button>
                  </div>
                ) : viewers.length === 0 ? (
                  <p className="rounded-lg bg-card px-6 py-10 text-center text-muted-foreground">No views yet.</p>
                ) : (
                  <>
                    <div className="mb-4 flex flex-col gap-3 sm:flex-row">
                      <Input
                        placeholder="Search by username"
                        value={viewerSearch}
                        onChange={(e) => setViewerSearch(e.target.value)}
                        className="flex-1"
                      />
                      <Select value={viewerSort} onValueChange={setViewerSort}>
                        <SelectTrigger className="min-w-[160px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="newest">Newest first</SelectItem>
                          <SelectItem value="oldest">Oldest first</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="divide-y divide-border overflow-hidden rounded-lg bg-card">
                      {viewers
                        .filter((viewer) => viewer.username.toLowerCase().includes(viewerSearch.toLowerCase()))
                        .sort((a, b) =>
                          viewerSort === "newest"
                            ? new Date(b.viewedAt).getTime() - new Date(a.viewedAt).getTime()
                            : new Date(a.viewedAt).getTime() - new Date(b.viewedAt).getTime(),
                        )
                        .map((viewer) => {
                          const cooling = nudgeCooldowns[viewer.id] && new Date() < nudgeCooldowns[viewer.id]
                          return (
                            <div key={viewer.id} className="flex items-center justify-between gap-3 px-4 py-3">
                              <Link href={`/profile/${viewer.id}`} className="flex min-w-0 flex-1 items-center gap-3">
                                <img
                                  src={viewer.profilePicture || "/placeholder.svg"}
                                  alt=""
                                  className="size-10 shrink-0 rounded-full bg-secondary object-cover"
                                />
                                <div className="min-w-0">
                                  <p className="truncate font-medium">{viewer.username}</p>
                                  <p className="text-[13px] text-muted-foreground">
                                    Viewed {new Date(viewer.viewedAt).toLocaleString()}
                                  </p>
                                </div>
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
                            </div>
                          )
                        })}
                    </div>
                  </>
                )}
              </Container>
            </Section>
          )}
        </>
      )}

      {/* Quantity selection */}
      <Dialog open={showQuantityModal} onOpenChange={setShowQuantityModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>How many do you want?</DialogTitle>
            <DialogDescription>{listing?.stock?.toLocaleString()} available from this seller.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <label htmlFor="quantity" className="text-sm font-medium">
                Quantity
              </label>
              <Input
                id="quantity"
                type="number"
                inputMode="numeric"
                min="1"
                max={listing?.stock}
                value={buyQuantity}
                aria-invalid={Boolean(quantityError)}
                onChange={(e) => {
                  setBuyQuantity(e.target.value)
                  if (quantityError) setQuantityError("")
                }}
              />
              {quantityError && <p className="text-sm text-destructive">{quantityError}</p>}
            </div>

            <dl className="space-y-2 rounded-xl bg-secondary/60 p-4 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">
                  {listing?.pricingMode === "per-peso" ? "Items per ₱1" : "Price each"}
                </dt>
                <dd className="tabular-nums">
                  {listing?.pricingMode === "per-peso"
                    ? `${listing?.price.toLocaleString()} items`
                    : `₱${listing?.price.toLocaleString()}`}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Quantity</dt>
                <dd className="tabular-nums">{buyQuantity}</dd>
              </div>
              <div className="flex justify-between border-t border-border pt-2 text-base font-semibold">
                <dt>Total</dt>
                <dd className="tabular-nums">
                  ₱
                  {listing?.pricingMode === "per-peso"
                    ? Math.ceil(parseInt(buyQuantity || "1") / listing?.price).toLocaleString()
                    : (listing?.price * parseInt(buyQuantity || "1")).toLocaleString()}
                </dd>
              </div>
            </dl>
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setShowQuantityModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleConfirmQuantity}>Continue to chat</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Report */}
      <Dialog open={showReportModal} onOpenChange={setShowReportModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Report this listing</DialogTitle>
            <DialogDescription>Tell us what's wrong. Reports are reviewed by moderators.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <label htmlFor="reportReason" className="text-sm font-medium">
                Reason
              </label>
              <Select value={reportReason} onValueChange={setReportReason}>
                <SelectTrigger id="reportReason" className="w-full">
                  <SelectValue placeholder="Choose a reason" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Scam">Scam or fraud</SelectItem>
                  <SelectItem value="Fake Items">Fake or counterfeit item</SelectItem>
                  <SelectItem value="Inappropriate">Inappropriate content</SelectItem>
                  <SelectItem value="Spam">Spam</SelectItem>
                  <SelectItem value="Overpriced">Overpriced</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label htmlFor="reportDetails" className="text-sm font-medium">
                Details <span className="font-normal text-muted-foreground">(optional)</span>
              </label>
              <Textarea
                id="reportDetails"
                placeholder="Anything that helps us review it, like what the seller said."
                value={reportDetails}
                onChange={(e) => setReportDetails(e.target.value)}
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="secondary"
              onClick={() => {
                setShowReportModal(false)
                setReportReason("")
                setReportDetails("")
              }}
              disabled={reportLoading}
            >
              Cancel
            </Button>
            <Button onClick={handleSubmitReport} disabled={!reportReason || reportLoading}>
              {reportLoading && <Loader2 className="animate-spin" />}
              {reportLoading ? "Sending…" : "Send report"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  )
}
