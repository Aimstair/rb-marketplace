"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import {
  Shield,
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
  Edit,
  Trash2,
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

const roles = [
  {
    id: "owner",
    name: "Owner / Super Admin",
    description: "Full access to all features",
    color: "bg-red-500",
    permissions: ["all"],
    users: [{ username: "AdminModerator", avatar: "/placeholder.svg?key=h9u2m", email: "admin@robloxtrade.com" }],
  },
  {
    id: "moderator",
    name: "Moderator",
    description: "Can manage reports, listings, and users",
    color: "bg-blue-500",
    permissions: ["users", "listings", "reports", "chat", "vouches"],
    users: [
      { username: "ModeratorX", avatar: "/placeholder.svg?key=c9sfl", email: "modx@robloxtrade.com" },
      { username: "ModeratorY", avatar: "/placeholder.svg?key=rdfne", email: "mody@robloxtrade.com" },
    ],
  },
  {
    id: "support",
    name: "Support Staff",
    description: "Can answer support tickets",
    color: "bg-green-500",
    permissions: ["support", "users_readonly"],
    users: [{ username: "SupportStaff", avatar: "/placeholder.svg?key=h4dti", email: "support@robloxtrade.com" }],
  },
  {
    id: "finance",
    name: "Finance Admin",
    description: "Handle monetization and refunds",
    color: "bg-purple-500",
    permissions: ["monetization", "analytics"],
    users: [{ username: "FinanceAdmin", avatar: "/placeholder.svg?key=96imd", email: "finance@robloxtrade.com" }],
  },
  {
    id: "analytics",
    name: "Analytics Manager",
    description: "Read-only access to statistics",
    color: "bg-orange-500",
    permissions: ["analytics_readonly"],
    users: [],
  },
]

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

export default function PermissionsPage() {
  const [selectedRole, setSelectedRole] = useState(roles[0])
  const [addUserDialogOpen, setAddUserDialogOpen] = useState(false)
  const [newUserData, setNewUserData] = useState({
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
  })
  const [addingToRole, setAddingToRole] = useState<string | null>(null)

  const handleAddUser = () => {
    if (newUserData.password !== newUserData.confirmPassword) {
      alert("Passwords do not match!")
      return
    }
    console.log("Adding user:", newUserData, "to role:", addingToRole || selectedRole.id)
    setAddUserDialogOpen(false)
    setNewUserData({ username: "", email: "", password: "", confirmPassword: "" })
    setAddingToRole(null)
  }

  const openAddUserDialog = (roleId?: string) => {
    if (roleId) setAddingToRole(roleId)
    setAddUserDialogOpen(true)
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Permission Roles</h1>
          <p className="text-muted-foreground">Manage admin roles and permissions</p>
        </div>
        <Dialog>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create Role
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Role</DialogTitle>
              <DialogDescription>Add a new permission role for staff members.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Role Name</Label>
                <Input placeholder="e.g., Junior Moderator" className="mt-2" />
              </div>
              <div>
                <Label>Description</Label>
                <Input placeholder="Brief description of this role" className="mt-2" />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline">Cancel</Button>
              <Button>Create Role</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Roles List */}
        <div className="lg:col-span-1 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Roles</CardTitle>
              <CardDescription>{roles.length} roles configured</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {roles.map((role) => (
                <div
                  key={role.id}
                  onClick={() => setSelectedRole(role)}
                  className={`p-4 border rounded-lg cursor-pointer transition-colors hover:bg-muted/50 ${
                    selectedRole.id === role.id ? "border-primary bg-muted/50" : ""
                  }`}
                >
                  <div className="flex items-center gap-3 mb-2">
                    <div className={`w-3 h-3 rounded-full ${role.color}`} />
                    <span className="font-medium">{role.name}</span>
                  </div>
                  <p className="text-sm text-muted-foreground mb-2">{role.description}</p>
                  <div className="flex items-center gap-2">
                    <div className="flex -space-x-2">
                      {role.users.slice(0, 3).map((user, i) => (
                        <Avatar key={i} className="h-6 w-6 border-2 border-background">
                          <AvatarImage src={user.avatar || "/placeholder.svg"} />
                          <AvatarFallback className="text-xs">{user.username.charAt(0)}</AvatarFallback>
                        </Avatar>
                      ))}
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {role.users.length} user{role.users.length !== 1 ? "s" : ""}
                    </span>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Role Details */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-4 h-4 rounded-full ${selectedRole.color}`} />
                  <div>
                    <CardTitle>{selectedRole.name}</CardTitle>
                    <CardDescription>{selectedRole.description}</CardDescription>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm">
                    <Edit className="h-4 w-4 mr-1" />
                    Edit
                  </Button>
                  {selectedRole.id !== "owner" && (
                    <Button variant="destructive" size="sm">
                      <Trash2 className="h-4 w-4 mr-1" />
                      Delete
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Assigned Users */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <p className="font-medium">Assigned Users ({selectedRole.users.length})</p>
                  <Button variant="outline" size="sm" onClick={() => openAddUserDialog()}>
                    <Plus className="h-4 w-4 mr-1" />
                    Add User
                  </Button>
                </div>
                {selectedRole.users.length > 0 ? (
                  <div className="space-y-2">
                    {selectedRole.users.map((user, i) => (
                      <div key={i} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <Avatar>
                            <AvatarImage src={user.avatar || "/placeholder.svg"} />
                            <AvatarFallback>{user.username.charAt(0)}</AvatarFallback>
                          </Avatar>
                          <div>
                            <span className="font-medium">{user.username}</span>
                            <p className="text-xs text-muted-foreground">{user.email}</p>
                          </div>
                        </div>
                        <Button variant="ghost" size="sm" className="text-destructive">
                          Remove
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center p-4 bg-muted/50 rounded-lg">
                    <p className="text-sm text-muted-foreground mb-2">No users assigned to this role</p>
                    <Button variant="outline" size="sm" onClick={() => openAddUserDialog()}>
                      <Plus className="h-4 w-4 mr-1" />
                      Add First User
                    </Button>
                  </div>
                )}
              </div>

              <Separator />

              {/* Permissions */}
              <div>
                <p className="font-medium mb-4">Permissions</p>
                {selectedRole.permissions.includes("all") ? (
                  <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
                    <p className="text-green-600 font-medium flex items-center gap-2">
                      <Shield className="h-5 w-5" />
                      Full Access - All permissions granted
                    </p>
                  </div>
                ) : (
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
                                className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                              >
                                <span className="text-sm">{perm.label}</span>
                                <Switch
                                  checked={
                                    selectedRole.permissions.includes(perm.id.split("_")[0]) ||
                                    selectedRole.permissions.includes(perm.id)
                                  }
                                  disabled={selectedRole.id === "owner"}
                                />
                              </div>
                            ))}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={addUserDialogOpen} onOpenChange={setAddUserDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New User</DialogTitle>
            <DialogDescription>
              Create a new admin user for the{" "}
              {addingToRole ? roles.find((r) => r.id === addingToRole)?.name : selectedRole.name} role.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                placeholder="Enter username"
                value={newUserData.username}
                onChange={(e) => setNewUserData({ ...newUserData, username: e.target.value })}
                className="mt-2"
              />
            </div>
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="Enter email address"
                value={newUserData.email}
                onChange={(e) => setNewUserData({ ...newUserData, email: e.target.value })}
                className="mt-2"
              />
            </div>
            <div>
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Enter password"
                value={newUserData.password}
                onChange={(e) => setNewUserData({ ...newUserData, password: e.target.value })}
                className="mt-2"
              />
            </div>
            <div>
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="Confirm password"
                value={newUserData.confirmPassword}
                onChange={(e) => setNewUserData({ ...newUserData, confirmPassword: e.target.value })}
                className="mt-2"
              />
            </div>
            <div>
              <Label htmlFor="role">Role</Label>
              <Select value={addingToRole || selectedRole.id} onValueChange={(value) => setAddingToRole(value)}>
                <SelectTrigger className="mt-2">
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  {roles.map((role) => (
                    <SelectItem key={role.id} value={role.id}>
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${role.color}`} />
                        {role.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setAddUserDialogOpen(false)
                setNewUserData({ username: "", email: "", password: "", confirmPassword: "" })
                setAddingToRole(null)
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleAddUser}
              disabled={
                !newUserData.username || !newUserData.email || !newUserData.password || !newUserData.confirmPassword
              }
            >
              Create User
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
