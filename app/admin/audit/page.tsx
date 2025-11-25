"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Search, FileText, Ban, Trash2, Edit, AlertTriangle, Settings, LogIn } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { ScrollArea } from "@/components/ui/scroll-area"

const mockAuditLogs = [
  {
    id: "1",
    action: "user_banned",
    admin: { username: "AdminModerator", avatar: "/placeholder.svg?key=0j3fc" },
    target: "ScammerJoe",
    details: "Banned for scam attempt. Multiple reports confirmed.",
    timestamp: "2 min ago",
    ip: "192.168.1.100",
  },
  {
    id: "2",
    action: "listing_removed",
    admin: { username: "ModeratorX", avatar: "/placeholder.svg?key=vbqlu" },
    target: "FREE ROBUX!!! CLICK HERE",
    details: "Removed spam/scam listing",
    timestamp: "15 min ago",
    ip: "192.168.1.101",
  },
  {
    id: "3",
    action: "vouch_invalidated",
    admin: { username: "AdminModerator", avatar: "/placeholder.svg?key=9a3jt" },
    target: "Circular vouch pattern",
    details: "Invalidated 12 vouches between alt accounts",
    timestamp: "1 hour ago",
    ip: "192.168.1.100",
  },
  {
    id: "4",
    action: "user_warning",
    admin: { username: "SupportStaff", avatar: "/placeholder.svg?key=0xbg6" },
    target: "SusTrader",
    details: "Warning issued for suspicious pricing",
    timestamp: "2 hours ago",
    ip: "192.168.1.102",
  },
  {
    id: "5",
    action: "admin_login",
    admin: { username: "AdminModerator", avatar: "/placeholder.svg?key=yptg1" },
    target: "Admin Dashboard",
    details: "Successful login from known IP",
    timestamp: "3 hours ago",
    ip: "192.168.1.100",
  },
  {
    id: "6",
    action: "subscription_modified",
    admin: { username: "FinanceAdmin", avatar: "/placeholder.svg?key=ziceg" },
    target: "EliteTrader99",
    details: "Extended Pro subscription by 1 month (compensation)",
    timestamp: "5 hours ago",
    ip: "192.168.1.103",
  },
  {
    id: "7",
    action: "settings_changed",
    admin: { username: "AdminModerator", avatar: "/placeholder.svg?key=47rqc" },
    target: "System Settings",
    details: "Updated max listing limit from 50 to 100",
    timestamp: "1 day ago",
    ip: "192.168.1.100",
  },
  {
    id: "8",
    action: "user_unbanned",
    admin: { username: "AdminModerator", avatar: "/placeholder.svg?key=q9ey9" },
    target: "FalseBannedUser",
    details: "Ban appeal approved - insufficient evidence",
    timestamp: "1 day ago",
    ip: "192.168.1.100",
  },
]

export default function AuditLogsPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [actionFilter, setActionFilter] = useState("all")
  const [adminFilter, setAdminFilter] = useState("all")

  const filteredLogs = mockAuditLogs.filter((log) => {
    const matchesSearch =
      log.target.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.details.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.admin.username.toLowerCase().includes(searchQuery.toLowerCase())

    const matchesAction = actionFilter === "all" || log.action === actionFilter
    const matchesAdmin = adminFilter === "all" || log.admin.username === adminFilter

    return matchesSearch && matchesAction && matchesAdmin
  })

  const getActionIcon = (action: string) => {
    switch (action) {
      case "user_banned":
      case "user_unbanned":
        return <Ban className="h-4 w-4" />
      case "listing_removed":
        return <Trash2 className="h-4 w-4" />
      case "vouch_invalidated":
        return <AlertTriangle className="h-4 w-4" />
      case "user_warning":
        return <AlertTriangle className="h-4 w-4" />
      case "admin_login":
        return <LogIn className="h-4 w-4" />
      case "subscription_modified":
        return <Edit className="h-4 w-4" />
      case "settings_changed":
        return <Settings className="h-4 w-4" />
      default:
        return <FileText className="h-4 w-4" />
    }
  }

  const getActionBadge = (action: string) => {
    switch (action) {
      case "user_banned":
        return <Badge variant="destructive">User Banned</Badge>
      case "user_unbanned":
        return <Badge className="bg-green-500 text-white">User Unbanned</Badge>
      case "listing_removed":
        return <Badge variant="destructive">Listing Removed</Badge>
      case "vouch_invalidated":
        return <Badge className="bg-orange-500 text-white">Vouch Invalidated</Badge>
      case "user_warning":
        return <Badge className="bg-yellow-500 text-white">Warning Issued</Badge>
      case "admin_login":
        return <Badge variant="outline">Admin Login</Badge>
      case "subscription_modified":
        return <Badge className="bg-blue-500 text-white">Subscription Modified</Badge>
      case "settings_changed":
        return <Badge variant="secondary">Settings Changed</Badge>
      default:
        return <Badge variant="outline">{action}</Badge>
    }
  }

  const uniqueAdmins = [...new Set(mockAuditLogs.map((log) => log.admin.username))]

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Audit Logs</h1>
        <p className="text-muted-foreground">Track all admin actions and system changes</p>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search logs..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={actionFilter} onValueChange={setActionFilter}>
              <SelectTrigger className="w-full md:w-[200px]">
                <SelectValue placeholder="Action Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Actions</SelectItem>
                <SelectItem value="user_banned">User Banned</SelectItem>
                <SelectItem value="user_unbanned">User Unbanned</SelectItem>
                <SelectItem value="listing_removed">Listing Removed</SelectItem>
                <SelectItem value="vouch_invalidated">Vouch Invalidated</SelectItem>
                <SelectItem value="user_warning">Warning Issued</SelectItem>
                <SelectItem value="admin_login">Admin Login</SelectItem>
                <SelectItem value="subscription_modified">Subscription Modified</SelectItem>
                <SelectItem value="settings_changed">Settings Changed</SelectItem>
              </SelectContent>
            </Select>
            <Select value={adminFilter} onValueChange={setAdminFilter}>
              <SelectTrigger className="w-full md:w-[180px]">
                <SelectValue placeholder="Admin" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Admins</SelectItem>
                {uniqueAdmins.map((admin) => (
                  <SelectItem key={admin} value={admin}>
                    {admin}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline">Export Logs</Button>
          </div>
        </CardContent>
      </Card>

      {/* Logs List */}
      <Card>
        <CardHeader>
          <CardTitle>Activity Log</CardTitle>
          <CardDescription>{filteredLogs.length} entries</CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[600px]">
            <div className="space-y-4">
              {filteredLogs.map((log) => (
                <div key={log.id} className="p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-muted rounded-lg">{getActionIcon(log.action)}</div>
                      {getActionBadge(log.action)}
                    </div>
                    <span className="text-sm text-muted-foreground">{log.timestamp}</span>
                  </div>
                  <div className="mb-3">
                    <p className="font-medium">Target: {log.target}</p>
                    <p className="text-sm text-muted-foreground">{log.details}</p>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <Avatar className="h-6 w-6">
                        <AvatarImage src={log.admin.avatar || "/placeholder.svg"} />
                        <AvatarFallback>{log.admin.username.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <span className="text-muted-foreground">by {log.admin.username}</span>
                    </div>
                    <span className="text-muted-foreground">IP: {log.ip}</span>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  )
}
