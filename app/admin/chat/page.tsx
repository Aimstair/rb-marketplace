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
import { Search, MessageSquare, AlertTriangle, Ban, MessageSquareOff, Shield, Bot } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"

// Mock chat data
const mockConversations = [
  {
    id: "1",
    participants: [
      { username: "TrustyShopper", avatar: "/placeholder.svg?key=v0rj5" },
      { username: "NinjaTrader", avatar: "/placeholder.svg?key=6qwnp" },
    ],
    lastMessage: "Thanks for the trade! Great doing business with you.",
    lastMessageTime: "5 min ago",
    flagged: false,
    messageCount: 24,
  },
  {
    id: "2",
    participants: [
      { username: "ScammerJoe", avatar: "/placeholder.svg?key=c8y3y" },
      { username: "VictimUser", avatar: "/placeholder.svg?key=m0g3m" },
    ],
    lastMessage: "Send the money first, I promise I'll send the item after",
    lastMessageTime: "1 hour ago",
    flagged: true,
    flagReason: "Potential scam attempt detected",
    messageCount: 15,
  },
  {
    id: "3",
    participants: [
      { username: "EliteTrader99", avatar: "/placeholder.svg?key=k2ky5" },
      { username: "CasualGamer", avatar: "/placeholder.svg?key=vdgfv" },
    ],
    lastMessage: "Deal! I'll send the Robux now.",
    lastMessageTime: "2 hours ago",
    flagged: false,
    messageCount: 8,
  },
  {
    id: "4",
    participants: [
      { username: "HarasserXX", avatar: "/placeholder.svg?key=hdzit" },
      { username: "InnocentUser", avatar: "/placeholder.svg?key=qjz2n" },
    ],
    lastMessage: "You're going to regret this! I know where you live!",
    lastMessageTime: "3 hours ago",
    flagged: true,
    flagReason: "Harassment and threatening language",
    messageCount: 32,
  },
]

const mockMessages = [
  {
    id: "1",
    sender: "ScammerJoe",
    message: "Hey, I saw your listing for the Dominus",
    time: "1:00 PM",
    flagged: false,
  },
  {
    id: "2",
    sender: "VictimUser",
    message: "Yes! It's still available. 50,000 Robux",
    time: "1:01 PM",
    flagged: false,
  },
  { id: "3", sender: "ScammerJoe", message: "That's too much. Can you do 30,000?", time: "1:02 PM", flagged: false },
  { id: "4", sender: "VictimUser", message: "Hmm, lowest I can go is 45,000", time: "1:03 PM", flagged: false },
  {
    id: "5",
    sender: "ScammerJoe",
    message: "Ok deal. But can you send the item first?",
    time: "1:05 PM",
    flagged: true,
  },
  { id: "6", sender: "VictimUser", message: "I'd prefer if you sent the Robux first", time: "1:06 PM", flagged: false },
  {
    id: "7",
    sender: "ScammerJoe",
    message: "Send the money first, I promise I'll send the item after",
    time: "1:07 PM",
    flagged: true,
  },
  {
    id: "8",
    sender: "ScammerJoe",
    message: "Trust me bro, I have 500 vouches on another site",
    time: "1:08 PM",
    flagged: true,
  },
  { id: "9", sender: "VictimUser", message: "That sounds sketchy...", time: "1:10 PM", flagged: false },
  {
    id: "10",
    sender: "ScammerJoe",
    message: "Just do it quick before someone else buys it from me",
    time: "1:11 PM",
    flagged: true,
  },
]

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
]

export default function ChatMonitoringPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [filterType, setFilterType] = useState("all")
  const [selectedConversation, setSelectedConversation] = useState<(typeof mockConversations)[0] | null>(null)
  const [actionDialogOpen, setActionDialogOpen] = useState(false)
  const [actionType, setActionType] = useState<string>("")
  const [actionNotes, setActionNotes] = useState("")
  const [selectedUser, setSelectedUser] = useState<string>("")

  const filteredConversations = mockConversations.filter((conv) => {
    const matchesSearch = conv.participants.some((p) => p.username.toLowerCase().includes(searchQuery.toLowerCase()))
    const matchesFilter =
      filterType === "all" || (filterType === "flagged" && conv.flagged) || (filterType === "normal" && !conv.flagged)

    return matchesSearch && matchesFilter
  })

  const handleAction = (action: string, user?: string) => {
    setActionType(action)
    setSelectedUser(user || "")
    setActionDialogOpen(true)
  }

  const executeAction = () => {
    console.log(`Executing ${actionType} on user ${selectedUser} with notes: ${actionNotes}`)
    setActionDialogOpen(false)
    setActionNotes("")
    setSelectedUser("")
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
                <p className="text-2xl font-bold">{mockConversations.length}</p>
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
                <p className="text-2xl font-bold text-red-500">{mockConversations.filter((c) => c.flagged).length}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">AI Detections Today</p>
                <p className="text-2xl font-bold">23</p>
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
                <p className="text-2xl font-bold">5</p>
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
                <div className="divide-y">
                  {filteredConversations.map((conv) => (
                    <div
                      key={conv.id}
                      onClick={() => setSelectedConversation(conv)}
                      className={`p-4 cursor-pointer hover:bg-muted/50 transition-colors ${
                        selectedConversation?.id === conv.id ? "bg-muted/50 border-l-2 border-l-primary" : ""
                      } ${conv.flagged ? "bg-red-500/5" : ""}`}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <div className="flex -space-x-2">
                          {conv.participants.map((p, i) => (
                            <Avatar key={i} className="h-8 w-8 border-2 border-background">
                              <AvatarImage src={p.avatar || "/placeholder.svg"} />
                              <AvatarFallback>{p.username.charAt(0)}</AvatarFallback>
                            </Avatar>
                          ))}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">
                            {conv.participants.map((p) => p.username).join(" & ")}
                          </p>
                        </div>
                        {conv.flagged && (
                          <Badge variant="destructive" className="text-xs">
                            <AlertTriangle className="h-3 w-3 mr-1" />
                            Flagged
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground truncate">{conv.lastMessage}</p>
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-xs text-muted-foreground">{conv.messageCount} messages</span>
                        <span className="text-xs text-muted-foreground">{conv.lastMessageTime}</span>
                      </div>
                    </div>
                  ))}
                </div>
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
                  <div className="space-y-4">
                    {mockMessages.map((msg) => {
                      const isScammer = msg.sender === "ScammerJoe"
                      return (
                        <div
                          key={msg.id}
                          className={`flex gap-3 ${msg.flagged ? "bg-red-500/10 -mx-2 px-2 py-2 rounded-lg border border-red-500/20" : ""}`}
                        >
                          <Avatar className="h-8 w-8">
                            <AvatarFallback>{msg.sender.charAt(0)}</AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className={`font-medium text-sm ${isScammer ? "text-red-500" : ""}`}>
                                {msg.sender}
                              </span>
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
                </ScrollArea>

                <Separator />

                {/* Actions */}
                <div>
                  <p className="text-sm font-medium mb-3">Quick Actions</p>
                  <div className="flex flex-wrap gap-2">
                    {selectedConversation.participants.map((p) => (
                      <div key={p.username} className="flex gap-2">
                        <Button size="sm" variant="outline" onClick={() => handleAction("mute", p.username)}>
                          <MessageSquareOff className="h-4 w-4 mr-1" />
                          Mute {p.username}
                        </Button>
                        <Button size="sm" variant="destructive" onClick={() => handleAction("ban", p.username)}>
                          <Ban className="h-4 w-4 mr-1" />
                          Ban {p.username}
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
                ? `This will prevent ${selectedUser} from sending messages.`
                : `This will ban ${selectedUser} from the platform.`}
            </DialogDescription>
          </DialogHeader>
          <div>
            <Label>Reason</Label>
            <Textarea
              placeholder="Enter reason for this action..."
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
              Confirm {actionType}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
