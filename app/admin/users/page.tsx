"use client"

import { useState, useEffect } from "react"
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
  Users,
  Loader2,
} from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { ScrollArea } from "@/components/ui/scroll-area"
import { getUsers, banUser } from "@/app/actions/admin"
import { useToast } from "@/components/ui/use-toast"

export default function UsersPage() {
  const { toast } = useToast()
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [currentPage, setCurrentPage] = useState(1)
  const [users, setUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedUser, setSelectedUser] = useState<any>(null)
  const [actionDialogOpen, setActionDialogOpen] = useState(false)
  const [actionType, setActionType] = useState<string>("")
  const [actionReason, setActionReason] = useState("")
  const [actionLoading, setActionLoading] = useState(false)
  const [totalPages, setTotalPages] = useState(0)

  // Load users when search, filter, or page changes
  useEffect(() => {
    const loadUsers = async () => {
      try {
        setLoading(true)
        const result = await getUsers(currentPage, searchQuery, statusFilter)
        setUsers(result.users)
        setTotalPages(result.pages)
      } catch (err) {
        console.error("Failed to load users:", err)
        toast({ title: "Error", description: "Failed to load users", variant: "destructive" })
      } finally {
        setLoading(false)
      }
    }

    loadUsers()
  }, [searchQuery, statusFilter, currentPage, toast])

  const handleAction = (user: any, action: string) => {
    setSelectedUser(user)
    setActionType(action)
    setActionDialogOpen(true)
  }

  const executeAction = async () => {
    if (!selectedUser) return

    try {
      setActionLoading(true)

      if (actionType === "ban") {
        const result = await banUser(selectedUser.id, true)
        if (result.success) {
          toast({ title: "Success", description: `${selectedUser.username} has been banned` })
          // Reload users
          const result = await getUsers(currentPage, searchQuery, statusFilter)
          setUsers(result.users)
        } else {
          toast({ title: "Error", description: result.error || "Failed to ban user", variant: "destructive" })
        }
      } else if (actionType === "unban") {
        const result = await banUser(selectedUser.id, false)
        if (result.success) {
          toast({ title: "Success", description: `${selectedUser.username} has been unbanned` })
          // Reload users
          const result = await getUsers(currentPage, searchQuery, statusFilter)
          setUsers(result.users)
        } else {
          toast({ title: "Error", description: result.error || "Failed to unban user", variant: "destructive" })
        }
      }

      setActionDialogOpen(false)
      setActionReason("")
    } finally {
      setActionLoading(false)
    }
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
                <SelectItem value="banned">Banned</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
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
              <CardTitle>Users {!loading && `(${users.length})`}</CardTitle>
              <CardDescription>Click on a user to view details</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center h-[600px]">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : (
                <ScrollArea className="h-[600px]">
                  <div className="space-y-2">
                    {users.map((user) => (
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
                              <AvatarImage src={user.profilePicture || "/placeholder.svg"} />
                              <AvatarFallback>{user.username.charAt(0)}</AvatarFallback>
                            </Avatar>
                            <div>
                              <div className="flex items-center gap-2">
                                <p className="font-semibold">{user.username}</p>
                                {user.isBanned && <Badge variant="destructive">Banned</Badge>}
                                {user.isVerified && <Badge className="bg-green-500">Verified</Badge>}
                                {user.role === "admin" && <Badge className="bg-purple-500">Admin</Badge>}
                              </div>
                              <p className="text-sm text-muted-foreground">{user.email}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            <div className="text-right hidden md:block">
                              <p className="text-sm font-medium">{user.vouchCount} vouches</p>
                              <p className="text-xs text-muted-foreground">{user.listingCount} listings</p>
                            </div>
                            {user.role !== "admin" && (
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon">
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem
                                    onClick={() => handleAction(user, user.isBanned ? "unban" : "ban")}
                                  >
                                    <Ban className="h-4 w-4 mr-2" />
                                    {user.isBanned ? "Unban" : "Ban"} User
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
            {!loading && totalPages > 1 && (
              <CardContent className="pt-0 flex items-center justify-between">
                <Button
                  variant="outline"
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                >
                  Previous
                </Button>
                <span className="text-sm text-muted-foreground">
                  Page {currentPage} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                >
                  Next
                </Button>
              </CardContent>
            )}
          </Card>
        </div>

        {/* User Details Panel */}
        <div className="lg:col-span-1">
          {selectedUser ? (
            <Card className="sticky top-6">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <Avatar className="h-16 w-16">
                    <AvatarImage src={selectedUser.profilePicture || "/placeholder.svg"} />
                    <AvatarFallback className="text-xl">{selectedUser.username.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div>
                    <CardTitle>{selectedUser.username}</CardTitle>
                    <CardDescription>{selectedUser.email}</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground">Joined</p>
                    <p className="font-medium text-sm">{new Date(selectedUser.joinDate).toLocaleDateString()}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Listings</p>
                    <p className="font-medium text-sm">{selectedUser.listingCount}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Sales</p>
                    <p className="font-medium text-sm">{selectedUser.salesCount}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Vouches</p>
                    <p className="font-medium text-sm">{selectedUser.vouchCount}</p>
                  </div>
                </div>

                <div className="pt-4 border-t space-y-2">
                  <p className="text-sm font-medium">Account Status</p>
                  <div className="flex flex-wrap gap-2">
                    {selectedUser.isBanned && <Badge variant="destructive">Banned</Badge>}
                    {selectedUser.isVerified && <Badge className="bg-green-500">Verified</Badge>}
                    {selectedUser.role === "admin" && <Badge className="bg-purple-500">Admin</Badge>}
                    {!selectedUser.isBanned && !selectedUser.isVerified && (
                      <Badge variant="secondary">Regular User</Badge>
                    )}
                  </div>
                </div>

                {selectedUser.role !== "admin" && (
                  <Button
                    className="w-full"
                    variant={selectedUser.isBanned ? "outline" : "destructive"}
                    onClick={() => handleAction(selectedUser, selectedUser.isBanned ? "unban" : "ban")}
                    disabled={actionLoading}
                  >
                    {actionLoading ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Processing...
                      </>
                    ) : selectedUser.isBanned ? (
                      "Unban User"
                    ) : (
                      "Ban User"
                    )}
                  </Button>
                )}
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
            <DialogTitle className="capitalize">
              {actionType === "ban" ? "Ban User" : actionType === "unban" ? "Unban User" : "Manage User"}
            </DialogTitle>
            <DialogDescription>
              {actionType === "ban" && `Are you sure you want to ban ${selectedUser?.username}?`}
              {actionType === "unban" && `Are you sure you want to unban ${selectedUser?.username}?`}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setActionDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant={actionType === "ban" ? "destructive" : "default"}
              onClick={executeAction}
              disabled={actionLoading}
            >
              {actionLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
