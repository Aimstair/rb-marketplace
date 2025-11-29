"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import Image from "next/image"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import {
  Search,
  MoreHorizontal,
  Loader2,
  ChevronRight,
} from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { getAdminListings, adminUpdateListingStatus } from "@/app/actions/admin"
import { useToast } from "@/components/ui/use-toast"

const validStatuses = [
  { value: "available", label: "Available" },
  { value: "sold", label: "Sold" },
  { value: "hidden", label: "Hidden" },
  { value: "pending", label: "Pending Review" },
  { value: "banned", label: "Banned" },
]

export default function ListingsPage() {
  const { toast } = useToast()
  const [listings, setListings] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [selectedListing, setSelectedListing] = useState<any>(null)
  const [actionDialogOpen, setActionDialogOpen] = useState(false)
  const [newStatus, setNewStatus] = useState("")
  const [actionReason, setActionReason] = useState("")
  const [actionLoading, setActionLoading] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(0)

  // Load listings
  useEffect(() => {
    const loadListings = async () => {
      try {
        setLoading(true)
        const result = await getAdminListings(currentPage, searchQuery, statusFilter === "all" ? "all" : statusFilter)
        if (result.success && result.listings) {
          setListings(result.listings)
          setTotalPages(result.pages || 0)
        }
      } catch (err) {
        console.error("Failed to load listings:", err)
        toast({ title: "Error", description: "Failed to load listings", variant: "destructive" })
      } finally {
        setLoading(false)
      }
    }

    loadListings()
  }, [searchQuery, statusFilter, currentPage, toast])

  const stats = {
    total: listings.length,
    available: listings.filter((l) => l.status === "available").length,
    pending: listings.filter((l) => l.status === "pending").length,
    hidden: listings.filter((l) => l.status === "hidden").length,
    banned: listings.filter((l) => l.status === "banned").length,
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "available":
        return <Badge className="bg-green-500 text-white">Available</Badge>
      case "pending":
        return <Badge className="bg-yellow-500 text-white">Pending Review</Badge>
      case "hidden":
        return <Badge variant="secondary">Hidden</Badge>
      case "banned":
        return <Badge variant="destructive">Banned</Badge>
      case "sold":
        return <Badge className="bg-blue-500 text-white">Sold</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const handleAction = (listing: any, newStat: string) => {
    setSelectedListing(listing)
    setNewStatus(newStat)
    setActionDialogOpen(true)
  }

  const executeAction = async () => {
    if (!selectedListing || !newStatus) return

    try {
      setActionLoading(true)

      const result = await adminUpdateListingStatus(selectedListing.id, newStatus)

      if (result.success) {
        toast({
          title: "Success",
          description: `Listing status updated to ${newStatus}`,
        })
        // Update local state
        setListings(
          listings.map((l) => (l.id === selectedListing.id ? { ...l, status: newStatus } : l))
        )
        setActionDialogOpen(false)
        setActionReason("")
      } else {
        toast({ title: "Error", description: result.error || "Failed to update listing", variant: "destructive" })
      }
    } finally {
      setActionLoading(false)
    }
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Listing Management</h1>
        <p className="text-muted-foreground">Review and moderate marketplace listings</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold">{stats.total}</p>
            <p className="text-sm text-muted-foreground">Total</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-green-500">{stats.available}</p>
            <p className="text-sm text-muted-foreground">Available</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-yellow-500">{stats.pending}</p>
            <p className="text-sm text-muted-foreground">Pending</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-muted-foreground">{stats.hidden}</p>
            <p className="text-sm text-muted-foreground">Hidden</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-red-500">{stats.banned}</p>
            <p className="text-sm text-muted-foreground">Banned</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by title or seller..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-[180px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="available">Available</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="hidden">Hidden</SelectItem>
                <SelectItem value="banned">Banned</SelectItem>
                <SelectItem value="sold">Sold</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Listings Table */}
      <Card>
        <CardHeader>
          <CardTitle>Listings</CardTitle>
          <CardDescription>{listings.length} listings</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center h-[400px]">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : listings.length === 0 ? (
            <div className="flex items-center justify-center h-[400px]">
              <div className="text-center">
                <p className="text-muted-foreground">No listings found</p>
              </div>
            </div>
          ) : (
            <ScrollArea className="w-full">
              <div className="space-y-2">
                {listings.map((listing) => (
                  <div
                    key={listing.id}
                    onClick={() => setSelectedListing(listing)}
                    className={`p-4 border rounded-lg cursor-pointer transition-colors hover:bg-muted/50 ${
                      selectedListing?.id === listing.id ? "border-primary bg-muted/50" : ""
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      {/* Listing Image */}
                      <div className="relative h-16 w-16 flex-shrink-0">
                        <Image
                          src={listing.image || "/placeholder.svg"}
                          alt={listing.title}
                          fill
                          className="object-cover rounded"
                        />
                      </div>

                      {/* Listing Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="font-semibold truncate">{listing.title}</p>
                            <p className="text-sm text-muted-foreground truncate">{listing.description}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <Avatar className="h-6 w-6">
                                <AvatarImage src={listing.seller.profilePicture || "/placeholder.svg"} />
                                <AvatarFallback>{listing.seller.username.charAt(0)}</AvatarFallback>
                              </Avatar>
                              <span className="text-xs text-muted-foreground">{listing.seller.username}</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Price & Status */}
                      <div className="text-right flex-shrink-0">
                        <p className="font-semibold">{listing.price} Robux</p>
                        {getStatusBadge(listing.status)}
                      </div>

                      {/* Actions */}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleAction(listing, "available")}>
                            Mark Available
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleAction(listing, "hidden")}>
                            Hide Listing
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleAction(listing, "banned")}>
                            Ban Listing
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleAction(listing, "sold")}>
                            Mark Sold
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem asChild>
                            <Link href={`/listing/${listing.id}`} target="_blank">
                              View Listing
                              <ChevronRight className="h-3 w-3 ml-auto" />
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild>
                            <Link href={`/profile/${listing.sellerId}`} target="_blank">
                              View Seller
                              <ChevronRight className="h-3 w-3 ml-auto" />
                            </Link>
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}

          {/* Pagination */}
          {totalPages > 1 && !loading && (
            <div className="flex items-center justify-between mt-4 pt-4 border-t">
              <Button
                variant="outline"
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
              >
                Previous
              </Button>
              <span className="text-sm text-muted-foreground">
                Page {currentPage} of {totalPages}
              </span>
              <Button
                variant="outline"
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
              >
                Next
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Listing Details Panel */}
      {selectedListing && (
        <Card>
          <CardHeader>
            <CardTitle>Listing Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Image */}
            <div className="relative w-full h-48">
              <Image
                src={selectedListing.image || "/placeholder.svg"}
                alt={selectedListing.title}
                fill
                className="object-cover rounded"
              />
            </div>

            {/* Basic Info */}
            <div className="space-y-3">
              <div>
                <p className="text-sm font-semibold text-muted-foreground">Title</p>
                <p className="font-semibold">{selectedListing.title}</p>
              </div>
              <div>
                <p className="text-sm font-semibold text-muted-foreground">Description</p>
                <p className="text-sm">{selectedListing.description}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-semibold text-muted-foreground">Price</p>
                  <p className="font-semibold">{selectedListing.price} Robux</p>
                </div>
                <div>
                  <p className="text-sm font-semibold text-muted-foreground">Status</p>
                  {getStatusBadge(selectedListing.status)}
                </div>
              </div>
            </div>

            {/* Seller Info */}
            <div className="p-4 bg-muted/50 rounded-lg">
              <p className="text-sm font-semibold text-muted-foreground mb-3">Seller</p>
              <div className="flex items-center gap-3">
                <Avatar>
                  <AvatarImage src={selectedListing.seller.profilePicture || "/placeholder.svg"} />
                  <AvatarFallback>{selectedListing.seller.username.charAt(0)}</AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <p className="font-semibold">{selectedListing.seller.username}</p>
                  <p className="text-xs text-muted-foreground">ID: {selectedListing.sellerId}</p>
                </div>
                <Link href={`/profile/${selectedListing.sellerId}`} target="_blank">
                  <Button variant="outline" size="sm">
                    View Profile
                  </Button>
                </Link>
              </div>
            </div>

            {/* Created At */}
            <div>
              <p className="text-sm font-semibold text-muted-foreground">Created</p>
              <p className="text-sm">{new Date(selectedListing.createdAt).toLocaleString()}</p>
            </div>

            <Separator />

            {/* Actions */}
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => handleAction(selectedListing, "available")}
                disabled={selectedListing.status === "available"}
                className="flex-1"
              >
                Mark Available
              </Button>
              <Button
                variant="outline"
                onClick={() => handleAction(selectedListing, "hidden")}
                disabled={selectedListing.status === "hidden"}
                className="flex-1"
              >
                Hide
              </Button>
              <Button
                variant="destructive"
                onClick={() => handleAction(selectedListing, "banned")}
                disabled={selectedListing.status === "banned"}
                className="flex-1"
              >
                Ban Item
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Status Change Dialog */}
      <Dialog open={actionDialogOpen} onOpenChange={setActionDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change Listing Status</DialogTitle>
            <DialogDescription>
              Update the status of "{selectedListing?.title}"
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>New Status</Label>
              <Select value={newStatus} onValueChange={setNewStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {validStatuses.map((status) => (
                    <SelectItem key={status.value} value={status.value}>
                      {status.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Reason (optional)</Label>
              <Textarea
                placeholder="Enter reason for this action..."
                value={actionReason}
                onChange={(e) => setActionReason(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setActionDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={executeAction} disabled={actionLoading}>
              {actionLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              Update Status
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
