"use client"

import { useState } from "react"
import Image from "next/image"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
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
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Search,
  MoreHorizontal,
  Eye,
  Trash2,
  Edit,
  Flag,
  CheckCircle,
  XCircle,
  Clock,
  Star,
  TrendingUp,
} from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"

// Mock listings data
const mockListings = [
  {
    id: "1",
    title: "Golden Dragon Pet - Limited Edition",
    description: "Rare golden dragon pet from limited event. Never traded before.",
    seller: "NinjaTrader",
    sellerAvatar: "/placeholder.svg?key=azhhu",
    game: "Adopt Me",
    price: 15000,
    currency: "Robux",
    image: "/golden-dragon-pet-roblox.jpg",
    status: "active",
    featured: true,
    boosted: true,
    createdAt: "2 hours ago",
    views: 342,
    reports: 0,
    flags: [],
  },
  {
    id: "2",
    title: "FREE ROBUX!!! CLICK HERE NOW!!!",
    description: "Get free robux instantly! No scam! 100% legit!",
    seller: "SpamBot2024",
    sellerAvatar: "/placeholder.svg?key=gn91z",
    game: "Other",
    price: 1,
    currency: "Robux",
    image: "/scam-warning-red-alert.jpg",
    status: "flagged",
    featured: false,
    boosted: false,
    createdAt: "1 day ago",
    views: 89,
    reports: 12,
    flags: ["spam", "scam", "misleading"],
  },
  {
    id: "3",
    title: "Dominus Infernus - OG Item",
    description: "Original Dominus Infernus. Proof of ownership available.",
    seller: "EliteTrader99",
    sellerAvatar: "/placeholder.svg?key=9ahw6",
    game: "Roblox Catalog",
    price: 500000,
    currency: "Robux",
    image: "/dominus-infernus-roblox-hat.jpg",
    status: "pending",
    featured: false,
    boosted: false,
    createdAt: "3 hours ago",
    views: 156,
    reports: 2,
    flags: ["high-value", "needs-verification"],
  },
  {
    id: "4",
    title: "Mega Neon Frost Dragon",
    description: "Trading mega neon frost dragon for good offers.",
    seller: "TrustyShopper",
    sellerAvatar: "/placeholder.svg?key=axt3p",
    game: "Adopt Me",
    price: 25000,
    currency: "Robux",
    image: "/neon-frost-dragon-adopt-me.jpg",
    status: "active",
    featured: false,
    boosted: true,
    createdAt: "5 hours ago",
    views: 234,
    reports: 0,
    flags: [],
  },
  {
    id: "5",
    title: "Murder Mystery 2 Godly Bundle",
    description: "Selling 5 godly knives and 3 godly guns. DM for details.",
    seller: "ScammerJoe",
    sellerAvatar: "/placeholder.svg?key=7gmm9",
    game: "Murder Mystery 2",
    price: 8000,
    currency: "Robux",
    image: "/murder-mystery-godly-knives.jpg",
    status: "removed",
    featured: false,
    boosted: false,
    createdAt: "2 days ago",
    views: 45,
    reports: 8,
    flags: ["fake-item", "scam-attempt"],
  },
  {
    id: "6",
    title: "Blox Fruits Leopard Account",
    description: "Level 2450 account with Leopard fruit awakened.",
    seller: "FruitMaster",
    sellerAvatar: "/placeholder.svg?key=c2vur",
    game: "Blox Fruits",
    price: 12000,
    currency: "Robux",
    image: "/blox-fruits-leopard.jpg",
    status: "active",
    featured: true,
    boosted: false,
    createdAt: "6 hours ago",
    views: 189,
    reports: 0,
    flags: [],
  },
]

const flagReasons = [
  { value: "spam", label: "Spam" },
  { value: "scam", label: "Scam Attempt" },
  { value: "misleading", label: "Misleading" },
  { value: "fake-item", label: "Fake Item" },
  { value: "nsfw", label: "NSFW Content" },
  { value: "illegal", label: "Illegal Trade" },
  { value: "price-manipulation", label: "Price Manipulation" },
  { value: "duplicate", label: "Duplicate Listing" },
]

export default function ListingsPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [gameFilter, setGameFilter] = useState("all")
  const [selectedListing, setSelectedListing] = useState<(typeof mockListings)[0] | null>(null)
  const [actionDialogOpen, setActionDialogOpen] = useState(false)
  const [actionType, setActionType] = useState<string>("")
  const [actionReason, setActionReason] = useState("")
  const [selectedFlags, setSelectedFlags] = useState<string[]>([])

  const filteredListings = mockListings.filter((listing) => {
    const matchesSearch =
      listing.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      listing.seller.toLowerCase().includes(searchQuery.toLowerCase())

    const matchesStatus = statusFilter === "all" || listing.status === statusFilter

    const matchesGame = gameFilter === "all" || listing.game === gameFilter

    return matchesSearch && matchesStatus && matchesGame
  })

  const stats = {
    total: mockListings.length,
    active: mockListings.filter((l) => l.status === "active").length,
    pending: mockListings.filter((l) => l.status === "pending").length,
    flagged: mockListings.filter((l) => l.status === "flagged").length,
    removed: mockListings.filter((l) => l.status === "removed").length,
  }

  const handleAction = (listing: (typeof mockListings)[0], action: string) => {
    setSelectedListing(listing)
    setActionType(action)
    setSelectedFlags(listing.flags || [])
    setActionDialogOpen(true)
  }

  const executeAction = () => {
    console.log(`Executing ${actionType} on listing ${selectedListing?.id} with reason: ${actionReason}`)
    setActionDialogOpen(false)
    setActionReason("")
    setSelectedFlags([])
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return <Badge className="bg-green-500 text-white">Active</Badge>
      case "pending":
        return <Badge className="bg-yellow-500 text-white">Pending Review</Badge>
      case "flagged":
        return <Badge variant="destructive">Flagged</Badge>
      case "removed":
        return <Badge variant="secondary">Removed</Badge>
      case "sold":
        return <Badge className="bg-blue-500 text-white">Sold</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Listing Management</h1>
        <p className="text-muted-foreground">Review, moderate, and manage marketplace listings</p>
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
            <p className="text-2xl font-bold text-green-500">{stats.active}</p>
            <p className="text-sm text-muted-foreground">Active</p>
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
            <p className="text-2xl font-bold text-red-500">{stats.flagged}</p>
            <p className="text-sm text-muted-foreground">Flagged</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-muted-foreground">{stats.removed}</p>
            <p className="text-sm text-muted-foreground">Removed</p>
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
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="flagged">Flagged</SelectItem>
                <SelectItem value="removed">Removed</SelectItem>
              </SelectContent>
            </Select>
            <Select value={gameFilter} onValueChange={setGameFilter}>
              <SelectTrigger className="w-full md:w-[180px]">
                <SelectValue placeholder="Game" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Games</SelectItem>
                <SelectItem value="Adopt Me">Adopt Me</SelectItem>
                <SelectItem value="Murder Mystery 2">Murder Mystery 2</SelectItem>
                <SelectItem value="Blox Fruits">Blox Fruits</SelectItem>
                <SelectItem value="Roblox Catalog">Roblox Catalog</SelectItem>
                <SelectItem value="Other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Listings Tabs */}
      <Tabs defaultValue="all">
        <TabsList>
          <TabsTrigger value="all">All Listings</TabsTrigger>
          <TabsTrigger value="flagged" className="text-red-500">
            Flagged Queue ({stats.flagged})
          </TabsTrigger>
          <TabsTrigger value="pending" className="text-yellow-500">
            Pending Review ({stats.pending})
          </TabsTrigger>
          <TabsTrigger value="featured">Featured</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredListings.map((listing) => (
              <Card key={listing.id} className="overflow-hidden">
                <div className="relative">
                  <Image
                    src={listing.image || "/placeholder.svg"}
                    alt={listing.title}
                    width={400}
                    height={200}
                    className="w-full h-40 object-cover"
                  />
                  <div className="absolute top-2 left-2 flex gap-1">{getStatusBadge(listing.status)}</div>
                  <div className="absolute top-2 right-2 flex gap-1">
                    {listing.featured && (
                      <Badge className="bg-amber-500 text-white">
                        <Star className="h-3 w-3 mr-1" />
                        Featured
                      </Badge>
                    )}
                    {listing.boosted && (
                      <Badge className="bg-blue-500 text-white">
                        <TrendingUp className="h-3 w-3 mr-1" />
                        Boosted
                      </Badge>
                    )}
                  </div>
                  {listing.reports > 0 && (
                    <div className="absolute bottom-2 right-2">
                      <Badge variant="destructive">
                        <Flag className="h-3 w-3 mr-1" />
                        {listing.reports} reports
                      </Badge>
                    </div>
                  )}
                </div>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-semibold line-clamp-1">{listing.title}</h3>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setSelectedListing(listing)}>
                          <Eye className="h-4 w-4 mr-2" />
                          View Details
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleAction(listing, "edit")}>
                          <Edit className="h-4 w-4 mr-2" />
                          Edit Listing
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        {listing.status !== "active" && (
                          <DropdownMenuItem onClick={() => handleAction(listing, "approve")}>
                            <CheckCircle className="h-4 w-4 mr-2" />
                            Approve
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem onClick={() => handleAction(listing, "flag")}>
                          <Flag className="h-4 w-4 mr-2" />
                          Flag Listing
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleAction(listing, "remove")} className="text-destructive">
                          <Trash2 className="h-4 w-4 mr-2" />
                          Remove
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{listing.description}</p>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Avatar className="h-6 w-6">
                        <AvatarImage src={listing.sellerAvatar || "/placeholder.svg"} />
                        <AvatarFallback>{listing.seller.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <span className="text-sm text-muted-foreground">{listing.seller}</span>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-primary">
                        {listing.price.toLocaleString()} {listing.currency}
                      </p>
                      <p className="text-xs text-muted-foreground">{listing.views} views</p>
                    </div>
                  </div>
                  {listing.flags.length > 0 && (
                    <div className="mt-3 pt-3 border-t flex flex-wrap gap-1">
                      {listing.flags.map((flag) => (
                        <Badge key={flag} variant="outline" className="text-xs">
                          {flag}
                        </Badge>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="flagged" className="mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredListings
              .filter((l) => l.status === "flagged")
              .map((listing) => (
                <Card key={listing.id} className="overflow-hidden border-destructive/50">
                  <div className="relative">
                    <Image
                      src={listing.image || "/placeholder.svg"}
                      alt={listing.title}
                      width={400}
                      height={200}
                      className="w-full h-40 object-cover"
                    />
                    <div className="absolute inset-0 bg-destructive/10" />
                    <div className="absolute top-2 left-2">
                      <Badge variant="destructive">Flagged</Badge>
                    </div>
                    <div className="absolute bottom-2 right-2">
                      <Badge variant="destructive">
                        <Flag className="h-3 w-3 mr-1" />
                        {listing.reports} reports
                      </Badge>
                    </div>
                  </div>
                  <CardContent className="p-4">
                    <h3 className="font-semibold line-clamp-1 mb-2">{listing.title}</h3>
                    <div className="flex items-center gap-2 mb-3">
                      <Avatar className="h-6 w-6">
                        <AvatarImage src={listing.sellerAvatar || "/placeholder.svg"} />
                        <AvatarFallback>{listing.seller.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <span className="text-sm text-muted-foreground">{listing.seller}</span>
                    </div>
                    <div className="flex flex-wrap gap-1 mb-3">
                      {listing.flags.map((flag) => (
                        <Badge key={flag} variant="destructive" className="text-xs">
                          {flag}
                        </Badge>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" className="flex-1" onClick={() => handleAction(listing, "approve")}>
                        <CheckCircle className="h-4 w-4 mr-1" />
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        className="flex-1"
                        onClick={() => handleAction(listing, "remove")}
                      >
                        <Trash2 className="h-4 w-4 mr-1" />
                        Remove
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
          </div>
        </TabsContent>

        <TabsContent value="pending" className="mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredListings
              .filter((l) => l.status === "pending")
              .map((listing) => (
                <Card key={listing.id} className="overflow-hidden border-yellow-500/50">
                  <div className="relative">
                    <Image
                      src={listing.image || "/placeholder.svg"}
                      alt={listing.title}
                      width={400}
                      height={200}
                      className="w-full h-40 object-cover"
                    />
                    <div className="absolute top-2 left-2">
                      <Badge className="bg-yellow-500 text-white">
                        <Clock className="h-3 w-3 mr-1" />
                        Pending Review
                      </Badge>
                    </div>
                  </div>
                  <CardContent className="p-4">
                    <h3 className="font-semibold line-clamp-1 mb-2">{listing.title}</h3>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Avatar className="h-6 w-6">
                          <AvatarImage src={listing.sellerAvatar || "/placeholder.svg"} />
                          <AvatarFallback>{listing.seller.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <span className="text-sm text-muted-foreground">{listing.seller}</span>
                      </div>
                      <p className="font-semibold text-primary">{listing.price.toLocaleString()} R$</p>
                    </div>
                    {listing.flags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-3">
                        {listing.flags.map((flag) => (
                          <Badge key={flag} variant="outline" className="text-xs">
                            {flag}
                          </Badge>
                        ))}
                      </div>
                    )}
                    <div className="flex gap-2">
                      <Button size="sm" className="flex-1" onClick={() => handleAction(listing, "approve")}>
                        <CheckCircle className="h-4 w-4 mr-1" />
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1 bg-transparent"
                        onClick={() => handleAction(listing, "flag")}
                      >
                        <Flag className="h-4 w-4 mr-1" />
                        Flag
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
          </div>
        </TabsContent>

        <TabsContent value="featured" className="mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredListings
              .filter((l) => l.featured || l.boosted)
              .map((listing) => (
                <Card key={listing.id} className="overflow-hidden border-amber-500/50">
                  <div className="relative">
                    <Image
                      src={listing.image || "/placeholder.svg"}
                      alt={listing.title}
                      width={400}
                      height={200}
                      className="w-full h-40 object-cover"
                    />
                    <div className="absolute top-2 right-2 flex gap-1">
                      {listing.featured && (
                        <Badge className="bg-amber-500 text-white">
                          <Star className="h-3 w-3 mr-1" />
                          Featured
                        </Badge>
                      )}
                      {listing.boosted && (
                        <Badge className="bg-blue-500 text-white">
                          <TrendingUp className="h-3 w-3 mr-1" />
                          Boosted
                        </Badge>
                      )}
                    </div>
                  </div>
                  <CardContent className="p-4">
                    <h3 className="font-semibold line-clamp-1 mb-2">{listing.title}</h3>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Avatar className="h-6 w-6">
                          <AvatarImage src={listing.sellerAvatar || "/placeholder.svg"} />
                          <AvatarFallback>{listing.seller.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <span className="text-sm text-muted-foreground">{listing.seller}</span>
                      </div>
                      <p className="font-semibold text-primary">{listing.price.toLocaleString()} R$</p>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" className="flex-1 bg-transparent">
                        <Eye className="h-4 w-4 mr-1" />
                        View
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1 bg-transparent"
                        onClick={() => handleAction(listing, "remove-feature")}
                      >
                        <XCircle className="h-4 w-4 mr-1" />
                        Unfeature
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* Action Dialog */}
      <Dialog open={actionDialogOpen} onOpenChange={setActionDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="capitalize">
              {actionType === "remove"
                ? "Remove Listing"
                : actionType === "flag"
                  ? "Flag Listing"
                  : actionType === "approve"
                    ? "Approve Listing"
                    : actionType}
            </DialogTitle>
            <DialogDescription>
              {actionType === "remove"
                ? "This will remove the listing from the marketplace."
                : actionType === "flag"
                  ? "Select the reasons for flagging this listing."
                  : actionType === "approve"
                    ? "This will approve the listing and make it visible."
                    : `Modifying listing: ${selectedListing?.title}`}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {actionType === "flag" && (
              <div className="space-y-3">
                <Label>Flag Reasons</Label>
                <div className="grid grid-cols-2 gap-2">
                  {flagReasons.map((reason) => (
                    <div key={reason.value} className="flex items-center space-x-2">
                      <Checkbox
                        id={reason.value}
                        checked={selectedFlags.includes(reason.value)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSelectedFlags([...selectedFlags, reason.value])
                          } else {
                            setSelectedFlags(selectedFlags.filter((f) => f !== reason.value))
                          }
                        }}
                      />
                      <label htmlFor={reason.value} className="text-sm">
                        {reason.label}
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {(actionType === "remove" || actionType === "flag") && (
              <div>
                <Label>Additional Notes</Label>
                <Textarea
                  placeholder="Enter additional notes..."
                  value={actionReason}
                  onChange={(e) => setActionReason(e.target.value)}
                  className="mt-2"
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setActionDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant={actionType === "remove" ? "destructive" : "default"} onClick={executeAction}>
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
