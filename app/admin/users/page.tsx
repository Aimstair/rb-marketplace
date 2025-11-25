"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Search,
  Filter,
  MoreHorizontal,
  Ban,
  EyeOff,
  MessageSquareOff,
  Snowflake,
  AlertTriangle,
  RefreshCcw,
  Globe,
  Smartphone,
  Users,
  CheckCircle,
  XCircle,
} from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"

// Mock user data with extended fields
const mockUsers = [
  {
    id: "1",
    username: "NinjaTrader",
    email: "ninja@example.com",
    avatar: "/ninja-avatar.png",
    joined: "Jan 15, 2023",
    lastActive: "2 min ago",
    status: "verified",
    role: "user",
    listings: 28,
    vouches: 342,
    warnings: 0,
    flags: 0,
    ip: "192.168.1.100",
    deviceId: "DEV-001-ABC",
    country: "United States",
    totalTrades: 156,
    accountValue: "$2,450",
    isBanned: false,
    isShadowbanned: false,
    isMuted: false,
    isFrozen: false,
  },
  {
    id: "2",
    username: "ScammerJoe",
    email: "scammer@example.com",
    avatar: "/suspicious-avatar.jpg",
    joined: "Nov 20, 2024",
    lastActive: "1 day ago",
    status: "flagged",
    role: "user",
    listings: 5,
    vouches: 2,
    warnings: 3,
    flags: 8,
    ip: "192.168.1.101",
    deviceId: "DEV-002-XYZ",
    country: "Unknown",
    totalTrades: 3,
    accountValue: "$50",
    isBanned: false,
    isShadowbanned: false,
    isMuted: true,
    isFrozen: false,
  },
  {
    id: "3",
    username: "TrustyShopper",
    email: "trusty@example.com",
    avatar: "/friendly-avatar.jpg",
    joined: "Mar 8, 2023",
    lastActive: "5 min ago",
    status: "verified",
    role: "user",
    listings: 12,
    vouches: 189,
    warnings: 0,
    flags: 0,
    ip: "192.168.1.102",
    deviceId: "DEV-003-QWE",
    country: "Canada",
    totalTrades: 89,
    accountValue: "$1,200",
    isBanned: false,
    isShadowbanned: false,
    isMuted: false,
    isFrozen: false,
  },
  {
    id: "4",
    username: "FakeAccount123",
    email: "fake@example.com",
    avatar: "/fake-avatar.jpg",
    joined: "Dec 1, 2024",
    lastActive: "3 days ago",
    status: "suspended",
    role: "user",
    listings: 0,
    vouches: 0,
    warnings: 5,
    flags: 12,
    ip: "192.168.1.101",
    deviceId: "DEV-002-XYZ",
    country: "Unknown",
    totalTrades: 0,
    accountValue: "$0",
    isBanned: true,
    isShadowbanned: false,
    isMuted: false,
    isFrozen: false,
  },
  {
    id: "5",
    username: "EliteTrader99",
    email: "elite@example.com",
    avatar: "/elite-avatar.jpg",
    joined: "Jun 22, 2022",
    lastActive: "Just now",
    status: "verified",
    role: "user",
    listings: 45,
    vouches: 567,
    warnings: 0,
    flags: 0,
    ip: "192.168.1.103",
    deviceId: "DEV-004-RTY",
    country: "United Kingdom",
    totalTrades: 312,
    accountValue: "$8,900",
    isBanned: false,
    isShadowbanned: false,
    isMuted: false,
    isFrozen: false,
  },
  {
    id: "6",
    username: "ShadowUser",
    email: "shadow@example.com",
    avatar: "/shadow-avatar.jpg",
    joined: "Aug 15, 2024",
    lastActive: "1 hour ago",
    status: "shadowbanned",
    role: "user",
    listings: 8,
    vouches: 15,
    warnings: 2,
    flags: 4,
    ip: "192.168.1.104",
    deviceId: "DEV-005-UIO",
    country: "Germany",
    totalTrades: 12,
    accountValue: "$300",
    isBanned: false,
    isShadowbanned: true,
    isMuted: false,
    isFrozen: false,
  },
]

const loginHistory = [
  {
    date: "Dec 15, 2024 10:23 AM",
    ip: "192.168.1.100",
    device: "Chrome / Windows",
    location: "New York, US",
    status: "success",
  },
  {
    date: "Dec 14, 2024 8:45 PM",
    ip: "192.168.1.100",
    device: "Chrome / Windows",
    location: "New York, US",
    status: "success",
  },
  {
    date: "Dec 14, 2024 2:12 PM",
    ip: "10.0.0.55",
    device: "Safari / iOS",
    location: "Los Angeles, US",
    status: "success",
  },
  {
    date: "Dec 13, 2024 11:30 AM",
    ip: "192.168.1.100",
    device: "Chrome / Windows",
    location: "New York, US",
    status: "success",
  },
  {
    date: "Dec 12, 2024 9:00 AM",
    ip: "45.67.89.123",
    device: "Firefox / Linux",
    location: "Unknown",
    status: "failed",
  },
]

const ipClusterData = [
  { ip: "192.168.1.101", accounts: ["ScammerJoe", "FakeAccount123", "AltUser1"], flagged: true },
  { ip: "192.168.1.100", accounts: ["NinjaTrader"], flagged: false },
  { ip: "10.0.0.55", accounts: ["NinjaTrader", "TrustyShopper"], flagged: false },
]

const deviceClusterData = [
  { deviceId: "DEV-002-XYZ", accounts: ["ScammerJoe", "FakeAccount123"], flagged: true },
  { deviceId: "DEV-001-ABC", accounts: ["NinjaTrader"], flagged: false },
]

export default function UsersPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [selectedUser, setSelectedUser] = useState<(typeof mockUsers)[0] | null>(null)
  const [actionDialogOpen, setActionDialogOpen] = useState(false)
  const [actionType, setActionType] = useState<string>("")
  const [actionReason, setActionReason] = useState("")

  const filteredUsers = mockUsers.filter((user) => {
    const matchesSearch =
      user.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.ip.includes(searchQuery) ||
      user.deviceId.toLowerCase().includes(searchQuery.toLowerCase())

    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "verified" && user.status === "verified") ||
      (statusFilter === "flagged" && user.status === "flagged") ||
      (statusFilter === "suspended" && user.status === "suspended") ||
      (statusFilter === "shadowbanned" && user.isShadowbanned)

    return matchesSearch && matchesStatus
  })

  const handleAction = (user: (typeof mockUsers)[0], action: string) => {
    setSelectedUser(user)
    setActionType(action)
    setActionDialogOpen(true)
  }

  const executeAction = () => {
    // In real app, this would call an API
    console.log(`Executing ${actionType} on user ${selectedUser?.username} with reason: ${actionReason}`)
    setActionDialogOpen(false)
    setActionReason("")
  }

  const getStatusBadge = (user: (typeof mockUsers)[0]) => {
    if (user.isBanned) return <Badge variant="destructive">Banned</Badge>
    if (user.isShadowbanned) return <Badge className="bg-purple-500 text-white">Shadowbanned</Badge>
    if (user.isFrozen) return <Badge className="bg-blue-500 text-white">Frozen</Badge>
    if (user.status === "flagged") return <Badge variant="destructive">Flagged</Badge>
    if (user.status === "verified") return <Badge className="bg-green-500 text-white">Verified</Badge>
    return <Badge variant="secondary">{user.status}</Badge>
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">User Management</h1>
        <p className="text-muted-foreground">Search, view, and manage user accounts</p>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by username, email, IP, or device ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-[180px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Users</SelectItem>
                <SelectItem value="verified">Verified</SelectItem>
                <SelectItem value="flagged">Flagged</SelectItem>
                <SelectItem value="suspended">Suspended</SelectItem>
                <SelectItem value="shadowbanned">Shadowbanned</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Users List */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Users ({filteredUsers.length})</CardTitle>
              <CardDescription>Click on a user to view details</CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[600px]">
                <div className="space-y-2">
                  {filteredUsers.map((user) => (
                    <div
                      key={user.id}
                      onClick={() => setSelectedUser(user)}
                      className={`p-4 border rounded-lg cursor-pointer transition-colors hover:bg-muted/50 ${
                        selectedUser?.id === user.id ? "border-primary bg-muted/50" : ""
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Avatar>
                            <AvatarImage src={user.avatar || "/placeholder.svg"} />
                            <AvatarFallback>{user.username.charAt(0)}</AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-semibold">{user.username}</p>
                              {getStatusBadge(user)}
                              {user.isMuted && (
                                <Badge variant="outline" className="text-orange-500 border-orange-500">
                                  <MessageSquareOff className="h-3 w-3 mr-1" />
                                  Muted
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground">{user.email}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right hidden md:block">
                            <p className="text-sm font-medium">{user.vouches} vouches</p>
                            <p className="text-xs text-muted-foreground">Last active: {user.lastActive}</p>
                          </div>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleAction(user, "ban")}>
                                <Ban className="h-4 w-4 mr-2" />
                                {user.isBanned ? "Unban" : "Ban"} User
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleAction(user, "shadowban")}>
                                <EyeOff className="h-4 w-4 mr-2" />
                                {user.isShadowbanned ? "Remove Shadowban" : "Shadowban"}
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleAction(user, "mute")}>
                                <MessageSquareOff className="h-4 w-4 mr-2" />
                                {user.isMuted ? "Unmute" : "Mute"} Chat
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleAction(user, "freeze")}>
                                <Snowflake className="h-4 w-4 mr-2" />
                                {user.isFrozen ? "Unfreeze" : "Freeze"} Account
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => handleAction(user, "warn")}>
                                <AlertTriangle className="h-4 w-4 mr-2" />
                                Issue Warning
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleAction(user, "reset-username")}>
                                <RefreshCcw className="h-4 w-4 mr-2" />
                                Reset Username
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>

        {/* User Details Panel */}
        <div className="lg:col-span-1">
          {selectedUser ? (
            <Card className="sticky top-6">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <Avatar className="h-16 w-16">
                    <AvatarImage src={selectedUser.avatar || "/placeholder.svg"} />
                    <AvatarFallback className="text-xl">{selectedUser.username.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div>
                    <CardTitle>{selectedUser.username}</CardTitle>
                    <CardDescription>{selectedUser.email}</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="profile">
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="profile">Profile</TabsTrigger>
                    <TabsTrigger value="history">History</TabsTrigger>
                    <TabsTrigger value="security">Security</TabsTrigger>
                  </TabsList>

                  <TabsContent value="profile" className="space-y-4 mt-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Status</p>
                        <div className="mt-1">{getStatusBadge(selectedUser)}</div>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Joined</p>
                        <p className="font-medium">{selectedUser.joined}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Vouches</p>
                        <p className="font-medium">{selectedUser.vouches}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Listings</p>
                        <p className="font-medium">{selectedUser.listings}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Total Trades</p>
                        <p className="font-medium">{selectedUser.totalTrades}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Account Value</p>
                        <p className="font-medium">{selectedUser.accountValue}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Warnings</p>
                        <p className={`font-medium ${selectedUser.warnings > 0 ? "text-destructive" : ""}`}>
                          {selectedUser.warnings}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Flags</p>
                        <p className={`font-medium ${selectedUser.flags > 0 ? "text-destructive" : ""}`}>
                          {selectedUser.flags}
                        </p>
                      </div>
                    </div>

                    <div className="pt-4 border-t space-y-2">
                      <p className="text-sm font-medium">Account Restrictions</p>
                      <div className="flex flex-wrap gap-2">
                        {selectedUser.isBanned && <Badge variant="destructive">Banned</Badge>}
                        {selectedUser.isShadowbanned && <Badge className="bg-purple-500">Shadowbanned</Badge>}
                        {selectedUser.isMuted && <Badge variant="outline">Chat Muted</Badge>}
                        {selectedUser.isFrozen && <Badge className="bg-blue-500">Frozen</Badge>}
                        {!selectedUser.isBanned &&
                          !selectedUser.isShadowbanned &&
                          !selectedUser.isMuted &&
                          !selectedUser.isFrozen && <Badge variant="secondary">No Restrictions</Badge>}
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="history" className="space-y-4 mt-4">
                    <p className="text-sm font-medium">Login History</p>
                    <ScrollArea className="h-[300px]">
                      <div className="space-y-3">
                        {loginHistory.map((entry, i) => (
                          <div key={i} className="p-3 bg-muted/50 rounded-lg text-sm">
                            <div className="flex items-center justify-between mb-1">
                              <span className="font-medium">{entry.date}</span>
                              {entry.status === "success" ? (
                                <CheckCircle className="h-4 w-4 text-green-500" />
                              ) : (
                                <XCircle className="h-4 w-4 text-destructive" />
                              )}
                            </div>
                            <div className="text-muted-foreground space-y-1">
                              <div className="flex items-center gap-2">
                                <Globe className="h-3 w-3" />
                                {entry.ip} • {entry.location}
                              </div>
                              <div className="flex items-center gap-2">
                                <Smartphone className="h-3 w-3" />
                                {entry.device}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </TabsContent>

                  <TabsContent value="security" className="space-y-4 mt-4">
                    <div>
                      <p className="text-sm font-medium mb-2 flex items-center gap-2">
                        <Globe className="h-4 w-4" />
                        IP Clustering
                      </p>
                      {ipClusterData
                        .filter((c) => c.accounts.includes(selectedUser.username))
                        .map((cluster, i) => (
                          <div
                            key={i}
                            className={`p-3 rounded-lg ${cluster.flagged ? "bg-destructive/10 border border-destructive/20" : "bg-muted/50"}`}
                          >
                            <div className="flex items-center justify-between mb-2">
                              <code className="text-sm">{cluster.ip}</code>
                              {cluster.flagged && <Badge variant="destructive">Suspicious</Badge>}
                            </div>
                            <p className="text-xs text-muted-foreground">Accounts: {cluster.accounts.join(", ")}</p>
                          </div>
                        ))}
                    </div>

                    <div>
                      <p className="text-sm font-medium mb-2 flex items-center gap-2">
                        <Smartphone className="h-4 w-4" />
                        Device Fingerprinting
                      </p>
                      {deviceClusterData
                        .filter((c) => c.accounts.includes(selectedUser.username))
                        .map((cluster, i) => (
                          <div
                            key={i}
                            className={`p-3 rounded-lg ${cluster.flagged ? "bg-destructive/10 border border-destructive/20" : "bg-muted/50"}`}
                          >
                            <div className="flex items-center justify-between mb-2">
                              <code className="text-sm">{cluster.deviceId}</code>
                              {cluster.flagged && <Badge variant="destructive">Multiple Accounts</Badge>}
                            </div>
                            <p className="text-xs text-muted-foreground">Accounts: {cluster.accounts.join(", ")}</p>
                          </div>
                        ))}
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-12 text-center">
                <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">Select a user to view details</p>
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
              You are about to {actionType} {selectedUser?.username}. Please provide a reason.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Reason</Label>
              <Textarea
                placeholder="Enter reason for this action..."
                value={actionReason}
                onChange={(e) => setActionReason(e.target.value)}
                className="mt-2"
              />
            </div>
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
