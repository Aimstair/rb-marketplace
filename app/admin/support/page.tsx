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
import { getSupportTickets, closeTicket, updateTicketStatus, reopenTicket, getTicketMessages, addTicketReply } from "@/app/actions/admin"
import { useSession } from "next-auth/react"

export default function SupportTicketsPage() {
  const { data: session } = useSession()
  const { toast } = useToast()
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [selectedTicket, setSelectedTicket] = useState<any | null>(null)
  const [replyMessage, setReplyMessage] = useState("")
  const [tickets, setTickets] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [messages, setMessages] = useState<any[]>([])
  const [messagesLoading, setMessagesLoading] = useState(false)
  const [replyLoading, setReplyLoading] = useState(false)

  useEffect(() => {
    loadTickets()
  }, [])

  useEffect(() => {
    if (selectedTicket) {
      loadMessages(selectedTicket.dbId)
    }
  }, [selectedTicket])

  const loadTickets = async () => {
    setLoading(true)
    try {
      const result = await getSupportTickets()
      if (result.success && result.data) {
        // Map database tickets to display format
        const mapped = result.data.map((ticket: any) => {
          // Map status
          let displayStatus = "open"
          if (ticket.status === "CLOSED") displayStatus = "resolved"
          else if (ticket.status === "IN_PROGRESS") displayStatus = "in-progress"
          else if (ticket.status === "PENDING") displayStatus = "pending"

          return {
            id: ticket.id.slice(0, 8),
            subject: ticket.subject,
            user: {
              username: ticket.user?.username || "Unknown User",
              avatar: ticket.user?.profilePicture || "/placeholder.svg",
              email: ticket.user?.email || "unknown@example.com",
            },
            category: ticket.category || "general",
            priority: ticket.priority || "medium",
            status: displayStatus,
            createdAt: new Date(ticket.createdAt).toLocaleDateString(),
            initialMessage: ticket.message,
            dbId: ticket.id,
            rawStatus: ticket.status,
          }
        })
        setTickets(mapped)
        if (mapped.length > 0 && !selectedTicket) {
          setSelectedTicket(mapped[0])
        }
      }
    } catch (error) {
      console.error("Failed to load tickets:", error)
      toast({
        title: "Error",
        description: "Failed to fetch support tickets",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleCloseTicket = async () => {
    if (!selectedTicket || !session?.user?.id) {
      toast({
        title: "Error",
        description: "Unable to close ticket",
        variant: "destructive",
      })
      return
    }

    setActionLoading(true)
    try {
      const result = await closeTicket(selectedTicket.dbId, session.user.id)
      if (result.success) {
        toast({
          title: "Success",
          description: "Ticket closed successfully",
        })
        setReplyMessage("")
        await loadTickets()
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to close ticket",
          variant: "destructive",
        })
      }
    } finally {
      setActionLoading(false)
    }
  }

  const handleUpdateStatus = async (newStatus: "IN_PROGRESS" | "PENDING") => {
    if (!selectedTicket || !session?.user?.id) return

    setActionLoading(true)
    try {
      const result = await updateTicketStatus(selectedTicket.dbId, newStatus, session.user.id)

      if (result.success) {
        toast({
          title: "Success",
          description: `Ticket marked as ${newStatus === "IN_PROGRESS" ? "in progress" : "pending"}`,
        })
        await loadTickets()
      } else {
        throw new Error(result.error)
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update ticket status",
        variant: "destructive",
      })
    } finally {
      setActionLoading(false)
    }
  }

  const handleReopenTicket = async () => {
    if (!selectedTicket || !session?.user?.id) return

    setActionLoading(true)
    try {
      const result = await reopenTicket(selectedTicket.dbId, session.user.id)

      if (result.success) {
        toast({
          title: "Success",
          description: "Ticket reopened successfully",
        })
        await loadTickets()
      } else {
        throw new Error(result.error)
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to reopen ticket",
        variant: "destructive",
      })
    } finally {
      setActionLoading(false)
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

  const loadMessages = async (ticketId: string) => {
    setMessagesLoading(true)
    try {
      const result = await getTicketMessages(ticketId)
      if (result.success && result.data) {
        setMessages(result.data)
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to load messages",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Failed to load messages:", error)
    } finally {
      setMessagesLoading(false)
    }
  }

  const handleSendReply = async () => {
    if (!replyMessage.trim() || !selectedTicket || !session?.user?.id) {
      return
    }

    setReplyLoading(true)
    try {
      const result = await addTicketReply(
        selectedTicket.dbId,
        session.user.id,
        replyMessage,
        true // isAdmin = true
      )

      if (result.success) {
        toast({
          title: "Success",
          description: "Reply sent successfully",
        })
        setReplyMessage("")
        // Reload messages to show the new reply
        await loadMessages(selectedTicket.dbId)
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to send reply",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Failed to send reply:", error)
      toast({
        title: "Error",
          description: "Failed to send reply",
        variant: "destructive",
      })
    } finally {
      setReplyLoading(false)
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
                    {messagesLoading ? (
                      <div className="flex items-center justify-center h-full">
                        <p className="text-sm text-muted-foreground">Loading messages...</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {/* Initial ticket message */}
                        <div className="flex gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={selectedTicket.user.avatar || "/placeholder.svg"} />
                            <AvatarFallback>{selectedTicket.user.username.charAt(0)}</AvatarFallback>
                          </Avatar>
                          <div className="flex flex-col max-w-[70%]">
                            <div className="p-3 rounded-lg bg-muted w-fit">
                              <p className="text-sm">{selectedTicket.initialMessage}</p>
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">{selectedTicket.createdAt}</p>
                          </div>
                        </div>
                        
                        {/* Replies */}
                        {messages.map((msg) => (
                          <div key={msg.id} className={`flex gap-3 ${msg.isAdmin ? "flex-row-reverse" : ""}`}>
                            <Avatar className="h-8 w-8">
                              <AvatarImage src={msg.user.profilePicture || "/placeholder.svg"} />
                              <AvatarFallback>
                                {msg.isAdmin ? "A" : msg.user.username.charAt(0)}
                              </AvatarFallback>
                            </Avatar>
                            <div className={`flex flex-col ${msg.isAdmin ? "items-end" : "items-start"}`}>
                              <div
                                className={`p-3 rounded-lg w-fit max-w-[70%] ${
                                  msg.isAdmin ? "bg-primary text-primary-foreground" : "bg-muted"
                                }`}
                              >
                                <p className="text-sm">{msg.message}</p>
                              </div>
                              <p className="text-xs text-muted-foreground mt-1">
                                {new Date(msg.createdAt).toLocaleString()}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
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
                      disabled={replyLoading}
                    />
                    <Button onClick={handleSendReply} disabled={replyLoading || !replyMessage.trim()}>
                      {replyLoading ? "Sending..." : <Send className="h-4 w-4" />}
                    </Button>
                  </div>
                )}

                <Separator />

                {/* Actions */}
                <div className="flex gap-2">
                  {selectedTicket.status !== "resolved" && (
                    <>
                      {selectedTicket.status !== "in-progress" && (
                        <Button
                          variant="outline"
                          onClick={() => handleUpdateStatus("IN_PROGRESS")}
                          disabled={actionLoading}
                        >
                          {actionLoading ? "Updating..." : "Mark as In Progress"}
                        </Button>
                      )}
                      {selectedTicket.status !== "pending" && (
                        <Button
                          variant="outline"
                          onClick={() => handleUpdateStatus("PENDING")}
                          disabled={actionLoading}
                        >
                          {actionLoading ? "Updating..." : "Mark as Pending"}
                        </Button>
                      )}
                      <Button
                        className="bg-green-500 hover:bg-green-600"
                        onClick={handleCloseTicket}
                        disabled={actionLoading}
                      >
                        {actionLoading ? "Closing..." : "Resolve Ticket"}
                      </Button>
                    </>
                  )}
                  {selectedTicket.status === "resolved" && (
                    <Button variant="outline" onClick={handleReopenTicket} disabled={actionLoading}>
                      {actionLoading ? "Reopening..." : "Reopen Ticket"}
                    </Button>
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
