"use client"

import { useState, useEffect } from "react"
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
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Skeleton } from "@/components/ui/skeleton"
import { ProfileSkeleton } from "@/components/site/skeletons"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ListingCard, ListingGrid } from "@/components/listing/listing-card"
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
import { ProfileJsonLd } from "@/components/json-ld"

export default function ProfilePageClient({
  profileId,
  initialResult,
}: {
  profileId: string
  /** Loaded on the server so the profile renders immediately */
  initialResult?: Awaited<ReturnType<typeof getProfile>>
}) {
  const router = useRouter()
  const id = profileId
  const { toast } = useToast()
  const [profile, setProfile] = useState<UserProfileData | null>(
    initialResult?.success ? (initialResult.data ?? null) : null,
  )
  const [loading, setLoading] = useState(!initialResult)
  const [error, setError] = useState<string | null>(
    initialResult && !initialResult.success ? initialResult.error || "Profile not found" : null,
  )
  const [copied, setCopied] = useState(false)
  const [showMoreVouches, setShowMoreVouches] = useState(false)
  const [showReportDialog, setShowReportDialog] = useState(false)
  const [showBlockDialog, setShowBlockDialog] = useState(false)
  const [listingFilter, setListingFilter] = useState("all")
  const [listingSort, setListingSort] = useState("newest")
  const [isBlocked, setIsBlocked] = useState(false)
  const [isFollowing, setIsFollowing] = useState(Boolean(initialResult?.data?.isFollowing))
  const [followLoading, setFollowLoading] = useState(false)
  const [reportReason, setReportReason] = useState("")
  const [reportDetails, setReportDetails] = useState("")
  const [reportLoading, setReportLoading] = useState(false)
  const [reportStatusFilter, setReportStatusFilter] = useState("all")
  const [transactionSort, setTransactionSort] = useState("newest")
  const [transactionSearch, setTransactionSearch] = useState("")

  useEffect(() => {
    if (initialResult) return
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
    return <ProfileSkeleton />
  }

  // Error state
  if (error || !profile) {
    return (
      <main className="min-h-screen bg-background">
        <div className="mx-auto w-full max-w-[1440px] px-5 md:px-8 lg:px-10 py-12 flex flex-col items-center justify-center min-h-96">
          <div className="text-center">
            <h1 className="text-title mb-2">404</h1>
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

  const socialUrls = Object.values(profile?.socialLinks || {})
    .filter((value): value is string => typeof value === "string")
    .map((value) => value.trim())
    .filter((value) => /^https?:\/\//i.test(value))

  const subscriptionBadge = getSubBadge(profile?.subscriptionTier || "FREE")

  return (
    <main className="min-h-screen bg-background">
      <ProfileJsonLd
        name={profile.username}
        profilePath={`/profile/${profile.id}`}
        description={profile.bio || `${profile.username}'s RbMarket trading profile.`}
        image={profile.avatar}
        sameAs={socialUrls}
        vouchCount={profile.vouchCount}
      />

      {/* Profile Banner */}
      <div className="relative h-40 md:h-56 overflow-hidden bg-surface">
        {profile.banner && (
          <img src={profile.banner} alt="" className="h-full w-full object-cover opacity-60" />
        )}
        {/* Fade the banner into the page so the header card reads cleanly */}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/30 to-background" />
      </div>

      <div className="mx-auto w-full max-w-[1440px] px-5 md:px-8 lg:px-10 -mt-20 relative z-10">
        {/* Banned Warning Banner */}
        {profile.isBanned && (
          <Card className="mb-4 border-destructive/40 bg-destructive/10">
            <CardContent className="p-4">
              <div className="flex items-center gap-3 text-destructive">
                <Ban className="w-5 h-5 shrink-0" />
                <div>
                  <p className="font-semibold">This user has been banned</p>
                  <p className="text-sm text-destructive">
                    This account has been suspended due to violations of platform policies.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
        
        {/* Profile Header */}
        <Card className="mb-8 rounded-[24px] p-6 md:p-8">
          <div className="flex flex-col md:flex-row gap-6 items-start">
            {/* Avatar */}
            <div className="relative">
              <img
                src={profile.avatar || "/placeholder.svg"}
                alt={profile.username}
                className="size-28 md:size-32 rounded-full bg-secondary object-cover ring-4 ring-card"
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
                <h1 className="text-title">{profile.username}</h1>
                {profile.isBanned && (
                  <Badge variant="destructive" className="bg-destructive text-white">
                    <Ban className="w-3 h-3 mr-1" />
                    Banned
                  </Badge>
                )}
                {profile.isVerified && (
                  <Badge>
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
                  <p className="text-[17px] font-semibold tabular-nums flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {new Date(profile.joinDate).toLocaleDateString("en-US", { month: "short", year: "numeric" })}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Last Active</p>
                  <p className="text-[17px] font-semibold tabular-nums flex items-center gap-1">
                    <Clock className="w-3 h-3 text-success" />
                    Now
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Vouches</p>
                  <p className="text-[17px] font-semibold tabular-nums flex items-center gap-1">
                    <Check className="w-3.5 h-3.5 text-success" strokeWidth={2.5} />
                    {profile.vouchCount || 0}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Successful Trades</p>
                  <p className="text-[17px] font-semibold tabular-nums">{profile.soldItems || 0}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Response Rate</p>
                  <p className="text-[17px] font-semibold tabular-nums">{profile.responseRate || 0}%</p>
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
                      {/* Block is hidden until blocking is stored server-side; it only changed local state. */}
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
            </div>

            {/* Stats Card */}
            <div className="hidden min-w-[220px] rounded-2xl bg-secondary/50 p-5 lg:block">
              <h3 className="mb-3 text-[13px] font-medium text-muted-foreground">Trading score</h3>
              <div className="flex items-center gap-2 mb-3">
                <span className="text-3xl font-semibold text-link">
                  {profile.vouchCount > 0 ? profile.averageRating.toFixed(1) : "N/A"}
                </span>
                <div className="flex">
                  {[...Array(5)].map((_, i) => (
                    <Star 
                      key={i} 
                      className={`w-4 h-4 ${
                        i < Math.round(profile.averageRating || 0)
                          ? "fill-warning text-warning"
                          : "text-muted-foreground"
                      }`}
                    />
                  ))}
                </div>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Active Listings</span>
                  <span className="font-semibold text-success">{profile.listings?.filter((l: any) => l.status === "available").length || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Followers</span>
                  <span className="font-semibold">{profile.followers || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Scam Reports</span>
                  <span className="font-semibold text-success">0</span>
                </div>
              </div>
            </div>
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
            <ListingGrid>
              {filteredListings.map((listing: any) => (
                <ListingCard
                  key={listing.id}
                  id={listing.id}
                  title={listing.title}
                  game={listing.game || "Roblox"}
                  price={listing.price || 0}
                  image={listing.image}
                  sellerName={profile.username}
                  vouches={profile.vouchCount || 0}
                  note={listing.status === "sold" ? "Sold" : `${(listing.views || 0).toLocaleString()} views`}
                  className={listing.status === "sold" ? "opacity-60" : undefined}
                />
              ))}
            </ListingGrid>

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
                <h3 className="font-semibold mb-4">Vouch Summary</h3>
                <div className="text-center mb-4">
                  <div className="text-5xl font-semibold text-link mb-2">
                    {profile.vouchCount > 0 ? profile.averageRating.toFixed(1) : "N/A"}
                  </div>
                  <div className="flex items-center justify-center gap-1 mb-2">
                    {[...Array(5)].map((_, i) => (
                      <Star 
                        key={i} 
                        className={`w-4 h-4 ${
                          i < Math.round(profile.averageRating || 0)
                            ? "fill-warning text-warning"
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
                                i < vouch.rating ? "fill-warning text-warning" : "text-muted"
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
                    <div className="w-32 h-32 bg-muted rounded-lg overflow-hidden shrink-0">
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
                          <h3 className="font-semibold text-lg mb-1">{transaction.listingTitle}</h3>
                          <p className="text-sm text-muted-foreground">{transaction.game || "Roblox"}</p>
                        </div>
                        <Badge className="bg-success text-white">
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Completed
                        </Badge>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-3">
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Amount</p>
                          <p className="font-semibold text-link text-lg">₱{transaction.amount?.toLocaleString() || "0"}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">
                            {profile.id === transaction.sellerId ? "Buyer" : "Seller"}
                          </p>
                          <Link 
                            href={`/profile/${profile.id === transaction.sellerId ? transaction.buyerId : transaction.sellerId}`}
                            className="font-semibold hover:text-link hover:underline flex items-center gap-1"
                          >
                            {profile.id === transaction.sellerId ? transaction.buyerUsername : transaction.sellerUsername}
                          </Link>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Date</p>
                          <p className="text-[17px] font-semibold tabular-nums">
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
                    <p className="text-2xl font-semibold">{reportStats.total}</p>
                  </div>
                  <Flag className="w-8 h-8 text-muted-foreground" />
                </div>
              </Card>
              <Card className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Pending</p>
                    <p className="text-2xl font-semibold text-warning">{reportStats.pending}</p>
                  </div>
                  <Clock className="w-8 h-8 text-warning" />
                </div>
              </Card>
              <Card className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Resolved</p>
                    <p className="text-2xl font-semibold text-destructive">{reportStats.resolved}</p>
                  </div>
                  <CheckCircle className="w-8 h-8 text-destructive" />
                </div>
              </Card>
              <Card className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Dismissed</p>
                    <p className="text-2xl font-semibold text-success">{reportStats.dismissed}</p>
                  </div>
                  <Shield className="w-8 h-8 text-success" />
                </div>
              </Card>
            </div>

            <Card className="p-6 mb-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-semibold">Reports Against This User</h3>
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
                          <Link href={`/profile/${report.reporter?.id}`} className="shrink-0">
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
                            <p className="text-sm font-medium text-link mb-2">{report.reason}</p>
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
                              ? "bg-destructive text-white"
                              : report.status === "PENDING"
                              ? "border-warning/40 text-warning"
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
