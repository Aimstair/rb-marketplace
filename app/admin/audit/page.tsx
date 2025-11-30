"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Search, FileText, Ban, Trash2, Edit, AlertTriangle, Settings, LogIn, Loader2 } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { ScrollArea } from "@/components/ui/scroll-area"
import { getAuditLogs } from "@/app/actions/admin"

interface AuditLog {
  id: string
  action: string
  targetId?: string
  details?: string
  admin: { id: string; username: string }
  createdAt: Date
}

export default function AuditLogsPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [actionFilter, setActionFilter] = useState("all")
  const [adminFilter, setAdminFilter] = useState("all")
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [loading, setLoading] = useState(true)
  const [uniqueAdmins, setUniqueAdmins] = useState<string[]>([])

  useEffect(() => {
    const loadLogs = async () => {
      try {
        setLoading(true)
        const result = await getAuditLogs(100)
        if (result.success && result.logs) {
          setLogs(result.logs)
          const admins = [...new Set(result.logs.map((log) => log.admin.username))]
          setUniqueAdmins(admins)
        }
      } catch (err) {
        console.error("Failed to load audit logs:", err)
      } finally {
        setLoading(false)
      }
    }

    loadLogs()
  }, [])

  const filteredLogs = logs.filter((log) => {
    const matchesSearch =
      log.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.details?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.admin.username.toLowerCase().includes(searchQuery.toLowerCase())

    const matchesAction = actionFilter === "all" || log.action === actionFilter
    const matchesAdmin = adminFilter === "all" || log.admin.username === adminFilter

    return matchesSearch && matchesAction && matchesAdmin
  })

  const getActionIcon = (action: string) => {
    switch (action) {
      case "USER_BANNED":
      case "USER_UNBANNED":
        return <Ban className="h-4 w-4" />
      case "LISTING_REMOVED":
        return <Trash2 className="h-4 w-4" />
      case "VOUCH_INVALIDATED":
        return <AlertTriangle className="h-4 w-4" />
      case "USER_WARNING":
        return <AlertTriangle className="h-4 w-4" />
      case "ADMIN_LOGIN":
        return <LogIn className="h-4 w-4" />
      case "SUBSCRIPTION_MODIFIED":
      case "USER_ROLE_UPDATED":
        return <Edit className="h-4 w-4" />
      case "SETTINGS_CHANGED":
        return <Settings className="h-4 w-4" />
      default:
        return <FileText className="h-4 w-4" />
    }
  }

  const getActionBadge = (action: string) => {
    switch (action) {
      case "USER_BANNED":
        return <Badge variant="destructive">User Banned</Badge>
      case "USER_UNBANNED":
        return <Badge className="bg-green-500 text-white">User Unbanned</Badge>
      case "LISTING_REMOVED":
        return <Badge variant="destructive">Listing Removed</Badge>
      case "VOUCH_INVALIDATED":
        return <Badge className="bg-orange-500 text-white">Vouch Invalidated</Badge>
      case "USER_WARNING":
        return <Badge className="bg-yellow-500 text-white">Warning Issued</Badge>
      case "ADMIN_LOGIN":
        return <Badge variant="outline">Admin Login</Badge>
      case "SUBSCRIPTION_MODIFIED":
        return <Badge className="bg-blue-500 text-white">Subscription Modified</Badge>
      case "USER_ROLE_UPDATED":
        return <Badge className="bg-purple-500 text-white">Role Updated</Badge>
      case "SETTINGS_CHANGED":
        return <Badge variant="secondary">Settings Changed</Badge>
      case "DISPUTE_RESOLVED":
        return <Badge className="bg-green-500 text-white">Dispute Resolved</Badge>
      case "TICKET_CLOSED":
        return <Badge className="bg-blue-500 text-white">Ticket Closed</Badge>
      case "ANNOUNCEMENT_CREATED":
        return <Badge className="bg-cyan-500 text-white">Announcement Created</Badge>
      case "ANNOUNCEMENT_DELETED":
        return <Badge variant="destructive">Announcement Deleted</Badge>
      default:
        return <Badge variant="outline">{action.replace(/_/g, " ")}</Badge>
    }
  }

  const formatDate = (date: Date | string) => {
    const d = new Date(date)
    const now = new Date()
    const diff = now.getTime() - d.getTime()
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(minutes / 60)
    const days = Math.floor(hours / 24)

    if (minutes < 1) return "just now"
    if (minutes < 60) return `${minutes}m ago`
    if (hours < 24) return `${hours}h ago`
    if (days < 7) return `${days}d ago`
    return d.toLocaleDateString()
  }

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
                <SelectItem value="USER_BANNED">User Banned</SelectItem>
                <SelectItem value="USER_UNBANNED">User Unbanned</SelectItem>
                <SelectItem value="LISTING_REMOVED">Listing Removed</SelectItem>
                <SelectItem value="VOUCH_INVALIDATED">Vouch Invalidated</SelectItem>
                <SelectItem value="USER_WARNING">Warning Issued</SelectItem>
                <SelectItem value="ADMIN_LOGIN">Admin Login</SelectItem>
                <SelectItem value="USER_ROLE_UPDATED">Role Updated</SelectItem>
                <SelectItem value="DISPUTE_RESOLVED">Dispute Resolved</SelectItem>
                <SelectItem value="TICKET_CLOSED">Ticket Closed</SelectItem>
                <SelectItem value="ANNOUNCEMENT_CREATED">Announcement Created</SelectItem>
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
            <Button variant="outline" disabled>
              Export Logs
            </Button>
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
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : (
            <ScrollArea className="h-[600px]">
              <div className="space-y-4 pr-4">
                {filteredLogs.length > 0 ? (
                  filteredLogs.map((log) => (
                    <div key={log.id} className="p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-muted rounded-lg">{getActionIcon(log.action)}</div>
                          {getActionBadge(log.action)}
                        </div>
                        <span className="text-sm text-muted-foreground">{formatDate(log.createdAt)}</span>
                      </div>
                      <div className="mb-3">
                        {log.details && (
                          <p className="text-sm text-foreground">{log.details}</p>
                        )}
                        {log.targetId && (
                          <p className="text-xs text-muted-foreground mt-1">Target ID: {log.targetId}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <Avatar className="h-6 w-6">
                          <AvatarFallback className="text-xs">
                            {log.admin.username.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-muted-foreground">by {log.admin.username}</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="flex items-center justify-center py-12">
                    <p className="text-muted-foreground">No logs found</p>
                  </div>
                )}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
