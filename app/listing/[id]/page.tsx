"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Star, Share2, Flag, MessageCircle, Check, Calendar, Shield, ThumbsUp, ThumbsDown } from "lucide-react"
import Navigation from "@/components/navigation"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"
import { useAuth } from "@/lib/auth-context"

// Mock listing data with upvotes/downvotes
const mockListingDetails = {
  1: {
    id: 1,
    title: "Golden Dragon Pet",
    description:
      "Golden Dragon Pet from Adopt Me! This is a rare pet that has been well-maintained. Perfect condition, never traded or scammed. Comes with proof of legitimacy.",
    price: 2500,
    image: "/golden-dragon-pet-roblox.jpg",
    images: ["/golden-dragon-pet-roblox.jpg", "/placeholder.svg?key=img1", "/placeholder.svg?key=img2"],
    seller: {
      id: 1,
      username: "NinjaTrader",
      avatar: "/user-avatar-profile-trading.jpg",
      vouch: 42,
      joinDate: "Jan 2023",
      listings: 28,
      verified: true,
      responseRate: 98,
      lastActive: "5 minutes ago",
    },
    game: "Adopt Me",
    category: "Pets",
    condition: "New",
    status: "available",
    postedDate: "2 days ago",
    views: 342,
    interestedBuyers: 12,
    details: {
      itemType: "Legendary Pet",
      rarity: "Legendary",
      tradeable: true,
      ageRestriction: "None",
    },
    paymentMethods: ["GCash", "PayPal", "Robux Gift Cards"],
    proof: {
      hasScreenshots: true,
      hasVideo: true,
      hasRobloxLink: true,
    },
    upvotes: 67,
    downvotes: 3,
  },
}

export default function ListingDetailPage({ params }: { params: { id: string } }) {
  const { user } = useAuth()
  const router = useRouter()
  const listing = mockListingDetails[params.id] || mockListingDetails[1]
  const [selectedImage, setSelectedImage] = useState(listing.images[0])
  const [isSaved, setIsSaved] = useState(false)
  const [userVote, setUserVote] = useState<"up" | "down" | null>(null)
  const [votes, setVotes] = useState({ upvotes: listing.upvotes, downvotes: listing.downvotes })

  const requireAuth = (action: () => void) => {
    if (!user) {
      router.push(`/auth/login?redirect=/listing/${params.id}`)
      return
    }
    action()
  }

  const handleVote = (type: "up" | "down") => {
    requireAuth(() => {
      if (userVote === type) {
        setUserVote(null)
        setVotes((prev) => ({
          upvotes: type === "up" ? prev.upvotes - 1 : prev.upvotes,
          downvotes: type === "down" ? prev.downvotes - 1 : prev.downvotes,
        }))
      } else {
        setVotes((prev) => ({
          upvotes: type === "up" ? prev.upvotes + 1 : userVote === "up" ? prev.upvotes - 1 : prev.upvotes,
          downvotes: type === "down" ? prev.downvotes + 1 : userVote === "down" ? prev.downvotes - 1 : prev.downvotes,
        }))
        setUserVote(type)
      }
    })
  }

  const handleMessageSeller = () => {
    requireAuth(() => {
      const params = new URLSearchParams({
        sellerId: listing.seller.id.toString(),
        sellerName: listing.seller.username,
        sellerAvatar: listing.seller.avatar,
        itemId: listing.id.toString(),
        itemTitle: listing.title,
        itemPrice: listing.price.toString(),
        itemImage: listing.image,
        type: "item",
      })
      router.push(`/messages?${params.toString()}`)
    })
  }

  const handleSaveItem = () => {
    requireAuth(() => setIsSaved(!isSaved))
  }

  const handleReport = () => {
    requireAuth(() => {
      alert("Report submitted")
    })
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
                  alt={listing.title}
                  className="w-full h-96 object-cover"
                />
                <Badge className="absolute top-4 left-4 bg-primary text-primary-foreground">{listing.condition}</Badge>
              </div>

              {/* Thumbnail Gallery */}
              <div className="flex gap-2">
                {listing.images.map((img, idx) => (
                  <button
                    key={idx}
                    onClick={() => setSelectedImage(img)}
                    className={`w-20 h-20 rounded-lg overflow-hidden border-2 transition ${
                      selectedImage === img ? "border-primary" : "border-border hover:border-primary/50"
                    }`}
                  >
                    <img
                      src={img || "/placeholder.svg"}
                      alt={`View ${idx + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
            </div>

            {/* Item Info Cards */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              <Card className="p-4">
                <p className="text-sm text-muted-foreground mb-1">Game</p>
                <p className="font-bold">{listing.game}</p>
              </Card>
              <Card className="p-4">
                <p className="text-sm text-muted-foreground mb-1">Category</p>
                <p className="font-bold">{listing.category}</p>
              </Card>
              <Card className="p-4">
                <p className="text-sm text-muted-foreground mb-1">Item Type</p>
                <p className="font-bold">{listing.details.itemType}</p>
              </Card>
              <Card className="p-4">
                <p className="text-sm text-muted-foreground mb-1">Rarity</p>
                <p className="font-bold">{listing.details.rarity}</p>
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
              <p className="text-foreground leading-relaxed">{listing.description}</p>
            </Card>

            {/* Proof of Item */}
            <Card className="p-6 mb-6">
              <h2 className="text-xl font-bold mb-4">Item Proof</h2>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  {listing.proof.hasScreenshots ? (
                    <Check className="w-5 h-5 text-green-500" />
                  ) : (
                    <div className="w-5 h-5 rounded border border-muted" />
                  )}
                  <span>Screenshots provided</span>
                </div>
                <div className="flex items-center gap-3">
                  {listing.proof.hasVideo ? (
                    <Check className="w-5 h-5 text-green-500" />
                  ) : (
                    <div className="w-5 h-5 rounded border border-muted" />
                  )}
                  <span>Video proof available</span>
                </div>
                <div className="flex items-center gap-3">
                  {listing.proof.hasRobloxLink ? (
                    <Check className="w-5 h-5 text-green-500" />
                  ) : (
                    <div className="w-5 h-5 rounded border border-muted" />
                  )}
                  <span>Roblox link provided</span>
                </div>
              </div>
            </Card>

            {/* Payment Methods */}
            <Card className="p-6">
              <h2 className="text-xl font-bold mb-4">Payment Methods Accepted</h2>
              <div className="flex flex-wrap gap-2">
                {listing.paymentMethods.map((method) => (
                  <Badge key={method} variant="secondary">
                    {method}
                  </Badge>
                ))}
              </div>
            </Card>
          </div>

          {/* Right Column - Seller & Action */}
          <div className="lg:col-span-1">
            {/* Price */}
            <div className="mb-6 p-6 bg-primary text-primary-foreground rounded-lg">
              <p className="text-sm mb-2 opacity-90">Price</p>
              <p className="text-4xl font-bold">₱{listing.price.toLocaleString()}</p>
              <p className="text-sm mt-2 opacity-75">Status: {listing.status}</p>
            </div>

            {/* Action Buttons */}
            <div className="space-y-3 mb-6">
              <Button size="lg" className="w-full" onClick={handleMessageSeller}>
                <MessageCircle className="w-5 h-5 mr-2" />
                Message
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
              <Link href={`/profile/${listing.seller.id}`}>
                <div className="flex items-center gap-4 mb-4 cursor-pointer group">
                  <img
                    src={listing.seller.avatar || "/placeholder.svg"}
                    alt={listing.seller.username}
                    className="w-16 h-16 rounded-full object-cover group-hover:opacity-80 transition"
                  />
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-lg group-hover:text-primary transition">
                        {listing.seller.username}
                      </h3>
                      {listing.seller.verified && <Shield className="w-4 h-4 text-primary" />}
                    </div>
                    <p className="text-sm text-muted-foreground">Joined {listing.seller.joinDate}</p>
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
                  <span className="font-bold">{listing.seller.vouch}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Response Rate</span>
                  <span className="font-bold">{listing.seller.responseRate}%</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Active Listings</span>
                  <span className="font-bold">{listing.seller.listings}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Last Active</span>
                  <span className="font-bold text-sm">{listing.seller.lastActive}</span>
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
                  <span>{listing.postedDate}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Views</span>
                  <span>{listing.views}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Interested</span>
                  <span>{listing.interestedBuyers} buyers</span>
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
      </div>
    </main>
  )
}
