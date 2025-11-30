"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Star, MessageCircle, Share2, Flag, Shield, Calendar, ThumbsUp, ThumbsDown } from "lucide-react"
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

const mockCurrencyListings = {
  "1": {
    id: "1",
    game: "Roblox",
    currencyType: "Robux",
    ratePerPeso: 3,
    stock: 10000,
    description:
      "Robux available for sale at 3 Robux per ₱1. Will be transferred via in-game trade or gift card. No scams, trusted seller with 24 vouches.",
    image: "/placeholder.jpg",
    images: ["/placeholder.jpg", "/placeholder.svg"],
    seller: {
      id: "seller1",
      username: "TrustTrader",
      avatar: "/placeholder-user.jpg",
      vouch: 24,
      joinDate: "Jan 2023",
      listings: 28,
      verified: true,
      responseRate: 98,
      lastActive: "5 minutes ago",
    },
    condition: "New",
    status: "available",
    postedDate: "2 days ago",
    views: 342,
    interestedBuyers: 12,
    deliveryMethods: ["In-game Trade", "Gift Card"],
    paymentMethods: ["GCash", "PayPal"],
    upvotes: 45,
    downvotes: 2,
  },
  "2": {
    id: "2",
    game: "Roblox",
    currencyType: "Robux",
    ratePerPeso: 2.5,
    stock: 25000,
    description: "Robux for sale at 2.5 per peso. Quick delivery available. Safe and secure transaction guaranteed.",
    image: "/placeholder.jpg",
    images: ["/placeholder.jpg"],
    seller: {
      id: "seller2",
      username: "FastDelivery",
      avatar: "/user-avatar-profile.png",
      vouch: 18,
      joinDate: "Mar 2023",
      listings: 15,
      verified: false,
      responseRate: 95,
      lastActive: "10 minutes ago",
    },
    condition: "New",
    status: "available",
    postedDate: "1 day ago",
    views: 156,
    interestedBuyers: 5,
    deliveryMethods: ["Account Trade", "In-game Trade"],
    paymentMethods: ["PayPal", "Crypto"],
    upvotes: 32,
    downvotes: 5,
  },
  "3": {
    id: "3",
    game: "Adopt Me",
    currencyType: "Coins",
    ratePerPeso: 500,
    stock: 1000000,
    description:
      "Adopt Me coins at 500 coins per peso. Perfect for new players. Can trade in-game. Proof of coins available.",
    image: "/placeholder.jpg",
    images: ["/placeholder.jpg"],
    seller: {
      id: "seller3",
      username: "CoinMaster",
      avatar: "/placeholder-user.jpg",
      vouch: 31,
      joinDate: "Feb 2023",
      listings: 42,
      verified: true,
      responseRate: 99,
      lastActive: "2 minutes ago",
    },
    condition: "New",
    status: "available",
    postedDate: "3 days ago",
    views: 523,
    interestedBuyers: 18,
    deliveryMethods: ["In-game Trade"],
    paymentMethods: ["GCash", "PayPal", "Gift Card"],
    upvotes: 78,
    downvotes: 3,
  },
}

interface CurrencyListingDetailContentProps {
  params: Promise<{ id: string }>
}

function CurrencyListingDetailContent({ params }: CurrencyListingDetailContentProps) {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { user } = useAuth()
  const [id, setId] = useState<string>("")
  const [isReady, setIsReady] = useState(false)

  // Initialize id from params
  useEffect(() => {
    ;(async () => {
      const { id: resolvedId } = await params
      setId(resolvedId)
      setIsReady(true)
    })()
  }, [params])

  // Get listing after id is ready
  const listing = isReady
    ? mockCurrencyListings[id as keyof typeof mockCurrencyListings] || mockCurrencyListings["1"]
    : mockCurrencyListings["1"]
  const [selectedImage, setSelectedImage] = useState(listing.images[0])
  const [isSaved, setIsSaved] = useState(false)
  const [userVote, setUserVote] = useState<"up" | "down" | null>(null)
  const [votes, setVotes] = useState({ upvotes: listing.upvotes, downvotes: listing.downvotes })
  const [showAmountDialog, setShowAmountDialog] = useState(false)
  const [currencyAmount, setCurrencyAmount] = useState("")

  useEffect(() => {
    if (searchParams.get("contact") === "true") {
      setShowAmountDialog(true)
    }
  }, [searchParams])

  const handleVote = (type: "up" | "down") => {
    if (!user) {
      alert("Please log in to vote")
      return
    }

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
  }

  const calculateCost = (amount: string) => {
    const numAmount = Number.parseInt(amount) || 0
    return Math.ceil(numAmount / listing.ratePerPeso)
  }

  const handleProceedToContact = () => {
    const amount = Number.parseInt(currencyAmount)
    if (!amount || amount <= 0) {
      alert("Please enter a valid amount")
      return
    }
    if (amount > listing.stock) {
      alert(`Only ${listing.stock.toLocaleString()} ${listing.currencyType} available`)
      return
    }
    const cost = calculateCost(currencyAmount)
    const msgParams = new URLSearchParams({
      sellerId: listing.seller.id,
      sellerName: listing.seller.username,
      sellerAvatar: listing.seller.avatar,
      itemId: listing.id,
      itemTitle: `${listing.ratePerPeso} ${listing.currencyType} per ₱1`,
      itemPrice: listing.stock.toString(),
      itemImage: listing.image,
      type: "currency",
      currencyType: listing.currencyType,
      amount: amount.toString(),
      cost: cost.toString(),
    })
    router.push(`/messages?${msgParams.toString()}`)
  }

  const handleCloseDialog = () => {
    setShowAmountDialog(false)
    setCurrencyAmount("")
    // Remove the contact=true from URL
    router.replace(`/currency/${id}`)
  }

  const handleContactSeller = () => {
    setShowAmountDialog(true)
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
                  alt={`${listing.stock} ${listing.currencyType}`}
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

            {/* Currency Info Cards */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              <Card className="p-4">
                <p className="text-sm text-muted-foreground mb-1">Game</p>
                <p className="font-bold">{listing.game}</p>
              </Card>
              <Card className="p-4">
                <p className="text-sm text-muted-foreground mb-1">Currency Type</p>
                <p className="font-bold">{listing.currencyType}</p>
              </Card>
              <Card className="p-4">
                <p className="text-sm text-muted-foreground mb-1">Rate</p>
                <p className="font-bold text-primary">
                  {listing.ratePerPeso} {listing.currencyType} per ₱1
                </p>
              </Card>
              <Card className="p-4">
                <p className="text-sm text-muted-foreground mb-1">Stock Available</p>
                <p className="font-bold">
                  {listing.stock.toLocaleString()} {listing.currencyType}
                </p>
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

            {/* Delivery Methods */}
            <Card className="p-6 mb-6">
              <h2 className="text-xl font-bold mb-4">Delivery Methods</h2>
              <div className="flex flex-wrap gap-2">
                {listing.deliveryMethods.map((method) => (
                  <Badge key={method} variant="secondary" className="px-3 py-2">
                    {method}
                  </Badge>
                ))}
              </div>
            </Card>

            {/* Payment Methods */}
            <Card className="p-6">
              <h2 className="text-xl font-bold mb-4">Payment Methods Accepted</h2>
              <div className="flex flex-wrap gap-2">
                {listing.paymentMethods.map((method) => (
                  <Badge key={method} variant="secondary" className="px-3 py-2">
                    {method}
                  </Badge>
                ))}
              </div>
            </Card>
          </div>

          {/* Right Column - Seller & Action */}
          <div className="lg:col-span-1">
            <div className="mb-6 p-6 bg-primary text-primary-foreground rounded-lg">
              <p className="text-sm mb-2 opacity-90">Rate</p>
              <p className="text-4xl font-bold">
                {listing.ratePerPeso} {listing.currencyType}
              </p>
              <p className="text-lg mt-1">per ₱1 PHP</p>
              <p className="text-sm mt-3 opacity-75">Stock: {listing.stock.toLocaleString()}</p>
            </div>

            <div className="space-y-3 mb-6">
              <Button size="lg" className="w-full" onClick={handleContactSeller}>
                <MessageCircle className="w-5 h-5 mr-2" />
                Message
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="w-full bg-transparent"
                onClick={() => setIsSaved(!isSaved)}
              >
                {isSaved ? "★ Saved" : "☆ Save Item"}
              </Button>
              <Button size="lg" variant="outline" className="w-full bg-transparent">
                <Share2 className="w-5 h-5 mr-2" />
                Share
              </Button>
              <Button size="lg" variant="outline" className="w-full text-destructive bg-transparent">
                <Flag className="w-5 h-5 mr-2" />
                Report
              </Button>
            </div>

            {/* Seller Card */}
            <Card className="p-6">
              <div className="flex items-center gap-4 mb-4">
                <img
                  src={listing.seller.avatar || "/placeholder.svg"}
                  alt={listing.seller.username}
                  className="w-16 h-16 rounded-full object-cover"
                />
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-lg">{listing.seller.username}</h3>
                    {listing.seller.verified && <Shield className="w-4 h-4 text-primary" />}
                  </div>
                  <p className="text-sm text-muted-foreground">Joined {listing.seller.joinDate}</p>
                </div>
              </div>

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
            Safety Tips for Currency Trading
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div>
              <p className="font-semibold mb-2">Verify Amount</p>
              <p className="text-muted-foreground">
                Always confirm the exact amount of currency you're purchasing before payment.
              </p>
            </div>
            <div>
              <p className="font-semibold mb-2">Choose Safe Delivery</p>
              <p className="text-muted-foreground">
                Use in-game trade or gift card methods. Avoid direct account sharing when possible.
              </p>
            </div>
            <div>
              <p className="font-semibold mb-2">Vouch After Trade</p>
              <p className="text-muted-foreground">
                Once currency is received, vouch for the seller to help build community trust.
              </p>
            </div>
          </div>
        </Card>
      </div>

      <Dialog
        open={showAmountDialog}
        onOpenChange={(open) => {
          if (!open) handleCloseDialog()
          else setShowAmountDialog(true)
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Specify Purchase Amount</DialogTitle>
            <DialogDescription>Enter how much {listing.currencyType} you would like to buy</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="amount">Amount of {listing.currencyType}</Label>
              <Input
                id="amount"
                type="number"
                placeholder={`Enter amount (max ${listing.stock.toLocaleString()})`}
                value={currencyAmount}
                onChange={(e) => setCurrencyAmount(e.target.value)}
                className="mt-2"
                max={listing.stock}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Available: {listing.stock.toLocaleString()} {listing.currencyType}
              </p>
            </div>

            {currencyAmount && Number.parseInt(currencyAmount) > 0 && (
              <div className="p-4 bg-muted/50 rounded-lg">
                <div className="flex justify-between mb-2">
                  <span className="text-muted-foreground">Amount:</span>
                  <span className="font-medium">
                    {Number.parseInt(currencyAmount).toLocaleString()} {listing.currencyType}
                  </span>
                </div>
                <div className="flex justify-between mb-2">
                  <span className="text-muted-foreground">Rate:</span>
                  <span className="font-medium">
                    {listing.ratePerPeso} {listing.currencyType} per ₱1
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
    </main>
  )
}

export default function CurrencyListingDetailPage({ params }: CurrencyListingDetailContentProps) {
  return <CurrencyListingDetailContent params={params} />
}
