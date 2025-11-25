"use client"

import type React from "react"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
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
import {
  Scale,
  Search,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  ArrowRight,
  MessageSquare,
  DollarSign,
  ExternalLink,
} from "lucide-react"

const mockDisputes = [
  {
    id: "DSP-001",
    type: "trade",
    status: "pending",
    priority: "high",
    buyer: { username: "NinjaTrader42", avatar: "/ninja-avatar.png" },
    seller: { username: "DragonMaster", avatar: "/dragon-avatar.png" },
    item: "Golden Dragon Pet",
    value: "$125.00",
    reason: "Item not received after payment sent",
    createdAt: "2 hours ago",
    lastUpdate: "1 hour ago",
    messages: 4,
  },
  {
    id: "DSP-002",
    type: "refund",
    status: "in_review",
    priority: "medium",
    buyer: { username: "CoolGamer99", avatar: "" },
    seller: { username: "ProSeller", avatar: "" },
    item: "Rare Sword Collection",
    value: "$89.00",
    reason: "Item received was different from listing description",
    createdAt: "5 hours ago",
    lastUpdate: "2 hours ago",
    messages: 8,
  },
  {
    id: "DSP-003",
    type: "trade",
    status: "resolved",
    priority: "low",
    buyer: { username: "NewPlayer123", avatar: "" },
    seller: { username: "VeteranSeller", avatar: "" },
    item: "Starter Pack",
    value: "$15.00",
    reason: "Delayed delivery",
    createdAt: "1 day ago",
    lastUpdate: "6 hours ago",
    messages: 12,
    resolution: "Seller issued partial refund",
  },
  {
    id: "DSP-004",
    type: "scam",
    status: "escalated",
    priority: "critical",
    buyer: { username: "TrustingBuyer", avatar: "" },
    seller: { username: "SuspiciousAccount", avatar: "" },
    item: "Mega Bundle Deal",
    value: "$450.00",
    reason: "Account sold was recovered by original owner",
    createdAt: "3 hours ago",
    lastUpdate: "30 minutes ago",
    messages: 15,
  },
]

const statusConfig: Record<
  string,
  { color: string; label: string; icon: React.ComponentType<{ className?: string }> }
> = {
  pending: { color: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20", label: "Pending", icon: Clock },
  in_review: { color: "bg-blue-500/10 text-blue-500 border-blue-500/20", label: "In Review", icon: Scale },
  resolved: { color: "bg-green-500/10 text-green-500 border-green-500/20", label: "Resolved", icon: CheckCircle },
  rejected: { color: "bg-red-500/10 text-red-500 border-red-500/20", label: "Rejected", icon: XCircle },
  escalated: {
    color: "bg-purple-500/10 text-purple-500 border-purple-500/20",
    label: "Escalated",
    icon: AlertTriangle,
  },
}

const priorityConfig: Record<string, { color: string; label: string }> = {
  low: { color: "bg-muted text-muted-foreground", label: "Low" },
  medium: { color: "bg-yellow-500/10 text-yellow-500", label: "Medium" },
  high: { color: "bg-orange-500/10 text-orange-500", label: "High" },
  critical: { color: "bg-red-500/10 text-red-500", label: "Critical" },
}

const typeConfig: Record<string, { color: string; label: string }> = {
  trade: { color: "bg-blue-500/10 text-blue-500", label: "Trade Issue" },
  refund: { color: "bg-green-500/10 text-green-500", label: "Refund Request" },
  scam: { color: "bg-red-500/10 text-red-500", label: "Scam Report" },
  quality: { color: "bg-yellow-500/10 text-yellow-500", label: "Quality Issue" },
}

export default function DisputesPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [priorityFilter, setPriorityFilter] = useState("all")
  const [selectedDispute, setSelectedDispute] = useState<(typeof mockDisputes)[0] | null>(null)

  const filteredDisputes = mockDisputes.filter((dispute) => {
    const matchesSearch =
      dispute.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      dispute.buyer.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
      dispute.seller.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
      dispute.item.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStatus = statusFilter === "all" || dispute.status === statusFilter
    const matchesPriority = priorityFilter === "all" || dispute.priority === priorityFilter
    return matchesSearch && matchesStatus && matchesPriority
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Disputes</h1>
          <p className="text-muted-foreground">Manage trade disputes and resolution requests</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <Clock className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{mockDisputes.filter((d) => d.status === "pending").length}</div>
            <p className="text-xs text-muted-foreground">Awaiting review</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">In Review</CardTitle>
            <Scale className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{mockDisputes.filter((d) => d.status === "in_review").length}</div>
            <p className="text-xs text-muted-foreground">Being investigated</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Escalated</CardTitle>
            <AlertTriangle className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{mockDisputes.filter((d) => d.status === "escalated").length}</div>
            <p className="text-xs text-muted-foreground">Needs attention</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Resolved</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{mockDisputes.filter((d) => d.status === "resolved").length}</div>
            <p className="text-xs text-muted-foreground">This week</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Value</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">$679</div>
            <p className="text-xs text-muted-foreground">In active disputes</p>
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
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="in_review">In Review</SelectItem>
                <SelectItem value="escalated">Escalated</SelectItem>
                <SelectItem value="resolved">Resolved</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priority</SelectItem>
                <SelectItem value="critical">Critical</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="low">Low</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Disputes List */}
      <div className="space-y-4">
        {filteredDisputes.map((dispute) => {
          const StatusIcon = statusConfig[dispute.status]?.icon || Clock
          return (
            <Card key={dispute.id} className={dispute.priority === "critical" ? "border-red-500/50" : ""}>
              <CardContent className="pt-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 space-y-4">
                    {/* Header */}
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className="font-mono text-sm font-semibold">{dispute.id}</span>
                      <Badge variant="outline" className={typeConfig[dispute.type]?.color}>
                        {typeConfig[dispute.type]?.label}
                      </Badge>
                      <Badge variant="outline" className={statusConfig[dispute.status]?.color}>
                        <StatusIcon className="mr-1 h-3 w-3" />
                        {statusConfig[dispute.status]?.label}
                      </Badge>
                      <Badge variant="outline" className={priorityConfig[dispute.priority]?.color}>
                        {priorityConfig[dispute.priority]?.label}
                      </Badge>
                    </div>

                    {/* Parties */}
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={dispute.buyer.avatar || "/placeholder.svg"} />
                          <AvatarFallback>{dispute.buyer.username[0]}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-sm font-medium">{dispute.buyer.username}</p>
                          <p className="text-xs text-muted-foreground">Buyer</p>
                        </div>
                      </div>
                      <ArrowRight className="h-4 w-4 text-muted-foreground" />
                      <div className="flex items-center gap-2">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={dispute.seller.avatar || "/placeholder.svg"} />
                          <AvatarFallback>{dispute.seller.username[0]}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-sm font-medium">{dispute.seller.username}</p>
                          <p className="text-xs text-muted-foreground">Seller</p>
                        </div>
                      </div>
                    </div>

                    {/* Item & Reason */}
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{dispute.item}</span>
                        <span className="text-sm text-muted-foreground">•</span>
                        <span className="text-sm font-semibold text-green-500">{dispute.value}</span>
                      </div>
                      <p className="text-sm text-muted-foreground">{dispute.reason}</p>
                      {dispute.resolution && <p className="text-sm text-green-600">Resolution: {dispute.resolution}</p>}
                    </div>

                    {/* Meta */}
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span>Created {dispute.createdAt}</span>
                      <span>Updated {dispute.lastUpdate}</span>
                      <span className="flex items-center gap-1">
                        <MessageSquare className="h-3 w-3" />
                        {dispute.messages} messages
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col gap-2">
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button size="sm">Review</Button>
                      </DialogTrigger>
                      <DialogContent className="sm:max-w-[600px]">
                        <DialogHeader>
                          <DialogTitle>Review Dispute {dispute.id}</DialogTitle>
                          <DialogDescription>Review the dispute details and take action.</DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                          <div className="grid gap-2">
                            <Label>Resolution Notes</Label>
                            <Textarea placeholder="Enter your resolution notes..." rows={4} />
                          </div>
                          <div className="grid gap-2">
                            <Label>Action</Label>
                            <Select>
                              <SelectTrigger>
                                <SelectValue placeholder="Select action" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="favor_buyer">Rule in favor of Buyer</SelectItem>
                                <SelectItem value="favor_seller">Rule in favor of Seller</SelectItem>
                                <SelectItem value="partial_refund">Issue Partial Refund</SelectItem>
                                <SelectItem value="full_refund">Issue Full Refund</SelectItem>
                                <SelectItem value="escalate">Escalate to Senior Admin</SelectItem>
                                <SelectItem value="close">Close - No Action</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        <DialogFooter>
                          <Button variant="outline">Cancel</Button>
                          <Button>Submit Resolution</Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                    <Button variant="outline" size="sm">
                      <ExternalLink className="mr-1 h-3 w-3" />
                      View Trade
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
