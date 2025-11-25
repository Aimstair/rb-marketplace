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
import { Search, Award, AlertTriangle, ArrowRight, Trash2, XCircle, Network, Eye } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from "recharts"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"

// Mock vouch data
const mockVouches = [
  {
    id: "1",
    giver: {
      username: "TrustyShopper",
      avatar: "/placeholder.svg?key=l5w1d",
      vouches: 189,
      joinDate: "Mar 2023",
      ip: "192.168.1.100",
    },
    receiver: {
      username: "NinjaTrader",
      avatar: "/placeholder.svg?key=20fdb",
      vouches: 342,
      joinDate: "Jan 2023",
      ip: "192.168.1.200",
    },
    type: "seller",
    message: "Great trader! Fast delivery and very communicative.",
    createdAt: "2 hours ago",
    status: "valid",
    flags: [],
    transaction: { item: "Golden Dragon Pet", price: 15000, date: "2 hours ago" },
  },
  {
    id: "2",
    giver: {
      username: "AltAccount1",
      avatar: "/placeholder.svg?key=hy1ns",
      vouches: 5,
      joinDate: "Dec 2024",
      ip: "192.168.1.50",
    },
    receiver: {
      username: "ScammerJoe",
      avatar: "/placeholder.svg?key=i0nkb",
      vouches: 12,
      joinDate: "Nov 2024",
      ip: "192.168.1.50",
    },
    type: "buyer",
    message: "Best trader ever!",
    createdAt: "5 hours ago",
    status: "suspicious",
    flags: ["same-ip", "new-account"],
    transaction: { item: "10,000 Robux", price: 3500, date: "5 hours ago" },
  },
  {
    id: "3",
    giver: {
      username: "AltAccount2",
      avatar: "/placeholder.svg?key=k8bhb",
      vouches: 3,
      joinDate: "Dec 2024",
      ip: "192.168.1.50",
    },
    receiver: {
      username: "ScammerJoe",
      avatar: "/placeholder.svg?key=3hckv",
      vouches: 12,
      joinDate: "Nov 2024",
      ip: "192.168.1.50",
    },
    type: "seller",
    message: "Amazing!",
    createdAt: "5 hours ago",
    status: "suspicious",
    flags: ["same-ip", "rapid-vouching"],
    transaction: { item: "Neon Unicorn", price: 8000, date: "5 hours ago" },
  },
  {
    id: "4",
    giver: {
      username: "EliteTrader99",
      avatar: "/placeholder.svg?key=mepqz",
      vouches: 567,
      joinDate: "Jun 2022",
      ip: "192.168.2.100",
    },
    receiver: {
      username: "TrustyShopper",
      avatar: "/placeholder.svg?key=mf8qd",
      vouches: 189,
      joinDate: "Mar 2023",
      ip: "192.168.1.100",
    },
    type: "seller",
    message: "Smooth transaction, highly recommend!",
    createdAt: "1 day ago",
    status: "valid",
    flags: [],
    transaction: { item: "Shadow Dragon", price: 25000, date: "1 day ago" },
  },
  {
    id: "5",
    giver: {
      username: "NewUser123",
      avatar: "/placeholder.svg?key=izcpl",
      vouches: 0,
      joinDate: "Dec 2024",
      ip: "192.168.3.50",
    },
    receiver: {
      username: "FakeAccount123",
      avatar: "/placeholder.svg?key=cjhw9",
      vouches: 2,
      joinDate: "Dec 2024",
      ip: "192.168.3.50",
    },
    type: "buyer",
    message: "Good",
    createdAt: "2 days ago",
    status: "invalid",
    flags: ["circular-vouch", "removed"],
    invalidReason: "Detected circular vouching pattern",
    transaction: { item: "5,000 Robux", price: 1750, date: "2 days ago" },
  },
  {
    id: "6",
    giver: {
      username: "QuickVoucher",
      avatar: "/placeholder.svg?key=9r1nb",
      vouches: 45,
      joinDate: "Aug 2024",
      ip: "192.168.4.100",
    },
    receiver: {
      username: "SusUser",
      avatar: "/placeholder.svg?key=2u27f",
      vouches: 28,
      joinDate: "Sep 2024",
      ip: "192.168.5.200",
    },
    type: "seller",
    message: "Perfect!",
    createdAt: "3 hours ago",
    status: "suspicious",
    flags: ["rapid-vouching"],
    transaction: { item: "Mega Neon Cat", price: 5000, date: "3 hours ago" },
  },
]

const suspiciousPatterns = [
  {
    id: "1",
    type: "circular",
    users: ["ScammerJoe", "AltAccount1", "AltAccount2", "AltAccount3"],
    description: "4 accounts vouching each other in a circle",
    severity: "high",
    vouchCount: 12,
  },
  {
    id: "2",
    type: "rapid",
    users: ["QuickVoucher"],
    description: "Gave 15 vouches in the last hour",
    severity: "medium",
    vouchCount: 15,
  },
  {
    id: "3",
    type: "same-ip",
    users: ["NewUser123", "FakeAccount123", "AnotherFake"],
    description: "Multiple accounts from same IP vouching each other",
    severity: "high",
    vouchCount: 8,
  },
]

const vouchTrendData = [
  { date: "Mon", vouches: 45, invalid: 3 },
  { date: "Tue", vouches: 52, invalid: 5 },
  { date: "Wed", vouches: 48, invalid: 2 },
  { date: "Thu", vouches: 61, invalid: 8 },
  { date: "Fri", vouches: 55, invalid: 4 },
  { date: "Sat", vouches: 72, invalid: 6 },
  { date: "Sun", vouches: 68, invalid: 5 },
]

export default function VouchesPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [selectedVouch, setSelectedVouch] = useState<(typeof mockVouches)[0] | null>(null)
  const [actionDialogOpen, setActionDialogOpen] = useState(false)
  const [actionType, setActionType] = useState<string>("")
  const [actionNotes, setActionNotes] = useState("")
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false)
  const [reviewingVouch, setReviewingVouch] = useState<(typeof mockVouches)[0] | null>(null)
  const [patternReviewDialogOpen, setPatternReviewDialogOpen] = useState(false)
  const [reviewingPattern, setReviewingPattern] = useState<(typeof suspiciousPatterns)[0] | null>(null)

  const filteredVouches = mockVouches.filter((vouch) => {
    const matchesSearch =
      vouch.giver.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
      vouch.receiver.username.toLowerCase().includes(searchQuery.toLowerCase())

    const matchesStatus = statusFilter === "all" || vouch.status === statusFilter

    return matchesSearch && matchesStatus
  })

  const stats = {
    total: mockVouches.length,
    valid: mockVouches.filter((v) => v.status === "valid").length,
    suspicious: mockVouches.filter((v) => v.status === "suspicious").length,
    invalid: mockVouches.filter((v) => v.status === "invalid").length,
  }

  const handleAction = (action: string) => {
    setActionType(action)
    setActionDialogOpen(true)
  }

  const executeAction = () => {
    console.log(`Executing ${actionType} on vouch ${selectedVouch?.id} with notes: ${actionNotes}`)
    setActionDialogOpen(false)
    setActionNotes("")
  }

  const handleReviewVouch = (vouch: (typeof mockVouches)[0]) => {
    setReviewingVouch(vouch)
    setReviewDialogOpen(true)
  }

  const handleReviewPattern = (pattern: (typeof suspiciousPatterns)[0]) => {
    setReviewingPattern(pattern)
    setPatternReviewDialogOpen(true)
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
                      <Button size="sm" variant="destructive">
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
            </CardContent>
          </Card>

          {/* Vouch Trend Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Vouch Activity</CardTitle>
              <CardDescription>Daily vouches and invalid detections</CardDescription>
            </CardHeader>
            <CardContent className="overflow-hidden">
              <ChartContainer
                config={{
                  vouches: { label: "Total Vouches", color: "hsl(var(--chart-1))" },
                  invalid: { label: "Invalid", color: "hsl(var(--chart-4))" },
                }}
                className="h-[200px] min-w-0"
              >
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={vouchTrendData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="date" className="text-xs" />
                    <YAxis className="text-xs" />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Line type="monotone" dataKey="vouches" stroke="hsl(var(--chart-1))" strokeWidth={2} />
                    <Line type="monotone" dataKey="invalid" stroke="hsl(var(--chart-4))" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </ChartContainer>
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
                <div className="space-y-3">
                  {filteredVouches.map((vouch) => (
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
                            <AvatarImage src={vouch.giver.avatar || "/placeholder.svg"} />
                            <AvatarFallback>{vouch.giver.username.charAt(0)}</AvatarFallback>
                          </Avatar>
                          <ArrowRight className="h-4 w-4 text-muted-foreground" />
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={vouch.receiver.avatar || "/placeholder.svg"} />
                            <AvatarFallback>{vouch.receiver.username.charAt(0)}</AvatarFallback>
                          </Avatar>
                          <div className="ml-2">
                            <p className="text-sm font-medium">
                              {vouch.giver.username} vouched {vouch.receiver.username}
                            </p>
                            <p className="text-xs text-muted-foreground">{vouch.createdAt}</p>
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
                      <p className="text-sm text-muted-foreground mb-2">"{vouch.message}"</p>
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
                        <AvatarImage src={selectedVouch.giver.avatar || "/placeholder.svg"} />
                        <AvatarFallback>{selectedVouch.giver.username.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <p className="text-sm font-medium">{selectedVouch.giver.username}</p>
                      <p className="text-xs text-muted-foreground">{selectedVouch.giver.vouches} vouches</p>
                    </div>
                    <ArrowRight className="h-6 w-6 text-muted-foreground" />
                    <div className="text-center">
                      <Avatar className="h-12 w-12 mx-auto mb-1">
                        <AvatarImage src={selectedVouch.receiver.avatar || "/placeholder.svg"} />
                        <AvatarFallback>{selectedVouch.receiver.username.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <p className="text-sm font-medium">{selectedVouch.receiver.username}</p>
                      <p className="text-xs text-muted-foreground">{selectedVouch.receiver.vouches} vouches</p>
                    </div>
                  </div>
                  {getStatusBadge(selectedVouch.status)}
                </div>

                <div>
                  <p className="text-sm text-muted-foreground mb-1">Message</p>
                  <p className="p-3 bg-muted/50 rounded-lg text-sm">"{selectedVouch.message}"</p>
                </div>

                <div>
                  <p className="text-sm text-muted-foreground mb-1">Type</p>
                  <Badge variant="outline" className="capitalize">
                    {selectedVouch.type} vouch
                  </Badge>
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

                {selectedVouch.invalidReason && (
                  <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                    <p className="text-sm font-medium text-red-500 mb-1">Invalid Reason</p>
                    <p className="text-sm text-muted-foreground">{selectedVouch.invalidReason}</p>
                  </div>
                )}

                {selectedVouch.status !== "invalid" && (
                  <div className="flex gap-2 pt-4">
                    <Button variant="destructive" className="flex-1" onClick={() => handleAction("invalidate")}>
                      <Trash2 className="h-4 w-4 mr-1" />
                      Invalidate
                    </Button>
                    {selectedVouch.status === "suspicious" && (
                      <Button
                        variant="outline"
                        className="flex-1 bg-transparent"
                        onClick={() => handleAction("approve")}
                      >
                        <Award className="h-4 w-4 mr-1" />
                        Approve
                      </Button>
                    )}
                  </div>
                )}
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
                      <AvatarImage src={reviewingVouch.giver.avatar || "/placeholder.svg"} />
                      <AvatarFallback>{reviewingVouch.giver.username.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">{reviewingVouch.giver.username}</p>
                      <p className="text-xs text-muted-foreground">{reviewingVouch.giver.vouches} vouches</p>
                    </div>
                  </div>
                  <div className="space-y-1 text-sm">
                    <p>
                      <span className="text-muted-foreground">Joined:</span> {reviewingVouch.giver.joinDate}
                    </p>
                    <p>
                      <span className="text-muted-foreground">IP:</span> {reviewingVouch.giver.ip}
                    </p>
                  </div>
                </div>
                <div className="p-4 border rounded-lg">
                  <p className="text-sm text-muted-foreground mb-2">Vouch Receiver</p>
                  <div className="flex items-center gap-3 mb-3">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={reviewingVouch.receiver.avatar || "/placeholder.svg"} />
                      <AvatarFallback>{reviewingVouch.receiver.username.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">{reviewingVouch.receiver.username}</p>
                      <p className="text-xs text-muted-foreground">{reviewingVouch.receiver.vouches} vouches</p>
                    </div>
                  </div>
                  <div className="space-y-1 text-sm">
                    <p>
                      <span className="text-muted-foreground">Joined:</span> {reviewingVouch.receiver.joinDate}
                    </p>
                    <p>
                      <span className="text-muted-foreground">IP:</span> {reviewingVouch.receiver.ip}
                    </p>
                  </div>
                </div>
              </div>

              {/* Transaction Details */}
              <div className="p-4 border rounded-lg">
                <p className="text-sm text-muted-foreground mb-2">Related Transaction</p>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{reviewingVouch.transaction.item}</p>
                    <p className="text-sm text-muted-foreground">{reviewingVouch.transaction.date}</p>
                  </div>
                  <p className="text-lg font-bold text-primary">₱{reviewingVouch.transaction.price.toLocaleString()}</p>
                </div>
              </div>

              {/* Vouch Message */}
              <div className="p-4 border rounded-lg">
                <p className="text-sm text-muted-foreground mb-2">Vouch Message</p>
                <p className="text-sm">"{reviewingVouch.message}"</p>
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

              {/* IP Match Warning */}
              {reviewingVouch.giver.ip === reviewingVouch.receiver.ip && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-red-500" />
                  <p className="text-sm text-red-500 font-medium">Warning: Both users share the same IP address</p>
                </div>
              )}
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
              Invalidate Vouch
            </Button>
            {reviewingVouch?.status === "suspicious" && (
              <Button
                onClick={() => {
                  setReviewDialogOpen(false)
                  handleAction("approve")
                }}
              >
                Approve Vouch
              </Button>
            )}
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
                        <AvatarFallback>{user.charAt(0)}</AvatarFallback>
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
            <Button variant="destructive">
              <Trash2 className="h-4 w-4 mr-1" />
              Invalidate All Vouches
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
