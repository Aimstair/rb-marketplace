"use client"

import { useState } from "react"
import {
  Star,
  Shield,
  MessageCircle,
  Share2,
  Copy,
  Check,
  Flag,
  Ban,
  Calendar,
  Clock,
  TrendingUp,
  Eye,
  Users,
  BarChart3,
  Sparkles,
  Crown,
  LinkIcon,
  Filter,
  ArrowUpDown,
  Rocket,
  CheckCircle,
  Percent,
  MessageSquare,
} from "lucide-react"
import Navigation from "@/components/navigation"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Progress } from "@/components/ui/progress"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import Link from "next/link"
import { useRouter } from "next/navigation"

// Mock profile data with extended fields
const mockProfiles: Record<string, any> = {
  "1": {
    id: "1",
    username: "NinjaTrader",
    avatar: "/user-avatar-profile-trading.jpg",
    banner: "/gaming-banner-abstract.jpg",
    bio: "Trusted trader with 3+ years experience. Fair prices and quick transactions! I specialize in rare pets and limited items.",
    joinDate: "January 15, 2023",
    lastActive: "5 minutes ago",
    vouch: 342,
    responseRate: 98,
    verified: true,
    subscription: "Pro",
    activeListings: 28,
    soldItems: 287,
    followers: 534,
    following: 128,
    totalViews: 15420,
    totalInquiries: 892,
    conversionRate: 32,
    inquiryResponseRate: 95,
    socialLinks: {
      discord: "NinjaTrader#1234",
    },
    paymentMethods: ["GCash", "PayPal", "Robux Gift Cards"],
    favoriteGames: ["Adopt Me", "Blox Fruits", "Pet Simulator X"],
    stats: {
      averageResponseTime: "15 minutes",
      tradingScore: 4.8,
      reportedScams: 0,
      activeYears: 3,
      salesSuccessRate: 89,
      inquiriesResponded: 95,
    },
    analytics: {
      monthlyViews: [1200, 1450, 1320, 1680, 1890, 2100],
      topItems: [
        { name: "Golden Dragon Pet", views: 342, inquiries: 45, sales: 12 },
        { name: "Blox Fruits Zoan", views: 256, inquiries: 32, sales: 8 },
        { name: "UGC Bundle Pack", views: 198, inquiries: 28, sales: 15 },
      ],
      peakHours: ["2PM-4PM", "8PM-10PM"],
    },
    vouches: [
      {
        id: 1,
        buyer: "CasualGamer",
        rating: 5,
        comment: "Great seller! Item arrived quickly and exactly as described. Highly recommend!",
        date: "3 days ago",
        avatar: "/user-avatar-trader-community.jpg",
      },
      {
        id: 2,
        buyer: "TrustyShopper",
        rating: 5,
        comment: "Very professional and trustworthy. Already bought 3 items from this seller!",
        date: "1 week ago",
        avatar: "/gamer-avatar-2.png",
      },
      {
        id: 3,
        buyer: "QuickBuyer",
        rating: 5,
        comment: "Super fast delivery. Exactly as described. 10/10",
        date: "2 weeks ago",
        avatar: "/gamer-avatar-3.png",
      },
      {
        id: 4,
        buyer: "HappyCustomer",
        rating: 4,
        comment: "Good experience overall. Would buy again.",
        date: "3 weeks ago",
        avatar: "/gamer-avatar-4.png",
      },
    ],
    listings: [
      {
        id: 1,
        title: "Golden Dragon Pet",
        game: "Adopt Me",
        price: 2500,
        image: "/golden-dragon-pet-roblox.jpg",
        status: "available",
        views: 342,
        inquiries: 45,
        featured: true,
        boosted: false,
        createdAt: "2 days ago",
      },
      {
        id: 2,
        title: "Blox Fruits Zoan Tier 3",
        game: "Blox Fruits",
        price: 1200,
        image: "/blox-fruits-zoan-tier.jpg",
        status: "available",
        views: 256,
        inquiries: 32,
        featured: false,
        boosted: true,
        createdAt: "5 days ago",
      },
      {
        id: 3,
        title: "UGC Bundle Pack",
        game: "Multiple",
        price: 890,
        image: "/ugc-bundle-roblox.jpg",
        status: "available",
        views: 198,
        inquiries: 28,
        featured: false,
        boosted: false,
        createdAt: "1 week ago",
      },
      {
        id: 4,
        title: "Neon Unicorn",
        game: "Adopt Me",
        price: 3500,
        image: "/neon-unicorn-adopt-me.jpg",
        status: "sold",
        views: 512,
        inquiries: 67,
        featured: false,
        boosted: false,
        createdAt: "2 weeks ago",
      },
      {
        id: 5,
        title: "Limited Sword",
        game: "Murder Mystery 2",
        price: 1800,
        image: "/limited-sword-mm2.jpg",
        status: "hidden",
        views: 89,
        inquiries: 12,
        featured: false,
        boosted: false,
        createdAt: "3 weeks ago",
      },
    ],
  },
}

export default function ProfilePage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const profile = mockProfiles[params.id] || mockProfiles["1"]
  const [copied, setCopied] = useState(false)
  const [showMoreVouches, setShowMoreVouches] = useState(false)
  const [showReportDialog, setShowReportDialog] = useState(false)
  const [showBlockDialog, setShowBlockDialog] = useState(false)
  const [listingFilter, setListingFilter] = useState("all")
  const [listingSort, setListingSort] = useState("newest")
  const [isBlocked, setIsBlocked] = useState(false)
  const [isFollowing, setIsFollowing] = useState(false)

  const handleCopyUsername = () => {
    navigator.clipboard.writeText(profile.username)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleMessage = () => {
    const msgParams = new URLSearchParams({
      sellerId: profile.id,
      sellerName: profile.username,
      sellerAvatar: profile.avatar,
    })
    router.push(`/messages?${msgParams.toString()}`)
  }

  const handleBlock = () => {
    setIsBlocked(true)
    setShowBlockDialog(false)
  }

  const filteredListings = profile.listings
    .filter((listing: any) => {
      if (listingFilter === "all") return listing.status !== "hidden"
      if (listingFilter === "available") return listing.status === "available"
      if (listingFilter === "sold") return listing.status === "sold"
      if (listingFilter === "featured") return listing.featured
      return true
    })
    .sort((a: any, b: any) => {
      if (listingSort === "newest") return 0
      if (listingSort === "oldest") return 1
      if (listingSort === "price-high") return b.price - a.price
      if (listingSort === "price-low") return a.price - b.price
      if (listingSort === "views") return b.views - a.views
      if (listingSort === "inquiries") return b.inquiries - a.inquiries
      return 0
    })

  const getSubscriptionBadge = () => {
    switch (profile.subscription) {
      case "Elite":
        return (
          <Badge className="bg-gradient-to-r from-purple-600 to-pink-600 text-white">
            <Crown className="w-3 h-3 mr-1" />
            Elite
          </Badge>
        )
      case "Pro":
        return (
          <Badge className="bg-gradient-to-r from-blue-600 to-cyan-600 text-white">
            <Sparkles className="w-3 h-3 mr-1" />
            Pro
          </Badge>
        )
      default:
        return <Badge variant="secondary">Free</Badge>
    }
  }

  return (
    <main className="min-h-screen bg-background">
      <Navigation />

      {/* Profile Banner */}
      <div className="relative h-48 md:h-64 bg-gradient-to-r from-primary/20 to-primary/5 overflow-hidden">
        <img
          src={profile.banner || "/placeholder.svg"}
          alt="Profile Banner"
          className="w-full h-full object-cover opacity-50"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background to-transparent" />
      </div>

      <div className="container mx-auto px-4 -mt-20 relative z-10">
        {/* Profile Header */}
        <Card className="p-6 mb-6">
          <div className="flex flex-col md:flex-row gap-6 items-start">
            {/* Avatar */}
            <div className="relative">
              <img
                src={profile.avatar || "/placeholder.svg"}
                alt={profile.username}
                className="w-32 h-32 rounded-full object-cover border-4 border-background shadow-lg"
              />
              {profile.verified && (
                <div className="absolute bottom-2 right-2 bg-primary text-primary-foreground rounded-full p-1">
                  <Shield className="w-4 h-4" />
                </div>
              )}
            </div>

            {/* Profile Info */}
            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-3 mb-2">
                <h1 className="text-2xl md:text-3xl font-bold">{profile.username}</h1>
                {profile.verified && (
                  <Badge variant="outline" className="text-primary border-primary">
                    <Shield className="w-3 h-3 mr-1" />
                    Verified
                  </Badge>
                )}
                {getSubscriptionBadge()}
              </div>

              <p className="text-muted-foreground mb-4 max-w-2xl">{profile.bio}</p>

              {/* Quick Stats */}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-4">
                <div>
                  <p className="text-xs text-muted-foreground">Joined</p>
                  <p className="font-semibold text-sm flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {profile.joinDate.split(" ").slice(0, 2).join(" ")}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Last Active</p>
                  <p className="font-semibold text-sm flex items-center gap-1">
                    <Clock className="w-3 h-3 text-green-500" />
                    {profile.lastActive}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Vouches</p>
                  <p className="font-semibold text-sm flex items-center gap-1">
                    <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                    {profile.vouch}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Successful Trades</p>
                  <p className="font-semibold text-sm">{profile.soldItems}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Response Time</p>
                  <p className="font-semibold text-sm">{profile.stats.averageResponseTime}</p>
                </div>
              </div>

              {/* Social Links */}
              {profile.socialLinks?.discord && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
                  <LinkIcon className="w-4 h-4" />
                  <span>Discord: {profile.socialLinks.discord}</span>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex flex-wrap gap-2">
                <Button onClick={handleMessage} disabled={isBlocked}>
                  <MessageCircle className="w-4 h-4 mr-2" />
                  Message
                </Button>
                <Button variant={isFollowing ? "secondary" : "outline"} onClick={() => setIsFollowing(!isFollowing)}>
                  {isFollowing ? (
                    <>
                      <Check className="w-4 h-4 mr-2" />
                      Following
                    </>
                  ) : (
                    <>
                      <Users className="w-4 h-4 mr-2" />
                      Follow
                    </>
                  )}
                </Button>
                <Button variant="outline" onClick={handleCopyUsername}>
                  {copied ? <Check className="w-4 h-4 mr-2" /> : <Copy className="w-4 h-4 mr-2" />}
                  {copied ? "Copied!" : "Copy Username"}
                </Button>
                <Button variant="outline">
                  <Share2 className="w-4 h-4 mr-2" />
                  Share
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="icon">
                      <Flag className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuItem onClick={() => setShowReportDialog(true)}>
                      <Flag className="w-4 h-4 mr-2" />
                      Report User
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setShowBlockDialog(true)} className="text-destructive">
                      <Ban className="w-4 h-4 mr-2" />
                      {isBlocked ? "Unblock User" : "Block User"}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

            {/* Stats Card */}
            <Card className="p-4 min-w-[200px] hidden lg:block">
              <h3 className="text-sm font-semibold text-muted-foreground mb-3">TRADING SCORE</h3>
              <div className="flex items-center gap-2 mb-3">
                <span className="text-3xl font-bold text-primary">{profile.stats.tradingScore.toFixed(1)}</span>
                <div className="flex">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      className={`w-4 h-4 ${
                        i < Math.round(profile.stats.tradingScore) ? "fill-yellow-400 text-yellow-400" : "text-muted"
                      }`}
                    />
                  ))}
                </div>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Sales Rate</span>
                  <span className="font-semibold text-green-600">{profile.stats.salesSuccessRate}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Response Rate</span>
                  <span className="font-semibold">{profile.stats.inquiriesResponded}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Scam Reports</span>
                  <span className="font-semibold text-green-600">{profile.stats.reportedScams}</span>
                </div>
              </div>
            </Card>
          </div>
        </Card>

        {/* Main Content Tabs */}
        <Tabs defaultValue="listings" className="mb-8">
          <TabsList className="mb-6">
            <TabsTrigger value="listings">Listings</TabsTrigger>
            <TabsTrigger value="vouches">Vouches ({profile.vouch})</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
          </TabsList>

          {/* Listings Tab */}
          <TabsContent value="listings">
            {/* Filters */}
            <div className="flex flex-wrap gap-4 mb-6">
              <Select value={listingFilter} onValueChange={setListingFilter}>
                <SelectTrigger className="w-[150px]">
                  <Filter className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="Filter" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Listings</SelectItem>
                  <SelectItem value="available">Available</SelectItem>
                  <SelectItem value="sold">Sold</SelectItem>
                  <SelectItem value="featured">Featured</SelectItem>
                </SelectContent>
              </Select>

              <Select value={listingSort} onValueChange={setListingSort}>
                <SelectTrigger className="w-[150px]">
                  <ArrowUpDown className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="Sort" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="newest">Newest</SelectItem>
                  <SelectItem value="oldest">Oldest</SelectItem>
                  <SelectItem value="price-high">Price: High to Low</SelectItem>
                  <SelectItem value="price-low">Price: Low to High</SelectItem>
                  <SelectItem value="views">Most Viewed</SelectItem>
                  <SelectItem value="inquiries">Most Inquired</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Listings Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredListings.map((listing: any) => (
                <Link key={listing.id} href={`/listing/${listing.id}`}>
                  <Card className="overflow-hidden hover:shadow-lg transition-all cursor-pointer group h-full">
                    <div className="relative h-40 bg-muted overflow-hidden">
                      <img
                        src={listing.image || "/placeholder.svg"}
                        alt={listing.title}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform"
                      />
                      {listing.featured && (
                        <Badge className="absolute top-2 left-2 bg-yellow-500 text-yellow-950">
                          <Star className="w-3 h-3 mr-1" />
                          Featured
                        </Badge>
                      )}
                      {listing.boosted && (
                        <Badge className="absolute top-2 right-2 bg-purple-500 text-white">
                          <Rocket className="w-3 h-3 mr-1" />
                          Boosted
                        </Badge>
                      )}
                      {listing.status === "sold" && (
                        <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                          <Badge className="bg-red-500 text-white text-lg px-4 py-2">SOLD</Badge>
                        </div>
                      )}
                    </div>
                    <div className="p-4">
                      <h3 className="font-bold line-clamp-1 mb-1">{listing.title}</h3>
                      <p className="text-xs text-muted-foreground mb-2">{listing.game}</p>
                      <div className="flex items-center justify-between">
                        <p className="text-xl font-bold text-primary">₱{listing.price.toLocaleString()}</p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Eye className="w-3 h-3" />
                            {listing.views}
                          </span>
                          <span className="flex items-center gap-1">
                            <MessageSquare className="w-3 h-3" />
                            {listing.inquiries}
                          </span>
                        </div>
                      </div>
                    </div>
                  </Card>
                </Link>
              ))}
            </div>

            {filteredListings.length === 0 && (
              <Card className="p-12 text-center">
                <p className="text-muted-foreground">No listings found</p>
              </Card>
            )}
          </TabsContent>

          {/* Vouches Tab */}
          <TabsContent value="vouches">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Vouch Summary */}
              <Card className="p-6 lg:col-span-1">
                <h3 className="font-bold mb-4">Vouch Summary</h3>
                <div className="text-center mb-4">
                  <div className="text-5xl font-bold text-primary mb-2">{profile.vouch}</div>
                  <p className="text-muted-foreground">Total Vouches</p>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span>5 Stars</span>
                    <div className="flex items-center gap-2 flex-1 mx-4">
                      <Progress value={85} className="h-2" />
                    </div>
                    <span>85%</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span>4 Stars</span>
                    <div className="flex items-center gap-2 flex-1 mx-4">
                      <Progress value={10} className="h-2" />
                    </div>
                    <span>10%</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span>3 Stars</span>
                    <div className="flex items-center gap-2 flex-1 mx-4">
                      <Progress value={3} className="h-2" />
                    </div>
                    <span>3%</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span>2 Stars</span>
                    <div className="flex items-center gap-2 flex-1 mx-4">
                      <Progress value={1} className="h-2" />
                    </div>
                    <span>1%</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span>1 Star</span>
                    <div className="flex items-center gap-2 flex-1 mx-4">
                      <Progress value={1} className="h-2" />
                    </div>
                    <span>1%</span>
                  </div>
                </div>
              </Card>

              {/* Vouch List */}
              <div className="lg:col-span-2 space-y-4">
                {profile.vouches.slice(0, showMoreVouches ? profile.vouches.length : 4).map((vouch: any) => (
                  <Card key={vouch.id} className="p-4">
                    <div className="flex items-start gap-4">
                      <img
                        src={vouch.avatar || "/placeholder.svg"}
                        alt={vouch.buyer}
                        className="w-10 h-10 rounded-full object-cover"
                      />
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <h4 className="font-semibold">{vouch.buyer}</h4>
                          <span className="text-xs text-muted-foreground">{vouch.date}</span>
                        </div>
                        <div className="flex items-center gap-1 mb-2">
                          {[...Array(5)].map((_, i) => (
                            <Star
                              key={i}
                              className={`w-3 h-3 ${
                                i < vouch.rating ? "fill-yellow-400 text-yellow-400" : "text-muted"
                              }`}
                            />
                          ))}
                        </div>
                        <p className="text-sm text-muted-foreground">{vouch.comment}</p>
                      </div>
                    </div>
                  </Card>
                ))}

                {profile.vouches.length > 4 && (
                  <Button
                    variant="outline"
                    className="w-full bg-transparent"
                    onClick={() => setShowMoreVouches(!showMoreVouches)}
                  >
                    {showMoreVouches ? "Show Less" : `Show All ${profile.vouch} Vouches`}
                  </Button>
                )}
              </div>
            </div>
          </TabsContent>

          {/* Analytics Tab (Premium Feature) */}
          <TabsContent value="analytics">
            {profile.subscription === "Free" ? (
              <Card className="p-12 text-center">
                <Crown className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-xl font-bold mb-2">Premium Feature</h3>
                <p className="text-muted-foreground mb-4">
                  Upgrade to Pro or Elite to access detailed analytics about your listings
                </p>
                <Link href="/subscriptions">
                  <Button>Upgrade Now</Button>
                </Link>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                {/* Analytics Stats */}
                <Card className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <Eye className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Total Views</p>
                      <p className="text-xl font-bold">{profile.totalViews.toLocaleString()}</p>
                    </div>
                  </div>
                </Card>

                <Card className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-500/10 rounded-lg">
                      <MessageSquare className="w-5 h-5 text-blue-500" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Total Inquiries</p>
                      <p className="text-xl font-bold">{profile.totalInquiries.toLocaleString()}</p>
                    </div>
                  </div>
                </Card>

                <Card className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-green-500/10 rounded-lg">
                      <TrendingUp className="w-5 h-5 text-green-500" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Conversion Rate</p>
                      <p className="text-xl font-bold">{profile.conversionRate}%</p>
                    </div>
                  </div>
                </Card>

                <Card className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-purple-500/10 rounded-lg">
                      <Percent className="w-5 h-5 text-purple-500" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Response Rate</p>
                      <p className="text-xl font-bold">{profile.inquiryResponseRate}%</p>
                    </div>
                  </div>
                </Card>

                {/* Top Performing Items */}
                <Card className="p-6 md:col-span-2">
                  <h3 className="font-bold mb-4 flex items-center gap-2">
                    <BarChart3 className="w-4 h-4" />
                    Top Performing Items
                  </h3>
                  <div className="space-y-4">
                    {profile.analytics.topItems.map((item: any, idx: number) => (
                      <div key={idx} className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="font-bold text-muted-foreground">{idx + 1}</span>
                          <span className="font-medium">{item.name}</span>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span>{item.views} views</span>
                          <span>{item.inquiries} inquiries</span>
                          <span className="text-green-600">{item.sales} sales</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>

                {/* Peak Activity */}
                <Card className="p-6 md:col-span-2">
                  <h3 className="font-bold mb-4 flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    Peak Activity Times
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {profile.analytics.peakHours.map((hour: string, idx: number) => (
                      <Badge key={idx} variant="secondary" className="px-3 py-2">
                        {hour}
                      </Badge>
                    ))}
                  </div>
                  <p className="text-sm text-muted-foreground mt-4">
                    Your listings get the most views during these hours. Consider posting new items during peak times.
                  </p>
                </Card>
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Favorite Games */}
        {profile.favoriteGames.length > 0 && (
          <Card className="p-6 mb-6">
            <h2 className="text-lg font-bold mb-4">Favorite Games</h2>
            <div className="flex flex-wrap gap-2">
              {profile.favoriteGames.map((game: string) => (
                <Badge key={game} variant="secondary" className="px-3 py-2">
                  {game}
                </Badge>
              ))}
            </div>
          </Card>
        )}

        {/* Payment Methods */}
        <Card className="p-6 mb-6">
          <h2 className="text-lg font-bold mb-4">Accepted Payment Methods</h2>
          <div className="flex flex-wrap gap-2">
            {profile.paymentMethods.map((method: string) => (
              <Badge key={method} variant="outline" className="px-3 py-2">
                <CheckCircle className="w-3 h-3 mr-1 text-green-500" />
                {method}
              </Badge>
            ))}
          </div>
        </Card>
      </div>

      {/* Report Dialog */}
      <Dialog open={showReportDialog} onOpenChange={setShowReportDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Report User</DialogTitle>
            <DialogDescription>Please select a reason for reporting {profile.username}</DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-4">
            {["Scam/Fraud", "Harassment", "Fake Profile", "Inappropriate Content", "Other"].map((reason) => (
              <Button
                key={reason}
                variant="outline"
                className="w-full justify-start bg-transparent"
                onClick={() => setShowReportDialog(false)}
              >
                {reason}
              </Button>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Block Dialog */}
      <Dialog open={showBlockDialog} onOpenChange={setShowBlockDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{isBlocked ? "Unblock" : "Block"} User</DialogTitle>
            <DialogDescription>
              {isBlocked
                ? `Are you sure you want to unblock ${profile.username}?`
                : `Are you sure you want to block ${profile.username}? They won't be able to message you or see your listings.`}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBlockDialog(false)}>
              Cancel
            </Button>
            <Button
              variant={isBlocked ? "default" : "destructive"}
              onClick={() => {
                setIsBlocked(!isBlocked)
                setShowBlockDialog(false)
              }}
            >
              {isBlocked ? "Unblock" : "Block"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  )
}
