"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Search, HelpCircle, ChevronRight, Send } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Textarea } from "@/components/ui/textarea"
import { Separator } from "@/components/ui/separator"
import { useToast } from "@/hooks/use-toast"
import { getSupportTickets, closeTicket } from "@/app/actions/admin"
import { useSession } from "next-auth/react"

const mockTickets = [
  {
    id: "TKT-001",
    subject: "Cannot withdraw my Robux",
    user: { username: "TrustyShopper", avatar: "/placeholder.svg?key=fjtii", email: "trusty@example.com" },
    category: "account",
    priority: "high",
    status: "open",
    createdAt: "2 hours ago",
    messages: [
      {
        sender: "user",
        message: "I've been trying to withdraw my Robux for 3 days now but it keeps failing. Please help!",
        time: "2 hours ago",
      },
      {
        sender: "admin",
        message: "Hi! I'm looking into this for you. Can you provide your Roblox username?",
        time: "1 hour ago",
      },
      { sender: "user", message: "My Roblox username is TrustyShopperRBX", time: "45 min ago" },
    ],
  },
  {
    id: "TKT-002",
    subject: "Appeal for ban",
    user: { username: "BannedUser", avatar: "/placeholder.svg?key=g0uez", email: "banned@example.com" },
    category: "appeal",
    priority: "medium",
    status: "pending",
    createdAt: "1 day ago",
    messages: [
      {
        sender: "user",
        message: "I was wrongfully banned. I never scammed anyone. Please review my case.",
        time: "1 day ago",
      },
    ],
  },
  {
    id: "TKT-003",
    subject: "Transaction dispute - Item not received",
    user: { username: "VictimUser", avatar: "/placeholder.svg?key=hqrx9", email: "victim@example.com" },
    category: "dispute",
    priority: "high",
    status: "in-progress",
    createdAt: "5 hours ago",
    messages: [
      {
        sender: "user",
        message: "I paid $200 for a Dominus but never received it. The seller blocked me.",
        time: "5 hours ago",
      },
      {
        sender: "admin",
        message: "I'm sorry to hear this. We're investigating the seller. Can you share payment proof?",
        time: "4 hours ago",
      },
    ],
  },
  {
    id: "TKT-004",
    subject: "How do I verify my account?",
    user: { username: "NewUser123", avatar: "/placeholder.svg?key=0h7wm", email: "new@example.com" },
    category: "general",
    priority: "low",
    status: "resolved",
    createdAt: "3 days ago",
    messages: [
      { sender: "user", message: "What steps do I need to take to get verified?", time: "3 days ago" },
      {
        sender: "admin",
        message: "To get verified, you need to complete 10 successful trades and have at least 20 vouches.",
        time: "3 days ago",
      },
      { sender: "user", message: "Thank you!", time: "2 days ago" },
    ],
  },
]

export default function SupportTicketsPage() {
  const { data: session } = useSession()
  const { toast } = useToast()
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [selectedTicket, setSelectedTicket] = useState<(typeof mockTickets)[0] | null>(null)
  const [replyMessage, setReplyMessage] = useState("")
  const [tickets, setTickets] = useState<typeof mockTickets>([])
  const [loading, setLoading] = useState(true)
  const [closingId, setClosingId] = useState<string | null>(null)

  useEffect(() => {
    const fetchTickets = async () => {
      try {
        const result = await getSupportTickets()
        if (result.success && result.data) {
          // Map database tickets to mock format for UI
          const mapped = result.data.map((ticket: any) => ({
            id: ticket.id.slice(0, 8),
            subject: ticket.subject,
            user: {
              username: ticket.user?.username || "Unknown User",
              avatar: ticket.user?.profileImage || "/placeholder.svg",
              email: ticket.user?.email || "unknown@example.com",
            },
            category: "support",
            priority: "medium",
            status: ticket.status.toLowerCase() === "open" ? "open" : "resolved",
            createdAt: new Date(ticket.createdAt).toLocaleDateString(),
            messages: [
              {
                sender: "user",
                message: ticket.message,
                time: new Date(ticket.createdAt).toLocaleDateString(),
              },
            ],
            dbId: ticket.id,
          }))
          setTickets(mapped)
          if (mapped.length > 0) {
            setSelectedTicket(mapped[0])
          }
        }
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to fetch support tickets",
          variant: "destructive",
        })
      } finally {
        setLoading(false)
      }
    }

    fetchTickets()
  }, [toast])

  const handleCloseTicket = async () => {
    if (!selectedTicket || !session?.user?.id) {
      toast({
        title: "Error",
        description: "Unable to close ticket",
        variant: "destructive",
      })
      return
    }

    setClosingId(selectedTicket.dbId)
    try {
      const result = await closeTicket(selectedTicket.dbId, session.user.id)
      if (result.success) {
        toast({
          title: "Success",
          description: "Ticket closed successfully",
        })
        setReplyMessage("")
        // Refresh tickets
        const refreshResult = await getSupportTickets()
        if (refreshResult.success && refreshResult.data) {
          const mapped = refreshResult.data.map((ticket: any) => ({
            id: ticket.id.slice(0, 8),
            subject: ticket.subject,
            user: {
              username: ticket.user?.username || "Unknown User",
              avatar: ticket.user?.profileImage || "/placeholder.svg",
              email: ticket.user?.email || "unknown@example.com",
            },
            category: "support",
            priority: "medium",
            status: ticket.status.toLowerCase() === "open" ? "open" : "resolved",
            createdAt: new Date(ticket.createdAt).toLocaleDateString(),
            messages: [
              {
                sender: "user",
                message: ticket.message,
                time: new Date(ticket.createdAt).toLocaleDateString(),
              },
            ],
            dbId: ticket.id,
          }))
          setTickets(mapped)
          if (mapped.length > 0) {
            setSelectedTicket(mapped[0])
          }
        }
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to close ticket",
          variant: "destructive",
        })
      }
    } finally {
      setClosingId(null)
    }
  }

  const filteredTickets = tickets.filter((ticket) => {
    const matchesSearch =
      ticket.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ticket.user.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ticket.id.toLowerCase().includes(searchQuery.toLowerCase())

    const matchesStatus = statusFilter === "all" || ticket.status === statusFilter

    return matchesSearch && matchesStatus
  })

  const stats = {
    total: tickets.length,
    open: tickets.filter((t) => t.status === "open").length,
    inProgress: tickets.filter((t) => t.status === "in-progress").length,
    pending: tickets.filter((t) => t.status === "pending").length,
    resolved: tickets.filter((t) => t.status === "resolved").length,
  }

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case "high":
        return <Badge variant="destructive">High</Badge>
      case "medium":
        return <Badge className="bg-orange-500 text-white">Medium</Badge>
      case "low":
        return <Badge variant="secondary">Low</Badge>
      default:
        return <Badge variant="outline">{priority}</Badge>
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "open":
        return <Badge className="bg-blue-500 text-white">Open</Badge>
      case "in-progress":
        return <Badge className="bg-yellow-500 text-white">In Progress</Badge>
      case "pending":
        return <Badge variant="outline">Pending</Badge>
      case "resolved":
        return <Badge className="bg-green-500 text-white">Resolved</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const handleSendReply = () => {
    if (replyMessage.trim()) {
      console.log("Sending reply:", replyMessage)
      setReplyMessage("")
    }
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Support Tickets</h1>
        <p className="text-muted-foreground">Manage user support requests and appeals</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold">{stats.total}</p>
            <p className="text-sm text-muted-foreground">Total</p>
          </CardContent>
        </Card>
        <Card className="border-blue-500/50">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-blue-500">{stats.open}</p>
            <p className="text-sm text-muted-foreground">Open</p>
          </CardContent>
        </Card>
        <Card className="border-yellow-500/50">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-yellow-500">{stats.inProgress}</p>
            <p className="text-sm text-muted-foreground">In Progress</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-muted-foreground">{stats.pending}</p>
            <p className="text-sm text-muted-foreground">Pending</p>
          </CardContent>
        </Card>
        <Card className="border-green-500/50">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-green-500">{stats.resolved}</p>
            <p className="text-sm text-muted-foreground">Resolved</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Tickets List */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Tickets</CardTitle>
              <div className="flex gap-2 mt-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[120px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="open">Open</SelectItem>
                    <SelectItem value="in-progress">In Progress</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="resolved">Resolved</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="h-[500px]">
                <div className="divide-y">
                  {filteredTickets.map((ticket) => (
                    <div
                      key={ticket.id}
                      onClick={() => setSelectedTicket(ticket)}
                      className={`p-4 cursor-pointer hover:bg-muted/50 transition-colors ${
                        selectedTicket?.id === ticket.id ? "bg-muted/50 border-l-2 border-l-primary" : ""
                      }`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <p className="font-medium text-sm line-clamp-1">{ticket.subject}</p>
                          <p className="text-xs text-muted-foreground">{ticket.id}</p>
                        </div>
                        <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      </div>
                      <div className="flex items-center gap-2 mb-2">
                        <Avatar className="h-5 w-5">
                          <AvatarImage src={ticket.user.avatar || "/placeholder.svg"} />
                          <AvatarFallback className="text-xs">{ticket.user.username.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <span className="text-xs text-muted-foreground">{ticket.user.username}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex gap-1">
                          {getPriorityBadge(ticket.priority)}
                          {getStatusBadge(ticket.status)}
                        </div>
                        <span className="text-xs text-muted-foreground">{ticket.createdAt}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>

        {/* Ticket Details */}
        <div className="lg:col-span-2">
          {selectedTicket ? (
            <Card className="h-fit">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="outline">{selectedTicket.id}</Badge>
                      <Badge variant="outline" className="capitalize">
                        {selectedTicket.category}
                      </Badge>
                      {getPriorityBadge(selectedTicket.priority)}
                      {getStatusBadge(selectedTicket.status)}
                    </div>
                    <CardTitle>{selectedTicket.subject}</CardTitle>
                    <CardDescription>Created {selectedTicket.createdAt}</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* User Info */}
                <div className="p-4 bg-muted/50 rounded-lg flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Avatar>
                      <AvatarImage src={selectedTicket.user.avatar || "/placeholder.svg"} />
                      <AvatarFallback>{selectedTicket.user.username.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">{selectedTicket.user.username}</p>
                      <p className="text-sm text-muted-foreground">{selectedTicket.user.email}</p>
                    </div>
                  </div>
                  <Button variant="outline" size="sm">
                    View Profile
                  </Button>
                </div>

                {/* Messages */}
                <div>
                  <p className="text-sm font-medium mb-3">Conversation</p>
                  <ScrollArea className="h-[300px] border rounded-lg p-4">
                    <div className="space-y-4">
                      {selectedTicket.messages.map((msg, i) => (
                        <div key={i} className={`flex gap-3 ${msg.sender === "admin" ? "flex-row-reverse" : ""}`}>
                          <Avatar className="h-8 w-8">
                            <AvatarFallback>
                              {msg.sender === "admin" ? "A" : selectedTicket.user.username.charAt(0)}
                            </AvatarFallback>
                          </Avatar>
                          <div className={`max-w-[70%] ${msg.sender === "admin" ? "text-right" : ""}`}>
                            <div
                              className={`p-3 rounded-lg ${
                                msg.sender === "admin" ? "bg-primary text-primary-foreground" : "bg-muted"
                              }`}
                            >
                              <p className="text-sm">{msg.message}</p>
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">{msg.time}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </div>

                {/* Reply Box */}
                {selectedTicket.status !== "resolved" && (
                  <div className="flex gap-2">
                    <Textarea
                      placeholder="Type your reply..."
                      value={replyMessage}
                      onChange={(e) => setReplyMessage(e.target.value)}
                      className="flex-1"
                    />
                    <Button onClick={handleSendReply}>
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                )}

                <Separator />

                {/* Actions */}
                <div className="flex gap-2">
                  {selectedTicket.status !== "resolved" && (
                    <>
                      <Button
                        variant="outline"
                        onClick={() => {
                          // Mark as pending
                        }}
                      >
                        Mark as Pending
                      </Button>
                      <Button
                        className="bg-green-500 hover:bg-green-600"
                        onClick={handleCloseTicket}
                        disabled={closingId === selectedTicket.dbId}
                      >
                        {closingId === selectedTicket.dbId ? "Closing..." : "Resolve Ticket"}
                      </Button>
                    </>
                  )}
                  {selectedTicket.status === "resolved" && (
                    <Button variant="outline">Reopen Ticket</Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-12 text-center">
                <HelpCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">Select a ticket to view details</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
