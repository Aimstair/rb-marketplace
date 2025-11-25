"use client"

import { useState } from "react"
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
import { Search, DollarSign, AlertTriangle, Clock, CheckCircle, XCircle, Shield, Wallet, Eye } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from "recharts"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"

const mockTrades = [
  {
    id: "1",
    seller: {
      username: "RobuxKing",
      avatar: "/placeholder.svg?key=t5dxl",
      vouches: 234,
      joinDate: "Mar 2023",
      riskScore: 12,
    },
    buyer: {
      username: "NewBuyer123",
      avatar: "/placeholder.svg?key=9nfei",
      vouches: 5,
      joinDate: "Dec 2024",
      riskScore: 45,
    },
    amount: 10000,
    price: 3500,
    rate: 0.35,
    status: "completed",
    createdAt: "2 hours ago",
    flags: [],
    chatHistory: [
      { sender: "buyer", message: "Hi, I'd like to buy 10,000 Robux", time: "2 hours ago" },
      { sender: "seller", message: "That will be ₱3,500", time: "2 hours ago" },
      { sender: "buyer", message: "Payment sent via GCash", time: "2 hours ago" },
      { sender: "seller", message: "Received! Sending Robux now", time: "2 hours ago" },
    ],
  },
  {
    id: "2",
    seller: {
      username: "SusAccount",
      avatar: "/placeholder.svg?key=s84xp",
      vouches: 2,
      joinDate: "Dec 2024",
      riskScore: 89,
    },
    buyer: {
      username: "TrustyShopper",
      avatar: "/placeholder.svg?key=8mkdr",
      vouches: 189,
      joinDate: "Mar 2023",
      riskScore: 8,
    },
    amount: 50000,
    price: 15000,
    rate: 0.3,
    status: "flagged",
    createdAt: "1 hour ago",
    flags: ["high-value", "new-seller", "suspicious-rate"],
    chatHistory: [
      { sender: "buyer", message: "I want to buy 50,000 Robux", time: "1 hour ago" },
      { sender: "seller", message: "Deal! ₱15,000 only", time: "1 hour ago" },
    ],
  },
  {
    id: "3",
    seller: {
      username: "EliteTrader99",
      avatar: "/placeholder.svg?key=a1saz",
      vouches: 567,
      joinDate: "Jun 2022",
      riskScore: 5,
    },
    buyer: {
      username: "CasualGamer",
      avatar: "/placeholder.svg?key=k3urc",
      vouches: 45,
      joinDate: "Aug 2024",
      riskScore: 22,
    },
    amount: 25000,
    price: 8750,
    rate: 0.35,
    status: "pending",
    createdAt: "30 min ago",
    flags: [],
    chatHistory: [
      { sender: "buyer", message: "Interested in 25,000 Robux", time: "30 min ago" },
      { sender: "seller", message: "Available! ₱8,750", time: "30 min ago" },
    ],
  },
  {
    id: "4",
    seller: {
      username: "ScammerJoe",
      avatar: "/placeholder.svg?key=ij2eo",
      vouches: 12,
      joinDate: "Nov 2024",
      riskScore: 95,
    },
    buyer: {
      username: "VictimUser",
      avatar: "/placeholder.svg?key=r8qm9",
      vouches: 23,
      joinDate: "Sep 2024",
      riskScore: 30,
    },
    amount: 100000,
    price: 30000,
    rate: 0.3,
    status: "disputed",
    createdAt: "5 hours ago",
    flags: ["high-value", "high-risk-seller", "dispute-filed"],
    dispute: {
      reason: "Robux not received after payment",
      filedBy: "VictimUser",
      evidence: ["Payment screenshot", "Chat logs"],
    },
    chatHistory: [
      { sender: "buyer", message: "I want 100,000 Robux", time: "5 hours ago" },
      { sender: "seller", message: "₱30,000 via GCash", time: "5 hours ago" },
      { sender: "buyer", message: "Sent!", time: "5 hours ago" },
      { sender: "seller", message: "Processing...", time: "5 hours ago" },
      { sender: "buyer", message: "Where's my Robux???", time: "4 hours ago" },
    ],
  },
  {
    id: "5",
    seller: {
      username: "NinjaTrader",
      avatar: "/placeholder.svg?key=c1m1z",
      vouches: 342,
      joinDate: "Jan 2023",
      riskScore: 10,
    },
    buyer: {
      username: "RegularBuyer",
      avatar: "/placeholder.svg?key=a8p54",
      vouches: 78,
      joinDate: "May 2024",
      riskScore: 15,
    },
    amount: 15000,
    price: 5250,
    rate: 0.35,
    status: "completed",
    createdAt: "1 day ago",
    flags: [],
    chatHistory: [
      { sender: "buyer", message: "Need 15,000 Robux", time: "1 day ago" },
      { sender: "seller", message: "₱5,250. Send to my GCash", time: "1 day ago" },
      { sender: "buyer", message: "Done!", time: "1 day ago" },
      { sender: "seller", message: "Robux sent. Thanks!", time: "1 day ago" },
    ],
  },
]

const priceHistoryData = [
  { date: "Mon", rate: 0.36 },
  { date: "Tue", rate: 0.35 },
  { date: "Wed", rate: 0.34 },
  { date: "Thu", rate: 0.35 },
  { date: "Fri", rate: 0.33 },
  { date: "Sat", rate: 0.35 },
  { date: "Sun", rate: 0.35 },
]

const highValueAlerts = [
  { id: "1", user: "SusAccount", amount: 50000, riskScore: 89, reason: "New account selling large amount" },
  { id: "2", user: "ScammerJoe", amount: 100000, riskScore: 95, reason: "Multiple dispute history" },
]

export default function CurrencyTradingPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [selectedTrade, setSelectedTrade] = useState<(typeof mockTrades)[0] | null>(null)
  const [actionDialogOpen, setActionDialogOpen] = useState(false)
  const [actionType, setActionType] = useState<string>("")
  const [actionNotes, setActionNotes] = useState("")
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false)
  const [reviewingTrade, setReviewingTrade] = useState<(typeof mockTrades)[0] | null>(null)

  const filteredTrades = mockTrades.filter((trade) => {
    const matchesSearch =
      trade.seller.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
      trade.buyer.username.toLowerCase().includes(searchQuery.toLowerCase())

    const matchesStatus = statusFilter === "all" || trade.status === statusFilter

    return matchesSearch && matchesStatus
  })

  const stats = {
    total: mockTrades.length,
    completed: mockTrades.filter((t) => t.status === "completed").length,
    pending: mockTrades.filter((t) => t.status === "pending").length,
    flagged: mockTrades.filter((t) => t.status === "flagged").length,
    disputed: mockTrades.filter((t) => t.status === "disputed").length,
    totalVolume: mockTrades.reduce((acc, t) => acc + t.amount, 0),
  }

  const handleAction = (action: string) => {
    setActionType(action)
    setActionDialogOpen(true)
  }

  const executeAction = () => {
    console.log(`Executing ${actionType} on trade ${selectedTrade?.id} with notes: ${actionNotes}`)
    setActionDialogOpen(false)
    setActionNotes("")
  }

  const handleReviewTrade = (trade: (typeof mockTrades)[0]) => {
    setReviewingTrade(trade)
    setReviewDialogOpen(true)
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return (
          <Badge className="bg-green-500 text-white">
            <CheckCircle className="h-3 w-3 mr-1" />
            Completed
          </Badge>
        )
      case "pending":
        return (
          <Badge className="bg-yellow-500 text-white">
            <Clock className="h-3 w-3 mr-1" />
            Pending
          </Badge>
        )
      case "flagged":
        return (
          <Badge variant="destructive">
            <AlertTriangle className="h-3 w-3 mr-1" />
            Flagged
          </Badge>
        )
      case "disputed":
        return (
          <Badge className="bg-orange-500 text-white">
            <XCircle className="h-3 w-3 mr-1" />
            Disputed
          </Badge>
        )
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const getRiskColor = (score: number) => {
    if (score >= 70) return "text-red-500"
    if (score >= 40) return "text-orange-500"
    return "text-green-500"
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Currency Marketplace</h1>
        <p className="text-muted-foreground">Monitor high-risk currency trades and resolve disputes</p>
      </div>

      {/* Stats - Updated to PHP */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold">{stats.total}</p>
            <p className="text-sm text-muted-foreground">Total Trades</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-green-500">{stats.completed}</p>
            <p className="text-sm text-muted-foreground">Completed</p>
          </CardContent>
        </Card>
        <Card className="border-yellow-500/50">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-yellow-500">{stats.pending}</p>
            <p className="text-sm text-muted-foreground">Pending</p>
          </CardContent>
        </Card>
        <Card className="border-red-500/50">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-red-500">{stats.flagged + stats.disputed}</p>
            <p className="text-sm text-muted-foreground">Need Review</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold">{(stats.totalVolume / 1000).toFixed(0)}K</p>
            <p className="text-sm text-muted-foreground">Total Volume (R$)</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* High Value Alerts */}
          {highValueAlerts.length > 0 && (
            <Card className="border-red-500/50">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-red-500" />
                  High-Value Alerts
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {highValueAlerts.map((alert) => (
                    <div
                      key={alert.id}
                      className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center justify-between"
                    >
                      <div>
                        <p className="font-medium">
                          {alert.user} selling {alert.amount.toLocaleString()} R$
                        </p>
                        <p className="text-sm text-muted-foreground">{alert.reason}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="destructive">Risk: {alert.riskScore}%</Badge>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            const trade = mockTrades.find((t) => t.seller.username === alert.user)
                            if (trade) handleReviewTrade(trade)
                          }}
                        >
                          Review
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Price Chart - Updated to PHP */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Robux Price Trends</CardTitle>
              <CardDescription>Average ₱/R$ rate over the week</CardDescription>
            </CardHeader>
            <CardContent className="overflow-hidden">
              <ChartContainer
                config={{
                  rate: { label: "Rate (₱/R$)", color: "hsl(var(--chart-1))" },
                }}
                className="h-[200px] min-w-0"
              >
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={priceHistoryData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="date" className="text-xs" />
                    <YAxis className="text-xs" domain={[0.3, 0.4]} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Line
                      type="monotone"
                      dataKey="rate"
                      stroke="hsl(var(--chart-1))"
                      strokeWidth={2}
                      dot={{ fill: "hsl(var(--chart-1))" }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </ChartContainer>
            </CardContent>
          </Card>

          {/* Trades List - Updated to PHP */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg">Recent Trades</CardTitle>
                  <CardDescription>Currency exchange transactions</CardDescription>
                </div>
                <div className="flex gap-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10 w-[180px]"
                    />
                  </div>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-[140px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="flagged">Flagged</SelectItem>
                      <SelectItem value="disputed">Disputed</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px]">
                <div className="space-y-3">
                  {filteredTrades.map((trade) => (
                    <div
                      key={trade.id}
                      onClick={() => setSelectedTrade(trade)}
                      className={`p-4 border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors ${
                        selectedTrade?.id === trade.id ? "border-primary bg-muted/50" : ""
                      } ${trade.status === "flagged" || trade.status === "disputed" ? "border-red-500/50" : ""}`}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-2">
                            <Avatar className="h-8 w-8">
                              <AvatarImage src={trade.seller.avatar || "/placeholder.svg"} />
                              <AvatarFallback>{trade.seller.username.charAt(0)}</AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="text-sm font-medium">{trade.seller.username}</p>
                              <p className="text-xs text-muted-foreground">Seller</p>
                            </div>
                          </div>
                          <DollarSign className="h-4 w-4 text-muted-foreground" />
                          <div className="flex items-center gap-2">
                            <Avatar className="h-8 w-8">
                              <AvatarImage src={trade.buyer.avatar || "/placeholder.svg"} />
                              <AvatarFallback>{trade.buyer.username.charAt(0)}</AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="text-sm font-medium">{trade.buyer.username}</p>
                              <p className="text-xs text-muted-foreground">Buyer</p>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleReviewTrade(trade)
                            }}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          {getStatusBadge(trade.status)}
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex gap-4 text-sm">
                          <span>
                            <strong>{trade.amount.toLocaleString()}</strong> R$
                          </span>
                          <span>
                            <strong>₱{trade.price.toLocaleString()}</strong>
                          </span>
                          <span className="text-muted-foreground">@₱{trade.rate}/R$</span>
                        </div>
                        <span className="text-xs text-muted-foreground">{trade.createdAt}</span>
                      </div>
                      {trade.flags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {trade.flags.map((flag) => (
                            <Badge key={flag} variant="outline" className="text-xs">
                              {flag}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar - Trade Details - Updated to PHP */}
        <div className="space-y-6">
          {selectedTrade ? (
            <>
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Trade Details</CardTitle>
                  <CardDescription>ID: {selectedTrade.id}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="text-center p-4 bg-muted/50 rounded-lg">
                    <p className="text-3xl font-bold">{selectedTrade.amount.toLocaleString()} R$</p>
                    <p className="text-lg text-muted-foreground">₱{selectedTrade.price.toLocaleString()} PHP</p>
                    <p className="text-sm text-muted-foreground">Rate: ₱{selectedTrade.rate}/R$</p>
                    <div className="mt-2">{getStatusBadge(selectedTrade.status)}</div>
                  </div>

                  {/* Seller Info */}
                  <div className="p-3 border rounded-lg">
                    <p className="text-sm text-muted-foreground mb-2">Seller</p>
                    <div className="flex items-center gap-3 mb-2">
                      <Avatar>
                        <AvatarImage src={selectedTrade.seller.avatar || "/placeholder.svg"} />
                        <AvatarFallback>{selectedTrade.seller.username.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">{selectedTrade.seller.username}</p>
                        <p className="text-xs text-muted-foreground">{selectedTrade.seller.vouches} vouches</p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span>Risk Score</span>
                      <span className={`font-medium ${getRiskColor(selectedTrade.seller.riskScore)}`}>
                        {selectedTrade.seller.riskScore}%
                      </span>
                    </div>
                    <Progress
                      value={selectedTrade.seller.riskScore}
                      className={`h-2 mt-1 ${selectedTrade.seller.riskScore >= 70 ? "[&>div]:bg-red-500" : selectedTrade.seller.riskScore >= 40 ? "[&>div]:bg-orange-500" : "[&>div]:bg-green-500"}`}
                    />
                  </div>

                  {/* Buyer Info */}
                  <div className="p-3 border rounded-lg">
                    <p className="text-sm text-muted-foreground mb-2">Buyer</p>
                    <div className="flex items-center gap-3 mb-2">
                      <Avatar>
                        <AvatarImage src={selectedTrade.buyer.avatar || "/placeholder.svg"} />
                        <AvatarFallback>{selectedTrade.buyer.username.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">{selectedTrade.buyer.username}</p>
                        <p className="text-xs text-muted-foreground">{selectedTrade.buyer.vouches} vouches</p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span>Risk Score</span>
                      <span className={`font-medium ${getRiskColor(selectedTrade.buyer.riskScore)}`}>
                        {selectedTrade.buyer.riskScore}%
                      </span>
                    </div>
                    <Progress
                      value={selectedTrade.buyer.riskScore}
                      className={`h-2 mt-1 ${selectedTrade.buyer.riskScore >= 70 ? "[&>div]:bg-red-500" : selectedTrade.buyer.riskScore >= 40 ? "[&>div]:bg-orange-500" : "[&>div]:bg-green-500"}`}
                    />
                  </div>

                  {/* Dispute Info */}
                  {selectedTrade.dispute && (
                    <div className="p-3 bg-orange-500/10 border border-orange-500/20 rounded-lg">
                      <p className="text-sm font-medium text-orange-600 mb-2">Dispute Filed</p>
                      <p className="text-sm text-muted-foreground mb-2">{selectedTrade.dispute.reason}</p>
                      <p className="text-xs text-muted-foreground">Filed by: {selectedTrade.dispute.filedBy}</p>
                      <div className="flex flex-wrap gap-1 mt-2">
                        {selectedTrade.dispute.evidence.map((e, i) => (
                          <Badge key={i} variant="outline" className="text-xs">
                            {e}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Actions */}
                  {selectedTrade.status !== "completed" && (
                    <div className="flex gap-2">
                      <Button className="flex-1" onClick={() => handleAction("approve")}>
                        <CheckCircle className="h-4 w-4 mr-1" />
                        Approve
                      </Button>
                      <Button variant="destructive" className="flex-1" onClick={() => handleAction("cancel")}>
                        <XCircle className="h-4 w-4 mr-1" />
                        Cancel
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </>
          ) : (
            <Card>
              <CardContent className="p-8 text-center">
                <Wallet className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">Select a trade to view details</p>
              </CardContent>
            </Card>
          )}

          {/* New User Limits - Updated to PHP context */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Shield className="h-5 w-5" />
                New User Limits
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Max sell (first week)</span>
                <span className="font-medium">5,000 R$</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Max sell (first month)</span>
                <span className="font-medium">25,000 R$</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Verified seller limit</span>
                <span className="font-medium">Unlimited</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Action Dialog */}
      <Dialog open={actionDialogOpen} onOpenChange={setActionDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="capitalize">{actionType} Trade</DialogTitle>
            <DialogDescription>
              {actionType === "approve"
                ? "This will approve the trade and release funds."
                : "This will cancel the trade and may trigger a refund."}
            </DialogDescription>
          </DialogHeader>
          <div>
            <Label>Notes</Label>
            <Textarea
              placeholder="Add notes about this action..."
              value={actionNotes}
              onChange={(e) => setActionNotes(e.target.value)}
              className="mt-2"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setActionDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant={actionType === "cancel" ? "destructive" : "default"} onClick={executeAction}>
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={reviewDialogOpen} onOpenChange={setReviewDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Trade Review Details</DialogTitle>
            <DialogDescription>Complete transaction information and chat history</DialogDescription>
          </DialogHeader>
          {reviewingTrade && (
            <div className="space-y-6">
              {/* Trade Summary */}
              <div className="p-4 bg-muted/50 rounded-lg text-center">
                <p className="text-3xl font-bold">{reviewingTrade.amount.toLocaleString()} R$</p>
                <p className="text-xl text-primary font-semibold">₱{reviewingTrade.price.toLocaleString()}</p>
                <p className="text-sm text-muted-foreground">Rate: ₱{reviewingTrade.rate}/R$</p>
                <div className="mt-2">{getStatusBadge(reviewingTrade.status)}</div>
              </div>

              {/* Users */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 border rounded-lg">
                  <p className="text-sm text-muted-foreground mb-2">Seller</p>
                  <div className="flex items-center gap-3 mb-3">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={reviewingTrade.seller.avatar || "/placeholder.svg"} />
                      <AvatarFallback>{reviewingTrade.seller.username.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">{reviewingTrade.seller.username}</p>
                      <p className="text-xs text-muted-foreground">{reviewingTrade.seller.vouches} vouches</p>
                    </div>
                  </div>
                  <div className="space-y-1 text-sm">
                    <p>
                      <span className="text-muted-foreground">Joined:</span> {reviewingTrade.seller.joinDate}
                    </p>
                    <p>
                      <span className="text-muted-foreground">Risk:</span>{" "}
                      <span className={getRiskColor(reviewingTrade.seller.riskScore)}>
                        {reviewingTrade.seller.riskScore}%
                      </span>
                    </p>
                  </div>
                </div>
                <div className="p-4 border rounded-lg">
                  <p className="text-sm text-muted-foreground mb-2">Buyer</p>
                  <div className="flex items-center gap-3 mb-3">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={reviewingTrade.buyer.avatar || "/placeholder.svg"} />
                      <AvatarFallback>{reviewingTrade.buyer.username.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">{reviewingTrade.buyer.username}</p>
                      <p className="text-xs text-muted-foreground">{reviewingTrade.buyer.vouches} vouches</p>
                    </div>
                  </div>
                  <div className="space-y-1 text-sm">
                    <p>
                      <span className="text-muted-foreground">Joined:</span> {reviewingTrade.buyer.joinDate}
                    </p>
                    <p>
                      <span className="text-muted-foreground">Risk:</span>{" "}
                      <span className={getRiskColor(reviewingTrade.buyer.riskScore)}>
                        {reviewingTrade.buyer.riskScore}%
                      </span>
                    </p>
                  </div>
                </div>
              </div>

              {/* Chat History */}
              <div className="p-4 border rounded-lg">
                <p className="font-medium mb-3">Chat History</p>
                <div className="space-y-3 max-h-[200px] overflow-y-auto">
                  {reviewingTrade.chatHistory.map((msg, i) => (
                    <div key={i} className={`flex ${msg.sender === "buyer" ? "justify-end" : "justify-start"}`}>
                      <div
                        className={`max-w-[70%] p-3 rounded-lg ${msg.sender === "buyer" ? "bg-primary text-primary-foreground" : "bg-muted"}`}
                      >
                        <p className="text-sm">{msg.message}</p>
                        <p className="text-xs opacity-70 mt-1">{msg.time}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Flags */}
              {reviewingTrade.flags.length > 0 && (
                <div className="p-4 border border-red-500/20 bg-red-500/5 rounded-lg">
                  <p className="font-medium mb-2 text-red-500">Flags</p>
                  <div className="flex flex-wrap gap-2">
                    {reviewingTrade.flags.map((flag) => (
                      <Badge key={flag} variant="destructive">
                        {flag}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Dispute Info */}
              {reviewingTrade.dispute && (
                <div className="p-4 border border-orange-500/20 bg-orange-500/5 rounded-lg">
                  <p className="font-medium mb-2 text-orange-500">Dispute Information</p>
                  <p className="text-sm mb-2">{reviewingTrade.dispute.reason}</p>
                  <p className="text-xs text-muted-foreground">Filed by: {reviewingTrade.dispute.filedBy}</p>
                  <div className="flex gap-2 mt-2">
                    {reviewingTrade.dispute.evidence.map((e, i) => (
                      <Badge key={i} variant="outline">
                        {e}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setReviewDialogOpen(false)}>
              Close
            </Button>
            {reviewingTrade?.status !== "completed" && (
              <>
                <Button
                  variant="destructive"
                  onClick={() => {
                    setReviewDialogOpen(false)
                    handleAction("cancel")
                  }}
                >
                  Cancel Trade
                </Button>
                <Button
                  onClick={() => {
                    setReviewDialogOpen(false)
                    handleAction("approve")
                  }}
                >
                  Approve Trade
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
