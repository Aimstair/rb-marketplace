"use client"

import Navigation from "@/components/navigation"
import { useAuth } from "@/lib/auth-context"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { Bell, Lock, User, Moon, Sun, Monitor, Shield, Trash2, Ban, Camera, LinkIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { FileUpload } from "@/components/file-upload"
import { useTheme } from "next-themes"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { getProfile, updateProfile, changePassword, type UserProfileData } from "@/app/actions/profile"
import { useToast } from "@/components/ui/use-toast"

export default function SettingsPage() {
  const { user } = useAuth()
  const router = useRouter()
  const { toast } = useToast()
  const { update } = useSession()
  const [activeTab, setActiveTab] = useState("account")
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [showPasswordDialog, setShowPasswordDialog] = useState(false)
  const [deleteConfirmText, setDeleteConfirmText] = useState("")

  // Profile data
  const [profileData, setProfileData] = useState<UserProfileData | null>(null)
  const [profileLoading, setProfileLoading] = useState(false)

  // Password change state
  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  })
  const [passwordLoading, setPasswordLoading] = useState(false)
  const [passwordErrors, setPasswordErrors] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  })

  // Account form state
  const [formData, setFormData] = useState({
    bio: "",
    avatar: "",
    banner: "",
    robloxProfile: "",
    discordTag: "",
    socialLinks: {} as Record<string, any>,
  })
  const [saveLoading, setSaveLoading] = useState(false)

  // Settings state
  const [settings, setSettings] = useState({
    // Privacy
    profileVisibility: true,
    showEmail: false,
    showRobloxProfile: true,
    showActivityStatus: true,
    allowMessageRequests: true,
    // Notifications
    newMessages: true,
    listingViews: true,
    priceAlerts: false,
    vouchNotifications: true,
    tradeUpdates: true,
    marketingEmails: false,
  })

  // Blocked users mock data
  const [blockedUsers, setBlockedUsers] = useState([
    { id: 1, username: "SpamUser123", avatar: "/diverse-group-avatars.png", blockedAt: "2 days ago" },
    { id: 2, username: "FakeTrader", avatar: "/pandora-ocean-scene.png", blockedAt: "1 week ago" },
  ])

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!user) {
      router.push("/auth/login")
    } else {
      // Fetch profile data on mount
      loadProfileData()
    }
  }, [user, router])

  const loadProfileData = async () => {
    if (!user) return
    try {
      setProfileLoading(true)
      const result = await getProfile(user.id)
      if (result.success && result.data) {
        setProfileData(result.data)
        // Populate form with profile data
        setFormData({
          bio: result.data.bio || "",
          avatar: result.data.avatar || "",
          banner: result.data.banner || "",
          robloxProfile: result.data.robloxProfile || "",
          discordTag: result.data.discordTag || "",
          socialLinks: result.data.socialLinks || {},
        })
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to load profile",
          variant: "destructive",
        })
      }
    } catch (err) {
      console.error("Failed to load profile:", err)
      toast({
        title: "Error",
        description: "Failed to load profile data",
        variant: "destructive",
      })
    } finally {
      setProfileLoading(false)
    }
  }

  const handleUnblock = (userId: number) => {
    setBlockedUsers((prev) => prev.filter((u) => u.id !== userId))
  }

  const handleDeleteAccount = () => {
    if (deleteConfirmText === "DELETE") {
      // Handle account deletion
      alert("Account deletion requested. This feature is for demonstration only.")
      setShowDeleteDialog(false)
    }
  }

  const handleFormChange = (field: string, value: any) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }))
  }

  const handleSocialLinkChange = (platform: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      socialLinks: {
        ...prev.socialLinks,
        [platform]: value,
      },
    }))
  }

  const handleSaveProfile = async () => {
    try {
      setSaveLoading(true)
      
      console.log("Saving profile with formData:", formData)
      
      const result = await updateProfile({
        bio: formData.bio,
        avatar: formData.avatar,
        banner: formData.banner,
        robloxProfile: formData.robloxProfile,
        discordTag: formData.discordTag,
        socialLinks: formData.socialLinks,
      } as Partial<UserProfileData>)

      console.log("Update profile result:", result)

      if (result.success) {
        toast({
          title: "Success",
          description: "Profile updated successfully!",
        })
        // Reload profile data to reflect changes
        await loadProfileData()
        // Update NextAuth session to refresh profile picture in navigation
        await update()
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to update profile",
          variant: "destructive",
        })
      }
    } catch (err) {
      console.error("Failed to save profile:", err)
      toast({
        title: "Error",
        description: "Failed to save profile",
        variant: "destructive",
      })
    } finally {
      setSaveLoading(false)
    }
  }

  const handleChangePassword = async () => {
    // Reset errors
    setPasswordErrors({
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    })

    let hasError = false
    const newErrors = {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    }

    // Validate all fields are filled
    if (!passwordData.currentPassword) {
      newErrors.currentPassword = "Current password is required"
      hasError = true
    }

    if (!passwordData.newPassword) {
      newErrors.newPassword = "New password is required"
      hasError = true
    } else if (passwordData.newPassword.length < 8) {
      newErrors.newPassword = "Password must be at least 8 characters long"
      hasError = true
    }

    if (!passwordData.confirmPassword) {
      newErrors.confirmPassword = "Please confirm your new password"
      hasError = true
    } else if (passwordData.newPassword !== passwordData.confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match"
      hasError = true
    }

    if (hasError) {
      setPasswordErrors(newErrors)
      return
    }

    try {
      setPasswordLoading(true)
      const result = await changePassword({
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword,
      })

      if (result.success) {
        toast({
          title: "Success",
          description: "Password changed successfully!",
        })
        // Reset form and close dialog
        setPasswordData({
          currentPassword: "",
          newPassword: "",
          confirmPassword: "",
        })
        setPasswordErrors({
          currentPassword: "",
          newPassword: "",
          confirmPassword: "",
        })
        setShowPasswordDialog(false)
      } else {
        // Show error on current password field
        setPasswordErrors({
          currentPassword: result.error || "Failed to change password",
          newPassword: "",
          confirmPassword: "",
        })
      }
    } catch (err) {
      console.error("Failed to change password:", err)
      setPasswordErrors({
        currentPassword: "Failed to change password. Please try again.",
        newPassword: "",
        confirmPassword: "",
      })
    } finally {
      setPasswordLoading(false)
    }
  }

  if (!user) return null

  return (
    <>
      <Navigation />
      <main className="container max-w-[1920px] mx-auto px-6 py-8">
        <h1 className="text-3xl font-bold mb-8">Settings</h1>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {/* Sidebar */}
          <div className="md:col-span-1">
            <div className="space-y-2">
              {[
                { id: "account", label: "Account Settings", icon: User },
                { id: "privacy", label: "Privacy & Safety", icon: Lock },
                { id: "blocked", label: "Blocked Users", icon: Ban },
                { id: "notifications", label: "Notifications", icon: Bell },
                { id: "appearance", label: "Appearance", icon: Moon },
                { id: "security", label: "Security", icon: Shield },
                { id: "danger", label: "Danger Zone", icon: Trash2 },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full px-4 py-2 rounded-lg text-left flex items-center gap-2 transition ${
                    activeTab === tab.id ? "bg-primary text-primary-foreground" : "hover:bg-muted"
                  } ${tab.id === "danger" ? "text-destructive hover:bg-destructive/10" : ""}`}
                >
                  <tab.icon className="w-4 h-4" />
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Content */}
          <div className="md:col-span-3">
            {/* Account Settings */}
            {activeTab === "account" && (
              <Card className="p-6 space-y-6">
                <h2 className="text-2xl font-bold">Account Settings</h2>

                {profileLoading ? (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground">Loading profile data...</p>
                  </div>
                ) : (
                  <>
                    {/* Profile Picture */}
                    <div>
                      <Label className="mb-2 block">Profile Picture</Label>
                      <FileUpload
                        key={`avatar-${formData.avatar}`}
                        endpoint="userAvatar"
                        value={formData.avatar || null}
                        onChange={(url) => handleFormChange("avatar", url || "")}
                      />
                      <p className="text-xs text-muted-foreground mt-1">Upload a profile picture (JPG, PNG, up to 2MB)</p>
                    </div>

                    {/* Profile Banner */}
                    <div>
                      <Label className="mb-2 block">Profile Banner</Label>
                      <FileUpload
                        key={`banner-${formData.banner}`}
                        endpoint="listingImage"
                        value={formData.banner || null}
                        onChange={(url) => handleFormChange("banner", url || "")}
                      />
                      <p className="text-xs text-muted-foreground mt-1">Upload a banner image (JPG, PNG, up to 4MB)</p>
                    </div>

                    <div>
                      <Label className="mb-2 block">Username</Label>
                      <Input type="text" value={user?.username || ""} readOnly className="bg-muted" />
                      <p className="text-xs text-muted-foreground mt-1">You can change your username once every 30 days</p>
                    </div>

                    <div>
                      <Label className="mb-2 block">Email</Label>
                      <Input type="email" value={user?.email || ""} readOnly className="bg-muted" />
                    </div>

                    <div>
                      <Label className="mb-2 block">Bio</Label>
                      <textarea
                        className="w-full px-3 py-2 border rounded-lg bg-background text-foreground min-h-[100px]"
                        placeholder="Tell us about yourself..."
                        value={formData.bio}
                        onChange={(e) => handleFormChange("bio", e.target.value)}
                        maxLength={200}
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        {formData.bio.length}/200 characters
                      </p>
                    </div>

                    {/* Roblox Profile */}
                    <div>
                      <Label className="mb-2 block">Roblox Profile</Label>
                      <Input
                        placeholder="Your Roblox username"
                        value={formData.robloxProfile}
                        onChange={(e) => handleFormChange("robloxProfile", e.target.value)}
                      />
                    </div>

                    {/* Social Links */}
                    <div>
                      <Label className="mb-2 block">Social Links (Optional)</Label>
                      <div className="space-y-3">
                        <div className="flex items-center gap-2">
                          <LinkIcon className="w-4 h-4 text-muted-foreground" />
                          <Input
                            placeholder="Discord username (e.g., username#1234)"
                            value={formData.socialLinks?.discord || ""}
                            onChange={(e) => handleSocialLinkChange("discord", e.target.value)}
                          />
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">Only shown if you enable it in privacy settings</p>
                    </div>

                    <Button
                      onClick={handleSaveProfile}
                      disabled={saveLoading}
                      className="w-full"
                    >
                      {saveLoading ? "Saving..." : "Save Changes"}
                    </Button>
                  </>
                )}
              </Card>
            )}

            {/* Privacy & Safety */}
            {activeTab === "privacy" && (
              <Card className="p-6 space-y-6">
                <h2 className="text-2xl font-bold">Privacy & Safety</h2>
                <p className="text-muted-foreground">Control who can see your information and interact with you</p>

                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <p className="font-semibold">Profile Visibility</p>
                      <p className="text-sm text-muted-foreground">Make your profile visible to others</p>
                    </div>
                    <Switch
                      checked={settings.profileVisibility}
                      onCheckedChange={(checked) => setSettings({ ...settings, profileVisibility: checked })}
                    />
                  </div>

                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <p className="font-semibold">Show Email</p>
                      <p className="text-sm text-muted-foreground">Display email on your profile</p>
                    </div>
                    <Switch
                      checked={settings.showEmail}
                      onCheckedChange={(checked) => setSettings({ ...settings, showEmail: checked })}
                    />
                  </div>

                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <p className="font-semibold">Show Roblox Profile</p>
                      <p className="text-sm text-muted-foreground">Display your Roblox profile link</p>
                    </div>
                    <Switch
                      checked={settings.showRobloxProfile}
                      onCheckedChange={(checked) => setSettings({ ...settings, showRobloxProfile: checked })}
                    />
                  </div>

                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <p className="font-semibold flex items-center gap-2">
                        Activity Status
                        {settings.showActivityStatus && (
                          <Badge variant="secondary" className="text-xs">
                            <span className="w-2 h-2 bg-green-500 rounded-full mr-1" />
                            Online
                          </Badge>
                        )}
                      </p>
                      <p className="text-sm text-muted-foreground">Show when you're active on the platform</p>
                    </div>
                    <Switch
                      checked={settings.showActivityStatus}
                      onCheckedChange={(checked) => setSettings({ ...settings, showActivityStatus: checked })}
                    />
                  </div>

                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <p className="font-semibold">Allow Message Requests</p>
                      <p className="text-sm text-muted-foreground">Let anyone send you messages</p>
                    </div>
                    <Switch
                      checked={settings.allowMessageRequests}
                      onCheckedChange={(checked) => setSettings({ ...settings, allowMessageRequests: checked })}
                    />
                  </div>
                </div>

                <Button>Save Changes</Button>
              </Card>
            )}

            {/* Blocked Users */}
            {activeTab === "blocked" && (
              <Card className="p-6 space-y-6">
                <h2 className="text-2xl font-bold">Blocked Users</h2>
                <p className="text-muted-foreground">
                  Blocked users cannot message you, see your listings, or interact with your profile
                </p>

                {blockedUsers.length === 0 ? (
                  <div className="text-center py-12">
                    <Ban className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">You haven't blocked anyone yet</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {blockedUsers.map((blockedUser) => (
                      <div key={blockedUser.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex items-center gap-3">
                          <img
                            src={blockedUser.avatar || "/placeholder.svg"}
                            alt={blockedUser.username}
                            className="w-10 h-10 rounded-full"
                          />
                          <div>
                            <p className="font-semibold">{blockedUser.username}</p>
                            <p className="text-xs text-muted-foreground">Blocked {blockedUser.blockedAt}</p>
                          </div>
                        </div>
                        <Button variant="outline" size="sm" onClick={() => handleUnblock(blockedUser.id)}>
                          Unblock
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            )}

            {/* Notifications */}
            {activeTab === "notifications" && (
              <Card className="p-6 space-y-6">
                <h2 className="text-2xl font-bold">Notifications</h2>
                <p className="text-muted-foreground">Choose what notifications you want to receive</p>

                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <p className="font-semibold">New Messages</p>
                      <p className="text-sm text-muted-foreground">Get notified when you receive messages</p>
                    </div>
                    <Switch
                      checked={settings.newMessages}
                      onCheckedChange={(checked) => setSettings({ ...settings, newMessages: checked })}
                    />
                  </div>

                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <p className="font-semibold">Listing Views</p>
                      <p className="text-sm text-muted-foreground">Get notified of new views on your listings</p>
                    </div>
                    <Switch
                      checked={settings.listingViews}
                      onCheckedChange={(checked) => setSettings({ ...settings, listingViews: checked })}
                    />
                  </div>

                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <p className="font-semibold">Vouch Notifications</p>
                      <p className="text-sm text-muted-foreground">Get notified when someone vouches for you</p>
                    </div>
                    <Switch
                      checked={settings.vouchNotifications}
                      onCheckedChange={(checked) => setSettings({ ...settings, vouchNotifications: checked })}
                    />
                  </div>

                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <p className="font-semibold">Trade Updates</p>
                      <p className="text-sm text-muted-foreground">Get notified about trade status changes</p>
                    </div>
                    <Switch
                      checked={settings.tradeUpdates}
                      onCheckedChange={(checked) => setSettings({ ...settings, tradeUpdates: checked })}
                    />
                  </div>

                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <p className="font-semibold">Price Alerts</p>
                      <p className="text-sm text-muted-foreground">Get alerts when items you want go on sale</p>
                    </div>
                    <Switch
                      checked={settings.priceAlerts}
                      onCheckedChange={(checked) => setSettings({ ...settings, priceAlerts: checked })}
                    />
                  </div>

                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <p className="font-semibold">Marketing Emails</p>
                      <p className="text-sm text-muted-foreground">Receive updates about new features and promotions</p>
                    </div>
                    <Switch
                      checked={settings.marketingEmails}
                      onCheckedChange={(checked) => setSettings({ ...settings, marketingEmails: checked })}
                    />
                  </div>
                </div>

                <Button>Save Changes</Button>
              </Card>
            )}

            {/* Appearance */}
            {activeTab === "appearance" && (
              <Card className="p-6 space-y-6">
                <h2 className="text-2xl font-bold">Appearance</h2>
                <p className="text-muted-foreground">Customize how RobloxTrade looks on your device</p>

                <div className="space-y-4">
                  <h3 className="font-semibold">Theme</h3>
                  <div className="grid grid-cols-3 gap-4">
                    <button
                      onClick={() => setTheme("light")}
                      className={`p-4 border rounded-lg flex flex-col items-center gap-2 transition ${
                        mounted && theme === "light" ? "border-primary bg-primary/10" : "hover:border-primary/50"
                      }`}
                    >
                      <div className="w-12 h-12 rounded-full bg-white border flex items-center justify-center">
                        <Sun className="w-6 h-6 text-yellow-500" />
                      </div>
                      <span className="font-medium">Light</span>
                      {mounted && theme === "light" && <span className="text-xs text-primary">Active</span>}
                    </button>

                    <button
                      onClick={() => setTheme("dark")}
                      className={`p-4 border rounded-lg flex flex-col items-center gap-2 transition ${
                        mounted && theme === "dark" ? "border-primary bg-primary/10" : "hover:border-primary/50"
                      }`}
                    >
                      <div className="w-12 h-12 rounded-full bg-gray-900 border flex items-center justify-center">
                        <Moon className="w-6 h-6 text-blue-400" />
                      </div>
                      <span className="font-medium">Dark</span>
                      {mounted && theme === "dark" && <span className="text-xs text-primary">Active</span>}
                    </button>

                    <button
                      onClick={() => setTheme("system")}
                      className={`p-4 border rounded-lg flex flex-col items-center gap-2 transition ${
                        mounted && theme === "system" ? "border-primary bg-primary/10" : "hover:border-primary/50"
                      }`}
                    >
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-white to-gray-900 border flex items-center justify-center">
                        <Monitor className="w-6 h-6 text-gray-500" />
                      </div>
                      <span className="font-medium">System</span>
                      {mounted && theme === "system" && <span className="text-xs text-primary">Active</span>}
                    </button>
                  </div>

                  <p className="text-sm text-muted-foreground mt-4">
                    {mounted && theme === "system"
                      ? "Theme will automatically match your system preferences."
                      : mounted && theme === "dark"
                        ? "Dark mode is easier on the eyes in low-light environments."
                        : "Light mode provides better visibility in bright environments."}
                  </p>
                </div>
              </Card>
            )}

            {/* Security */}
            {activeTab === "security" && (
              <Card className="p-6 space-y-6">
                <h2 className="text-2xl font-bold">Security</h2>
                <p className="text-muted-foreground">Manage your account security settings</p>

                <div className="space-y-4">
                  <div className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <p className="font-semibold">Password</p>
                        <p className="text-sm text-muted-foreground">Last changed 30 days ago</p>
                      </div>
                      <Button variant="outline" onClick={() => setShowPasswordDialog(true)}>
                        Change Password
                      </Button>
                    </div>
                  </div>

                  <div className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <p className="font-semibold">Two-Factor Authentication</p>
                        <p className="text-sm text-muted-foreground">Add an extra layer of security</p>
                      </div>
                      <Button variant="outline">Enable 2FA</Button>
                    </div>
                  </div>

                  <div className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <p className="font-semibold">Active Sessions</p>
                        <p className="text-sm text-muted-foreground">Manage your logged-in devices</p>
                      </div>
                      <Button variant="outline">View Sessions</Button>
                    </div>
                  </div>
                </div>
              </Card>
            )}

            {/* Danger Zone */}
            {activeTab === "danger" && (
              <Card className="p-6 space-y-6 border-destructive">
                <h2 className="text-2xl font-bold text-destructive">Danger Zone</h2>
                <p className="text-muted-foreground">These actions are irreversible. Please proceed with caution.</p>

                <div className="space-y-4">
                  <div className="p-4 border border-destructive/50 rounded-lg bg-destructive/5">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold">Delete Account</p>
                        <p className="text-sm text-muted-foreground">
                          Permanently delete your account and all associated data
                        </p>
                      </div>
                      <Button variant="destructive" onClick={() => setShowDeleteDialog(true)}>
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete Account
                      </Button>
                    </div>
                  </div>
                </div>
              </Card>
            )}
          </div>
        </div>
      </main>

      {/* Change Password Dialog */}
      <Dialog open={showPasswordDialog} onOpenChange={setShowPasswordDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change Password</DialogTitle>
            <DialogDescription>Enter your current password and a new password</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Current Password</Label>
              <Input
                type="password"
                className={`mt-1 ${passwordErrors.currentPassword ? "border-red-500 focus-visible:ring-red-500" : ""}`}
                value={passwordData.currentPassword}
                onChange={(e) => {
                  setPasswordData({ ...passwordData, currentPassword: e.target.value })
                  if (passwordErrors.currentPassword) {
                    setPasswordErrors({ ...passwordErrors, currentPassword: "" })
                  }
                }}
              />
              {passwordErrors.currentPassword && (
                <p className="text-sm text-red-500 mt-1">{passwordErrors.currentPassword}</p>
              )}
            </div>
            <div>
              <Label>New Password</Label>
              <Input
                type="password"
                className={`mt-1 ${passwordErrors.newPassword ? "border-red-500 focus-visible:ring-red-500" : ""}`}
                placeholder="At least 8 characters"
                value={passwordData.newPassword}
                onChange={(e) => {
                  setPasswordData({ ...passwordData, newPassword: e.target.value })
                  if (passwordErrors.newPassword) {
                    setPasswordErrors({ ...passwordErrors, newPassword: "" })
                  }
                }}
              />
              {passwordErrors.newPassword && (
                <p className="text-sm text-red-500 mt-1">{passwordErrors.newPassword}</p>
              )}
            </div>
            <div>
              <Label>Confirm New Password</Label>
              <Input
                type="password"
                className={`mt-1 ${passwordErrors.confirmPassword ? "border-red-500 focus-visible:ring-red-500" : ""}`}
                value={passwordData.confirmPassword}
                onChange={(e) => {
                  setPasswordData({ ...passwordData, confirmPassword: e.target.value })
                  if (passwordErrors.confirmPassword) {
                    setPasswordErrors({ ...passwordErrors, confirmPassword: "" })
                  }
                }}
              />
              {passwordErrors.confirmPassword && (
                <p className="text-sm text-red-500 mt-1">{passwordErrors.confirmPassword}</p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPasswordDialog(false)} disabled={passwordLoading}>
              Cancel
            </Button>
            <Button onClick={handleChangePassword} disabled={passwordLoading}>
              {passwordLoading ? "Updating..." : "Update Password"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Account Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete your account and remove all your data from our
              servers including:
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>All your listings</li>
                <li>Your transaction history</li>
                <li>Your vouches and reputation</li>
                <li>Your messages and contacts</li>
              </ul>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <Label>Type DELETE to confirm</Label>
            <Input
              className="mt-2"
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
              placeholder="DELETE"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeleteConfirmText("")}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteConfirmText !== "DELETE"}
              onClick={handleDeleteAccount}
            >
              Delete Account
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
