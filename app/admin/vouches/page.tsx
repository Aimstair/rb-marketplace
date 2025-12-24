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
import { Search, Award, AlertTriangle, ArrowRight, Trash2, XCircle, Network, Eye, Loader2, Star } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from "recharts"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { getVouches, invalidateVouch, approveVouch, invalidatePattern } from "@/app/actions/admin"
import { useToast } from "@/hooks/use-toast"

interface VouchData {
  id: string
  giver: {
    id: string
    username: string
    avatar: string | null
    vouchCount: number
    joinDate: Date
  }
  receiver: {
    id: string
    username: string
    avatar: string | null
    vouchCount: number
    joinDate: Date
  }
  type: string
  message: string | null
  rating: number | null
  createdAt: Date
  status: "valid" | "suspicious" | "invalid"
  flags: string[]
  transaction?: {
    id: string
    item: string
    price: number
    date: Date
  } | null
  transactionTitle?: string
}

interface SuspiciousPattern {
  id: string
  type: "circular" | "rapid" | "new-accounts"
  users: string[]
  description: string
  severity: "high" | "medium" | "low"
  vouchCount: number
}

export default function VouchesPage() {
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [vouches, setVouches] = useState<VouchData[]>([])
  const [stats, setStats] = useState({ total: 0, valid: 0, suspicious: 0, invalid: 0 })
  const [suspiciousPatterns, setSuspiciousPatterns] = useState<SuspiciousPattern[]>([])
  const [trendData, setTrendData] = useState<Array<{ date: string; vouches: number; invalid: number }>>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [selectedVouch, setSelectedVouch] = useState<VouchData | null>(null)
  const [actionDialogOpen, setActionDialogOpen] = useState(false)
  const [actionType, setActionType] = useState<string>("")
  const [actionNotes, setActionNotes] = useState("")
  const [actionLoading, setActionLoading] = useState(false)
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false)
  const [reviewingVouch, setReviewingVouch] = useState<VouchData | null>(null)
  const [patternReviewDialogOpen, setPatternReviewDialogOpen] = useState(false)
  const [reviewingPattern, setReviewingPattern] = useState<SuspiciousPattern | null>(null)
  const [patternActionDialogOpen, setPatternActionDialogOpen] = useState(false)
  const [patternActionNotes, setPatternActionNotes] = useState("")

  // Load vouches
  useEffect(() => {
    loadVouches()
  }, [searchQuery, statusFilter])

  const loadVouches = async () => {
    try {
      setLoading(true)
      const result = await getVouches(searchQuery, statusFilter)
      if (result.success) {
        setVouches(result.vouches || [])
        setStats(result.stats || { total: 0, valid: 0, suspicious: 0, invalid: 0 })
        setSuspiciousPatterns(result.suspiciousPatterns || [])
        setTrendData(result.trendData || [])
      } else {
        toast({
          variant: "destructive",
          title: "Error",
          description: result.error || "Failed to load vouches",
        })
      }
    } catch (err) {
      console.error("Failed to load vouches:", err)
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load vouches",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleAction = (action: string) => {
    setActionType(action)
    setActionDialogOpen(true)
  }

  const executeAction = async () => {
    if (!selectedVouch?.id || !actionNotes.trim()) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please provide a reason for this action",
      })
      return
    }

    try {
      setActionLoading(true)
      let result

      if (actionType === "invalidate") {
        result = await invalidateVouch(selectedVouch.id, actionNotes)
      } else if (actionType === "approve") {
        result = await approveVouch(selectedVouch.id)
      }

      if (result?.success) {
        toast({
          title: "Success",
          description: `Vouch has been ${actionType === "invalidate" ? "invalidated" : "approved"}`,
        })
        setActionDialogOpen(false)
        setActionNotes("")
        setSelectedVouch(null)
        loadVouches()
      } else {
        toast({
          variant: "destructive",
          title: "Error",
          description: result?.error || `Failed to ${actionType} vouch`,
        })
      }
    } catch (err) {
      console.error(`Failed to ${actionType} vouch:`, err)
      toast({
        variant: "destructive",
        title: "Error",
        description: `Failed to ${actionType} vouch`,
      })
    } finally {
      setActionLoading(false)
    }
  }

  const handleReviewVouch = (vouch: VouchData) => {
    setReviewingVouch(vouch)
    setReviewDialogOpen(true)
  }

  const handleReviewPattern = (pattern: SuspiciousPattern) => {
    setReviewingPattern(pattern)
    setPatternReviewDialogOpen(true)
  }

  const handleInvalidatePattern = async (pattern: SuspiciousPattern) => {
    if (!patternActionNotes.trim()) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please provide a reason for invalidating these vouches",
      })
      return
    }

    try {
      setActionLoading(true)
      // Get all vouch IDs for users in this pattern
      const patternVouchIds = vouches
        .filter(
          (v) => pattern.users.includes(v.giver.username) && pattern.users.includes(v.receiver.username)
        )
        .map((v) => v.id)

      const result = await invalidatePattern(patternVouchIds, patternActionNotes)

      if (result.success) {
        toast({
          title: "Success",
          description: `Invalidated ${patternVouchIds.length} vouches in pattern`,
        })
        setPatternActionDialogOpen(false)
        setPatternActionNotes("")
        setReviewingPattern(null)
        loadVouches()
      } else {
        toast({
          variant: "destructive",
          title: "Error",
          description: result.error || "Failed to invalidate pattern",
        })
      }
    } catch (err) {
      console.error("Failed to invalidate pattern:", err)
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to invalidate pattern",
      })
    } finally {
      setActionLoading(false)
    }
  }

  const formatTimeAgo = (date: Date) => {
    const now = new Date()
    const diffMs = now.getTime() - new Date(date).getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return "Just now"
    if (diffMins < 60) return `${diffMins} min ago`
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`
    return `${diffDays} day${diffDays > 1 ? "s" : ""} ago`
  }

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString("en-US", { month: "short", year: "numeric" })
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "valid":
        return <Badge className="bg-green-500 text-white">Valid</Badge>
      case "suspicious":
        return <Badge className="bg-orange-500 text-white">Suspicious</Badge>
      case "invalid":
        return <Badge variant="destructive">Invalid</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "high":
        return "text-red-500"
      case "medium":
        return "text-orange-500"
      case "low":
        return "text-yellow-500"
      default:
        return "text-muted-foreground"
    }
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Vouch Moderation</h1>
        <p className="text-muted-foreground">Detect fake vouches, circular patterns, and vouch abuse</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Vouches</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
              <Award className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Valid</p>
                <p className="text-2xl font-bold text-green-500">{stats.valid}</p>
              </div>
              <div className="h-8 w-8 rounded-full bg-green-500/10 flex items-center justify-center">
                <Award className="h-5 w-5 text-green-500" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-orange-500/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Suspicious</p>
                <p className="text-2xl font-bold text-orange-500">{stats.suspicious}</p>
              </div>
              <div className="h-8 w-8 rounded-full bg-orange-500/10 flex items-center justify-center">
                <AlertTriangle className="h-5 w-5 text-orange-500" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-red-500/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Invalid</p>
                <p className="text-2xl font-bold text-red-500">{stats.invalid}</p>
              </div>
              <div className="h-8 w-8 rounded-full bg-red-500/10 flex items-center justify-center">
                <XCircle className="h-5 w-5 text-red-500" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Suspicious Patterns Alert */}
          <Card className="border-orange-500/50">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-orange-500" />
                Detected Suspicious Patterns
              </CardTitle>
              <CardDescription>AI-detected vouch abuse patterns requiring review</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
              ) : suspiciousPatterns.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Network className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No suspicious patterns detected</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {suspiciousPatterns.map((pattern) => (
                    <div key={pattern.id} className="p-4 border rounded-lg bg-orange-500/5 border-orange-500/20">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Network className="h-4 w-4 text-orange-500" />
                          <span className="font-medium capitalize">{pattern.type} Pattern</span>
                          <Badge className={getSeverityColor(pattern.severity)} variant="outline">
                            {pattern.severity}
                          </Badge>
                        </div>
                        <span className="text-sm text-muted-foreground">{pattern.vouchCount} vouches affected</span>
                      </div>
                      <p className="text-sm text-muted-foreground mb-3">{pattern.description}</p>
                      <div className="flex items-center gap-2 mb-3">
                        <span className="text-sm text-muted-foreground">Involved users:</span>
                        <div className="flex -space-x-2">
                          {pattern.users.slice(0, 4).map((user, i) => (
                            <Avatar key={i} className="h-6 w-6 border-2 border-background">
                              <AvatarFallback className="text-xs">{user.charAt(0)}</AvatarFallback>
                            </Avatar>
                          ))}
                          {pattern.users.length > 4 && (
                            <div className="h-6 w-6 rounded-full bg-muted border-2 border-background flex items-center justify-center text-xs">
                              +{pattern.users.length - 4}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => {
                            setReviewingPattern(pattern)
                            setPatternActionDialogOpen(true)
                          }}
                        >
                          <Trash2 className="h-4 w-4 mr-1" />
                          Invalidate All
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => handleReviewPattern(pattern)}>
                          <Eye className="h-4 w-4 mr-1" />
                          Review
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Vouch Trend Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Vouch Activity</CardTitle>
              <CardDescription>Daily vouches and invalid detections</CardDescription>
            </CardHeader>
            <CardContent className="overflow-hidden">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
              ) : (
                <ChartContainer
                  config={{
                    vouches: { label: "Total Vouches", color: "hsl(var(--chart-1))" },
                    invalid: { label: "Invalid", color: "hsl(var(--chart-4))" },
                  }}
                  className="h-[200px] min-w-0"
                >
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={trendData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="date" className="text-xs" />
                      <YAxis className="text-xs" />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Line type="monotone" dataKey="vouches" stroke="hsl(var(--chart-1))" strokeWidth={2} />
                      <Line type="monotone" dataKey="invalid" stroke="hsl(var(--chart-4))" strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                </ChartContainer>
              )}
            </CardContent>
          </Card>

          {/* Recent Vouches Table */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg">Recent Vouches</CardTitle>
                  <CardDescription>All vouches in the system</CardDescription>
                </div>
                <div className="flex gap-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search users..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10 w-[200px]"
                    />
                  </div>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-[140px]">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="valid">Valid</SelectItem>
                      <SelectItem value="suspicious">Suspicious</SelectItem>
                      <SelectItem value="invalid">Invalid</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px]">
                {loading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                  </div>
                ) : vouches.length === 0 ? (
                  <div className="p-8 text-center text-muted-foreground">
                    <Award className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No vouches found</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {vouches.map((vouch) => (
                      <div
                        key={vouch.id}
                        onClick={() => setSelectedVouch(vouch)}
                        className={`p-4 border rounded-lg cursor-pointer transition-colors hover:bg-muted/50 ${
                          selectedVouch?.id === vouch.id ? "border-primary bg-muted/50" : ""
                        } ${vouch.status === "suspicious" ? "border-orange-500/50" : ""} ${
                          vouch.status === "invalid" ? "border-red-500/50 bg-red-500/5" : ""
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <Avatar className="h-8 w-8">
                              <AvatarImage src={vouch.giver.avatar || undefined} />
                              <AvatarFallback>{vouch.giver.username.charAt(0).toUpperCase()}</AvatarFallback>
                            </Avatar>
                            <ArrowRight className="h-4 w-4 text-muted-foreground" />
                            <Avatar className="h-8 w-8">
                              <AvatarImage src={vouch.receiver.avatar || undefined} />
                              <AvatarFallback>{vouch.receiver.username.charAt(0).toUpperCase()}</AvatarFallback>
                            </Avatar>
                            <div className="ml-2">
                              <p className="text-sm font-medium">
                                {vouch.giver.username} vouched {vouch.receiver.username}
                              </p>
                              <p className="text-xs text-muted-foreground">{formatTimeAgo(vouch.createdAt)}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={(e) => {
                                e.stopPropagation()
                                handleReviewVouch(vouch)
                              }}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            {getStatusBadge(vouch.status)}
                          </div>
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">"{vouch.message || "No message"}"</p>
                        {vouch.flags.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {vouch.flags.map((flag) => (
                              <Badge key={flag} variant="outline" className="text-xs">
                                {flag}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Selected Vouch Details */}
          {selectedVouch ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Vouch Details</CardTitle>
                <CardDescription>ID: {selectedVouch.id}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-center py-4">
                  <div className="flex items-center justify-center gap-4 mb-4">
                    <div className="text-center">
                      <Avatar className="h-12 w-12 mx-auto mb-1">
                        <AvatarImage src={selectedVouch.giver.avatar || undefined} />
                        <AvatarFallback>{selectedVouch.giver.username.charAt(0).toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <p className="text-sm font-medium">{selectedVouch.giver.username}</p>
                      <p className="text-xs text-muted-foreground">
                        Joined {formatDate(selectedVouch.giver.joinDate)}
                      </p>
                    </div>
                    <ArrowRight className="h-6 w-6 text-muted-foreground" />
                    <div className="text-center">
                      <Avatar className="h-12 w-12 mx-auto mb-1">
                        <AvatarImage src={selectedVouch.receiver.avatar || undefined} />
                        <AvatarFallback>{selectedVouch.receiver.username.charAt(0).toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <p className="text-sm font-medium">{selectedVouch.receiver.username}</p>
                      <p className="text-xs text-muted-foreground">
                        Joined {formatDate(selectedVouch.receiver.joinDate)}
                      </p>
                    </div>
                  </div>
                  {getStatusBadge(selectedVouch.status)}
                </div>

                <div>
                  <p className="text-sm text-muted-foreground mb-1">Message</p>
                  <p className="p-3 bg-muted/50 rounded-lg text-sm">
                    "{selectedVouch.message || "No message provided"}"
                  </p>
                </div>

                <div>
                  <p className="text-sm text-muted-foreground mb-1">Type</p>
                  <Badge variant="outline" className="capitalize">
                    {selectedVouch.type} vouch
                  </Badge>
                </div>

                {selectedVouch.rating && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Rating</p>
                    <div className="flex items-center gap-1">
                      <Star className="h-4 w-4 fill-yellow-500 text-yellow-500" />
                      <span className="text-sm">{selectedVouch.rating}/5</span>
                    </div>
                  </div>
                )}

                {selectedVouch.transaction && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Related Transaction</p>
                    <p className="text-sm">{selectedVouch.transaction.item}</p>
                  </div>
                )}

                <div>
                  <p className="text-sm text-muted-foreground mb-1">Created</p>
                  <p className="text-sm">{formatTimeAgo(selectedVouch.createdAt)}</p>
                </div>

                {selectedVouch.flags.length > 0 && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Flags</p>
                    <div className="flex flex-wrap gap-1">
                      {selectedVouch.flags.map((flag) => (
                        <Badge key={flag} variant="destructive" className="text-xs">
                          {flag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex gap-2 pt-4">
                  <Button
                    variant="destructive"
                    className="flex-1"
                    disabled={actionLoading}
                    onClick={() => handleAction("invalidate")}
                  >
                    {actionLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-1" />
                    ) : (
                      <Trash2 className="h-4 w-4 mr-1" />
                    )}
                    Invalidate
                  </Button>
                  <Button
                    variant="outline"
                    className="flex-1"
                    disabled={actionLoading}
                    onClick={() => handleAction("approve")}
                  >
                    {actionLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-1" />
                    ) : (
                      <Award className="h-4 w-4 mr-1" />
                    )}
                    Approve
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-8 text-center">
                <Award className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">Select a vouch to view details</p>
              </CardContent>
            </Card>
          )}

          {/* Quick Stats */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Vouch Health</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>Valid Rate</span>
                  <span className="text-green-500">{Math.round((stats.valid / stats.total) * 100)}%</span>
                </div>
                <Progress value={(stats.valid / stats.total) * 100} className="h-2" />
              </div>
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>Suspicious Rate</span>
                  <span className="text-orange-500">{Math.round((stats.suspicious / stats.total) * 100)}%</span>
                </div>
                <Progress value={(stats.suspicious / stats.total) * 100} className="h-2 [&>div]:bg-orange-500" />
              </div>
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>Invalid Rate</span>
                  <span className="text-red-500">{Math.round((stats.invalid / stats.total) * 100)}%</span>
                </div>
                <Progress value={(stats.invalid / stats.total) * 100} className="h-2 [&>div]:bg-red-500" />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Action Dialog */}
      <Dialog open={actionDialogOpen} onOpenChange={setActionDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="capitalize">{actionType} Vouch</DialogTitle>
            <DialogDescription>
              {actionType === "invalidate"
                ? "This will mark the vouch as invalid and remove it from the receiver's count."
                : "This will approve the vouch and mark it as valid."}
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
            <Button variant={actionType === "invalidate" ? "destructive" : "default"} onClick={executeAction}>
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={reviewDialogOpen} onOpenChange={setReviewDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Vouch Review Details</DialogTitle>
            <DialogDescription>Complete information about this vouch</DialogDescription>
          </DialogHeader>
          {reviewingVouch && (
            <div className="space-y-6">
              {/* Users Info */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 border rounded-lg">
                  <p className="text-sm text-muted-foreground mb-2">Vouch Giver</p>
                  <div className="flex items-center gap-3 mb-3">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={reviewingVouch.giver.avatar || undefined} />
                      <AvatarFallback>{reviewingVouch.giver.username.charAt(0).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">{reviewingVouch.giver.username}</p>
                      <p className="text-xs text-muted-foreground">{reviewingVouch.giver.vouchCount} vouches</p>
                    </div>
                  </div>
                  <div className="space-y-1 text-sm">
                    <p>
                      <span className="text-muted-foreground">Joined:</span> {formatDate(reviewingVouch.giver.joinDate)}
                    </p>
                  </div>
                </div>
                <div className="p-4 border rounded-lg">
                  <p className="text-sm text-muted-foreground mb-2">Vouch Receiver</p>
                  <div className="flex items-center gap-3 mb-3">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={reviewingVouch.receiver.avatar || undefined} />
                      <AvatarFallback>{reviewingVouch.receiver.username.charAt(0).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">{reviewingVouch.receiver.username}</p>
                      <p className="text-xs text-muted-foreground">{reviewingVouch.receiver.vouchCount} vouches</p>
                    </div>
                  </div>
                  <div className="space-y-1 text-sm">
                    <p>
                      <span className="text-muted-foreground">Joined:</span> {formatDate(reviewingVouch.receiver.joinDate)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Transaction Details */}
              {reviewingVouch.transaction && (
                <div className="p-4 border rounded-lg">
                  <p className="text-sm text-muted-foreground mb-2">Related Transaction</p>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{reviewingVouch.transaction.item}</p>
                      <p className="text-sm text-muted-foreground">{formatTimeAgo(reviewingVouch.transaction.date)}</p>
                    </div>
                    <p className="text-lg font-bold text-primary">₱{reviewingVouch.transaction.price.toLocaleString()}</p>
                  </div>
                </div>
              )}

              {/* Vouch Message */}
              <div className="p-4 border rounded-lg">
                <p className="text-sm text-muted-foreground mb-2">Vouch Message</p>
                <p className="text-sm">"{reviewingVouch.message || "No message provided"}"</p>
              </div>

              {/* Type and Rating */}
              <div className="flex items-center gap-4">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Type</p>
                  <Badge variant="outline" className="capitalize">{reviewingVouch.type}</Badge>
                </div>
                {reviewingVouch.rating && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Rating</p>
                    <div className="flex items-center gap-1">
                      <Star className="h-4 w-4 fill-yellow-500 text-yellow-500" />
                      <span className="text-sm">{reviewingVouch.rating}/5</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Status and Flags */}
              <div className="flex items-center gap-4">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Status</p>
                  {getStatusBadge(reviewingVouch.status)}
                </div>
                {reviewingVouch.flags.length > 0 && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Flags</p>
                    <div className="flex gap-1">
                      {reviewingVouch.flags.map((flag) => (
                        <Badge key={flag} variant="destructive" className="text-xs">
                          {flag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Time Info */}
              <div className="p-4 border rounded-lg">
                <p className="text-sm text-muted-foreground mb-2">Timeline</p>
                <p className="text-sm">Created: {formatTimeAgo(reviewingVouch.createdAt)}</p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setReviewDialogOpen(false)}>
              Close
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                setReviewDialogOpen(false)
                handleAction("invalidate")
              }}
            >
              <Trash2 className="h-4 w-4 mr-1" />
              Invalidate
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={patternReviewDialogOpen} onOpenChange={setPatternReviewDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="capitalize">{reviewingPattern?.type} Pattern Review</DialogTitle>
            <DialogDescription>Detailed analysis of the suspicious pattern</DialogDescription>
          </DialogHeader>
          {reviewingPattern && (
            <div className="space-y-6">
              <div className="p-4 bg-orange-500/10 border border-orange-500/20 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium">Pattern Type</span>
                  <Badge variant="outline" className={getSeverityColor(reviewingPattern.severity)}>
                    {reviewingPattern.severity} severity
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">{reviewingPattern.description}</p>
              </div>

              <div>
                <p className="font-medium mb-3">Involved Users ({reviewingPattern.users.length})</p>
                <div className="grid grid-cols-2 gap-2">
                  {reviewingPattern.users.map((user, i) => (
                    <div key={i} className="flex items-center gap-3 p-3 border rounded-lg">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback>{user.charAt(0).toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <span className="font-medium text-sm">{user}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-4 border rounded-lg">
                <p className="text-sm text-muted-foreground mb-1">Affected Vouches</p>
                <p className="text-2xl font-bold">{reviewingPattern.vouchCount}</p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setPatternReviewDialogOpen(false)}>
              Close
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                setPatternReviewDialogOpen(false)
                setPatternActionDialogOpen(true)
              }}
            >
              <Trash2 className="h-4 w-4 mr-1" />
              Invalidate All
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Pattern Action Dialog */}
      <Dialog open={patternActionDialogOpen} onOpenChange={setPatternActionDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invalidate Pattern Vouches</DialogTitle>
            <DialogDescription>
              This will invalidate all vouches in this pattern and notify affected users.
            </DialogDescription>
          </DialogHeader>
          <div>
            <Label>Reason for Invalidation</Label>
            <Textarea
              placeholder="Explain why these vouches are being invalidated..."
              value={patternActionNotes}
              onChange={(e) => setPatternActionNotes(e.target.value)}
              className="mt-2"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPatternActionDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={actionLoading}
              onClick={() => {
                if (reviewingPattern) {
                  handleInvalidatePattern(reviewingPattern)
                }
              }}
            >
              {actionLoading ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Trash2 className="h-4 w-4 mr-1" />}
              Confirm Invalidation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
