"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
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
  Clock,
  CheckCircle,
  XCircle,
  Loader2,
  ChevronRight,
  RefreshCw,
} from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { MoreHorizontal, Ban, Trash2 } from "lucide-react"
import { getReports, resolveReport, banUser, adminUpdateListingStatus } from "@/app/actions/admin"
import { useToast } from "@/components/ui/use-toast"

export default function ReportsPage() {
  const { toast } = useToast()
  const [reports, setReports] = useState<any[]>([])
  const [allReports, setAllReports] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState("PENDING")
  const [reportTypeFilter, setReportTypeFilter] = useState("all")
  const [selectedReport, setSelectedReport] = useState<any>(null)
  const [actionDialogOpen, setActionDialogOpen] = useState(false)
  const [actionType, setActionType] = useState<string>("")
  const [actionNotes, setActionNotes] = useState("")
  const [actionLoading, setActionLoading] = useState(false)
  const [banDialogOpen, setBanDialogOpen] = useState(false)
  const [banType, setBanType] = useState<"user" | "listing" | null>(null)
  const [banReason, setBanReason] = useState("")
  const [refreshKey, setRefreshKey] = useState(0)

  // Load all reports for stats
  useEffect(() => {
    const loadAllReports = async () => {
      try {
        const result = await getReports("all")
        if (result.success && result.reports) {
          setAllReports(result.reports)
        }
      } catch (err) {
        console.error("Failed to load all reports for stats:", err)
      }
    }

    loadAllReports()
  }, [refreshKey])

  // Load filtered reports
  useEffect(() => {
    const loadReports = async () => {
      try {
        setLoading(true)
        const result = await getReports(statusFilter === "all" ? "all" : statusFilter)
        if (result.success && result.reports) {
          setReports(result.reports)
          // Also update allReports if we're fetching "all"
          if (statusFilter === "all") {
            setAllReports(result.reports)
          }
        }
      } catch (err) {
        console.error("Failed to load reports:", err)
        toast({ title: "Error", description: "Failed to load reports", variant: "destructive" })
      } finally {
        setLoading(false)
      }
    }

    loadReports()
  }, [statusFilter, toast, refreshKey])

  // Auto-refresh on window focus
  useEffect(() => {
    const handleFocus = () => {
      setRefreshKey(prev => prev + 1)
    }

    window.addEventListener('focus', handleFocus)
    return () => window.removeEventListener('focus', handleFocus)
  }, [])

  const getReportType = (report: any) => {
    if (report.reported && report.reported.username) return "user"
    if (report.listing) return "listing"
    return "unknown"
  }

  const filteredReports = reports.filter((report) => {
    const matchesSearch =
      report.reporter.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (report.reported?.username?.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (report.listing?.title?.toLowerCase().includes(searchQuery.toLowerCase()))

    const reportType = getReportType(report)
    const matchesType = reportTypeFilter === "all" || reportType === reportTypeFilter

    return matchesSearch && matchesType
  })

  const stats = {
    total: allReports.length,
    pending: allReports.filter((r) => r.status === "PENDING").length,
    resolved: allReports.filter((r) => r.status === "RESOLVED").length,
    dismissed: allReports.filter((r) => r.status === "DISMISSED").length,
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "user":
        return <User className="h-4 w-4" />
      case "listing":
        return <ShoppingBag className="h-4 w-4" />
      default:
        return <Flag className="h-4 w-4" />
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "PENDING":
        return (
          <Badge variant="outline" className="border-orange-500 text-orange-500">
            <Clock className="h-3 w-3 mr-1" />
            Pending
          </Badge>
        )
      case "RESOLVED":
        return (
          <Badge className="bg-green-500 text-white">
            <CheckCircle className="h-3 w-3 mr-1" />
            Resolved
          </Badge>
        )
      case "DISMISSED":
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

  const handleAction = (report: any, action: string) => {
    setSelectedReport(report)
    setActionType(action)
    setActionDialogOpen(true)
  }

  const executeAction = async () => {
    if (!selectedReport) return

    try {
      setActionLoading(true)

      // If resolving a user report, ban the user first
      if (actionType === "RESOLVED" && selectedReport.reportedId) {
        const banResult = await banUser(selectedReport.reportedId, true)
        if (!banResult.success) {
          toast({ 
            title: "Error", 
            description: banResult.error || "Failed to ban user", 
            variant: "destructive" 
          })
          setActionLoading(false)
          return
        }
      }

      // If resolving a listing report, ban the listing first
      if (actionType === "RESOLVED" && selectedReport.listingId) {
        const banResult = await adminUpdateListingStatus(selectedReport.listingId, "banned")
        if (!banResult.success) {
          toast({ 
            title: "Error", 
            description: banResult.error || "Failed to ban listing", 
            variant: "destructive" 
          })
          setActionLoading(false)
          return
        }
      }

      const result = await resolveReport(selectedReport.id, actionType as "RESOLVED" | "DISMISSED")

      if (result.success) {
        toast({
          title: "Success",
          description: actionType === "RESOLVED" && selectedReport.reportedId
            ? "User banned and report resolved"
            : actionType === "RESOLVED" && selectedReport.listingId 
            ? "Listing banned and report resolved"
            : `Report ${actionType === "RESOLVED" ? "resolved" : "dismissed"}`,
        })
        
        // Trigger refresh to reload reports from server
        setRefreshKey(prev => prev + 1)
        
        // Clear selected report if it no longer matches the filter
        if (statusFilter !== "all" && statusFilter !== actionType) {
          setSelectedReport(null)
        } else {
          setSelectedReport({ ...selectedReport, status: actionType })
        }
        
        setActionDialogOpen(false)
        setActionNotes("")
      } else {
        toast({ title: "Error", description: result.error || "Failed to update report", variant: "destructive" })
      }
    } finally {
      setActionLoading(false)
    }
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Reports & Flagged Content</h1>
          <p className="text-muted-foreground">Review and handle user reports</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setRefreshKey(prev => prev + 1)}
          disabled={loading}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
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
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-[180px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="PENDING">Pending</SelectItem>
                <SelectItem value="RESOLVED">Resolved</SelectItem>
                <SelectItem value="DISMISSED">Dismissed</SelectItem>
                <SelectItem value="all">All Status</SelectItem>
              </SelectContent>
            </Select>
            <Select value={reportTypeFilter} onValueChange={setReportTypeFilter}>
              <SelectTrigger className="w-full md:w-[180px]">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Reports</SelectItem>
                <SelectItem value="user">User Reports</SelectItem>
                <SelectItem value="listing">Listing Reports</SelectItem>
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
              {loading ? (
                <div className="flex items-center justify-center h-[400px]">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : (
                <ScrollArea className="h-[600px]">
                  <div className="divide-y">
                    {filteredReports.map((report) => (
                      <div
                        key={report.id}
                        onClick={() => setSelectedReport(report)}
                        className={`p-4 cursor-pointer transition-colors hover:bg-muted/50 ${
                          selectedReport?.id === report.id ? "bg-muted/50" : ""
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-start gap-3 flex-1 min-w-0">
                            <Avatar className="h-8 w-8 mt-1">
                              <AvatarImage src={report.reporter.profilePicture || "/placeholder.svg"} />
                              <AvatarFallback>{report.reporter.username.charAt(0)}</AvatarFallback>
                            </Avatar>
                            <div className="min-w-0 flex-1">
                              <p className="font-semibold text-sm truncate">{report.reporter.username}</p>
                              <p className="text-xs text-muted-foreground truncate">{report.reason}</p>
                            </div>
                          </div>
                          {getStatusBadge(report.status)}
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Report Details */}
        <div className="lg:col-span-2">
          {selectedReport ? (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {getTypeIcon(getReportType(selectedReport))}
                    <CardTitle>Report Details</CardTitle>
                  </div>
                  {getStatusBadge(selectedReport.status)}
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Reporter */}
                <div className="p-4 bg-muted/50 rounded-lg">
                  <p className="text-xs font-semibold text-muted-foreground mb-3">REPORTED BY</p>
                  <div className="flex items-center gap-3">
                    <Avatar>
                      <AvatarImage src={selectedReport.reporter.profilePicture || "/placeholder.svg"} />
                      <AvatarFallback>{selectedReport.reporter.username.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-semibold">{selectedReport.reporter.username}</p>
                      <p className="text-sm text-muted-foreground">ID: {selectedReport.reporterId}</p>
                    </div>
                  </div>
                </div>

                {/* Reported User or Listing */}
                {selectedReport.reported && (
                  <div className="p-4 bg-destructive/10 rounded-lg border border-destructive/20">
                    <p className="text-xs font-semibold text-muted-foreground mb-3">REPORTED USER</p>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Avatar>
                          <AvatarImage src={selectedReport.reported.profilePicture || "/placeholder.svg"} />
                          <AvatarFallback>{selectedReport.reported.username.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-semibold">{selectedReport.reported.username}</p>
                          <p className="text-sm text-muted-foreground">ID: {selectedReport.reportedId}</p>
                        </div>
                      </div>
                      <Link href={`/profile/${selectedReport.reportedId}`} target="_blank">
                        <Button variant="outline" size="sm">
                          View Profile
                          <ChevronRight className="h-3 w-3 ml-1" />
                        </Button>
                      </Link>
                    </div>
                  </div>
                )}

                {selectedReport.listing && (
                  <div className="p-4 bg-destructive/10 rounded-lg border border-destructive/20">
                    <p className="text-xs font-semibold text-muted-foreground mb-3">REPORTED LISTING</p>
                    <div className="flex items-center gap-4">
                      {selectedReport.listing.image && (
                        <Image
                          src={selectedReport.listing.image || "/placeholder.svg"}
                          alt={selectedReport.listing.title}
                          width={60}
                          height={60}
                          className="rounded object-cover h-16 w-16"
                        />
                      )}
                      <div className="flex-1">
                        <p className="font-semibold">{selectedReport.listing.title}</p>
                        <p className="text-sm text-muted-foreground">ID: {selectedReport.listingId}</p>
                      </div>
                      <Link 
                        href={
                          selectedReport.listingType === "CURRENCY" 
                            ? `/currency/${selectedReport.listingId}` 
                            : `/listing/${selectedReport.listingId}`
                        } 
                        target="_blank"
                      >
                        <Button variant="outline" size="sm">
                          View Listing
                          <ChevronRight className="h-3 w-3 ml-1" />
                        </Button>
                      </Link>
                    </div>
                  </div>
                )}

                {/* Reason & Details */}
                <div>
                  <p className="text-sm font-semibold mb-2">Reason</p>
                  <p className="text-sm text-muted-foreground">{selectedReport.reason}</p>
                </div>

                {selectedReport.details && (
                  <div>
                    <p className="text-sm font-semibold mb-2">Details</p>
                    <p className="text-sm text-muted-foreground">{selectedReport.details}</p>
                  </div>
                )}

                {/* Created At */}
                <div>
                  <p className="text-sm font-semibold mb-2">Created</p>
                  <p className="text-sm text-muted-foreground">
                    {new Date(selectedReport.createdAt).toLocaleString()}
                  </p>
                </div>

                <Separator />

                {/* Actions */}
                {selectedReport.status === "PENDING" && (
                  <div className="space-y-4">
                    <div className="flex gap-2">
                      <Button
                        variant="default"
                        onClick={() => handleAction(selectedReport, "RESOLVED")}
                        disabled={actionLoading}
                        className="flex-1"
                      >
                        {actionLoading ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Processing...
                          </>
                        ) : (
                          "Mark Resolved"
                        )}
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => handleAction(selectedReport, "DISMISSED")}
                        disabled={actionLoading}
                        className="flex-1"
                      >
                        {actionLoading ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Processing...
                          </>
                        ) : (
                          "Dismiss"
                        )}
                      </Button>
                    </div>
                    
                    <Separator className="my-2" />
                    
                    <div className="space-y-2">
                      <p className="text-xs font-semibold text-muted-foreground">ENFORCEMENT ACTIONS</p>
                      <p className="text-xs text-muted-foreground">
                        {selectedReport.reportedId 
                          ? "Marking this report as resolved will ban the reported user."
                          : "Marking this report as resolved will ban the reported listing."}
                      </p>
                    </div>
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
            <DialogTitle>{actionType === "RESOLVED" ? "Resolve Report" : "Dismiss Report"}</DialogTitle>
            <DialogDescription>
              {actionType === "RESOLVED"
                ? selectedReport?.reportedId
                  ? "Mark this report as resolved. This will ban the reported user."
                  : selectedReport?.listingId
                  ? "Mark this report as resolved. This will ban the reported listing."
                  : "Mark this report as resolved. This will close the case."
                : "Dismiss this report. This indicates insufficient evidence or invalid claim."}
            </DialogDescription>
          </DialogHeader>
          <div>
            <Label>Notes (optional)</Label>
            <Textarea
              placeholder="Add internal notes about this decision..."
              value={actionNotes}
              onChange={(e) => setActionNotes(e.target.value)}
              className="mt-2"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setActionDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant={actionType === "RESOLVED" ? "default" : "outline"}
              onClick={executeAction}
              disabled={actionLoading}
            >
              {actionLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Ban/Remove Dialog */}
      <Dialog open={banDialogOpen} onOpenChange={setBanDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-destructive">Ban User</DialogTitle>
            <DialogDescription>
              This will ban the user from the platform. They will not be able to create listings or make transactions.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Reason *</Label>
              <Textarea
                placeholder="Provide a reason for this action..."
                value={banReason}
                onChange={(e) => setBanReason(e.target.value)}
                className="mt-2"
                rows={4}
              />
            </div>
            {selectedReport && (
              <div className="p-3 bg-destructive/10 rounded-lg">
                <p className="text-sm font-semibold mb-1">
                  {selectedReport.reported?.username || selectedReport.listing?.seller?.username}
                </p>
                <p className="text-xs text-muted-foreground">
                  User ID: {selectedReport.reportedId || selectedReport.listing?.sellerId}
                </p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setBanDialogOpen(false)
                setBanReason("")
                setBanType(null)
              }}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={async () => {
                if (!banReason.trim()) {
                  toast({
                    title: "Error",
                    description: "Please provide a reason",
                    variant: "destructive",
                  })
                  return
                }

                try {
                  setActionLoading(true)
                  
                  if (banType === "user") {
                    const userId = selectedReport.reportedId || selectedReport.listing?.sellerId
                    
                    if (!userId) {
                      toast({
                        title: "Error",
                        description: "Unable to identify user to ban. The listing may have been deleted.",
                        variant: "destructive",
                      })
                      setActionLoading(false)
                      return
                    }
                    
                    const result = await banUser(userId, true)
                    
                    if (result.success) {
                      // Also mark report as resolved
                      const resolveResult = await resolveReport(selectedReport.id, "RESOLVED")
                      
                      if (resolveResult.success) {
                        toast({
                          title: "Success",
                          description: "User has been banned successfully",
                        })
                        
                        // Trigger refresh to reload reports from server
                        setRefreshKey(prev => prev + 1)
                        
                        // Clear selected report if viewing pending only
                        if (statusFilter === "PENDING") {
                          setSelectedReport(null)
                        } else {
                          setSelectedReport({ ...selectedReport, status: "RESOLVED" })
                        }
                        
                        setBanDialogOpen(false)
                        setBanReason("")
                        setBanType(null)
                      } else {
                        toast({
                          title: "Warning",
                          description: "User banned but failed to update report status",
                          variant: "destructive",
                        })
                      }
                    } else {
                      toast({
                        title: "Error",
                        description: result.error || "Failed to ban user",
                        variant: "destructive",
                      })
                    }
                  }
                } catch (error) {
                  console.error("Ban action failed:", error)
                  toast({
                    title: "Error",
                    description: "An error occurred",
                    variant: "destructive",
                  })
                } finally {
                  setActionLoading(false)
                }
              }}
              disabled={actionLoading || !banReason.trim()}
            >
              {actionLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              Confirm Ban
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
