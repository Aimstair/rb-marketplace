"use client"

import { useState, useEffect } from "react"
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
import { Search, DollarSign, AlertTriangle, Clock, CheckCircle, XCircle, Shield, Wallet, Eye, Loader2 } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from "recharts"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { getCurrencyTrades, approveTransaction, cancelTransaction, resolveDispute, getPriceHistory } from "@/app/actions/admin-currency"
import { useToast } from "@/hooks/use-toast"

export default function CurrencyTradingPage() {
  const { toast } = useToast()
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [selectedTrade, setSelectedTrade] = useState<any | null>(null)
  const [actionDialogOpen, setActionDialogOpen] = useState(false)
  const [actionType, setActionType] = useState<string>("")
  const [actionNotes, setActionNotes] = useState("")
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false)
  const [reviewingTrade, setReviewingTrade] = useState<any | null>(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [trades, setTrades] = useState<any[]>([])
  const [stats, setStats] = useState({
    total: 0,
    completed: 0,
    pending: 0,
    flagged: 0,
    disputed: 0,
    totalVolume: 0
  })
  const [highValueAlerts, setHighValueAlerts] = useState<any[]>([])
  const [priceHistoryData, setPriceHistoryData] = useState<any[]>([])

  // Load data on mount and when filters change
  useEffect(() => {
    loadData()
  }, [statusFilter])

  const loadData = async () => {
    setLoading(true)
    try {
      const [tradesResult, priceResult] = await Promise.all([
        getCurrencyTrades({ status: statusFilter, search: searchQuery }),
        getPriceHistory()
      ])

      if (tradesResult.success) {
        setTrades(tradesResult.trades || [])
        setStats(tradesResult.stats || stats)
        setHighValueAlerts(tradesResult.highValueAlerts || [])
      }

      if (priceResult.success && priceResult.priceHistory) {
        setPriceHistoryData(priceResult.priceHistory)
      }
    } catch (error) {
      console.error("Failed to load data:", error)
      toast({
        title: "Error",
        description: "Failed to load currency trades",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const filteredTrades = trades.filter((trade) => {
    if (!searchQuery) return true
    return (
      trade.seller.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
      trade.buyer.username.toLowerCase().includes(searchQuery.toLowerCase())
    )
  })

  const handleAction = (action: string) => {
    setActionType(action)
    setActionDialogOpen(true)
  }

  const executeAction = async () => {
    if (!selectedTrade) return
    
    setActionLoading(true)
    try {
      let result
      
      if (selectedTrade.dispute && actionType === "resolve-approve") {
        result = await resolveDispute(selectedTrade.id, "approve", actionNotes)
      } else if (selectedTrade.dispute && actionType === "resolve-cancel") {
        result = await resolveDispute(selectedTrade.id, "cancel", actionNotes)
      } else if (actionType === "approve") {
        result = await approveTransaction(selectedTrade.id, actionNotes)
      } else if (actionType === "cancel") {
        result = await cancelTransaction(selectedTrade.id, actionNotes)
      }

      if (result?.success) {
        toast({
          title: "Success",
          description: `Transaction ${actionType}d successfully`
        })
        setActionDialogOpen(false)
        setActionNotes("")
        await loadData() // Reload data
        setSelectedTrade(null)
      } else {
        toast({
          title: "Error",
          description: result?.error || "Failed to execute action",
          variant: "destructive"
        })
      }
    } catch (error) {
      console.error("Failed to execute action:", error)
      toast({
        title: "Error",
        description: "Failed to execute action",
        variant: "destructive"
      })
    } finally {
      setActionLoading(false)
    }
  }

  const handleReviewTrade = (trade: any) => {
    setReviewingTrade(trade)
    setReviewDialogOpen(true)
  }

  // Handle search with debounce
  const handleSearch = (value: string) => {
    setSearchQuery(value)
  }

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center h-[600px]">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading currency trades...</p>
        </div>
      </div>
    )
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
                            const trade = trades.find((t) => t.seller.username === alert.user)
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
                      onChange={(e) => handleSearch(e.target.value)}
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
            <Button variant="outline" onClick={() => setActionDialogOpen(false)} disabled={actionLoading}>
              Cancel
            </Button>
            <Button 
              variant={actionType === "cancel" ? "destructive" : "default"} 
              onClick={executeAction}
              disabled={actionLoading}
            >
              {actionLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                "Confirm"
              )}
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
