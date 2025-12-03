"use client"

import { useState, useEffect, use } from "react"
import { useRouter } from "next/navigation"
import { Star, Share2, Flag, MessageCircle, Check, Calendar, Shield, ThumbsUp, ThumbsDown, X } from "lucide-react"
import Navigation from "@/components/navigation"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"
import { useAuth } from "@/lib/auth-context"
import { getListing, toggleListingVote, reportListing } from "@/app/actions/listings"
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

interface ListingDetailPageProps {
  params: Promise<{ id: string }>
}

export default function ListingDetailPage({ params }: ListingDetailPageProps) {
  // Unwrap params at the very top
  const { id } = use(params)
  
  // ALL hooks declared before any conditional logic
  const { user } = useAuth()
  const router = useRouter()
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
      } catch (err) {
        console.error("Failed to fetch listing:", err)
        setError("Failed to load listing")
      } finally {
        setLoading(false)
      }
    }

    fetchListing()
  }, [id])

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
        const result = await toggleListingVote(id, type)
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

  const handleMessageSeller = () => {
    requireAuth(() => {
      if (!listing) return
      console.log("Attempting to message seller:", { 
        seller: listing.seller, 
        sellerId: listing.seller?.id || listing.sellerId 
      })
      const params = new URLSearchParams({
        sellerId: listing.seller?.id || listing.sellerId,
        itemId: listing.id,
        itemTitle: listing.title,
      })
      router.push(`/messages?${params.toString()}`)
    })
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
      const result = await reportListing(id, reportReason, reportDetails)
      if (result.success) {
        alert("Report submitted successfully. Thank you for helping keep our community safe!")
        setShowReportModal(false)
        setReportReason("")
        setReportDetails("")
      } else {
        alert(result.error || "Failed to submit report")
      }
    } catch (error) {
      console.error("Error submitting report:", error)
      alert("Failed to submit report")
    } finally {
      setReportLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-background">
      <Navigation />

      <div className="container mx-auto px-4 py-8">
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
            <div className="grid grid-cols-2 gap-4 mb-6">
              <Card className="p-4">
                <p className="text-sm text-muted-foreground mb-1">Game</p>
                <p className="font-bold">{listing.game || "N/A"}</p>
              </Card>
              <Card className="p-4">
                <p className="text-sm text-muted-foreground mb-1">Category</p>
                <p className="font-bold">{listing.category || "N/A"}</p>
              </Card>
              <Card className="p-4">
                <p className="text-sm text-muted-foreground mb-1">Item Type</p>
                <p className="font-bold">{listing.itemType || "N/A"}</p>
              </Card>
              <Card className="p-4">
                <p className="text-sm text-muted-foreground mb-1">Condition</p>
                <p className="font-bold">{listing.condition || "New"}</p>
              </Card>
            </div>

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
              <p className="text-4xl font-bold">₱{listing.price?.toLocaleString() || "0"}</p>
              <p className="text-sm mt-2 opacity-75">Status: {listing.status || "available"}</p>
            </div>

            {/* Action Buttons */}
            <div className="space-y-3 mb-6">
              <Button size="lg" className="w-full" onClick={handleMessageSeller}>
                <MessageCircle className="w-5 h-5 mr-2" />
                Message Seller
              </Button>
              <Button size="lg" variant="outline" className="w-full bg-transparent" onClick={handleSaveItem}>
                {isSaved ? "★ Saved" : "☆ Save Item"}
              </Button>
              <Button size="lg" variant="outline" className="w-full bg-transparent">
                <Share2 className="w-5 h-5 mr-2" />
                Share
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="w-full text-destructive bg-transparent"
                onClick={handleReport}
              >
                <Flag className="w-5 h-5 mr-2" />
                Report
              </Button>
            </div>

            {/* Seller Card */}
            <Card className="p-6">
              <Link href={`/profile/${listing.sellerId}`}>
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

              <Button size="sm" variant="outline" className="w-full mt-4 bg-transparent">
                View Profile
              </Button>
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
      </div>
    </main>
  )
}
