"use client"

import { useState, useEffect } from "react"
import { Clock, CheckCircle, AlertTriangle, DollarSign, ArrowRight, MessageSquare, ExternalLink } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Search } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { getDisputes, resolveDispute } from "@/app/actions/admin"
import { useAuth } from "@/lib/auth-context"

interface Dispute {
  id: string
  reason: string
  status: string
  resolution?: string
  transaction: {
    id: string
    buyer: { id: string; username: string }
    seller: { id: string; username: string }
    listing: { id: string; title: string; price: number }
    price: number
  }
  createdAt: Date
}

export default function DisputesPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [disputes, setDisputes] = useState<Dispute[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedDispute, setSelectedDispute] = useState<Dispute | null>(null)
  const [isResolveDialogOpen, setIsResolveDialogOpen] = useState(false)
  const [resolution, setResolution] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { user } = useAuth()

  // Fetch disputes on mount
  useEffect(() => {
    const fetchDisputes = async () => {
      try {
        setIsLoading(true)
        const result = await getDisputes()
        if (result.success && result.disputes) {
          setDisputes(result.disputes)
        }
      } catch (error) {
        console.error("Failed to fetch disputes:", error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchDisputes()
  }, [])

  const filteredDisputes = disputes.filter((dispute) => {
    const matchesSearch =
      dispute.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      dispute.transaction.buyer.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
      dispute.transaction.seller.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
      dispute.transaction.listing.title.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStatus = statusFilter === "all" || dispute.status === statusFilter
    return matchesSearch && matchesStatus
  })

  const handleResolve = async () => {
    if (!selectedDispute || !user || !resolution.trim()) return

    try {
      setIsSubmitting(true)
      const result = await resolveDispute(selectedDispute.id, resolution, user.id)
      if (result.success) {
        setDisputes(disputes.map((d) => (d.id === selectedDispute.id ? { ...d, status: "RESOLVED", resolution } : d)))
        setIsResolveDialogOpen(false)
        setResolution("")
        setSelectedDispute(null)
      }
    } catch (error) {
      console.error("Failed to resolve dispute:", error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const openStatus = (status: string) => {
    return status === "OPEN" ? "bg-yellow-500/10 text-yellow-500 border-yellow-500/20" : "bg-green-500/10 text-green-500 border-green-500/20"
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Disputes</h1>
          <p className="text-muted-foreground">Manage trade disputes and resolution requests</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Open</CardTitle>
            <Clock className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{disputes.filter((d) => d.status === "OPEN").length}</div>
            <p className="text-xs text-muted-foreground">Awaiting resolution</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Resolved</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{disputes.filter((d) => d.status === "RESOLVED").length}</div>
            <p className="text-xs text-muted-foreground">Completed</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Disputes</CardTitle>
            <AlertTriangle className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{disputes.length}</div>
            <p className="text-xs text-muted-foreground">All time</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Value at Stake</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₱{disputes.reduce((sum, d) => sum + d.transaction.price, 0).toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">In disputes</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by ID, user, or item..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="OPEN">Open</SelectItem>
                <SelectItem value="RESOLVED">Resolved</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Disputes List */}
      <div className="space-y-4">
        {isLoading ? (
          <Card>
            <CardContent className="p-12 text-center">
              <p className="text-muted-foreground">Loading disputes...</p>
            </CardContent>
          </Card>
        ) : filteredDisputes.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <p className="text-muted-foreground">No disputes found</p>
            </CardContent>
          </Card>
        ) : (
          filteredDisputes.map((dispute) => (
            <Card key={dispute.id}>
              <CardContent className="pt-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 space-y-4">
                    {/* Header */}
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className="font-mono text-sm font-semibold">{dispute.id}</span>
                      <Badge variant="outline" className={openStatus(dispute.status)}>
                        {dispute.status === "OPEN" ? <Clock className="mr-1 h-3 w-3" /> : <CheckCircle className="mr-1 h-3 w-3" />}
                        {dispute.status}
                      </Badge>
                    </div>

                    {/* Parties */}
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src="/placeholder.svg" />
                          <AvatarFallback>{dispute.transaction.buyer.username[0]}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-sm font-medium">{dispute.transaction.buyer.username}</p>
                          <p className="text-xs text-muted-foreground">Buyer</p>
                        </div>
                      </div>
                      <ArrowRight className="h-4 w-4 text-muted-foreground" />
                      <div className="flex items-center gap-2">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src="/placeholder.svg" />
                          <AvatarFallback>{dispute.transaction.seller.username[0]}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-sm font-medium">{dispute.transaction.seller.username}</p>
                          <p className="text-xs text-muted-foreground">Seller</p>
                        </div>
                      </div>
                    </div>

                    {/* Item & Reason */}
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{dispute.transaction.listing.title}</span>
                        <span className="text-sm text-muted-foreground">•</span>
                        <span className="text-sm font-semibold text-green-500">₱{dispute.transaction.price.toLocaleString()}</span>
                      </div>
                      <p className="text-sm text-muted-foreground">{dispute.reason}</p>
                      {dispute.resolution && <p className="text-sm text-green-600">Resolution: {dispute.resolution}</p>}
                    </div>

                    {/* Meta */}
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span>Created {new Date(dispute.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>

                  {/* Actions */}
                  {dispute.status === "OPEN" && user && (
                    <Dialog open={isResolveDialogOpen && selectedDispute?.id === dispute.id} onOpenChange={setIsResolveDialogOpen}>
                      <DialogTrigger asChild>
                        <Button size="sm" onClick={() => setSelectedDispute(dispute)}>
                          Resolve
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="sm:max-w-[600px]">
                        <DialogHeader>
                          <DialogTitle>Resolve Dispute</DialogTitle>
                          <DialogDescription>Provide resolution details for this dispute.</DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                          <div className="grid gap-2">
                            <Label>Resolution Notes</Label>
                            <Textarea
                              placeholder="Enter your resolution notes..."
                              value={resolution}
                              onChange={(e) => setResolution(e.target.value)}
                              rows={4}
                            />
                          </div>
                        </div>
                        <DialogFooter>
                          <Button
                            variant="outline"
                            onClick={() => {
                              setIsResolveDialogOpen(false)
                              setResolution("")
                            }}
                          >
                            Cancel
                          </Button>
                          <Button onClick={handleResolve} disabled={isSubmitting || !resolution.trim()}>
                            {isSubmitting ? "Resolving..." : "Submit Resolution"}
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  )
}
