"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  Users,
  ShoppingBag,
  Flag,
  MessageSquare,
  Award,
  DollarSign,
  BarChart3,
  CreditCard,
  Settings,
  Plus,
  Loader2,
} from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Separator } from "@/components/ui/separator"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useSession } from "next-auth/react"
import { getRoles, createRole, updateRolePermissions, assignUserRole } from "@/app/actions/admin"
import { Checkbox } from "@/components/ui/checkbox"

interface CustomRole {
  id: string
  name: string
  description?: string
  color: string
  permissions: string[]
  userCount: number
  users: Array<{
    id: string
    username: string
    email: string
    profilePicture?: string
  }>
}

const permissionGroups = [
  {
    name: "User Management",
    icon: Users,
    permissions: [
      { id: "users_view", label: "View users" },
      { id: "users_edit", label: "Edit users" },
      { id: "users_ban", label: "Ban/unban users" },
      { id: "users_warn", label: "Issue warnings" },
    ],
  },
  {
    name: "Listings",
    icon: ShoppingBag,
    permissions: [
      { id: "listings_view", label: "View listings" },
      { id: "listings_edit", label: "Edit listings" },
      { id: "listings_remove", label: "Remove listings" },
      { id: "listings_feature", label: "Feature listings" },
    ],
  },
  {
    name: "Reports",
    icon: Flag,
    permissions: [
      { id: "reports_view", label: "View reports" },
      { id: "reports_resolve", label: "Resolve reports" },
    ],
  },
  {
    name: "Chat",
    icon: MessageSquare,
    permissions: [
      { id: "chat_view", label: "View chat logs" },
      { id: "chat_mute", label: "Mute users" },
    ],
  },
  {
    name: "Vouches",
    icon: Award,
    permissions: [
      { id: "vouches_view", label: "View vouches" },
      { id: "vouches_invalidate", label: "Invalidate vouches" },
    ],
  },
  {
    name: "Currency",
    icon: DollarSign,
    permissions: [
      { id: "currency_view", label: "View currency trades" },
      { id: "currency_moderate", label: "Moderate trades" },
    ],
  },
  {
    name: "Analytics",
    icon: BarChart3,
    permissions: [{ id: "analytics_view", label: "View analytics" }],
  },
  {
    name: "Monetization",
    icon: CreditCard,
    permissions: [
      { id: "monetization_view", label: "View subscriptions" },
      { id: "monetization_modify", label: "Modify subscriptions" },
      { id: "monetization_refund", label: "Process refunds" },
    ],
  },
  {
    name: "System",
    icon: Settings,
    permissions: [
      { id: "settings_view", label: "View settings" },
      { id: "settings_modify", label: "Modify settings" },
      { id: "audit_view", label: "View audit logs" },
      { id: "permissions_manage", label: "Manage permissions" },
    ],
  },
]

const colorOptions = [
  { value: "bg-red-500", label: "Red" },
  { value: "bg-blue-500", label: "Blue" },
  { value: "bg-green-500", label: "Green" },
  { value: "bg-yellow-500", label: "Yellow" },
  { value: "bg-purple-500", label: "Purple" },
  { value: "bg-pink-500", label: "Pink" },
  { value: "bg-indigo-500", label: "Indigo" },
]

export default function PermissionsPage() {
  const { data: session } = useSession()
  const [roles, setRoles] = useState<CustomRole[]>([])
  const [selectedRole, setSelectedRole] = useState<CustomRole | null>(null)
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)

  // Dialogs
  const [isCreateRoleOpen, setIsCreateRoleOpen] = useState(false)
  const [isAddUserOpen, setIsAddUserOpen] = useState(false)
  const [creatingRole, setCreatingRole] = useState(false)
  const [assigningUser, setAssigningUser] = useState(false)

  // Create role form
  const [newRoleName, setNewRoleName] = useState("")
  const [newRoleDescription, setNewRoleDescription] = useState("")
  const [newRoleColor, setNewRoleColor] = useState("bg-blue-500")

  // Add user form
  const [addUserUsername, setAddUserUsername] = useState("")

  // Load roles
  useEffect(() => {
    const loadRoles = async () => {
      try {
        setLoading(true)
        const result = await getRoles()
        if (result.success && result.roles) {
          setRoles(result.roles)
          if (result.roles.length > 0) {
            setSelectedRole(result.roles[0])
          }
        }
      } catch (err) {
        console.error("Failed to load roles:", err)
      } finally {
        setLoading(false)
      }
    }

    loadRoles()
  }, [])

  const handleCreateRole = async () => {
    if (!session?.user?.id || !newRoleName.trim()) return

    try {
      setCreatingRole(true)
      const result = await createRole(
        {
          name: newRoleName,
          description: newRoleDescription,
          color: newRoleColor,
          permissions: [],
        },
        session.user.id
      )

      if (result.success) {
        // Refresh roles
        const rolesResult = await getRoles()
        if (rolesResult.success && rolesResult.roles) {
          setRoles(rolesResult.roles)
          const newRole = rolesResult.roles.find((r) => r.name === newRoleName)
          if (newRole) {
            setSelectedRole(newRole)
          }
        }
        setNewRoleName("")
        setNewRoleDescription("")
        setNewRoleColor("bg-blue-500")
        setIsCreateRoleOpen(false)
      } else {
        alert(result.error || "Failed to create role")
      }
    } catch (err) {
      console.error("Failed to create role:", err)
      alert("Failed to create role")
    } finally {
      setCreatingRole(false)
    }
  }

  const handleTogglePermission = async (permissionId: string) => {
    if (!selectedRole || !session?.user?.id) return

    try {
      setUpdating(true)
      const newPermissions = selectedRole.permissions.includes(permissionId)
        ? selectedRole.permissions.filter((p) => p !== permissionId)
        : [...selectedRole.permissions, permissionId]

      const result = await updateRolePermissions(selectedRole.id, newPermissions, session.user.id)
      if (result.success) {
        // Update local state
        const updatedRole = { ...selectedRole, permissions: newPermissions }
        setSelectedRole(updatedRole)
        setRoles(roles.map((r) => (r.id === selectedRole.id ? updatedRole : r)))
      } else {
        alert(result.error || "Failed to update permissions")
      }
    } catch (err) {
      console.error("Failed to toggle permission:", err)
      alert("Failed to update permission")
    } finally {
      setUpdating(false)
    }
  }

  const handleAssignUser = async () => {
    if (!session?.user?.id || !addUserUsername.trim() || !selectedRole) return

    try {
      setAssigningUser(true)
      const result = await assignUserRole(addUserUsername, selectedRole.id, session.user.id)

      if (result.success) {
        // Refresh roles
        const rolesResult = await getRoles()
        if (rolesResult.success && rolesResult.roles) {
          setRoles(rolesResult.roles)
          const updatedRole = rolesResult.roles.find((r) => r.id === selectedRole.id)
          if (updatedRole) {
            setSelectedRole(updatedRole)
          }
        }
        setAddUserUsername("")
        setIsAddUserOpen(false)
      } else {
        alert(result.error || "Failed to assign user")
      }
    } catch (err) {
      console.error("Failed to assign user:", err)
      alert("Failed to assign user to role")
    } finally {
      setAssigningUser(false)
    }
  }

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Permission Roles</h1>
          <p className="text-muted-foreground">Create and manage custom roles with fine-grained permissions</p>
        </div>
        <Dialog open={isCreateRoleOpen} onOpenChange={setIsCreateRoleOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              New Role
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Role</DialogTitle>
              <DialogDescription>Define a new custom role with specific permissions.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="role-name">Role Name</Label>
                <Input
                  id="role-name"
                  placeholder="e.g., Content Moderator"
                  value={newRoleName}
                  onChange={(e) => setNewRoleName(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="role-desc">Description</Label>
                <Input
                  id="role-desc"
                  placeholder="Role description (optional)"
                  value={newRoleDescription}
                  onChange={(e) => setNewRoleDescription(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="role-color">Color Badge</Label>
                <Select value={newRoleColor} onValueChange={setNewRoleColor}>
                  <SelectTrigger id="role-color">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {colorOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        <div className="flex items-center gap-2">
                          <div className={`w-3 h-3 rounded-full ${option.value}`} />
                          {option.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateRoleOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateRole} disabled={creatingRole || !newRoleName.trim()}>
                {creatingRole ? "Creating..." : "Create Role"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Roles List */}
        <div className="lg:col-span-1 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Roles ({roles.length})</CardTitle>
              <CardDescription>Custom roles and permissions</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {roles.map((role) => (
                <div
                  key={role.id}
                  onClick={() => setSelectedRole(role)}
                  className={`p-4 border rounded-lg cursor-pointer transition-colors hover:bg-muted/50 ${
                    selectedRole?.id === role.id ? "border-primary bg-muted/50" : ""
                  }`}
                >
                  <div className="flex items-center gap-3 mb-2">
                    <div className={`w-3 h-3 rounded-full ${role.color}`} />
                    <span className="font-medium">{role.name}</span>
                  </div>
                  {role.description && <p className="text-xs text-muted-foreground mb-2">{role.description}</p>}
                  <div className="flex items-center gap-2">
                    <div className="flex -space-x-2">
                      {role.users.slice(0, 3).map((user) => (
                        <Avatar key={user.id} className="h-6 w-6 border-2 border-background">
                          <AvatarImage src={user.profilePicture || "/placeholder.svg"} />
                          <AvatarFallback className="text-xs">
                            {user.username.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                      ))}
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {role.userCount} user{role.userCount !== 1 ? "s" : ""}
                    </span>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Role Details */}
        {selectedRole && (
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-4 h-4 rounded-full ${selectedRole.color}`} />
                    <div>
                      <CardTitle>{selectedRole.name}</CardTitle>
                      {selectedRole.description && <CardDescription>{selectedRole.description}</CardDescription>}
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Assigned Users */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <p className="font-medium">Assigned Users ({selectedRole.userCount})</p>
                    <Dialog open={isAddUserOpen} onOpenChange={setIsAddUserOpen}>
                      <DialogTrigger asChild>
                        <Button size="sm">
                          <Plus className="h-4 w-4 mr-1" />
                          Add User
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Add User to Role</DialogTitle>
                          <DialogDescription>
                            Assign a user to the {selectedRole.name} role
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div>
                            <Label htmlFor="username">Username</Label>
                            <Input
                              id="username"
                              placeholder="Enter username"
                              value={addUserUsername}
                              onChange={(e) => setAddUserUsername(e.target.value)}
                            />
                          </div>
                        </div>
                        <DialogFooter>
                          <Button variant="outline" onClick={() => setIsAddUserOpen(false)}>
                            Cancel
                          </Button>
                          <Button
                            onClick={handleAssignUser}
                            disabled={assigningUser || !addUserUsername.trim()}
                          >
                            {assigningUser ? "Adding..." : "Add User"}
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  </div>
                  {selectedRole.users.length > 0 ? (
                    <div className="space-y-2">
                      {selectedRole.users.map((user) => (
                        <div
                          key={user.id}
                          className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                        >
                          <div className="flex items-center gap-3">
                            <Avatar className="h-8 w-8">
                              <AvatarImage src={user.profilePicture || "/placeholder.svg"} />
                              <AvatarFallback>{user.username.charAt(0).toUpperCase()}</AvatarFallback>
                            </Avatar>
                            <div>
                              <span className="font-medium text-sm">{user.username}</span>
                              <p className="text-xs text-muted-foreground">{user.email}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center p-4 bg-muted/50 rounded-lg">
                      <p className="text-sm text-muted-foreground">No users assigned to this role yet</p>
                    </div>
                  )}
                </div>

                <Separator />

                {/* Permissions */}
                <div>
                  <p className="font-medium mb-4">Permissions</p>
                  <div className="space-y-6">
                    {permissionGroups.map((group) => {
                      const Icon = group.icon
                      return (
                        <div key={group.name}>
                          <div className="flex items-center gap-2 mb-3">
                            <Icon className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium text-sm">{group.name}</span>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {group.permissions.map((perm) => (
                              <div
                                key={perm.id}
                                className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg cursor-pointer hover:bg-muted transition-colors"
                                onClick={() => handleTogglePermission(perm.id)}
                              >
                                <Checkbox
                                  checked={selectedRole.permissions.includes(perm.id)}
                                  disabled={updating}
                                  className="cursor-pointer"
                                />
                                <span className="text-sm flex-1">{perm.label}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  )
}
