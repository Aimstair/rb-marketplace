"use client"

import { useState, useEffect, use } from "react"
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
  MessageSquare,
  Loader2,
} from "lucide-react"
import Navigation from "@/components/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
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
import { getProfile, toggleFollow, type UserProfileData } from "@/app/actions/profile"
import { getSubscriptionBadge as getSubBadge } from "@/lib/subscription-utils"
import { createReport } from "@/app/actions/admin"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"

export default function ProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter()
  const { id } = use(params)
  const { toast } = useToast()
  const [profile, setProfile] = useState<UserProfileData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [showMoreVouches, setShowMoreVouches] = useState(false)
  const [showReportDialog, setShowReportDialog] = useState(false)
  const [showBlockDialog, setShowBlockDialog] = useState(false)
  const [listingFilter, setListingFilter] = useState("all")
  const [listingSort, setListingSort] = useState("newest")
  const [isBlocked, setIsBlocked] = useState(false)
  const [isFollowing, setIsFollowing] = useState(false)
  const [followLoading, setFollowLoading] = useState(false)
  const [reportReason, setReportReason] = useState("")
  const [reportDetails, setReportDetails] = useState("")
  const [reportLoading, setReportLoading] = useState(false)
  const [reportStatusFilter, setReportStatusFilter] = useState("all")
  const [transactionSort, setTransactionSort] = useState("newest")
  const [transactionSearch, setTransactionSearch] = useState("")

  useEffect(() => {
    const loadProfile = async () => {
      try {
        setLoading(true)
        const result = await getProfile(id)
        if (result.success && result.data) {
          setProfile(result.data)
          setIsFollowing(result.data.isFollowing || false)
        } else {
          setError(result.error || "Profile not found")
        }
      } catch (err) {
        setError("Failed to load profile")
        console.error(err)
      } finally {
        setLoading(false)
      }
    }

    loadProfile()
  }, [id])

  const handleCopyUsername = () => {
    navigator.clipboard.writeText(profile?.username || "")
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleMessage = () => {
    if (!profile) return
    const msgParams = new URLSearchParams({
      sellerId: profile.id,
      sellerName: profile.username,
      sellerAvatar: profile.avatar || "",
    })
    router.push(`/messages?${msgParams.toString()}`)
  }

  const handleBlock = () => {
    setIsBlocked(true)
    setShowBlockDialog(false)
  }

  const handleToggleFollow = async () => {
    if (!profile) return
    try {
      setFollowLoading(true)
      const result = await toggleFollow(profile.id)
      if (result.success) {
        setIsFollowing(!isFollowing)
      }
    } catch (err) {
      console.error("Failed to toggle follow:", err)
    } finally {
      setFollowLoading(false)
    }
  }

  const handleReportUser = async () => {
    if (!profile || !reportReason) {
      toast({
        title: "Error",
        description: "Please select a reason for reporting",
        variant: "destructive",
      })
      return
    }

    try {
      setReportLoading(true)
      const result = await createReport({
        reportedUserId: profile.id,
        reason: reportReason,
        details: reportDetails || undefined,
      })

      if (result.success) {
        toast({
          title: "Success",
          description: "Report submitted successfully. Our team will review it.",
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
      console.error("Failed to submit report:", err)
      toast({
        title: "Error",
        description: "An error occurred while submitting the report",
        variant: "destructive",
      })
    } finally {
      setReportLoading(false)
    }
  }

  // Loading state
  if (loading) {
    return (
      <main className="min-h-screen bg-background flex items-center justify-center">
        <Navigation />
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading profile...</p>
        </div>
      </main>
    )
  }

  // Error state
  if (error || !profile) {
    return (
      <main className="min-h-screen bg-background">
        <Navigation />
        <div className="container max-w-[1920px] mx-auto px-6 py-12 flex flex-col items-center justify-center min-h-96">
          <div className="text-center">
            <h1 className="text-4xl font-bold mb-2">404</h1>
            <p className="text-xl text-muted-foreground mb-6">{error || "Profile not found"}</p>
            <Link href="/marketplace">
              <Button>Back to Marketplace</Button>
            </Link>
          </div>
        </div>
      </main>
    )
  }

  const filteredListings = (profile?.listings || [])
    .filter((listing: any) => {
      if (listingFilter === "all") return listing.status !== "hidden"
      if (listingFilter === "available") return listing.status === "available"
      if (listingFilter === "sold") return listing.status === "sold"
      return true
    })
    .sort((a: any, b: any) => {
      if (listingSort === "newest") return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      if (listingSort === "oldest") return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      if (listingSort === "price-high") return b.price - a.price
      if (listingSort === "price-low") return a.price - b.price
      return 0
    })

  const filteredReports = (profile?.reports || []).filter((report: any) => {
    if (reportStatusFilter === "all") return true
    return report.status === reportStatusFilter
  })

  const filteredTransactions = (profile?.transactions || [])
    .filter((transaction: any) => {
      if (!transactionSearch) return true
      const searchLower = transactionSearch.toLowerCase()
      return (
        transaction.listingTitle?.toLowerCase().includes(searchLower) ||
        transaction.buyerUsername?.toLowerCase().includes(searchLower) ||
        transaction.sellerUsername?.toLowerCase().includes(searchLower) ||
        transaction.game?.toLowerCase().includes(searchLower)
      )
    })
    .sort((a: any, b: any) => {
      if (transactionSort === "newest") {
        return new Date(b.completedAt || b.createdAt).getTime() - new Date(a.completedAt || a.createdAt).getTime()
      }
      if (transactionSort === "oldest") {
        return new Date(a.completedAt || a.createdAt).getTime() - new Date(b.completedAt || b.createdAt).getTime()
      }
      return 0
    })

  const reportStats = {
    total: profile?.reports?.length || 0,
    pending: profile?.reports?.filter((r: any) => r.status === "PENDING").length || 0,
    resolved: profile?.reports?.filter((r: any) => r.status === "RESOLVED").length || 0,
    dismissed: profile?.reports?.filter((r: any) => r.status === "DISMISSED").length || 0,
  }

  const subscriptionBadge = getSubBadge(profile?.subscriptionTier || "FREE")

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

      <div className="container max-w-[1920px] mx-auto px-6 -mt-20 relative z-10">
        {/* Banned Warning Banner */}
        {profile.isBanned && (
          <Card className="mb-4 border-red-500 bg-red-50 dark:bg-red-950/20">
            <CardContent className="p-4">
              <div className="flex items-center gap-3 text-red-700 dark:text-red-400">
                <Ban className="w-5 h-5 flex-shrink-0" />
                <div>
                  <p className="font-semibold">This user has been banned</p>
                  <p className="text-sm text-red-600 dark:text-red-500">
                    This account has been suspended due to violations of platform policies.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
        
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
              {profile.isVerified && (
                <div className="absolute bottom-2 right-2 bg-primary text-primary-foreground rounded-full p-1">
                  <Shield className="w-4 h-4" />
                </div>
              )}
            </div>

            {/* Profile Info */}
            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-3 mb-2">
                <h1 className="text-2xl md:text-3xl font-bold">{profile.username}</h1>
                {profile.isBanned && (
                  <Badge variant="destructive" className="bg-red-500 text-white">
                    <Ban className="w-3 h-3 mr-1" />
                    Banned
                  </Badge>
                )}
                {profile.isVerified && (
                  <Badge variant="outline" className="text-primary border-primary">
                    <Shield className="w-3 h-3 mr-1" />
                    Verified
                  </Badge>
                )}
                {subscriptionBadge && (
                  <Badge variant={subscriptionBadge.variant} className={subscriptionBadge.className}>
                    {subscriptionBadge.label}
                  </Badge>
                )}
              </div>

              <p className="text-muted-foreground mb-4 max-w-2xl">{profile.bio}</p>

              {/* Quick Stats */}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-4">
                <div>
                  <p className="text-xs text-muted-foreground">Joined</p>
                  <p className="font-semibold text-sm flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {new Date(profile.joinDate).toLocaleDateString("en-US", { month: "short", year: "numeric" })}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Last Active</p>
                  <p className="font-semibold text-sm flex items-center gap-1">
                    <Clock className="w-3 h-3 text-green-500" />
                    Now
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Vouches</p>
                  <p className="font-semibold text-sm flex items-center gap-1">
                    <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                    {profile.vouchCount || 0}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Successful Trades</p>
                  <p className="font-semibold text-sm">{profile.soldItems || 0}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Response Rate</p>
                  <p className="font-semibold text-sm">{profile.responseRate || 0}%</p>
                </div>
              </div>

              {/* Social Links */}
              {profile.socialLinks && Object.keys(profile.socialLinks).length > 0 && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
                  <LinkIcon className="w-4 h-4" />
                  {Object.entries(profile.socialLinks).map(([key, value]) => (
                    <span key={key}>
                      {key}: {value}
                    </span>
                  ))}
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex flex-wrap gap-2">
                {!profile.isOwnProfile && (
                  <>
                    <Button onClick={handleMessage} disabled={isBlocked}>
                      <MessageCircle className="w-4 h-4 mr-2" />
                      Message
                    </Button>
                    <Button
                      variant={isFollowing ? "secondary" : "outline"}
                      onClick={handleToggleFollow}
                      disabled={followLoading}
                    >
                      {followLoading ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : isFollowing ? (
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
                  </>
                )}
                <Button variant="outline" onClick={handleCopyUsername}>
                  {copied ? <Check className="w-4 h-4 mr-2" /> : <Copy className="w-4 h-4 mr-2" />}
                  {copied ? "Copied!" : "Copy Username"}
                </Button>
                <Button variant="outline">
                  <Share2 className="w-4 h-4 mr-2" />
                  Share
                </Button>
                {!profile.isOwnProfile && (
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
                )}
              </div>
            </div>

            {/* Stats Card */}
            <Card className="p-4 min-w-[200px] hidden lg:block">
              <h3 className="text-sm font-semibold text-muted-foreground mb-3">TRADING SCORE</h3>
              <div className="flex items-center gap-2 mb-3">
                <span className="text-3xl font-bold text-primary">
                  {profile.vouchCount > 0 ? profile.averageRating.toFixed(1) : "N/A"}
                </span>
                <div className="flex">
                  {[...Array(5)].map((_, i) => (
                    <Star 
                      key={i} 
                      className={`w-4 h-4 ${
                        i < Math.round(profile.averageRating || 0)
                          ? "fill-yellow-400 text-yellow-400"
                          : "text-muted-foreground"
                      }`}
                    />
                  ))}
                </div>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Active Listings</span>
                  <span className="font-semibold text-green-600">{profile.listings?.filter((l: any) => l.status === "available").length || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Followers</span>
                  <span className="font-semibold">{profile.followers || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Scam Reports</span>
                  <span className="font-semibold text-green-600">0</span>
                </div>
              </div>
            </Card>
          </div>
        </Card>

        {/* Main Content Tabs */}
        <Tabs defaultValue="listings" className="mb-8">
          <TabsList className="mb-6">
            <TabsTrigger value="listings">Listings ({profile.listings?.length || 0})</TabsTrigger>
            <TabsTrigger value="vouches">Vouches ({profile.vouchCount || 0})</TabsTrigger>
            <TabsTrigger value="transactions">Transactions ({profile.transactions?.length || 0})</TabsTrigger>
            <TabsTrigger value="reports">Reports ({profile.reports?.length || 0})</TabsTrigger>
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
                      {listing.status === "sold" && (
                        <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                          <Badge className="bg-red-500 text-white text-lg px-4 py-2">SOLD</Badge>
                        </div>
                      )}
                    </div>
                    <div className="p-4">
                      <h3 className="font-bold line-clamp-1 mb-1">{listing.title}</h3>
                      <p className="text-xs text-muted-foreground mb-2">{listing.game || "Roblox"}</p>
                      <div className="flex items-center justify-between">
                        <p className="text-xl font-bold text-primary">₱{listing.price?.toLocaleString() || "0"}</p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Eye className="w-3 h-3" />
                            {listing.views || 0}
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
                  <div className="text-5xl font-bold text-primary mb-2">
                    {profile.vouchCount > 0 ? profile.averageRating.toFixed(1) : "N/A"}
                  </div>
                  <div className="flex items-center justify-center gap-1 mb-2">
                    {[...Array(5)].map((_, i) => (
                      <Star 
                        key={i} 
                        className={`w-4 h-4 ${
                          i < Math.round(profile.averageRating || 0)
                            ? "fill-yellow-400 text-yellow-400"
                            : "text-muted-foreground"
                        }`}
                      />
                    ))}
                  </div>
                  <p className="text-muted-foreground">{profile.vouchCount || 0} Total Vouches</p>
                </div>
                <div className="space-y-2">
                  {[5, 4, 3, 2, 1].map((star) => {
                    const count = profile.ratingBreakdown?.[star] || 0
                    const percentage = profile.vouchCount > 0 ? Math.round((count / profile.vouchCount) * 100) : 0
                    return (
                      <div key={star} className="flex items-center justify-between text-sm">
                        <span>{star} Star{star !== 1 ? 's' : ''}</span>
                        <div className="flex items-center gap-2 flex-1 mx-4">
                          <Progress value={percentage} className="h-2" />
                        </div>
                        <span className="w-10 text-right">{percentage}%</span>
                      </div>
                    )
                  })}
                </div>
              </Card>

              {/* Vouch List */}
              <div className="lg:col-span-2 space-y-4">
                {profile.vouches && profile.vouches.slice(0, showMoreVouches ? profile.vouches.length : 4).map((vouch: any) => (
                  <Card key={vouch.id} className="p-4">
                    <div className="flex items-start gap-4">
                      <img
                        src={vouch.fromUser?.image || "/placeholder.svg"}
                        alt={vouch.fromUser?.username || "Reviewer"}
                        className="w-10 h-10 rounded-full object-cover"
                      />
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <h4 className="font-semibold">{vouch.fromUser?.username || "Anonymous"}</h4>
                          <span className="text-xs text-muted-foreground">
                            {new Date(vouch.createdAt).toLocaleDateString()}
                          </span>
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

                {(profile.vouches?.length || 0) > 4 && (
                  <Button
                    variant="outline"
                    className="w-full bg-transparent"
                    onClick={() => setShowMoreVouches(!showMoreVouches)}
                  >
                    {showMoreVouches ? "Show Less" : `Show All ${profile.vouchCount || 0} Vouches`}
                  </Button>
                )}
              </div>
            </div>
          </TabsContent>

          {/* Transactions Tab */}
          <TabsContent value="transactions">
            {/* Filters */}
            <div className="flex flex-wrap gap-4 mb-6">
              <div className="flex-1 min-w-[200px]">
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search transactions..."
                    value={transactionSearch}
                    onChange={(e) => setTransactionSearch(e.target.value)}
                    className="w-full px-4 py-2 pr-10 border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                  <MessageSquare className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                </div>
              </div>

              <Select value={transactionSort} onValueChange={setTransactionSort}>
                <SelectTrigger className="w-[150px]">
                  <ArrowUpDown className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="Sort" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="newest">Newest First</SelectItem>
                  <SelectItem value="oldest">Oldest First</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Transactions List */}
            <div className="space-y-4">
              {filteredTransactions.map((transaction: any) => (
                <Card key={transaction.id} className="p-6">
                  <div className="flex flex-col md:flex-row gap-6">
                    {/* Transaction Image */}
                    <div className="w-32 h-32 bg-muted rounded-lg overflow-hidden flex-shrink-0">
                      <img
                        src={transaction.listingImage || "/placeholder.svg"}
                        alt={transaction.listingTitle}
                        className="w-full h-full object-cover"
                      />
                    </div>

                    {/* Transaction Details */}
                    <div className="flex-1">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h3 className="font-bold text-lg mb-1">{transaction.listingTitle}</h3>
                          <p className="text-sm text-muted-foreground">{transaction.game || "Roblox"}</p>
                        </div>
                        <Badge className="bg-green-500 text-white">
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Completed
                        </Badge>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-3">
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Amount</p>
                          <p className="font-bold text-primary text-lg">₱{transaction.amount?.toLocaleString() || "0"}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">
                            {profile.id === transaction.sellerId ? "Buyer" : "Seller"}
                          </p>
                          <Link 
                            href={`/profile/${profile.id === transaction.sellerId ? transaction.buyerId : transaction.sellerId}`}
                            className="font-semibold hover:text-primary hover:underline flex items-center gap-1"
                          >
                            {profile.id === transaction.sellerId ? transaction.buyerUsername : transaction.sellerUsername}
                          </Link>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Date</p>
                          <p className="font-semibold text-sm">
                            {new Date(transaction.completedAt || transaction.createdAt).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                              year: "numeric"
                            })}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>

            {filteredTransactions.length === 0 && (
              <Card className="p-12 text-center">
                <TrendingUp className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">
                  {transactionSearch ? "No transactions found matching your search" : "No completed transactions yet"}
                </p>
                {!transactionSearch && (
                  <p className="text-sm text-muted-foreground mt-2">
                    Completed transactions will appear here
                  </p>
                )}
              </Card>
            )}
          </TabsContent>

          {/* Reports Tab */}
          <TabsContent value="reports">
            {/* Report Statistics */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <Card className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Total Reports</p>
                    <p className="text-2xl font-bold">{reportStats.total}</p>
                  </div>
                  <Flag className="w-8 h-8 text-muted-foreground" />
                </div>
              </Card>
              <Card className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Pending</p>
                    <p className="text-2xl font-bold text-orange-500">{reportStats.pending}</p>
                  </div>
                  <Clock className="w-8 h-8 text-orange-500" />
                </div>
              </Card>
              <Card className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Resolved</p>
                    <p className="text-2xl font-bold text-red-500">{reportStats.resolved}</p>
                  </div>
                  <CheckCircle className="w-8 h-8 text-red-500" />
                </div>
              </Card>
              <Card className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Dismissed</p>
                    <p className="text-2xl font-bold text-green-500">{reportStats.dismissed}</p>
                  </div>
                  <Shield className="w-8 h-8 text-green-500" />
                </div>
              </Card>
            </div>

            <Card className="p-6 mb-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-bold">Reports Against This User</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    This shows all reports that have been filed against this user and their current status.
                  </p>
                </div>
                <Select value={reportStatusFilter} onValueChange={setReportStatusFilter}>
                  <SelectTrigger className="w-[150px]">
                    <Filter className="w-4 h-4 mr-2" />
                    <SelectValue placeholder="Filter" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Reports</SelectItem>
                    <SelectItem value="PENDING">Pending</SelectItem>
                    <SelectItem value="RESOLVED">Resolved</SelectItem>
                    <SelectItem value="DISMISSED">Dismissed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              {filteredReports.length > 0 ? (
                <div className="space-y-4">
                  {filteredReports.map((report: any) => (
                    <Card key={report.id} className="p-4 border">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-start gap-3 flex-1">
                          <Link href={`/profile/${report.reporter?.id}`} className="flex-shrink-0">
                            <img
                              src={report.reporter?.profilePicture || "/placeholder.svg"}
                              alt={report.reporter?.username || "Reporter"}
                              className="w-10 h-10 rounded-full object-cover hover:ring-2 hover:ring-primary transition-all cursor-pointer"
                            />
                          </Link>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <Link href={`/profile/${report.reporter?.id}`} className="hover:underline">
                                <h4 className="font-semibold">{report.reporter?.username || "Anonymous"}</h4>
                              </Link>
                              <span className="text-xs text-muted-foreground">
                                {new Date(report.createdAt).toLocaleDateString()}
                              </span>
                            </div>
                            <p className="text-sm font-medium text-primary mb-2">{report.reason}</p>
                            {report.details && (
                              <p className="text-sm text-muted-foreground">{report.details}</p>
                            )}
                          </div>
                        </div>
                        <Badge
                          variant={
                            report.status === "RESOLVED"
                              ? "default"
                              : report.status === "DISMISSED"
                              ? "secondary"
                              : "outline"
                          }
                          className={
                            report.status === "RESOLVED"
                              ? "bg-red-500 text-white"
                              : report.status === "PENDING"
                              ? "border-orange-500 text-orange-500"
                              : ""
                          }
                        >
                          {report.status === "RESOLVED" && <CheckCircle className="w-3 h-3 mr-1" />}
                          {report.status === "DISMISSED" && <Ban className="w-3 h-3 mr-1" />}
                          {report.status === "PENDING" && <Clock className="w-3 h-3 mr-1" />}
                          {report.status}
                        </Badge>
                      </div>
                      
                      <div className="pt-3 border-t">
                        <p className="text-xs text-muted-foreground">
                          <strong>Verdict:</strong>{" "}
                          {report.status === "RESOLVED" && "The report was reviewed and user was found to have violated the rule."}
                          {report.status === "DISMISSED" && "The report was reviewed and dismissed as invalid or insufficient evidence."}
                          {report.status === "PENDING" && "The report is currently under review by moderators."}
                        </p>
                      </div>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Shield className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">
                    {reportStatusFilter === "all" 
                      ? "No reports have been filed against this user" 
                      : `No ${reportStatusFilter.toLowerCase()} reports`}
                  </p>
                  <p className="text-sm text-muted-foreground mt-2">
                    {reportStatusFilter === "all" && "This is a good sign! Clean record."}
                  </p>
                </div>
              )}
            </Card>
          </TabsContent>
        </Tabs>

        {/* Favorite Games */}
        {/* TODO: Add favorite games section when profile data includes favoriteGames */}

        {/* Payment Methods */}
        {/* TODO: Add payment methods section when profile data includes paymentMethods */}
      </div>

      {/* Report Dialog */}
      <Dialog open={showReportDialog} onOpenChange={(open) => {
        setShowReportDialog(open)
        if (!open) {
          setReportReason("")
          setReportDetails("")
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Report User</DialogTitle>
            <DialogDescription>Please select a reason for reporting {profile.username}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Reason *</Label>
              <div className="space-y-2 mt-2">
                {["Scam/Fraud", "Harassment", "Fake Profile", "Inappropriate Content", "Other"].map((reason) => (
                  <Button
                    key={reason}
                    variant={reportReason === reason ? "default" : "outline"}
                    className="w-full justify-start"
                    onClick={() => setReportReason(reason)}
                  >
                    {reason}
                  </Button>
                ))}
              </div>
            </div>
            <div>
              <Label>Additional Details (Optional)</Label>
              <Textarea
                placeholder="Provide any additional information about this report..."
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
              onClick={() => {
                setShowReportDialog(false)
                setReportReason("")
                setReportDetails("")
              }}
              disabled={reportLoading}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleReportUser}
              disabled={reportLoading || !reportReason}
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

      {/* Block Dialog */}
      <Dialog open={showBlockDialog} onOpenChange={setShowBlockDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{isBlocked ? "Unblock" : "Block"} User</DialogTitle>
            <DialogDescription>
              {isBlocked
                ? `Are you sure you want to unblock ${profile?.username}?`
                : `Are you sure you want to block ${profile?.username}? They won't be able to message you or see your listings.`}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBlockDialog(false)}>
              Cancel
            </Button>
            <Button
              variant={isBlocked ? "default" : "destructive"}
              onClick={() => {
                handleBlock()
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
