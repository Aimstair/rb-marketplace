"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Star, MessageCircle, Share2, Flag, Shield, Calendar, ThumbsUp, ThumbsDown, Loader2, Copy, Check } from "lucide-react"
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
import { getListing } from "@/app/actions/listings"
import { toggleListingVote, reportListing } from "@/app/actions/listings"
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
    if (!isReady) return

    const fetchListing = async () => {
      try {
        setLoading(true)
        setError(null)
        const result = await getListing(id)
        if (result.success && result.listing) {
          setListing(result.listing)
          const parsed = parseCurrencyDescription(result.listing.description)
          setCurrencyData(parsed)
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
  }, [id, isReady])

  const [selectedImage, setSelectedImage] = useState<string>("")
  const [isSaved, setIsSaved] = useState(false)
  const [userVote, setUserVote] = useState<"up" | "down" | null>(null)
  const [votes, setVotes] = useState({ upvotes: 0, downvotes: 0 })
  const [showAmountDialog, setShowAmountDialog] = useState(false)
  const [showReportDialog, setShowReportDialog] = useState(false)
  const [currencyAmount, setCurrencyAmount] = useState("")
  const [reportReason, setReportReason] = useState("")
  const [reportDetails, setReportDetails] = useState("")
  const [isVoting, setIsVoting] = useState(false)
  const [isReporting, setIsReporting] = useState(false)
  const [copied, setCopied] = useState(false)

  // Initialize selectedImage and votes when listing loads
  useEffect(() => {
    if (listing) {
      setSelectedImage(listing.image || "/placeholder.svg")
      setVotes({
        upvotes: listing.upvotes || 0,
        downvotes: listing.downvotes || 0,
      })
    }
  }, [listing])

  useEffect(() => {
    if (searchParams.get("contact") === "true") {
      setShowAmountDialog(true)
    }
  }, [searchParams])

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
      const result = await toggleListingVote(id, type)
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
    if (!amount || amount <= 0) {
      toast({
        title: "Invalid Amount",
        description: "Please enter a valid amount",
        variant: "destructive",
      })
      return
    }
    if (amount > currencyData.stock) {
      toast({
        title: "Insufficient Stock",
        description: `Only ${currencyData.stock.toLocaleString()} ${currencyData.currencyType} available`,
        variant: "destructive",
      })
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
      const result = await reportListing(id, reportReason, reportDetails)
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

  if (loading) {
    return (
      <main className="min-h-screen bg-background">
        <Navigation />
        <div className="container mx-auto px-4 py-8 flex items-center justify-center h-[600px]">
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
        <div className="container mx-auto px-4 py-8 flex items-center justify-center h-[600px]">
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

      <div className="container mx-auto px-4 py-8">
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

            {/* Description */}
            <Card className="p-6 mb-6">
              <h2 className="text-xl font-bold mb-4">Description</h2>
              <p className="text-foreground leading-relaxed whitespace-pre-wrap">{listing?.description || "No description available"}</p>
              {currencyData.notes && (
                <div className="mt-4 p-4 bg-muted/50 rounded-lg">
                  <p className="text-sm font-semibold mb-1">Additional Notes:</p>
                  <p className="text-sm text-muted-foreground">{currencyData.notes}</p>
                </div>
              )}
            </Card>

            {/* Delivery Methods */}
            <Card className="p-6 mb-6">
              <h2 className="text-xl font-bold mb-4">Listing Information</h2>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Posted:</span>
                  <span className="font-medium">
                    {listing?.createdAt ? new Date(listing.createdAt).toLocaleDateString() : "Recently"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Views:</span>
                  <span className="font-medium">{listing?.views || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Status:</span>
                  <Badge variant={listing?.status === "available" ? "default" : "secondary"}>
                    {listing?.status || "Available"}
                  </Badge>
                </div>
              </div>
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

            <div className="space-y-3 mb-6">
              <Button size="lg" className="w-full" onClick={handleContactSeller} disabled={!user}>
                <MessageCircle className="w-5 h-5 mr-2" />
                Buy Now
              </Button>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant="outline"
                  onClick={handleShare}
                  disabled={copied}
                >
                  {copied ? <Check className="w-4 h-4 mr-1" /> : <Share2 className="w-4 h-4 mr-1" />}
                  {copied ? "Copied" : "Share"}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setShowReportDialog(true)}
                  className="text-red-600 hover:text-red-700"
                >
                  <Flag className="w-4 h-4 mr-1" />
                  Report
                </Button>
              </div>
            </div>

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
                  <p className="text-sm text-muted-foreground">Trusted Seller</p>
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

              <Button 
                size="sm" 
                variant="outline" 
                className="w-full mt-4" 
                onClick={() => router.push(`/profile/${listing?.seller?.id}`)} 
                disabled={!user}
              >
                <MessageCircle className="w-4 h-4 mr-1" />
                View Profile
              </Button>
            </Card>

          </div>
        </div>
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
                onChange={(e) => setCurrencyAmount(e.target.value)}
                className="mt-2"
                max={currencyData.stock}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Available: {currencyData.stock.toLocaleString()} {currencyData.currencyType}
              </p>
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
