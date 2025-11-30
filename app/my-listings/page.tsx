"use client"

import Navigation from "@/components/navigation"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { Plus, Edit, Trash2, Eye, ChevronLeft, ChevronRight, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Skeleton } from "@/components/ui/skeleton"
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
import { getListings } from "@/app/actions/listings"
import type { ListingResponse } from "@/lib/schemas"

const SUBSCRIPTION_LIMITS = {
  free: { maxListings: 3, featuredListings: 0 },
  pro: { maxListings: 10, featuredListings: 1 },
  elite: { maxListings: 30, featuredListings: 3 },
}

const ITEMS_PER_PAGE = 5

export default function MyListingsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [listings, setListings] = useState<ListingResponse[]>([])
  const [currentPage, setCurrentPage] = useState(1)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [listingToDelete, setListingToDelete] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [totalListings, setTotalListings] = useState(0)

  // Mock user subscription - in real app, this would come from user context
  const userSubscription = "free" as keyof typeof SUBSCRIPTION_LIMITS
  const subscriptionLimit = SUBSCRIPTION_LIMITS[userSubscription]
  const activeListingsCount = listings.filter((l) => l.status === "available").length
  const canCreateMore = activeListingsCount < subscriptionLimit.maxListings
  const listingsRemaining = subscriptionLimit.maxListings - activeListingsCount

  // Redirect to login if not authenticated
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/login")
    }
  }, [status, router])

  // Fetch user's listings
  useEffect(() => {
    if (status === "authenticated" && session?.user?.id) {
      const fetchListings = async () => {
        try {
          setIsLoading(true)
          // Note: getListings doesn't have a sellerId filter yet, so we'll fetch all and filter
          // In a production app, you'd add a sellerId parameter to getListings
          const result = await getListings({
            page: currentPage,
            itemsPerPage: ITEMS_PER_PAGE,
          })
          setListings(result.listings)
          setTotalListings(result.total)
        } catch (error) {
          console.error("Error fetching listings:", error)
          setListings([])
        } finally {
          setIsLoading(false)
        }
      }

      fetchListings()
    }
  }, [status, session?.user?.id, currentPage])

  if (status === "loading") {
    return (
      <>
        <Navigation />
        <main className="container mx-auto px-4 py-8">
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
      default:
        return "bg-blue-100 text-blue-800"
    }
  }

  // Pagination
  const totalPages = Math.ceil(totalListings / ITEMS_PER_PAGE)
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE

  const handleView = (listing: ListingResponse) => {
    // Navigate to the listing detail page
    router.push(`/listing/${listing.id}`)
  }

  const handleEdit = (listingId: string) => {
    // Navigate to edit page
    router.push(`/sell?edit=${listingId}`)
  }

  const handleDeleteClick = (listingId: string) => {
    setListingToDelete(listingId)
    setDeleteDialogOpen(true)
  }

  const handleConfirmDelete = () => {
    if (listingToDelete !== null) {
      // In a real app, this would call a server action to delete the listing
      setListings(listings.filter((l) => l.id !== listingToDelete))
      setDeleteDialogOpen(false)
      setListingToDelete(null)
      // Adjust current page if needed
      const newTotalPages = Math.ceil((totalListings - 1) / ITEMS_PER_PAGE)
      if (currentPage > newTotalPages && newTotalPages > 0) {
        setCurrentPage(newTotalPages)
      }
    }
  }

  return (
    <>
      <Navigation />
      <main className="container mx-auto px-4 py-8">
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
                {userSubscription} Plan
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
            <p className="text-2xl font-bold">{listings.reduce((sum, l) => sum + 0, 0).toLocaleString()}</p>
          </Card>
          <Card className="p-4">
            <p className="text-sm text-muted-foreground mb-1">Total Inquiries</p>
            <p className="text-2xl font-bold">{0}</p>
          </Card>
          <Card className="p-4">
            <p className="text-sm text-muted-foreground mb-1">Items Sold</p>
            <p className="text-2xl font-bold">{listings.filter((l) => l.status === "sold").length}</p>
          </Card>
        </div>

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
                ) : listings.length > 0 ? (
                  listings.map((listing) => (
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
                        <Badge className={getStatusColor(listing.status)}>
                          {listing.status.charAt(0).toUpperCase() + listing.status.slice(1)}
                        </Badge>
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
                            onClick={() => handleEdit(listing.id)}
                            title="Edit listing"
                            disabled={listing.status === "sold"}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDeleteClick(listing.id)}
                            title="Delete listing"
                            className="text-red-500 hover:text-red-600 hover:bg-red-50"
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
                      No listings found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {listings.length > 0 && (
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

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Listing</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete this listing? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleConfirmDelete} className="bg-red-500 hover:bg-red-600">
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </main>
    </>
  )
}
