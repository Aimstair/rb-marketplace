"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { Star, MessageCircle, Share2, Flag, Shield, Calendar, ThumbsUp, ThumbsDown, Loader2, Copy, Check, Eye, Crown, X } from "lucide-react"
import Navigation from "@/components/navigation"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useAuth } from "@/lib/auth-context"
import { getListing, toggleListingVote, reportListing, getListingViewers, nudgeViewer } from "@/app/actions/listings"
import { useToast } from "@/hooks/use-toast"
import { Textarea } from "@/components/ui/textarea"

interface ParsedCurrency {
  currencyType: string
  ratePerPeso: number
  stock: number
  minOrder?: number
  maxOrder?: number
  notes?: string
}

// Helper function to parse currency details from description
function parseCurrencyDescription(description: string | null): ParsedCurrency {
  if (!description) {
    return {
      currencyType: "Unknown",
      ratePerPeso: 0,
      stock: 0,
    }
  }

  const lines = description.split("\n")
  const result: ParsedCurrency = {
    currencyType: "Unknown",
    ratePerPeso: 0,
    stock: 0,
  }

  for (const line of lines) {
    if (line.startsWith("Currency:")) {
      result.currencyType = line.replace("Currency:", "").trim()
    } else if (line.startsWith("Rate:")) {
      const match = line.match(/₱([\d.]+)/)
      result.ratePerPeso = match ? parseFloat(match[1]) : 0
    } else if (line.startsWith("Stock:")) {
      result.stock = parseInt(line.replace("Stock:", "").trim()) || 0
    } else if (line.startsWith("Min Order:")) {
      result.minOrder = parseInt(line.replace("Min Order:", "").trim()) || 0
    } else if (line.startsWith("Max Order:")) {
      result.maxOrder = parseInt(line.replace("Max Order:", "").trim()) || 0
    } else if (line.startsWith("Notes:")) {
      result.notes = line.replace("Notes:", "").trim()
    }
  }

  return result
}

interface CurrencyListingDetailContentProps {
  params: Promise<{ id: string }>
}

function CurrencyListingDetailContent({ params }: CurrencyListingDetailContentProps) {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { user } = useAuth()
  const { toast } = useToast()
  const [id, setId] = useState<string>("")
  const [isReady, setIsReady] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [listing, setListing] = useState<any>(null)
  const [currencyData, setCurrencyData] = useState<ParsedCurrency>({
    currencyType: "Unknown",
    ratePerPeso: 0,
    stock: 0,
  })

  // Initialize id from params
  useEffect(() => {
    ;(async () => {
      const { id: resolvedId } = await params
      setId(resolvedId)
      setIsReady(true)
    })()
  }, [params])

  // Fetch listing after id is ready
  useEffect(() => {
    if (!isReady || !id) return

    const fetchListing = async () => {
      try {
        setLoading(true)
        setError(null)
        const result = await getListing(id)
        if (result.success && result.listing) {
          setListing(result.listing)
          // Use data from getListing response directly
          setCurrencyData({
            currencyType: result.listing.itemType, // itemType contains gameCurrency.displayName
            ratePerPeso: result.listing.price, // price contains ratePerPeso for currency listings
            stock: result.listing.stock,
            minOrder: result.listing.minOrder,
            maxOrder: result.listing.maxOrder,
            notes: result.listing.description || undefined,
          })

          // Check if user is the owner and fetch viewers
          if (user && result.listing.seller?.id === user.id) {
            setShowViewers(true)
            fetchViewers()
          }
        } else {
          setError(result.error || "Listing not found")
        }
      } catch (err) {
        console.error("Failed to load listing:", err)
        setError("Failed to load listing")
      } finally {
        setLoading(false)
      }
    }

    fetchListing()
  }, [id, isReady, user])

  const [selectedImage, setSelectedImage] = useState<string>("")
  const [isSaved, setIsSaved] = useState(false)
  const [userVote, setUserVote] = useState<"up" | "down" | null>(null)
  const [votes, setVotes] = useState({ upvotes: 0, downvotes: 0 })
  const [showAmountDialog, setShowAmountDialog] = useState(false)
  const [showReportDialog, setShowReportDialog] = useState(false)
  const [currencyAmount, setCurrencyAmount] = useState("")
  const [amountError, setAmountError] = useState("")
  const [reportReason, setReportReason] = useState("")
  const [reportDetails, setReportDetails] = useState("")
  const [isVoting, setIsVoting] = useState(false)
  const [isReporting, setIsReporting] = useState(false)
  const [copied, setCopied] = useState(false)
  const [viewers, setViewers] = useState<any[]>([])
  const [viewersLoading, setViewersLoading] = useState(false)
  const [requiresUpgrade, setRequiresUpgrade] = useState(false)
  const [showViewers, setShowViewers] = useState(false)
  const [viewerSearch, setViewerSearch] = useState("")
  const [viewerSort, setViewerSort] = useState("newest")
  const [nudgeCooldowns, setNudgeCooldowns] = useState<Record<string, Date>>({})
  const [nudgingViewerId, setNudgingViewerId] = useState<string | null>(null)

  // Initialize selectedImage, votes, and userVote when listing loads
  useEffect(() => {
    if (listing) {
      setSelectedImage(listing.image || "/placeholder.svg")
      setVotes({
        upvotes: listing.upvotes || 0,
        downvotes: listing.downvotes || 0,
      })
      // Initialize user's vote from database
      if (listing.userVote) {
        setUserVote(listing.userVote.toLowerCase() as "up" | "down")
      } else {
        setUserVote(null)
      }
    }
  }, [listing])

  useEffect(() => {
    if (searchParams.get("contact") === "true") {
      setShowAmountDialog(true)
    }
  }, [searchParams])

  const fetchViewers = async () => {
    if (!id) return
    
    setViewersLoading(true)
    try {
      const result = await getListingViewers(id, "CURRENCY")
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

  const handleVote = async (type: "up" | "down") => {
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please log in to vote",
        variant: "destructive",
      })
      return
    }

    setIsVoting(true)
    try {
      const result = await toggleListingVote(id, type, "CURRENCY")
      if (result.success) {
        setVotes({
          upvotes: result.upvotes || 0,
          downvotes: result.downvotes || 0,
        })
        // Toggle user vote
        if (userVote === type) {
          setUserVote(null)
        } else {
          setUserVote(type as "up" | "down")
        }
        toast({
          title: "Vote Recorded",
          description: `Your ${type} vote has been recorded`,
        })
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to record vote",
          variant: "destructive",
        })
      }
    } catch (err) {
      console.error("Error voting:", err)
      toast({
        title: "Error",
        description: "Failed to record vote",
        variant: "destructive",
      })
    } finally {
      setIsVoting(false)
    }
  }

  const calculateCost = (amount: string) => {
    const numAmount = Number.parseInt(amount) || 0
    return Math.ceil(numAmount / currencyData.ratePerPeso)
  }

  const handleProceedToContact = () => {
    const amount = Number.parseInt(currencyAmount)
    setAmountError("")
    
    if (!amount || amount <= 0) {
      setAmountError("Please enter a valid amount")
      return
    }
    if (amount > currencyData.stock) {
      setAmountError(`Only ${currencyData.stock.toLocaleString()} ${currencyData.currencyType} available`)
      return
    }
    if (currencyData.minOrder && amount < currencyData.minOrder) {
      setAmountError(`Minimum order is ${currencyData.minOrder.toLocaleString()} ${currencyData.currencyType}`)
      return
    }
    if (currencyData.maxOrder && amount > currencyData.maxOrder) {
      setAmountError(`Maximum order is ${currencyData.maxOrder.toLocaleString()} ${currencyData.currencyType}`)
      return
    }
    const cost = calculateCost(currencyAmount)
    const msgParams = new URLSearchParams({
      sellerId: listing.seller.id,
      sellerName: listing.seller.username,
      sellerAvatar: listing.seller.profilePicture || "",
      itemId: listing.id,
      itemTitle: `${currencyData.ratePerPeso} ${currencyData.currencyType} per ₱1`,
      itemPrice: listing.price.toString(),
      itemImage: listing.image,
      type: "currency",
      currencyType: currencyData.currencyType,
      amount: amount.toString(),
      cost: cost.toString(),
    })
    router.push(`/messages?${msgParams.toString()}`)
  }

  const handleCloseDialog = () => {
    setShowAmountDialog(false)
    setCurrencyAmount("")
    setAmountError("")
    router.replace(`/currency/${id}`)
  }

  const handleContactSeller = () => {
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please log in to contact the seller",
        variant: "destructive",
      })
      return
    }
    setShowAmountDialog(true)
  }

  const handleShare = async () => {
    const url = typeof window !== "undefined" ? window.location.href : ""
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      toast({
        title: "Copied",
        description: "Listing URL copied to clipboard",
      })
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to copy URL",
        variant: "destructive",
      })
    }
  }

  const handleReport = async () => {
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please log in to report a listing",
        variant: "destructive",
      })
      return
    }

    if (!reportReason) {
      toast({
        title: "Missing Information",
        description: "Please select a reason for the report",
        variant: "destructive",
      })
      return
    }

    setIsReporting(true)
    try {
      const result = await reportListing(id, reportReason, reportDetails, "CURRENCY")
      if (result.success) {
        toast({
          title: "Report Submitted",
          description: "Thank you for reporting. Our team will review this.",
        })
        setShowReportDialog(false)
        setReportReason("")
        setReportDetails("")
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to submit report",
          variant: "destructive",
        })
      }
    } catch (err) {
      console.error("Error reporting:", err)
      toast({
        title: "Error",
        description: "Failed to submit report",
        variant: "destructive",
      })
    } finally {
      setIsReporting(false)
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
      const result = await nudgeViewer(viewerId, listing.id, "CURRENCY", `${currencyData.ratePerPeso} ${currencyData.currencyType} per ₱1`)
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

  if (loading) {
    return (
      <main className="min-h-screen bg-background">
        <Navigation />
        <div className="container max-w-[1920px] mx-auto px-6 py-8 flex items-center justify-center h-[600px]">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="w-12 h-12 animate-spin text-primary" />
            <p className="text-muted-foreground">Loading listing...</p>
          </div>
        </div>
      </main>
    )
  }

  if (error || !listing) {
    return (
      <main className="min-h-screen bg-background">
        <Navigation />
        <div className="container max-w-[1920px] mx-auto px-6 py-8 flex items-center justify-center h-[600px]">
          <div className="flex flex-col items-center gap-4">
            <p className="text-lg font-semibold text-destructive">{error || "Listing not found"}</p>
            <Button onClick={() => router.push("/currency")}>Back to Listings</Button>
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-background">
      <Navigation />

      <div className="container max-w-[1920px] mx-auto px-6 py-8">
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
                    This currency is no longer available for purchase. Check out other listings from this seller or browse the marketplace for similar offers.
                  </p>
                </div>
              </div>
            </div>
          </Card>
        )}
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Images & Details */}
          <div className="lg:col-span-2">
            {/* Main Image */}
            <div className="mb-6">
              <div className="relative w-full bg-muted rounded-lg overflow-hidden mb-4">
                <img
                  src={selectedImage || "/placeholder.svg"}
                  alt={`${currencyData.currencyType}`}
                  className="w-full h-96 object-cover"
                />
                <Badge className="absolute top-4 left-4 bg-primary text-primary-foreground">{listing?.condition || "New"}</Badge>
              </div>

              {/* Thumbnail Gallery */}
              {listing?.images && listing.images.length > 0 && (
                <div className="flex gap-2">
                  <button
                    onClick={() => setSelectedImage(listing.image || "/placeholder.svg")}
                    className={`w-20 h-20 rounded-lg overflow-hidden border-2 transition ${
                      selectedImage === listing.image ? "border-primary" : "border-border hover:border-primary/50"
                    }`}
                  >
                    <img
                      src={listing.image || "/placeholder.svg"}
                      alt="Main"
                      className="w-full h-full object-cover"
                    />
                  </button>
                </div>
              )}
            </div>

            {/* Currency Info Cards */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              <Card className="p-4">
                <p className="text-sm text-muted-foreground mb-1">Currency Type</p>
                <p className="font-bold">{currencyData.currencyType}</p>
              </Card>
              <Card className="p-4">
                <p className="text-sm text-muted-foreground mb-1">Rate</p>
                <p className="font-bold text-primary">
                  {currencyData.ratePerPeso} {currencyData.currencyType} per ₱1
                </p>
              </Card>
              <Card className="p-4">
                <p className="text-sm text-muted-foreground mb-1">Stock Available</p>
                <p className="font-bold">
                  {currencyData.stock.toLocaleString()} {currencyData.currencyType}
                </p>
              </Card>
              <Card className="p-4">
                <p className="text-sm text-muted-foreground mb-1">Status</p>
                <Badge variant={listing?.status === "available" ? "default" : "secondary"}>
                  {listing?.status || "Available"}
                </Badge>
              </Card>
            </div>

            {/* Rate Listing */}
            {listing.status !== "banned" && listing.status !== "sold" && (
              <Card className="p-6 mb-6">
                <h2 className="text-xl font-bold mb-4">Rate this Listing</h2>
                <div className="flex items-center gap-6">
                  <Button
                    variant={userVote === "up" ? "default" : "outline"}
                    className={`flex items-center gap-2 ${userVote === "up" ? "bg-green-600 hover:bg-green-700" : ""}`}
                    onClick={() => handleVote("up")}
                    disabled={isVoting}
                  >
                    {isVoting ? <Loader2 className="w-5 h-5 animate-spin" /> : <ThumbsUp className="w-5 h-5" />}
                    <span className="font-bold">{votes.upvotes}</span>
                  </Button>
                  <Button
                    variant={userVote === "down" ? "default" : "outline"}
                    className={`flex items-center gap-2 ${userVote === "down" ? "bg-red-600 hover:bg-red-700" : ""}`}
                    onClick={() => handleVote("down")}
                    disabled={isVoting}
                  >
                    {isVoting ? <Loader2 className="w-5 h-5 animate-spin" /> : <ThumbsDown className="w-5 h-5" />}
                    <span className="font-bold">{votes.downvotes}</span>
                  </Button>
                  <span className="text-sm text-muted-foreground">{votes.upvotes + votes.downvotes} total votes</span>
                </div>
              </Card>
            )}

            {/* Description */}
            <Card className="p-6 mb-6">
              <h2 className="text-xl font-bold mb-4">Description</h2>
              <p className="text-foreground leading-relaxed">{currencyData.notes || "No description provided"}</p>
            </Card>

            
          </div>
          
          

          {/* Right Column - Seller & Action */}
          <div className="lg:col-span-1">
            <div className="mb-6 p-6 bg-primary text-primary-foreground rounded-lg">
              <p className="text-sm mb-2 opacity-90">Exchange Rate</p>
              <p className="text-4xl font-bold">
                {currencyData.ratePerPeso} {currencyData.currencyType}
              </p>
              <p className="text-lg mt-1">per ₱1 PHP</p>
              <p className="text-sm mt-3 opacity-75">Stock: {currencyData.stock.toLocaleString()}</p>
            </div>

            {listing.status !== "banned" && listing.status !== "sold" && (
              <div className="space-y-3 mb-6">
                <Button 
                  size="lg" 
                  className={user?.id === listing.seller.id ? "w-full pointer-events-none opacity-50" : "w-full"}
                  onClick={handleContactSeller} 
                  disabled={!user || listing.seller.id === listing?.sellerId}
                >
                  <MessageCircle className="w-5 h-5 mr-2" />
                  {user?.id === listing.seller.id ? "Your Listing" : "Buy Now"}
                </Button>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    variant="outline"
                    onClick={handleShare}
                    disabled={copied || user?.id === listing.seller.id}
                    className={copied || user?.id === listing.seller.id ? "pointer-events-none opacity-50" : ""}
                  >
                    {copied ? <Check className="w-4 h-4 mr-1" /> : <Share2 className="w-4 h-4 mr-1" />}
                    {copied ? "Copied" : "Share"}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setShowReportDialog(true)}
                    className={user?.id === listing.seller.id ? "text-red-600 hover:text-red-700 pointer-events-none opacity-50" : "text-red-600 hover:text-red-700"}
                    disabled={user?.id === listing.seller.id}
                  >
                    <Flag className="w-4 h-4 mr-1" />
                    Report
                  </Button>
                </div>
              </div>
            )}

            {/* Seller Card */}
            <Card className="p-6">
              <div className="flex items-center gap-4 mb-4">
                <img
                  src={listing?.seller?.profilePicture || "/placeholder.svg"}
                  alt={listing?.seller?.username || "Seller"}
                  className="w-16 h-16 rounded-full object-cover"
                />
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-lg">{listing?.seller?.username || "Unknown"}</h3>
                    {listing?.seller?.verified && <Shield className="w-4 h-4 text-primary" />}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Joined {listing.seller?.joinDate ? new Date(listing.seller.joinDate).toLocaleDateString() : "Unknown"}
                  </p>
                </div>
              </div>

              {/* Seller Stats */}
              <div className="space-y-3 py-4 border-t border-b">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground flex items-center gap-1">
                    <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                    Vouches
                  </span>
                  <span className="font-bold">{listing?.seller?.vouchCount || 0}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Listings</span>
                  <span className="font-bold">{listing?.seller?.listings || 0}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Member Since</span>
                  <span className="text-sm font-medium">
                    {listing?.seller?.joinDate
                      ? new Date(listing.seller.joinDate).toLocaleDateString()
                      : "Recently"}
                  </span>
                </div>
              </div>

              <Link href={`/profile/${listing?.seller?.id || listing?.sellerId}`}>
                <Button 
                  size="sm" 
                  variant="outline" 
                  className="w-full mt-4"
                >
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
      </div>

      {/* Purchase Dialog */}
      <Dialog
        open={showAmountDialog}
        onOpenChange={(open) => {
          if (!open) handleCloseDialog()
          else setShowAmountDialog(true)
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Purchase {currencyData.currencyType}</DialogTitle>
            <DialogDescription>Enter how much {currencyData.currencyType} you would like to buy</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="amount">Amount of {currencyData.currencyType}</Label>
              <Input
                id="amount"
                type="number"
                placeholder={`Enter amount (max ${currencyData.stock.toLocaleString()})`}
                value={currencyAmount}
                onChange={(e) => {
                  setCurrencyAmount(e.target.value)
                  setAmountError("")
                }}
                className={`mt-2 ${amountError ? "border-red-500" : ""}`}
                max={currencyData.stock}
              />
              {amountError && (
                <p className="text-sm text-red-500 mt-1">{amountError}</p>
              )}
              <div className="text-xs text-muted-foreground mt-1 space-y-1">
                <p>Available: {currencyData.stock.toLocaleString()} {currencyData.currencyType}</p>
                {currencyData.minOrder && (
                  <p>Minimum Order: {currencyData.minOrder.toLocaleString()} {currencyData.currencyType}</p>
                )}
                {currencyData.maxOrder && (
                  <p>Maximum Order: {currencyData.maxOrder.toLocaleString()} {currencyData.currencyType}</p>
                )}
              </div>
            </div>

            {currencyAmount && Number.parseInt(currencyAmount) > 0 && (
              <div className="p-4 bg-muted/50 rounded-lg">
                <div className="flex justify-between mb-2">
                  <span className="text-muted-foreground">Amount:</span>
                  <span className="font-medium">
                    {Number.parseInt(currencyAmount).toLocaleString()} {currencyData.currencyType}
                  </span>
                </div>
                <div className="flex justify-between mb-2">
                  <span className="text-muted-foreground">Rate:</span>
                  <span className="font-medium">
                    {currencyData.ratePerPeso} {currencyData.currencyType} per ₱1
                  </span>
                </div>
                <div className="flex justify-between pt-2 border-t">
                  <span className="font-medium">Total Cost:</span>
                  <span className="font-bold text-primary text-lg">
                    ₱{calculateCost(currencyAmount).toLocaleString()}
                  </span>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleCloseDialog}>
              Cancel
            </Button>
            <Button onClick={handleProceedToContact} disabled={!currencyAmount || Number.parseInt(currencyAmount) <= 0}>
              <MessageCircle className="w-4 h-4 mr-2" />
              Continue to Chat
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Report Dialog */}
      <Dialog open={showReportDialog} onOpenChange={setShowReportDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Report Listing</DialogTitle>
            <DialogDescription>Help us keep the marketplace safe by reporting this listing</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="reason">Reason for Report *</Label>
              <select
                id="reason"
                value={reportReason}
                onChange={(e) => setReportReason(e.target.value)}
                className="w-full mt-2 px-3 py-2 border border-input rounded-md bg-background text-foreground"
              >
                <option value="">Select a reason...</option>
                <option value="scam">Scam or Fraud</option>
                <option value="inappropriate">Inappropriate Content</option>
                <option value="fake">Fake or Misleading</option>
                <option value="spam">Spam</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <Label htmlFor="details">Additional Details</Label>
              <Textarea
                id="details"
                placeholder="Please provide any additional information..."
                value={reportDetails}
                onChange={(e) => setReportDetails(e.target.value)}
                className="mt-2"
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowReportDialog(false)}
              disabled={isReporting}
            >
              Cancel
            </Button>
            <Button
              onClick={handleReport}
              disabled={isReporting || !reportReason}
            >
              {isReporting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Submit Report
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      
    </main>
  )
}

export default function CurrencyListingDetailPage({ params }: CurrencyListingDetailContentProps) {
  return <CurrencyListingDetailContent params={params} />
}
