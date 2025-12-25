"use client"

import Navigation from "@/components/navigation"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { Plus, Trash2, Eye, ChevronLeft, ChevronRight, AlertCircle, Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Skeleton } from "@/components/ui/skeleton"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import Link from "next/link"
import { useSession } from "next-auth/react"
import { getUserListings } from "@/app/actions/listings"
import { deleteListingSoft, toggleListingStatus } from "@/app/actions/listings-management"
import { getMySubscription, getSubscriptionLimitsFromSettings, checkAndExpireSubscriptions } from "@/app/actions/subscriptions"
import { getSubscriptionLimits } from "@/lib/subscription-utils"
import type { ListingResponse } from "@/lib/schemas"
import { useToast } from "@/hooks/use-toast"

const ITEMS_PER_PAGE = 5

export default function MyListingsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const { toast } = useToast()
  const [listings, setListings] = useState<ListingResponse[]>([])
  const [currentPage, setCurrentPage] = useState(1)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deleteConfirmDialogOpen, setDeleteConfirmDialogOpen] = useState(false)
  const [listingToDelete, setListingToDelete] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isDeleting, setIsDeleting] = useState(false)
  const [totalListings, setTotalListings] = useState(0)
  const [subscriptionTier, setSubscriptionTier] = useState("FREE")
  const [customLimits, setCustomLimits] = useState<{ free?: number; pro?: number; elite?: number }>()
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [typeFilter, setTypeFilter] = useState<string>("all")
  
  const subscriptionLimit = getSubscriptionLimits(subscriptionTier, customLimits)
  const activeListingsCount = listings.filter((l) => l.status === "available").length
  const canCreateMore = activeListingsCount < subscriptionLimit.maxListings
  const listingsRemaining = subscriptionLimit.maxListings - activeListingsCount

  // Redirect to login if not authenticated
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/login")
    }
  }, [status, router])

  // Fetch user's listings and subscription
  useEffect(() => {
    if (status === "authenticated" && session?.user?.id) {
      const fetchData = async () => {
        try {
          setIsLoading(true)
          
          // Check for expired subscriptions first (will hide excess listings if needed)
          await checkAndExpireSubscriptions(session.user.id)
          
          // Fetch listings, subscription, and system limits in parallel
          const [listingsResult, subscriptionResult, limitsResult] = await Promise.all([
            getUserListings(session.user.id, currentPage, ITEMS_PER_PAGE),
            getMySubscription(session.user.id),
            getSubscriptionLimitsFromSettings()
          ])
          
          setListings(listingsResult.listings)
          setTotalListings(listingsResult.total)
          
          if (subscriptionResult.success && subscriptionResult.data) {
            setSubscriptionTier(subscriptionResult.data.tier)
          }

          if (limitsResult.success && limitsResult.limits) {
            setCustomLimits(limitsResult.limits)
          }
        } catch (error) {
          console.error("Error fetching data:", error)
          setListings([])
        } finally {
          setIsLoading(false)
        }
      }

      fetchData()
    }
  }, [status, session?.user?.id, currentPage])

  if (status === "loading") {
    return (
      <>
        <Navigation />
        <main className="container max-w-[1920px] mx-auto px-6 py-8">
          <Skeleton className="h-12 w-64 mb-8" />
          <Skeleton className="h-24 mb-6" />
          <Skeleton className="h-96 mb-8" />
        </main>
      </>
    )
  }

  if (status === "unauthenticated") return null

  const getStatusColor = (status: string) => {
    switch (status) {
      case "available":
        return "bg-green-100 text-green-800"
      case "sold":
        return "bg-gray-100 text-gray-800"
      case "pending":
        return "bg-yellow-100 text-yellow-800"
      case "hidden":
        return "bg-orange-100 text-orange-800"
      case "deleted":
        return "bg-red-100 text-red-800"
      default:
        return "bg-blue-100 text-blue-800"
    }
  }

  // Pagination
  const totalPages = Math.ceil(totalListings / ITEMS_PER_PAGE)
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE

  // Filter and search listings
  const filteredListings = listings.filter((listing) => {
    const matchesSearch = searchQuery === "" || 
      listing.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      listing.game?.toLowerCase().includes(searchQuery.toLowerCase())
    
    const matchesStatus = statusFilter === "all" || listing.status === statusFilter
    const matchesType = typeFilter === "all" || listing.listingType === typeFilter

    return matchesSearch && matchesStatus && matchesType
  })

  const handleView = (listing: ListingResponse) => {
    // Navigate to the listing detail page
    router.push(`/listing/${listing.id}`)
  }

  const handleDeleteClick = (listingId: string) => {
    setListingToDelete(listingId)
    setDeleteDialogOpen(true)
  }

  const handleFirstConfirm = () => {
    setDeleteDialogOpen(false)
    setDeleteConfirmDialogOpen(true)
  }

  const handleConfirmDelete = async () => {
    if (listingToDelete === null) return

    const listing = listings.find((l) => l.id === listingToDelete)
    if (!listing) return

    setIsDeleting(true)
    try {
      const result = await deleteListingSoft(listingToDelete, listing.listingType as "ITEM" | "CURRENCY")

      if (result.success) {
        // Remove listing from local state
        setListings(listings.filter((l) => l.id !== listingToDelete))
        setTotalListings((prev) => prev - 1)

        toast({
          title: "Listing Deleted",
          description: "Your listing has been deleted successfully. All related conversations and transactions have been cancelled.",
        })

        // Adjust current page if needed
        const newTotalPages = Math.ceil((totalListings - 1) / ITEMS_PER_PAGE)
        if (currentPage > newTotalPages && newTotalPages > 0) {
          setCurrentPage(newTotalPages)
        }
      } else {
        toast({
          title: "Delete Failed",
          description: result.error || "Failed to delete listing. Please try again.",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsDeleting(false)
      setDeleteConfirmDialogOpen(false)
      setListingToDelete(null)
    }
  }

  const handleToggleStatus = async (listingId: string, currentStatus: string) => {
    const listing = listings.find((l) => l.id === listingId)
    if (!listing) return

    const newStatus = currentStatus === "available" ? "hidden" : "available"

    try {
      const result = await toggleListingStatus(listingId, newStatus, listing.listingType as "ITEM" | "CURRENCY")

      if (result.success) {
        // Update local state
        setListings(
          listings.map((l) =>
            l.id === listingId ? { ...l, status: newStatus } : l
          )
        )

        toast({
          title: "Status Updated",
          description: `Listing is now ${newStatus === "available" ? "visible" : "hidden"} in the marketplace.`,
        })
      } else {
        toast({
          title: "Update Failed",
          description: result.error || "Failed to update listing status. Please try again.",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      })
    }
  }

  return (
    <>
      <Navigation />
      <main className="container max-w-[1920px] mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold">My Listings</h1>
          <Link href="/sell">
            <Button disabled={!canCreateMore}>
              <Plus className="w-4 h-4 mr-2" />
              Create New Listing
            </Button>
          </Link>
        </div>

        <Card className="p-4 mb-6">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="font-medium">Listing Limit</span>
              <Badge variant="outline" className="capitalize">
                {subscriptionTier.toLowerCase()} Plan
              </Badge>
            </div>
            <span className="text-sm text-muted-foreground">
              {activeListingsCount} / {subscriptionLimit.maxListings} active listings
            </span>
          </div>
          <Progress value={(activeListingsCount / subscriptionLimit.maxListings) * 100} className="h-2" />
          <div className="flex items-center justify-between mt-2">
            <p className="text-sm text-muted-foreground">
              {canCreateMore ? (
                <>
                  You can create {listingsRemaining} more listing{listingsRemaining !== 1 ? "s" : ""}
                </>
              ) : (
                <span className="flex items-center gap-1 text-orange-500">
                  <AlertCircle className="h-4 w-4" />
                  Listing limit reached
                </span>
              )}
            </p>
            <Link href="/subscriptions">
              <Button variant="link" size="sm" className="p-0 h-auto">
                Upgrade Plan
              </Button>
            </Link>
          </div>
        </Card>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card className="p-4">
            <p className="text-sm text-muted-foreground mb-1">Active Listings</p>
            <p className="text-2xl font-bold">{activeListingsCount}</p>
          </Card>
          <Card className="p-4">
            <p className="text-sm text-muted-foreground mb-1">Total Views</p>
            <p className="text-2xl font-bold">{listings.reduce((sum, l) => sum + (l.views || 0), 0).toLocaleString()}</p>
          </Card>
          <Card className="p-4">
            <p className="text-sm text-muted-foreground mb-1">Total Inquiries</p>
            <p className="text-2xl font-bold">{listings.reduce((sum, l) => sum + (l.inquiries || 0), 0).toLocaleString()}</p>
          </Card>
          <Card className="p-4">
            <p className="text-sm text-muted-foreground mb-1">Items Sold</p>
            <p className="text-2xl font-bold">{listings.filter((l) => l.status === "sold").length}</p>
          </Card>
        </div>

        {/* Search and Filters */}
        <Card className="p-4 mb-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search by title or game..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="available">Available</SelectItem>
                <SelectItem value="hidden">Hidden</SelectItem>
                <SelectItem value="sold">Sold</SelectItem>
              </SelectContent>
            </Select>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="Item">Items</SelectItem>
                <SelectItem value="Currency">Currency</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </Card>

        {/* Listings Table */}
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b bg-muted">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-semibold">Item</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold">Game</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold">Price</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold">Status</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold">Category</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  Array.from({ length: ITEMS_PER_PAGE }).map((_, i) => (
                    <tr key={i} className="border-b">
                      <td colSpan={6} className="px-6 py-4">
                        <Skeleton className="h-10" />
                      </td>
                    </tr>
                  ))
                ) : filteredListings.length > 0 ? (
                  filteredListings.map((listing) => (
                    <tr key={listing.id} className="border-b hover:bg-muted/50">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <img
                            src={listing.image || "/placeholder.svg"}
                            alt={listing.title}
                            className="w-10 h-10 rounded object-cover"
                          />
                          <span className="font-medium">{listing.title}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm">{listing.game}</td>
                      <td className="px-6 py-4 font-bold text-primary">₱{listing.price.toLocaleString()}</td>
                      <td className="px-6 py-4">
                        {(listing.status === "available" || listing.status === "hidden") ? (
                          <Select
                            value={listing.status}
                            onValueChange={(value) => handleToggleStatus(listing.id, listing.status)}
                          >
                            <SelectTrigger className="w-[130px]">
                              <SelectValue>
                                <Badge className={getStatusColor(listing.status)}>
                                  {listing.status.charAt(0).toUpperCase() + listing.status.slice(1)}
                                </Badge>
                              </SelectValue>
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="available">
                                <div className="flex items-center gap-2">
                                  <div className="w-2 h-2 rounded-full bg-green-500" />
                                  Available
                                </div>
                              </SelectItem>
                              <SelectItem value="hidden">
                                <div className="flex items-center gap-2">
                                  <div className="w-2 h-2 rounded-full bg-orange-500" />
                                  Hidden
                                </div>
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        ) : (
                          <Badge className={getStatusColor(listing.status)}>
                            {listing.status.charAt(0).toUpperCase() + listing.status.slice(1)}
                          </Badge>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm">{listing.category}</td>
                      <td className="px-6 py-4">
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleView(listing)}
                            title="View listing"
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDeleteClick(listing.id)}
                            title="Delete listing"
                            disabled={listing.status === "sold"}
                            className="text-red-500 hover:text-red-600 hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-muted-foreground">
                      {searchQuery || statusFilter !== "all" || typeFilter !== "all" 
                        ? "No listings found matching your filters"
                        : "No listings found"}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {filteredListings.length > 0 && (
            <div className="flex items-center justify-between px-6 py-4 border-t">
              <p className="text-sm text-muted-foreground">
                Showing {startIndex + 1}-{Math.min(startIndex + ITEMS_PER_PAGE, totalListings)} of {totalListings}{" "}
                listings
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                  <Button
                    key={page}
                    variant={currentPage === page ? "default" : "outline"}
                    size="sm"
                    onClick={() => setCurrentPage(page)}
                    className="w-8"
                  >
                    {page}
                  </Button>
                ))}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </Card>

        {/* Delete Confirmation Dialog - First Step */}
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Listing?</AlertDialogTitle>
              <AlertDialogDescription>
                This will delete your listing and cancel all related conversations and transactions.
                This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleFirstConfirm} className="bg-red-500 hover:bg-red-600">
                Continue
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Delete Confirmation Dialog - Second Step */}
        <AlertDialog open={deleteConfirmDialogOpen} onOpenChange={setDeleteConfirmDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
              <div className="space-y-2 text-sm text-muted-foreground pt-2">
                <div className="font-semibold text-foreground">This will permanently delete your listing and:</div>
                <ul className="list-disc list-inside space-y-1">
                  <li>Cancel all active conversations</li>
                  <li>Cancel all pending transactions</li>
                  <li>Send notifications to all buyers</li>
                  <li>Remove the listing from the marketplace</li>
                </ul>
                <div className="text-red-600 font-medium mt-3">This action cannot be undone!</div>
              </div>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
              <AlertDialogAction 
                onClick={handleConfirmDelete} 
                disabled={isDeleting}
                className="bg-red-500 hover:bg-red-600"
              >
                {isDeleting ? "Deleting..." : "Yes, Delete Listing"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </main>
    </>
  )
}
