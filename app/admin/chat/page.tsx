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
import { Search, MessageSquare, AlertTriangle, Ban, MessageSquareOff, Shield, Bot, Loader2 } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { getChatConversations, getConversationMessages, banUser, muteUser } from "@/app/actions/admin"
import { useToast } from "@/hooks/use-toast"

const flaggedKeywords = [
  "send first",
  "trust me",
  "promise",
  "quick before",
  "another site",
  "free robux",
  "outside of platform",
  "paypal",
  "gift card",
  "discord",
  "private message",
  "cashapp",
  "venmo",
  "zelle",
]

interface Conversation {
  id: string
  participants: Array<{ id: string; username: string; avatar: string | null; isBanned: boolean }>
  lastMessage: string | null
  lastMessageTime: Date | null
  flagged: boolean
  flagReason?: string
  messageCount: number
}

interface Message {
  id: string
  sender: string
  senderId: string
  message: string
  time: string
  createdAt: Date
  flagged: boolean
}

export default function ChatMonitoringPage() {
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [stats, setStats] = useState({ total: 0, flagged: 0, aiDetections: 0, usersMuted: 0 })
  const [messages, setMessages] = useState<Message[]>([])
  const [messagesLoading, setMessagesLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [filterType, setFilterType] = useState("all")
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null)
  const [actionDialogOpen, setActionDialogOpen] = useState(false)
  const [actionType, setActionType] = useState<string>("")
  const [actionNotes, setActionNotes] = useState("")
  const [selectedUser, setSelectedUser] = useState<{ id: string; username: string }>({ id: "", username: "" })
  const [actionLoading, setActionLoading] = useState(false)

  // Load conversations
  useEffect(() => {
    loadConversations()
  }, [searchQuery, filterType])

  const loadConversations = async () => {
    try {
      setLoading(true)
      const result = await getChatConversations(searchQuery, filterType)
      if (result.success && result.conversations) {
        setConversations(result.conversations)
        if (result.stats) {
          setStats(result.stats)
        }
      } else {
        toast({
          variant: "destructive",
          title: "Error",
          description: result.error || "Failed to load conversations",
        })
      }
    } catch (err) {
      console.error("Failed to load conversations:", err)
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load conversations",
      })
    } finally {
      setLoading(false)
    }
  }

  // Load messages for selected conversation
  const loadMessages = async (conversationId: string) => {
    try {
      setMessagesLoading(true)
      const result = await getConversationMessages(conversationId)
      if (result.success && result.messages) {
        setMessages(result.messages)
      } else {
        toast({
          variant: "destructive",
          title: "Error",
          description: result.error || "Failed to load messages",
        })
      }
    } catch (err) {
      console.error("Failed to load messages:", err)
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load messages",
      })
    } finally {
      setMessagesLoading(false)
    }
  }

  const handleConversationSelect = (conv: Conversation) => {
    setSelectedConversation(conv)
    loadMessages(conv.id)
  }

  const handleAction = (action: string, user: { id: string; username: string }) => {
    setActionType(action)
    setSelectedUser(user)
    setActionDialogOpen(true)
  }

  const executeAction = async () => {
    if (!selectedUser.id || !actionNotes.trim()) {
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

      if (actionType === "ban") {
        result = await banUser(selectedUser.id, true)
      } else if (actionType === "mute") {
        result = await muteUser(selectedUser.id, actionNotes, 24) // 24 hour mute
      }

      if (result?.success) {
        toast({
          title: "Success",
          description: `User ${selectedUser.username} has been ${actionType === "ban" ? "banned" : "muted"}`,
        })
        setActionDialogOpen(false)
        setActionNotes("")
        setSelectedUser({ id: "", username: "" })
        // Reload conversations to reflect changes
        loadConversations()
        if (selectedConversation) {
          loadMessages(selectedConversation.id)
        }
      } else {
        toast({
          variant: "destructive",
          title: "Error",
          description: result?.error || `Failed to ${actionType} user`,
        })
      }
    } catch (err) {
      console.error(`Failed to ${actionType} user:`, err)
      toast({
        variant: "destructive",
        title: "Error",
        description: `Failed to ${actionType} user`,
      })
    } finally {
      setActionLoading(false)
    }
  }

  const formatTimeAgo = (date: Date | null) => {
    if (!date) return "No messages"
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

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Chat Monitoring</h1>
        <p className="text-muted-foreground">Monitor conversations and detect scam patterns</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Conversations</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
              <MessageSquare className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-red-500/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Flagged</p>
                <p className="text-2xl font-bold text-red-500">{stats.flagged}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">AI Detections</p>
                <p className="text-2xl font-bold">{stats.aiDetections}</p>
              </div>
              <Bot className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Users Muted</p>
                <p className="text-2xl font-bold">{stats.usersMuted}</p>
              </div>
              <MessageSquareOff className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Conversations List */}
        <div className="lg:col-span-1">
          <Card className="h-fit">
            <CardHeader>
              <CardTitle className="text-lg">Conversations</CardTitle>
              <div className="flex gap-2 mt-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search users..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Select value={filterType} onValueChange={setFilterType}>
                  <SelectTrigger className="w-[120px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="flagged">Flagged</SelectItem>
                    <SelectItem value="normal">Normal</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="h-[500px]">
                {loading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                  </div>
                ) : conversations.length === 0 ? (
                  <div className="p-8 text-center text-muted-foreground">
                    <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No conversations found</p>
                  </div>
                ) : (
                  <div className="divide-y">
                    {conversations.map((conv) => (
                      <div
                        key={conv.id}
                        onClick={() => handleConversationSelect(conv)}
                        className={`p-4 cursor-pointer hover:bg-muted/50 transition-colors ${
                          selectedConversation?.id === conv.id ? "bg-muted/50 border-l-2 border-l-primary" : ""
                        } ${conv.flagged ? "bg-red-500/5" : ""}`}
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <div className="flex -space-x-2 relative">
                            {conv.participants.map((p, i) => (
                              <Avatar key={i} className="h-8 w-8 border-2 border-background">
                                <AvatarImage src={p.avatar || undefined} />
                                <AvatarFallback>{p.username.charAt(0).toUpperCase()}</AvatarFallback>
                              </Avatar>
                            ))}
                            {conv.flagged && (
                              <div className="absolute -top-1 -right-1 bg-red-500 rounded-full p-1">
                                <AlertTriangle className="h-3 w-3 text-white" />
                              </div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate">
                              {conv.participants.map((p) => p.username).join(" & ")}
                            </p>
                            {conv.flagged && (
                              <p className="text-xs text-red-500 truncate">{conv.flagReason}</p>
                            )}
                          </div>
                          {conv.flagged && (
                            <Badge variant="destructive" className="text-xs shrink-0">
                              <AlertTriangle className="h-3 w-3 mr-1" />
                              Flagged
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground truncate">
                          {conv.lastMessage || "No messages yet"}
                        </p>
                        <div className="flex items-center justify-between mt-2">
                          <span className="text-xs text-muted-foreground">{conv.messageCount} messages</span>
                          <span className="text-xs text-muted-foreground">{formatTimeAgo(conv.lastMessageTime)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </div>

        {/* Chat View */}
        <div className="lg:col-span-2">
          {selectedConversation ? (
            <Card className="h-fit">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex -space-x-2">
                      {selectedConversation.participants.map((p, i) => (
                        <Avatar key={i} className="h-10 w-10 border-2 border-background">
                          <AvatarImage src={p.avatar || "/placeholder.svg"} />
                          <AvatarFallback>{p.username.charAt(0)}</AvatarFallback>
                        </Avatar>
                      ))}
                    </div>
                    <div>
                      <CardTitle className="text-lg">
                        {selectedConversation.participants.map((p) => p.username).join(" & ")}
                      </CardTitle>
                      <CardDescription>{selectedConversation.messageCount} messages</CardDescription>
                    </div>
                  </div>
                  {selectedConversation.flagged && (
                    <Badge variant="destructive">
                      <AlertTriangle className="h-3 w-3 mr-1" />
                      {selectedConversation.flagReason}
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Messages */}
                <ScrollArea className="h-[400px] border rounded-lg p-4">
                  {messagesLoading ? (
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="w-8 h-8 animate-spin text-primary" />
                    </div>
                  ) : messages.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <p>No messages in this conversation</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {messages.map((msg) => {
                        const participant = selectedConversation?.participants.find((p) => p.id === msg.senderId)
                        const isBanned = participant?.isBanned || false
                        return (
                          <div
                            key={msg.id}
                            className={`flex gap-3 ${msg.flagged ? "bg-red-500/10 -mx-2 px-2 py-2 rounded-lg border border-red-500/20" : ""}`}
                          >
                            <Avatar className="h-8 w-8">
                              <AvatarImage src={participant?.avatar || undefined} />
                              <AvatarFallback>{msg.sender.charAt(0).toUpperCase()}</AvatarFallback>
                            </Avatar>
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <span className={`font-medium text-sm ${isBanned ? "text-red-500" : ""}`}>
                                  {msg.sender}
                                </span>
                                {isBanned && (
                                  <Badge variant="destructive" className="text-xs">
                                    Banned
                                  </Badge>
                                )}
                                <span className="text-xs text-muted-foreground">{msg.time}</span>
                                {msg.flagged && (
                                  <Badge variant="destructive" className="text-xs">
                                    <AlertTriangle className="h-3 w-3 mr-1" />
                                    AI Flagged
                                  </Badge>
                                )}
                              </div>
                              <p className="text-sm">{msg.message}</p>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </ScrollArea>

                <Separator />

                {/* Actions */}
                <div>
                  <p className="text-sm font-medium mb-3">Quick Actions</p>
                  <div className="flex flex-wrap gap-2">
                    {selectedConversation.participants.map((p) => (
                      <div key={p.username} className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleAction("mute", { id: p.id, username: p.username })}
                          disabled={p.isBanned}
                        >
                          <MessageSquareOff className="h-4 w-4 mr-1" />
                          Mute {p.username}
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleAction("ban", { id: p.id, username: p.username })}
                          disabled={p.isBanned}
                        >
                          <Ban className="h-4 w-4 mr-1" />
                          {p.isBanned ? "Already Banned" : `Ban ${p.username}`}
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Flagged Keywords */}
                <div className="p-4 bg-muted/50 rounded-lg">
                  <p className="text-sm font-medium mb-2 flex items-center gap-2">
                    <Shield className="h-4 w-4" />
                    AI Detection Keywords
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {flaggedKeywords.slice(0, 8).map((keyword) => (
                      <Badge key={keyword} variant="outline" className="text-xs">
                        {keyword}
                      </Badge>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-12 text-center">
                <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">Select a conversation to view messages</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Action Dialog */}
      <Dialog open={actionDialogOpen} onOpenChange={setActionDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="capitalize">{actionType} User</DialogTitle>
            <DialogDescription>
              {actionType === "mute"
                ? `This will prevent ${selectedUser.username} from sending messages for 24 hours.`
                : `This will ban ${selectedUser.username} from the platform and hide all their listings.`}
            </DialogDescription>
          </DialogHeader>
          <div>
            <Label>Reason</Label>
            <Textarea
              placeholder="Enter reason for this action..."
              value={actionNotes}
              onChange={(e) => setActionNotes(e.target.value)}
              className="mt-2"
              disabled={actionLoading}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setActionDialogOpen(false)} disabled={actionLoading}>
              Cancel
            </Button>
            <Button
              variant={actionType === "ban" ? "destructive" : "default"}
              onClick={executeAction}
              disabled={actionLoading || !actionNotes.trim()}
            >
              {actionLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                `Confirm ${actionType}`
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
