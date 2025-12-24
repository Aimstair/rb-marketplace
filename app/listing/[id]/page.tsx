"use client"

import { useState, useEffect, use } from "react"
import { useRouter } from "next/navigation"
import { Star, Share2, Flag, MessageCircle, Check, Calendar, Shield, ThumbsUp, ThumbsDown, X, Loader2, Eye, Crown } from "lucide-react"
import Navigation from "@/components/navigation"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"
import { useAuth } from "@/lib/auth-context"
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

interface ListingDetailPageProps {
  params: Promise<{ id: string }>
}

export default function ListingDetailPage({ params }: ListingDetailPageProps) {
  // Unwrap params at the very top
  const { id } = use(params)
  
  // ALL hooks declared before any conditional logic
  const { user } = useAuth()
  const router = useRouter()
  const { toast } = useToast()
  const [listing, setListing] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedImage, setSelectedImage] = useState<string>("")
  const [isSaved, setIsSaved] = useState(false)
  const [userVote, setUserVote] = useState<"up" | "down" | null>(null)
  const [votes, setVotes] = useState({ upvotes: 0, downvotes: 0 })
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

  // Fetch listing data
  useEffect(() => {
    if (!id) return

    const fetchListing = async () => {
      try {
        setLoading(true)
        const result = await getListing(id)
        
        if (!result.success || !result.listing) {
          setError(result.error || "Listing not found")
          return
        }

        console.log("Listing loaded:", result.listing)
        console.log("Seller ID:", result.listing.seller?.id)
        setListing(result.listing)
        setVotes({ 
          upvotes: result.listing.upvotes || 0, 
          downvotes: result.listing.downvotes || 0 
        })
        
        // Initialize user's vote from database
        if (result.listing.userVote) {
          setUserVote(result.listing.userVote.toLowerCase() as "up" | "down")
        } else {
          setUserVote(null)
        }
        
        // Set first image as default
        if (result.listing.image) {
          setSelectedImage(result.listing.image)
        }

        // Check if user is the owner and fetch viewers
        if (user && result.listing.seller?.id === user.id) {
          setShowViewers(true)
          fetchViewers()
        }
      } catch (err) {
        console.error("Failed to fetch listing:", err)
        setError("Failed to load listing")
      } finally {
        setLoading(false)
      }
    }

    fetchListing()
  }, [id, user])

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
          title: "Nudge Sent! 👋",
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
          setNudgeCooldowns(prev => ({ ...prev, [viewerId]: result.canNudgeAgainAt }))
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

  return (
    <main className="min-h-screen bg-background">
      <Navigation />

      <div className="container max-w-[1920px] mx-auto px-6 py-8">
        {loading && (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Loading listing...</p>
          </div>
        )}

        {error && !listing && (
          <div className="text-center py-12">
            <p className="text-destructive mb-4">{error}</p>
            <Button onClick={() => router.push("/marketplace")}>
              Back to Marketplace
            </Button>
          </div>
        )}

        {listing && (
        <>
        {/* Listing Title */}
        <h1 className="text-3xl font-bold mb-6">{listing.title}</h1>
        
        {/* Banned Warning Banner */}
        {listing.status === "banned" && (
          <Card className="mb-6 border-red-500 bg-red-50 dark:bg-red-950/20">
            <div className="p-6">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-red-500 rounded-full">
                  <X className="w-8 h-8 text-white" />
                </div>
                <div className="flex-1">
                  <h2 className="text-2xl font-bold text-red-700 dark:text-red-400 mb-2">
                    This listing has been banned
                  </h2>
                  <p className="text-red-600 dark:text-red-500 text-lg">
                    This listing has been removed from the marketplace due to violations of our policies and is no longer available for purchase.
                  </p>
                </div>
              </div>
            </div>
          </Card>
        )}
        
        {/* Sold Notice Banner */}
        {listing.status === "sold" && (
          <Card className="mb-6 border-green-500 bg-green-50 dark:bg-green-950/20">
            <div className="p-6">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-green-500 rounded-full">
                  <Check className="w-8 h-8 text-white" />
                </div>
                <div className="flex-1">
                  <h2 className="text-2xl font-bold text-green-700 dark:text-green-400 mb-2">
                    This listing has been sold
                  </h2>
                  <p className="text-green-600 dark:text-green-500 text-lg">
                    This item is no longer available for purchase. Check out other listings from this seller or browse the marketplace for similar items.
                  </p>
                </div>
              </div>
            </div>
          </Card>
        )}
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            {/* Main Image */}
            <div className="mb-6">
              <div className="relative w-full bg-muted rounded-lg overflow-hidden mb-4">
                <img
                  src={selectedImage || listing.image || "/placeholder.jpg"}
                  alt={listing.title}
                  className="w-full h-96 object-cover"
                  onError={(e) => {
                    ;(e.target as HTMLImageElement).src = "/placeholder.jpg"
                  }}
                />
                <Badge className="absolute top-4 left-4 bg-primary text-primary-foreground">
                  {listing.condition || "New"}
                </Badge>
              </div>

              {/* Thumbnail Gallery - if we have more images */}
              {listing.image && (
                <div className="flex gap-2">
                  <button
                    onClick={() => setSelectedImage(listing.image)}
                    className={`w-20 h-20 rounded-lg overflow-hidden border-2 transition ${
                      selectedImage === listing.image ? "border-primary" : "border-border hover:border-primary/50"
                    }`}
                  >
                    <img
                      src={listing.image || "/placeholder.jpg"}
                      alt="Main"
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        ;(e.target as HTMLImageElement).src = "/placeholder.jpg"
                      }}
                    />
                  </button>
                </div>
              )}
            </div>

            {/* Item Info Cards */}
            <div className="grid grid-cols-3 gap-4 mb-6">
              <Card className="p-4">
                <p className="text-sm text-muted-foreground mb-1">Category</p>
                <p className="font-bold">{listing.category || "N/A"}</p>
              </Card>
              <Card className="p-4">
                <p className="text-sm text-muted-foreground mb-1">Game</p>
                <p className="font-bold">{listing.game || "N/A"}</p>
              </Card>
              <Card className="p-4">
                <p className="text-sm text-muted-foreground mb-1">Item Type</p>
                <p className="font-bold">{listing.itemType || "N/A"}</p>
              </Card>
            </div>

            {listing.status !== "banned" && listing.status !== "sold" && (
              <Card className="p-6 mb-6">
                <h2 className="text-xl font-bold mb-4">Rate this Listing</h2>
                <div className="flex items-center gap-6">
                  <Button
                    variant={userVote === "up" ? "default" : "outline"}
                    className={`flex items-center gap-2 ${userVote === "up" ? "bg-green-600 hover:bg-green-700" : ""}`}
                    onClick={() => handleVote("up")}
                  >
                    <ThumbsUp className="w-5 h-5" />
                    <span className="font-bold">{votes.upvotes}</span>
                  </Button>
                  <Button
                    variant={userVote === "down" ? "default" : "outline"}
                    className={`flex items-center gap-2 ${userVote === "down" ? "bg-red-600 hover:bg-red-700" : ""}`}
                    onClick={() => handleVote("down")}
                  >
                    <ThumbsDown className="w-5 h-5" />
                    <span className="font-bold">{votes.downvotes}</span>
                  </Button>
                  <span className="text-sm text-muted-foreground">{votes.upvotes + votes.downvotes} total votes</span>
                </div>
              </Card>
            )}

            {/* Description */}
            <Card className="p-6 mb-6">
              <h2 className="text-xl font-bold mb-4">Description</h2>
              <p className="text-foreground leading-relaxed">{listing.description || "No description provided"}</p>
            </Card>
          </div>

          {/* Right Column - Seller & Action */}
          <div className="lg:col-span-1">
            {/* Price */}
            <div className="mb-6 p-6 bg-primary text-primary-foreground rounded-lg">
              <p className="text-sm mb-2 opacity-90">Price</p>
              {listing.pricingMode === "per-peso" ? (
                <>
                  <p className="text-4xl font-bold">{listing.price?.toLocaleString() || "0"}</p>
                  <p className="text-sm mt-2 opacity-90">items per ₱1</p>
                </>
              ) : (
                <>
                  <p className="text-4xl font-bold">₱{listing.price?.toLocaleString() || "0"}</p>
                  <p className="text-sm mt-2 opacity-90">per item</p>
                </>
              )}
              <p className="text-sm mt-2 opacity-75">Stock: {listing.stock?.toLocaleString() || "0"} available</p>
            </div>

            {/* Action Buttons */}
            {listing.status !== "banned" && listing.status !== "sold" && (
              <div className="space-y-3 mb-6">
                <Button 
                  size="lg" 
                  className={user?.id === listing.seller.id ? "w-full pointer-events-none opacity-50" : "w-full"}
                  disabled={user?.id === listing.seller.id}
                  onClick={handleBuyNow}
                >
                  <MessageCircle className="w-5 h-5 mr-2" />
                  {user?.id === listing.seller.id ? "Your Listing" : "Buy Now"}
                </Button>
                <div className="grid grid-cols-2 gap-2">
                  <Button 
                    disabled={user?.id === listing.seller.id}
                    size="lg" 
                    variant="outline" 
                    className={user?.id === listing.seller.id ? "w-full bg-transparent pointer-events-none opacity-50" : "w-full bg-transparent"}
                    onClick={() => {
                      const url = typeof window !== "undefined" ? window.location.href : ""
                      navigator.clipboard.writeText(url)
                    }}
                  >
                    <Share2 className="w-5 h-5 mr-2" />
                    Share
                  </Button>
                  <Button
                    size="lg"
                    variant="outline"
                    className={user?.id === listing.seller.id ? "w-full text-destructive bg-transparent pointer-events-none opacity-50" : "w-full text-destructive bg-transparent"}
                    disabled={user?.id === listing.seller.id}
                    onClick={handleReport}
                  >
                    <Flag className="w-5 h-5 mr-2" />
                    Report
                  </Button>
                </div>
              </div>
            )}

            {/* Seller Card */}
            <Card className="p-6">
              <Link href={`/profile/${listing.seller?.id || listing.sellerId}`}>
                <div className="flex items-center gap-4 mb-4 cursor-pointer group">
                  <img
                    src={listing.seller?.profilePicture || "/placeholder.svg"}
                    alt={listing.seller?.username || "Seller"}
                    className="w-16 h-16 rounded-full object-cover group-hover:opacity-80 transition"
                  />
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-lg group-hover:text-primary transition">
                        {listing.seller?.username || "Unknown"}
                      </h3>
                      {listing.seller?.isVerified && <Shield className="w-4 h-4 text-primary" />}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Joined {listing.seller?.joinDate ? new Date(listing.seller.joinDate).toLocaleDateString() : "Unknown"}
                    </p>
                  </div>
                </div>
              </Link>

              {/* Seller Stats */}
              <div className="space-y-3 py-4 border-t border-b">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground flex items-center gap-1">
                    <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                    Vouches
                  </span>
                  <span className="font-bold">{listing.seller?.vouchCount || 0}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Verification</span>
                  <span className="font-bold">{listing.seller?.isVerified ? "Verified" : "Unverified"}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Last Active</span>
                  <span className="font-bold text-sm">
                    {listing.seller?.lastActive ? new Date(listing.seller.lastActive).toLocaleDateString() : "Unknown"}
                  </span>
                </div>
              </div>

              <Link href={`/profile/${listing.seller?.id || listing.sellerId}`}>
                <Button size="sm" variant="outline" className="w-full mt-4 bg-transparent">
                  View Profile
                </Button>
              </Link>
            </Card>

            {/* Listing Info */}
            <Card className="p-6 mt-6">
              <div className="space-y-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    Posted
                  </span>
                  <span>{new Date(listing.createdAt).toLocaleDateString()}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Views</span>
                  <span>{listing.views || 0}</span>
                </div>
              </div>
            </Card>
          </div>
        </div>

        {/* Listing Viewers Section (Owner Only - Elite Feature) */}
        {showViewers && (
          <Card className="mt-8 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <Eye className="w-5 h-5" />
                Who Viewed This Listing
              </h2>
              <Badge variant="secondary" className="flex items-center gap-1">
                <Crown className="w-3 h-3" />
                Elite Feature
              </Badge>
            </div>

            {viewersLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : requiresUpgrade ? (
              <div className="text-center py-12 px-4">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
                  <Crown className="w-8 h-8 text-primary" />
                </div>
                <h3 className="text-lg font-bold mb-2">Upgrade to Elite to View Your Listing Viewers</h3>
                <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                  See who's interested in your listing and reach out to potential buyers proactively. This premium feature is available exclusively to Elite members.
                </p>
                <Link href="/subscriptions">
                  <Button size="lg">
                    <Crown className="w-4 h-4 mr-2" />
                    Upgrade to Elite
                  </Button>
                </Link>
              </div>
            ) : viewers.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Eye className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No viewers yet</p>
              </div>
            ) : (
              <>
                <div className="flex flex-col sm:flex-row gap-3 mb-4">
                  <div className="flex-1">
                    <Input
                      placeholder="Search by username..."
                      value={viewerSearch}
                      onChange={(e) => setViewerSearch(e.target.value)}
                      className="w-full"
                    />
                  </div>
                  <select
                    value={viewerSort}
                    onChange={(e) => setViewerSort(e.target.value)}
                    className="px-3 py-2 border rounded-md bg-background min-w-[150px]"
                  >
                    <option value="newest">Newest First</option>
                    <option value="oldest">Oldest First</option>
                  </select>
                </div>
                <div className="space-y-3">
                  {viewers
                    .filter((viewer) =>
                      viewer.username.toLowerCase().includes(viewerSearch.toLowerCase())
                    )
                    .sort((a, b) => {
                      if (viewerSort === "newest") {
                        return new Date(b.viewedAt).getTime() - new Date(a.viewedAt).getTime()
                      } else {
                        return new Date(a.viewedAt).getTime() - new Date(b.viewedAt).getTime()
                      }
                    })
                    .map((viewer) => (
                  <div key={viewer.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition">
                    <Link href={`/profile/${viewer.id}`} className="flex items-center gap-3 flex-1">
                      <img
                        src={viewer.profilePicture || "/placeholder.svg"}
                        alt={viewer.username}
                        className="w-12 h-12 rounded-full object-cover"
                      />
                      <div>
                        <p className="font-semibold hover:text-primary transition">{viewer.username}</p>
                        <p className="text-sm text-muted-foreground">
                          Viewed {new Date(viewer.viewedAt).toLocaleString()}
                        </p>
                      </div>
                    </Link>
                    <Button
                      size="sm"
                      onClick={() => handleNudgeViewer(viewer.id, viewer.username)}
                      disabled={nudgingViewerId === viewer.id || (nudgeCooldowns[viewer.id] && new Date() < nudgeCooldowns[viewer.id])}
                    >
                      {nudgingViewerId === viewer.id ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <span className="mr-2">👋</span>
                      )}
                      {nudgeCooldowns[viewer.id] && new Date() < nudgeCooldowns[viewer.id]
                        ? `${Math.ceil((nudgeCooldowns[viewer.id].getTime() - Date.now()) / 60000)}m`
                        : "Nudge"}
                    </Button>
                  </div>
                ))}
                </div>
              </>
            )}
          </Card>
        )}

        {/* Safety Tips Section */}
        <Card className="mt-12 p-6 bg-secondary/5 border-secondary">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Safety Tips
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div>
              <p className="font-semibold mb-2">Ask for Proof</p>
              <p className="text-muted-foreground">
                Always ask the seller for item screenshots or video proof before making any payment.
              </p>
            </div>
            <div>
              <p className="font-semibold mb-2">Agree on Terms</p>
              <p className="text-muted-foreground">
                Discuss payment method, delivery method, and timeline before proceeding.
              </p>
            </div>
            <div>
              <p className="font-semibold mb-2">Vouch After Trade</p>
              <p className="text-muted-foreground">
                Once trade is complete, vouch for the seller to help build community trust.
              </p>
            </div>
          </div>
        </Card>
        </>
        )}

        {/* Quantity Selection Modal */}
        <Dialog open={showQuantityModal} onOpenChange={setShowQuantityModal}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Select Quantity</DialogTitle>
              <DialogDescription>
                How many units would you like to purchase?
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <label htmlFor="quantity" className="text-sm font-medium">
                  Quantity
                </label>
                <Input
                  id="quantity"
                  type="number"
                  min="1"
                  max={listing?.stock}
                  value={buyQuantity}
                  onChange={(e) => {
                    setBuyQuantity(e.target.value)
                    if (quantityError) setQuantityError("")
                  }}
                  className={`w-full ${quantityError ? "border-red-500 focus-visible:ring-red-500" : ""}`}
                />
                {quantityError && (
                  <p className="text-sm text-red-500">{quantityError}</p>
                )}
                <p className="text-xs text-muted-foreground">
                  Available stock: {listing?.stock}
                </p>
              </div>
              
              <div className="p-4 bg-muted rounded-lg space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">
                    {listing?.pricingMode === "per-peso" ? "Items per ₱1:" : "Price per unit:"}
                  </span>
                  <span className="font-medium">
                    {listing?.pricingMode === "per-peso" 
                      ? `${listing?.price.toLocaleString()} items`
                      : `₱${listing?.price.toLocaleString()}`
                    }
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Quantity:</span>
                  <span className="font-medium">{buyQuantity}</span>
                </div>
                <div className="flex justify-between text-base font-bold pt-2 border-t">
                  <span>Total Cost:</span>
                  <span>
                    ₱{listing?.pricingMode === "per-peso"
                      ? Math.ceil(parseInt(buyQuantity || "1") / listing?.price).toLocaleString()
                      : (listing?.price * parseInt(buyQuantity || "1")).toLocaleString()
                    }
                  </span>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowQuantityModal(false)}>
                Cancel
              </Button>
              <Button onClick={handleConfirmQuantity}>
                Continue to Chat
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Report Modal */}
        <Dialog open={showReportModal} onOpenChange={setShowReportModal}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Report Listing</DialogTitle>
              <DialogDescription>
                Help us keep the marketplace safe by reporting suspicious or inappropriate content.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <label htmlFor="reportReason" className="text-sm font-medium">
                  Reason for Report *
                </label>
                <select
                  id="reportReason"
                  value={reportReason}
                  onChange={(e) => setReportReason(e.target.value)}
                  className="w-full px-3 py-2 border rounded-md bg-background"
                >
                  <option value="">Select a reason...</option>
                  <option value="Scam">Scam or Fraud</option>
                  <option value="Fake Items">Fake or Counterfeit Items</option>
                  <option value="Inappropriate">Inappropriate Content</option>
                  <option value="Spam">Spam</option>
                  <option value="Overpriced">Overpriced</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              
              <div className="space-y-2">
                <label htmlFor="reportDetails" className="text-sm font-medium">
                  Additional Details (Optional)
                </label>
                <Textarea
                  id="reportDetails"
                  placeholder="Provide any additional information that might help us review this report..."
                  value={reportDetails}
                  onChange={(e) => setReportDetails(e.target.value)}
                  rows={4}
                />
              </div>
            </div>
            <DialogFooter>
              <Button 
                variant="outline" 
                onClick={() => {
                  setShowReportModal(false)
                  setReportReason("")
                  setReportDetails("")
                }}
                disabled={reportLoading}
              >
                Cancel
              </Button>
              <Button 
                onClick={handleSubmitReport}
                disabled={!reportReason || reportLoading}
              >
                {reportLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  "Submit Report"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </main>
  )
}
