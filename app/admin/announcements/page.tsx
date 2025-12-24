"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import {
  Megaphone,
  Plus,
  Search,
  Edit,
  Trash2,
  Eye,
  EyeOff,
  Calendar,
  AlertTriangle,
  Info,
  Sparkles,
} from "lucide-react"
import { getAnnouncements, createAnnouncement, deleteAnnouncement, updateAnnouncement } from "@/app/actions/admin"
import { useSession } from "next-auth/react"

const typeConfig: Record<string, { icon: React.ComponentType<{ className?: string }>; color: string; label: string }> =
  {
    maintenance: { icon: AlertTriangle, color: "bg-yellow-500/10 text-yellow-500", label: "Maintenance" },
    update: { icon: Sparkles, color: "bg-blue-500/10 text-blue-500", label: "Update" },
    event: { icon: Calendar, color: "bg-green-500/10 text-green-500", label: "Event" },
    warning: { icon: AlertTriangle, color: "bg-red-500/10 text-red-500", label: "Warning" },
    info: { icon: Info, color: "bg-muted text-muted-foreground", label: "Info" },
  }

const statusConfig: Record<string, { color: string; label: string }> = {
  active: { color: "bg-green-500/10 text-green-500 border-green-500/20", label: "Active" },
  scheduled: { color: "bg-blue-500/10 text-blue-500 border-blue-500/20", label: "Scheduled" },
  expired: { color: "bg-muted text-muted-foreground border-border", label: "Expired" },
  draft: { color: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20", label: "Draft" },
}

export default function AnnouncementsPage() {
  const { data: session } = useSession()
  const { toast } = useToast()
  const [searchQuery, setSearchQuery] = useState("")
  const [typeFilter, setTypeFilter] = useState("all")
  const [statusFilter, setStatusFilter] = useState("all")
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [announcements, setAnnouncements] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [updating, setUpdating] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<any>(null)

  // Form fields for create
  const [formData, setFormData] = useState({
    title: "",
    content: "",
    type: "info",
    expiresAt: "",
  })

  // Form fields for edit
  const [editFormData, setEditFormData] = useState({
    title: "",
    content: "",
    type: "info",
    isActive: true,
    expiresAt: "",
  })

  useEffect(() => {
    loadAnnouncements()
  }, [])

  const loadAnnouncements = async () => {
    setLoading(true)
    try {
      const result = await getAnnouncements()
      if (result.success && result.data) {
        // Map database announcements to display format
        const mapped = result.data.map((ann: any) => {
          // Determine status based on isActive and expiresAt
          let status = "active"
          if (!ann.isActive) {
            status = "draft"
          } else if (ann.expiresAt) {
            const expiryDate = new Date(ann.expiresAt)
            const now = new Date()
            if (expiryDate < now) {
              status = "expired"
            } else if (expiryDate.getTime() - now.getTime() < 7 * 24 * 60 * 60 * 1000) {
              // Within 7 days
              status = "scheduled"
            }
          }

          return {
            id: ann.id.slice(0, 8),
            title: ann.title,
            content: ann.content,
            type: ann.type.toLowerCase(),
            status,
            isActive: ann.isActive,
            createdAt: new Date(ann.createdAt).toLocaleDateString(),
            expiresAt: ann.expiresAt ? new Date(ann.expiresAt).toLocaleDateString() : "No expiry",
            expiresAtRaw: ann.expiresAt ? new Date(ann.expiresAt).toISOString().split('T')[0] : "",
            dbId: ann.id,
          }
        })
        setAnnouncements(mapped)
      }
    } catch (error) {
      console.error("Failed to load announcements:", error)
      toast({
        title: "Error",
        description: "Failed to fetch announcements",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = async () => {
    if (!session?.user?.id || !formData.title.trim() || !formData.content.trim()) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      })
      return
    }

    setCreating(true)
    try {
      const result = await createAnnouncement(
        {
          title: formData.title,
          content: formData.content,
          type: formData.type,
          expiresAt: formData.expiresAt || undefined,
        },
        session.user.id
      )
      if (result.success) {
        toast({
          title: "Success",
          description: "Announcement created successfully",
        })
        setFormData({ title: "", content: "", type: "info", expiresAt: "" })
        setIsCreateOpen(false)
        loadAnnouncements()
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to create announcement",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Failed to create announcement:", error)
      toast({
        title: "Error",
        description: "Failed to create announcement",
        variant: "destructive",
      })
    } finally {
      setCreating(false)
    }
  }

  const handleEdit = (announcement: any) => {
    setSelectedAnnouncement(announcement)
    setEditFormData({
      title: announcement.title,
      content: announcement.content,
      type: announcement.type,
      isActive: announcement.isActive,
      expiresAt: announcement.expiresAtRaw,
    })
    setIsEditOpen(true)
  }

  const handleUpdate = async () => {
    if (!session?.user?.id || !selectedAnnouncement || !editFormData.title.trim() || !editFormData.content.trim()) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      })
      return
    }

    setUpdating(true)
    try {
      const result = await updateAnnouncement(
        selectedAnnouncement.dbId,
        {
          title: editFormData.title,
          content: editFormData.content,
          type: editFormData.type,
          isActive: editFormData.isActive,
          expiresAt: editFormData.expiresAt || null,
        },
        session.user.id
      )
      if (result.success) {
        toast({
          title: "Success",
          description: "Announcement updated successfully",
        })
        setIsEditOpen(false)
        setSelectedAnnouncement(null)
        loadAnnouncements()
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to update announcement",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Failed to update announcement:", error)
      toast({
        title: "Error",
        description: "Failed to update announcement",
        variant: "destructive",
      })
    } finally {
      setUpdating(false)
    }
  }

  const handleDelete = async (announcementId: string) => {
    if (!session?.user?.id) return

    setDeleting(announcementId)
    try {
      const result = await deleteAnnouncement(announcementId, session.user.id)
      if (result.success) {
        toast({
          title: "Success",
          description: "Announcement deleted successfully",
        })
        setAnnouncements(announcements.filter((a) => a.dbId !== announcementId))
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to delete announcement",
          variant: "destructive",
        })
      }
    } finally {
      setDeleting(null)
    }
  }

  const filteredAnnouncements = announcements.filter((announcement) => {
    const matchesSearch =
      announcement.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      announcement.content.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesType = typeFilter === "all" || announcement.type === typeFilter
    const matchesStatus = statusFilter === "all" || announcement.status === statusFilter
    return matchesSearch && matchesType && matchesStatus
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Announcements</h1>
          <p className="text-muted-foreground">Create and manage platform announcements</p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              New Announcement
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[525px]">
            <DialogHeader>
              <DialogTitle>Create Announcement</DialogTitle>
              <DialogDescription>Create a new announcement to display to users.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  placeholder="Announcement title..."
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="content">Content</Label>
                <Textarea
                  id="content"
                  placeholder="Announcement content..."
                  rows={4}
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="type">Type</Label>
                  <Select value={formData.type} onValueChange={(value) => setFormData({ ...formData, type: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="info">Info</SelectItem>
                      <SelectItem value="update">Update</SelectItem>
                      <SelectItem value="event">Event</SelectItem>
                      <SelectItem value="maintenance">Maintenance</SelectItem>
                      <SelectItem value="warning">Warning</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="expires">Expires</Label>
                  <Input
                    id="expires"
                    type="date"
                    value={formData.expiresAt}
                    onChange={(e) => setFormData({ ...formData, expiresAt: e.target.value })}
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreate} disabled={creating}>
                {creating ? "Creating..." : "Create"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active</CardTitle>
            <Eye className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{announcements.filter((a) => a.status === "active").length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Scheduled</CardTitle>
            <Calendar className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{announcements.filter((a) => a.status === "scheduled").length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Expired</CardTitle>
            <EyeOff className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{announcements.filter((a) => a.status === "expired").length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total</CardTitle>
            <Megaphone className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{announcements.length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search announcements..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="info">Info</SelectItem>
                <SelectItem value="update">Update</SelectItem>
                <SelectItem value="event">Event</SelectItem>
                <SelectItem value="maintenance">Maintenance</SelectItem>
                <SelectItem value="warning">Warning</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="scheduled">Scheduled</SelectItem>
                <SelectItem value="expired">Expired</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Announcements List */}
      <div className="space-y-4">
        {loading ? (
          <Card>
            <CardContent className="pt-6 text-center">Loading announcements...</CardContent>
          </Card>
        ) : filteredAnnouncements.length === 0 ? (
          <Card>
            <CardContent className="pt-6 text-center text-muted-foreground">No announcements found</CardContent>
          </Card>
        ) : (
          filteredAnnouncements.map((announcement) => {
            const TypeIcon = typeConfig[announcement.type]?.icon || Info
            return (
              <Card key={announcement.id}>
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-4">
                      <div className={`rounded-lg p-2 ${typeConfig[announcement.type]?.color || "bg-muted"}`}>
                        <TypeIcon className="h-5 w-5" />
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold">{announcement.title}</h3>
                          <Badge variant="outline" className={typeConfig[announcement.type]?.color}>
                            {typeConfig[announcement.type]?.label || announcement.type}
                          </Badge>
                          <Badge variant="outline" className={statusConfig[announcement.status]?.color}>
                            {statusConfig[announcement.status]?.label || announcement.status}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">{announcement.content}</p>
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <span>Created: {announcement.createdAt}</span>
                          <span>Expires: {announcement.expiresAt}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(announcement)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive"
                        onClick={() => handleDelete(announcement.dbId)}
                        disabled={deleting === announcement.dbId}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })
        )}
      </div>

      {/* Edit Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="sm:max-w-[525px]">
          <DialogHeader>
            <DialogTitle>Edit Announcement</DialogTitle>
            <DialogDescription>Update the announcement details.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-title">Title</Label>
              <Input
                id="edit-title"
                placeholder="Announcement title..."
                value={editFormData.title}
                onChange={(e) => setEditFormData({ ...editFormData, title: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-content">Content</Label>
              <Textarea
                id="edit-content"
                placeholder="Announcement content..."
                rows={4}
                value={editFormData.content}
                onChange={(e) => setEditFormData({ ...editFormData, content: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="edit-type">Type</Label>
                <Select value={editFormData.type} onValueChange={(value) => setEditFormData({ ...editFormData, type: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="info">Info</SelectItem>
                    <SelectItem value="update">Update</SelectItem>
                    <SelectItem value="event">Event</SelectItem>
                    <SelectItem value="maintenance">Maintenance</SelectItem>
                    <SelectItem value="warning">Warning</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-expires">Expires</Label>
                <Input
                  id="edit-expires"
                  type="date"
                  value={editFormData.expiresAt}
                  onChange={(e) => setEditFormData({ ...editFormData, expiresAt: e.target.value })}
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="edit-active"
                checked={editFormData.isActive}
                onChange={(e) => setEditFormData({ ...editFormData, isActive: e.target.checked })}
                className="h-4 w-4"
              />
              <Label htmlFor="edit-active" className="cursor-pointer">Active</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdate} disabled={updating}>
              {updating ? "Updating..." : "Update"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
