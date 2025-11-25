"use client"

import { useState } from "react"
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
  Search,
  Flag,
  User,
  ShoppingBag,
  MessageSquare,
  DollarSign,
  ChevronRight,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Ban,
  Eye,
} from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"

// Mock reports data
const mockReports = [
  {
    id: "1",
    type: "user",
    reporter: { username: "TrustyShopper", avatar: "/placeholder.svg?key=hgp0l" },
    reported: {
      username: "ScammerJoe",
      avatar: "/placeholder.svg?key=qlpsy",
      id: "user-2",
    },
    reason: "Scam attempt",
    category: "scam",
    description:
      "This user tried to scam me by claiming they sent Robux but never did. They have done this to multiple people.",
    evidence: ["/placeholder.svg?key=vmhcr", "/placeholder.svg?key=ksyef"],
    status: "pending",
    severity: "high",
    createdAt: "2 hours ago",
    relatedListingId: null,
    relatedChatId: "chat-123",
  },
  {
    id: "2",
    type: "listing",
    reporter: { username: "SafeTrader99", avatar: "/placeholder.svg?key=w0a1c" },
    reported: {
      title: "FREE ROBUX!!! CLICK HERE",
      seller: "SpamBot2024",
      id: "listing-2",
    },
    reason: "Spam/Scam listing",
    category: "spam",
    description: "Obvious scam listing trying to steal accounts. Multiple people have reported this.",
    evidence: ["/placeholder.svg?key=oopmy"],
    status: "pending",
    severity: "high",
    createdAt: "5 hours ago",
    relatedListingId: "listing-2",
    relatedChatId: null,
  },
  {
    id: "3",
    type: "user",
    reporter: { username: "CasualGamer", avatar: "/placeholder.svg?key=8yl0p" },
    reported: {
      username: "FakeAccount123",
      avatar: "/placeholder.svg?key=z4xau",
      id: "user-4",
    },
    reason: "Impersonation",
    category: "impersonation",
    description:
      "This user is pretending to be a well-known trader named 'RealTrader123'. They've changed their profile to look identical.",
    evidence: [],
    status: "reviewing",
    severity: "medium",
    createdAt: "1 day ago",
    relatedListingId: null,
    relatedChatId: null,
  },
  {
    id: "4",
    type: "chat",
    reporter: { username: "EliteTrader99", avatar: "/placeholder.svg?key=3cvvv" },
    reported: {
      username: "HarasserXX",
      avatar: "/placeholder.svg?key=i1lae",
      id: "user-7",
    },
    reason: "Harassment",
    category: "harassment",
    description: "This user has been sending threatening and abusive messages after a failed trade negotiation.",
    evidence: ["/placeholder.svg?key=hxwsf"],
    status: "pending",
    severity: "high",
    createdAt: "3 hours ago",
    relatedListingId: null,
    relatedChatId: "chat-456",
  },
  {
    id: "5",
    type: "currency",
    reporter: { username: "RobuxKing", avatar: "/placeholder.svg?key=r1x85" },
    reported: {
      username: "CurrencyScammer",
      avatar: "/placeholder.svg?key=nkuef",
      id: "user-8",
    },
    reason: "Currency fraud",
    category: "fraud",
    description: "User advertised 10,000 Robux for $50 but only sent 1,000 Robux. Refusing to respond to messages.",
    evidence: ["/placeholder.svg?key=8vgwy", "/placeholder.svg?key=mq54x"],
    status: "resolved",
    severity: "high",
    createdAt: "2 days ago",
    resolution: "User banned. Refund issued.",
    relatedListingId: null,
    relatedChatId: "chat-789",
  },
  {
    id: "6",
    type: "listing",
    reporter: { username: "NinjaTrader", avatar: "/placeholder.svg?key=kf28c" },
    reported: {
      title: "Dominus Infernus",
      seller: "SusTrader",
      id: "listing-6",
    },
    reason: "Price manipulation",
    category: "price-manipulation",
    description:
      "This seller is intentionally pricing way below market value to manipulate prices. Multiple accounts posting similar items.",
    evidence: [],
    status: "dismissed",
    severity: "low",
    createdAt: "3 days ago",
    resolution: "Insufficient evidence. Market price fluctuations are normal.",
    relatedListingId: "listing-6",
    relatedChatId: null,
  },
]

const chatLogs = [
  { sender: "ScammerJoe", message: "Hey, I'll send you the Robux first, trust me!", time: "10:23 AM" },
  { sender: "TrustyShopper", message: "Okay, sounds good. Send it now.", time: "10:24 AM" },
  { sender: "ScammerJoe", message: "Done! I sent 5000 Robux. Now give me the pet.", time: "10:25 AM" },
  { sender: "TrustyShopper", message: "I didn't receive anything...", time: "10:30 AM" },
  { sender: "ScammerJoe", message: "It takes 24 hours to process. Just trust me bro.", time: "10:31 AM" },
  { sender: "TrustyShopper", message: "That's not how Robux works. You're trying to scam me!", time: "10:32 AM" },
  { sender: "ScammerJoe", message: "Whatever, you're wasting my time.", time: "10:33 AM" },
]

export default function ReportsPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [typeFilter, setTypeFilter] = useState("all")
  const [statusFilter, setStatusFilter] = useState("all")
  const [selectedReport, setSelectedReport] = useState<(typeof mockReports)[0] | null>(null)
  const [actionDialogOpen, setActionDialogOpen] = useState(false)
  const [actionType, setActionType] = useState<string>("")
  const [actionNotes, setActionNotes] = useState("")

  const filteredReports = mockReports.filter((report) => {
    const matchesSearch =
      report.reporter.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ("username" in report.reported && report.reported.username?.toLowerCase().includes(searchQuery.toLowerCase())) ||
      ("title" in report.reported && report.reported.title?.toLowerCase().includes(searchQuery.toLowerCase()))

    const matchesType = typeFilter === "all" || report.type === typeFilter
    const matchesStatus = statusFilter === "all" || report.status === statusFilter

    return matchesSearch && matchesType && matchesStatus
  })

  const stats = {
    total: mockReports.length,
    pending: mockReports.filter((r) => r.status === "pending").length,
    reviewing: mockReports.filter((r) => r.status === "reviewing").length,
    resolved: mockReports.filter((r) => r.status === "resolved").length,
    dismissed: mockReports.filter((r) => r.status === "dismissed").length,
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "user":
        return <User className="h-4 w-4" />
      case "listing":
        return <ShoppingBag className="h-4 w-4" />
      case "chat":
        return <MessageSquare className="h-4 w-4" />
      case "currency":
        return <DollarSign className="h-4 w-4" />
      default:
        return <Flag className="h-4 w-4" />
    }
  }

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case "high":
        return <Badge variant="destructive">High</Badge>
      case "medium":
        return <Badge className="bg-orange-500 text-white">Medium</Badge>
      case "low":
        return <Badge variant="secondary">Low</Badge>
      default:
        return <Badge variant="outline">{severity}</Badge>
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return (
          <Badge variant="outline" className="border-orange-500 text-orange-500">
            <Clock className="h-3 w-3 mr-1" />
            Pending
          </Badge>
        )
      case "reviewing":
        return (
          <Badge className="bg-blue-500 text-white">
            <Eye className="h-3 w-3 mr-1" />
            Reviewing
          </Badge>
        )
      case "resolved":
        return (
          <Badge className="bg-green-500 text-white">
            <CheckCircle className="h-3 w-3 mr-1" />
            Resolved
          </Badge>
        )
      case "dismissed":
        return (
          <Badge variant="secondary">
            <XCircle className="h-3 w-3 mr-1" />
            Dismissed
          </Badge>
        )
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const handleAction = (action: string) => {
    setActionType(action)
    setActionDialogOpen(true)
  }

  const executeAction = () => {
    console.log(`Executing ${actionType} on report ${selectedReport?.id} with notes: ${actionNotes}`)
    setActionDialogOpen(false)
    setActionNotes("")
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Reports & Flagged Content</h1>
        <p className="text-muted-foreground">Review and handle user reports, flagged content, and disputes</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold">{stats.total}</p>
            <p className="text-sm text-muted-foreground">Total Reports</p>
          </CardContent>
        </Card>
        <Card className="border-orange-500/50">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-orange-500">{stats.pending}</p>
            <p className="text-sm text-muted-foreground">Pending</p>
          </CardContent>
        </Card>
        <Card className="border-blue-500/50">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-blue-500">{stats.reviewing}</p>
            <p className="text-sm text-muted-foreground">Reviewing</p>
          </CardContent>
        </Card>
        <Card className="border-green-500/50">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-green-500">{stats.resolved}</p>
            <p className="text-sm text-muted-foreground">Resolved</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-muted-foreground">{stats.dismissed}</p>
            <p className="text-sm text-muted-foreground">Dismissed</p>
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
                placeholder="Search reports..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-full md:w-[180px]">
                <SelectValue placeholder="Report Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="user">User Reports</SelectItem>
                <SelectItem value="listing">Listing Reports</SelectItem>
                <SelectItem value="chat">Chat Reports</SelectItem>
                <SelectItem value="currency">Currency Reports</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-[180px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="reviewing">Reviewing</SelectItem>
                <SelectItem value="resolved">Resolved</SelectItem>
                <SelectItem value="dismissed">Dismissed</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Reports List */}
        <div className="lg:col-span-1">
          <Card className="h-fit">
            <CardHeader>
              <CardTitle className="text-lg">Reports Queue</CardTitle>
              <CardDescription>{filteredReports.length} reports</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="h-[600px]">
                <div className="divide-y">
                  {filteredReports.map((report) => (
                    <div
                      key={report.id}
                      onClick={() => setSelectedReport(report)}
                      className={`p-4 cursor-pointer hover:bg-muted/50 transition-colors ${
                        selectedReport?.id === report.id ? "bg-muted/50 border-l-2 border-l-primary" : ""
                      }`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div className="p-1.5 bg-muted rounded">{getTypeIcon(report.type)}</div>
                          <div>
                            <p className="font-medium text-sm">
                              {"username" in report.reported ? report.reported.username : report.reported.title}
                            </p>
                            <p className="text-xs text-muted-foreground">{report.reason}</p>
                          </div>
                        </div>
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {getSeverityBadge(report.severity)}
                          {getStatusBadge(report.status)}
                        </div>
                        <span className="text-xs text-muted-foreground">{report.createdAt}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>

        {/* Report Details */}
        <div className="lg:col-span-2">
          {selectedReport ? (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="outline" className="capitalize">
                        {selectedReport.type} Report
                      </Badge>
                      {getSeverityBadge(selectedReport.severity)}
                      {getStatusBadge(selectedReport.status)}
                    </div>
                    <CardTitle>{selectedReport.reason}</CardTitle>
                    <CardDescription>
                      Report ID: {selectedReport.id} • {selectedReport.createdAt}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Reporter & Reported */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-muted/50 rounded-lg">
                    <p className="text-sm text-muted-foreground mb-2">Reporter</p>
                    <div className="flex items-center gap-3">
                      <Avatar>
                        <AvatarImage src={selectedReport.reporter.avatar || "/placeholder.svg"} />
                        <AvatarFallback>{selectedReport.reporter.username.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <span className="font-medium">{selectedReport.reporter.username}</span>
                    </div>
                  </div>
                  <div className="p-4 bg-destructive/10 rounded-lg border border-destructive/20">
                    <p className="text-sm text-muted-foreground mb-2">Reported</p>
                    <div className="flex items-center gap-3">
                      {"avatar" in selectedReport.reported ? (
                        <>
                          <Avatar>
                            <AvatarImage src={selectedReport.reported.avatar || "/placeholder.svg"} />
                            <AvatarFallback>{selectedReport.reported.username?.charAt(0)}</AvatarFallback>
                          </Avatar>
                          <span className="font-medium">{selectedReport.reported.username}</span>
                        </>
                      ) : (
                        <div>
                          <p className="font-medium">{selectedReport.reported.title}</p>
                          <p className="text-sm text-muted-foreground">by {selectedReport.reported.seller}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Description */}
                <div>
                  <h4 className="font-medium mb-2">Description</h4>
                  <p className="text-muted-foreground bg-muted/50 p-4 rounded-lg">{selectedReport.description}</p>
                </div>

                {/* Evidence */}
                {selectedReport.evidence.length > 0 && (
                  <div>
                    <h4 className="font-medium mb-2">Evidence ({selectedReport.evidence.length} files)</h4>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                      {selectedReport.evidence.map((img, i) => (
                        <div key={i} className="relative aspect-video bg-muted rounded-lg overflow-hidden">
                          <Image
                            src={img || "/placeholder.svg"}
                            alt={`Evidence ${i + 1}`}
                            fill
                            className="object-cover"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Chat Logs if applicable */}
                {selectedReport.relatedChatId && (
                  <div>
                    <h4 className="font-medium mb-2">Related Chat Logs</h4>
                    <ScrollArea className="h-[200px] border rounded-lg">
                      <div className="p-4 space-y-3">
                        {chatLogs.map((msg, i) => (
                          <div
                            key={i}
                            className={`flex gap-3 ${
                              msg.sender ===
                              ("username" in selectedReport.reported ? selectedReport.reported.username : "")
                                ? "bg-destructive/10"
                                : "bg-muted/50"
                            } p-3 rounded-lg`}
                          >
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="font-medium text-sm">{msg.sender}</span>
                                <span className="text-xs text-muted-foreground">{msg.time}</span>
                              </div>
                              <p className="text-sm">{msg.message}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </div>
                )}

                {/* Resolution (if resolved/dismissed) */}
                {selectedReport.resolution && (
                  <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
                    <h4 className="font-medium mb-2 text-green-600">Resolution</h4>
                    <p className="text-muted-foreground">{selectedReport.resolution}</p>
                  </div>
                )}

                <Separator />

                {/* Actions */}
                {selectedReport.status !== "resolved" && selectedReport.status !== "dismissed" && (
                  <div className="flex flex-wrap gap-2">
                    <Button onClick={() => handleAction("warn")}>
                      <AlertTriangle className="h-4 w-4 mr-2" />
                      Warn User
                    </Button>
                    <Button variant="destructive" onClick={() => handleAction("ban")}>
                      <Ban className="h-4 w-4 mr-2" />
                      Ban User
                    </Button>
                    <Button variant="outline" onClick={() => handleAction("resolve")}>
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Resolve
                    </Button>
                    <Button variant="ghost" onClick={() => handleAction("dismiss")}>
                      <XCircle className="h-4 w-4 mr-2" />
                      Dismiss
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-12 text-center">
                <Flag className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">Select a report to view details</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Action Dialog */}
      <Dialog open={actionDialogOpen} onOpenChange={setActionDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="capitalize">{actionType} Action</DialogTitle>
            <DialogDescription>
              {actionType === "ban" && "This will permanently ban the reported user."}
              {actionType === "warn" && "This will issue a warning to the reported user."}
              {actionType === "resolve" && "Mark this report as resolved."}
              {actionType === "dismiss" && "Dismiss this report as invalid or insufficient evidence."}
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
            <Button variant={actionType === "ban" ? "destructive" : "default"} onClick={executeAction}>
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
