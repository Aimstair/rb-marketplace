"use client"

import type React from "react"
import { useAuth } from "@/lib/auth-context"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { Bell, Lock, User, Moon, Sun, Monitor, Shield, Trash2, Ban, Camera, LinkIcon, HelpCircle, Send } from "lucide-react"
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
import { getProfile, updateProfile, changePassword, getUserPreferences, updateUserPreferences, type UserProfileData } from "@/app/actions/profile"
import { createSupportTicket, getMyTickets, getTicketMessages, addTicketReply } from "@/app/actions/admin"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/components/ui/use-toast"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Skeleton } from "@/components/ui/skeleton"
import { FormPageSkeleton } from "@/components/site/skeletons"
import { Container } from "@/components/site/container"
import { cn } from "@/lib/utils"

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
  const [settingsLoading, setSettingsLoading] = useState(false)

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

  // Blocking isn't stored server-side yet, so there is no real list to show. The mock entries
  // that used to be here were displayed to every user; the section stays hidden until blocking exists.
  const [blockedUsers, setBlockedUsers] = useState<{ id: number; username: string; avatar: string; blockedAt: string }[]>([])

  // Support ticket state
  const [supportTickets, setSupportTickets] = useState<any[]>([])
  const [ticketSubject, setTicketSubject] = useState("")
  const [ticketMessage, setTicketMessage] = useState("")
  const [ticketCategory, setTicketCategory] = useState("GENERAL")
  const [ticketLoading, setTicketLoading] = useState(false)
  const [loadingTickets, setLoadingTickets] = useState(false)
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null)
  const [ticketReply, setTicketReply] = useState("")
  const [replyLoading, setReplyLoading] = useState(false)
  const [ticketMessages, setTicketMessages] = useState<any[]>([])
  const [messagesLoading, setMessagesLoading] = useState(false)
  const [ticketStatusFilter, setTicketStatusFilter] = useState("all")

  useEffect(() => {
    setMounted(true)
  }, [])

  // Load profile and preferences once per user, not on every tab switch
  useEffect(() => {
    if (!user) {
      router.push("/auth/login")
      return
    }
    loadProfileData()
    loadUserPreferences()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id])

  // Tickets are only needed on the support tab; fetch them when it is first opened
  const [ticketsLoaded, setTicketsLoaded] = useState(false)
  useEffect(() => {
    if (user && activeTab === "support" && !ticketsLoaded) {
      setTicketsLoaded(true)
      loadSupportTickets()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, activeTab, ticketsLoaded])

  useEffect(() => {
    if (selectedTicketId) {
      loadTicketMessages(selectedTicketId)
    }
  }, [selectedTicketId])

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

  const loadUserPreferences = async () => {
    try {
      setSettingsLoading(true)
      const result = await getUserPreferences()
      if (result.success && result.preferences) {
        setSettings({
          profileVisibility: result.preferences.profileVisibility ?? true,
          showEmail: result.preferences.showEmail ?? false,
          showRobloxProfile: result.preferences.showRobloxProfile ?? true,
          showActivityStatus: result.preferences.showActivityStatus ?? true,
          allowMessageRequests: result.preferences.allowMessageRequests ?? true,
          newMessages: result.preferences.notifyNewMessages ?? true,
          listingViews: result.preferences.notifyListingViews ?? true,
          priceAlerts: result.preferences.notifyPriceAlerts ?? false,
          vouchNotifications: result.preferences.notifyVouches ?? true,
          tradeUpdates: result.preferences.notifyTradeUpdates ?? true,
          marketingEmails: result.preferences.notifyMarketingEmails ?? false,
        })
      }
    } catch (err) {
      console.error("Failed to load preferences:", err)
    } finally {
      setSettingsLoading(false)
    }
  }

  const handleUnblock = (userId: number) => {
    setBlockedUsers((prev) => prev.filter((u) => u.id !== userId))
  }

  const handleSavePrivacySettings = async () => {
    try {
      setSaveLoading(true)
      const result = await updateUserPreferences({
        profileVisibility: settings.profileVisibility,
        showEmail: settings.showEmail,
        showRobloxProfile: settings.showRobloxProfile,
        showActivityStatus: settings.showActivityStatus,
        allowMessageRequests: settings.allowMessageRequests,
      })

      if (result.success) {
        toast({
          title: "✅ Settings Saved",
          description: "Privacy settings have been updated successfully.",
        })
      } else {
        toast({
          title: "❌ Failed to Save",
          description: result.error || "Failed to save settings",
          variant: "destructive",
        })
      }
    } catch (err) {
      console.error("Failed to save privacy settings:", err)
      toast({
        title: "❌ Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      })
    } finally {
      setSaveLoading(false)
    }
  }

  const handleSaveNotificationSettings = async () => {
    try {
      setSaveLoading(true)
      const result = await updateUserPreferences({
        notifyNewMessages: settings.newMessages,
        notifyListingViews: settings.listingViews,
        notifyPriceAlerts: settings.priceAlerts,
        notifyVouches: settings.vouchNotifications,
        notifyTradeUpdates: settings.tradeUpdates,
        notifyMarketingEmails: settings.marketingEmails,
      })

      if (result.success) {
        toast({
          title: "✅ Settings Saved",
          description: "Notification settings have been updated successfully.",
        })
      } else {
        toast({
          title: "❌ Failed to Save",
          description: result.error || "Failed to save settings",
          variant: "destructive",
        })
      }
    } catch (err) {
      console.error("Failed to save notification settings:", err)
      toast({
        title: "❌ Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      })
    } finally {
      setSaveLoading(false)
    }
  }

  const loadSupportTickets = async () => {
    if (!user) return
    setLoadingTickets(true)
    try {
      const result = await getMyTickets(user.id)
      if (result.success && result.data) {
        setSupportTickets(result.data)
      }
    } catch (error) {
      console.error("Failed to load tickets:", error)
    } finally {
      setLoadingTickets(false)
    }
  }

  const handleSubmitTicket = async () => {
    console.log("Submit ticket clicked", { ticketSubject, ticketMessage, ticketCategory })
    
    if (!ticketSubject.trim() || !ticketMessage.trim()) {
      toast({
        title: "Error",
        description: "Please fill in both subject and message fields",
        variant: "destructive",
      })
      return
    }

    if (!user?.id) {
      toast({
        title: "Error",
        description: "User session not found. Please refresh and try again.",
        variant: "destructive",
      })
      return
    }

    setTicketLoading(true)
    try {
      console.log("Creating support ticket...")
      const result = await createSupportTicket({
        userId: user.id,
        subject: ticketSubject,
        message: ticketMessage,
        category: ticketCategory,
      })

      console.log("Support ticket result:", result)

      if (result.success) {
        toast({
          title: "✅ Ticket Submitted!",
          description: "Your support ticket has been submitted successfully. We'll get back to you soon.",
        })
        setTicketSubject("")
        setTicketMessage("")
        setTicketCategory("GENERAL")
        await loadSupportTickets()
      } else {
        toast({
          title: "❌ Submission Failed",
          description: result.error || "Failed to submit support ticket. Please try again.",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error submitting ticket:", error)
      toast({
        title: "❌ Error",
        description: error instanceof Error ? error.message : "An unexpected error occurred. Please try again.",
        variant: "destructive",
      })
    } finally {
      setTicketLoading(false)
    }
  }

  const loadTicketMessages = async (ticketId: string) => {
    setMessagesLoading(true)
    try {
      const result = await getTicketMessages(ticketId)
      if (result.success && result.data) {
        setTicketMessages(result.data)
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to load messages",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Failed to load messages:", error)
      toast({
        title: "Error",
        description: "Failed to load messages",
        variant: "destructive",
      })
    } finally {
      setMessagesLoading(false)
    }
  }

  const handleSendReply = async () => {
    if (!ticketReply.trim() || !selectedTicketId || !user?.id) {
      return
    }

    setReplyLoading(true)
    try {
      const result = await addTicketReply(
        selectedTicketId,
        user.id,
        ticketReply,
        false // isAdmin = false
      )

      if (result.success) {
        toast({
          title: "✅ Reply Sent!",
          description: "Your reply has been sent successfully.",
        })
        setTicketReply("")
        // Reload messages to show the new reply
        await loadTicketMessages(selectedTicketId)
        // Also reload tickets to update the updatedAt timestamp
        await loadSupportTickets()
      } else {
        toast({
          title: "❌ Failed to Send Reply",
          description: result.error || "Failed to send reply. Please try again.",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error sending reply:", error)
      toast({
        title: "❌ Error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      })
    } finally {
      setReplyLoading(false)
    }
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

  // Session still loading (or redirecting to login): keep the page shape instead of a blank gap
  if (!user) return <FormPageSkeleton />

  const navItems = [
    { id: "account", label: "Account", icon: User },
    { id: "privacy", label: "Privacy", icon: Lock },
    { id: "notifications", label: "Notifications", icon: Bell },
    { id: "security", label: "Security", icon: Shield },
    { id: "support", label: "Help & support", icon: HelpCircle },
    { id: "danger", label: "Delete account", icon: Trash2 },
  ]

  const ticketBadge = (status: string) =>
    status === "CLOSED" ? "success" : status === "OPEN" ? "default" : "warning"
  const ticketLabel = (status: string) =>
    ({ OPEN: "Open", IN_PROGRESS: "In progress", PENDING: "Waiting on you", CLOSED: "Resolved" })[status] || status

  return (
    <>
      <main className="min-h-screen bg-background">
        <Container className="pt-10 pb-16 md:pt-14 md:pb-20">
          <h1 className="text-title">Settings</h1>

          <div className="mt-8 grid gap-8 md:grid-cols-[220px_minmax(0,1fr)] md:gap-12">
            {/* Section nav: list on desktop, chips on mobile */}
            <nav aria-label="Settings sections">
              <div className="no-scrollbar -mx-5 flex gap-2 overflow-x-auto px-5 md:mx-0 md:flex-col md:gap-0.5 md:px-0">
                {navItems.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setActiveTab(item.id)}
                    aria-current={activeTab === item.id ? "page" : undefined}
                    className={cn(
                      "flex shrink-0 items-center gap-3 rounded-full px-4 py-2 text-[15px] transition-colors md:rounded-lg md:px-3",
                      activeTab === item.id
                        ? "bg-secondary text-foreground"
                        : "text-muted-foreground hover:bg-white/[0.04] hover:text-foreground",
                      item.id === "danger" && "md:mt-4 text-destructive hover:text-destructive",
                    )}
                  >
                    <item.icon className="hidden size-4 md:block" strokeWidth={1.75} />
                    {item.label}
                  </button>
                ))}
              </div>
            </nav>

            <div className="min-w-0 max-w-2xl space-y-8">
              {/* Account */}
              {activeTab === "account" &&
                (profileLoading ? (
                  <div className="space-y-8" aria-hidden="true">
                    <Skeleton className="h-64 w-full rounded-[20px]" />
                    <Skeleton className="h-32 w-full rounded-[20px]" />
                  </div>
                ) : (
                  <>
                    <SettingsGroup title="Profile" footer="Your Discord is only shown if you allow it under Privacy.">
                      <FieldRow label="Profile picture" hint="JPG or PNG, up to 2 MB.">
                        <FileUpload
                          key={`avatar-${formData.avatar}`}
                          endpoint="userAvatar"
                          value={formData.avatar || null}
                          onChange={(url) => handleFormChange("avatar", url || "")}
                        />
                      </FieldRow>
                      <FieldRow label="Profile banner" hint="JPG or PNG, up to 4 MB.">
                        <FileUpload
                          key={`banner-${formData.banner}`}
                          endpoint="listingImage"
                          value={formData.banner || null}
                          onChange={(url) => handleFormChange("banner", url || "")}
                        />
                      </FieldRow>
                      <FieldRow label="Bio" htmlFor="settings-bio" hint={`${formData.bio.length}/200`}>
                        <Textarea
                          id="settings-bio"
                          placeholder="What do you trade? When are you online?"
                          value={formData.bio}
                          onChange={(e) => handleFormChange("bio", e.target.value)}
                          maxLength={200}
                          rows={3}
                        />
                      </FieldRow>
                      <FieldRow label="Roblox username" htmlFor="settings-roblox">
                        <Input
                          id="settings-roblox"
                          placeholder="Your Roblox username"
                          value={formData.robloxProfile}
                          onChange={(e) => handleFormChange("robloxProfile", e.target.value)}
                        />
                      </FieldRow>
                      <FieldRow label="Discord" htmlFor="settings-discord">
                        <Input
                          id="settings-discord"
                          placeholder="Discord username"
                          value={formData.socialLinks?.discord || ""}
                          onChange={(e) => handleSocialLinkChange("discord", e.target.value)}
                        />
                      </FieldRow>
                    </SettingsGroup>

                    <SettingsGroup title="Account">
                      <SettingsRow title="Username">
                        <span className="text-[15px] text-muted-foreground">{user?.username}</span>
                      </SettingsRow>
                      <SettingsRow title="Email">
                        <span className="truncate text-[15px] text-muted-foreground">{user?.email}</span>
                      </SettingsRow>
                    </SettingsGroup>

                    <div className="flex justify-end">
                      <Button onClick={handleSaveProfile} disabled={saveLoading}>
                        {saveLoading ? "Saving…" : "Save changes"}
                      </Button>
                    </div>
                  </>
                ))}

              {/* Privacy */}
              {activeTab === "privacy" && (
                <>
                  <SettingsGroup title="Your profile">
                    <ToggleRow
                      id="privacy-visible"
                      title="Public profile"
                      description="Anyone can see your profile and listings."
                      checked={settings.profileVisibility}
                      onChange={(checked) => setSettings({ ...settings, profileVisibility: checked })}
                    />
                    <ToggleRow
                      id="privacy-email"
                      title="Show email"
                      description="Display your email address on your profile."
                      checked={settings.showEmail}
                      onChange={(checked) => setSettings({ ...settings, showEmail: checked })}
                    />
                    <ToggleRow
                      id="privacy-roblox"
                      title="Show Roblox profile"
                      description="Link your Roblox account on your profile."
                      checked={settings.showRobloxProfile}
                      onChange={(checked) => setSettings({ ...settings, showRobloxProfile: checked })}
                    />
                  </SettingsGroup>

                  <SettingsGroup title="Activity and messages">
                    <ToggleRow
                      id="privacy-activity"
                      title="Show when you're online"
                      description="Buyers see a green dot when you're active."
                      checked={settings.showActivityStatus}
                      onChange={(checked) => setSettings({ ...settings, showActivityStatus: checked })}
                    />
                    <ToggleRow
                      id="privacy-messages"
                      title="Message requests"
                      description="Let anyone start a conversation with you."
                      checked={settings.allowMessageRequests}
                      onChange={(checked) => setSettings({ ...settings, allowMessageRequests: checked })}
                    />
                  </SettingsGroup>

                  <div className="flex justify-end">
                    <Button onClick={handleSavePrivacySettings} disabled={saveLoading || settingsLoading}>
                      {saveLoading ? "Saving…" : "Save changes"}
                    </Button>
                  </div>
                </>
              )}

              {/* Notifications */}
              {activeTab === "notifications" && (
                <>
                  <SettingsGroup title="Trading">
                    <ToggleRow
                      id="notify-messages"
                      title="New messages"
                      description="When a buyer or seller messages you."
                      checked={settings.newMessages}
                      onChange={(checked) => setSettings({ ...settings, newMessages: checked })}
                    />
                    <ToggleRow
                      id="notify-trades"
                      title="Trade updates"
                      description="When a trade's status changes."
                      checked={settings.tradeUpdates}
                      onChange={(checked) => setSettings({ ...settings, tradeUpdates: checked })}
                    />
                    <ToggleRow
                      id="notify-vouches"
                      title="Vouches"
                      description="When someone vouches for you."
                      checked={settings.vouchNotifications}
                      onChange={(checked) => setSettings({ ...settings, vouchNotifications: checked })}
                    />
                    <ToggleRow
                      id="notify-views"
                      title="Listing views"
                      description="When people view your listings."
                      checked={settings.listingViews}
                      onChange={(checked) => setSettings({ ...settings, listingViews: checked })}
                    />
                  </SettingsGroup>

                  <SettingsGroup title="Deals and news">
                    <ToggleRow
                      id="notify-prices"
                      title="Price alerts"
                      description="When items you're watching drop in price."
                      checked={settings.priceAlerts}
                      onChange={(checked) => setSettings({ ...settings, priceAlerts: checked })}
                    />
                    <ToggleRow
                      id="notify-marketing"
                      title="RbMarket news"
                      description="New features, giveaways and the weekly market digest by email."
                      checked={settings.marketingEmails}
                      onChange={(checked) => setSettings({ ...settings, marketingEmails: checked })}
                    />
                  </SettingsGroup>

                  <div className="flex justify-end">
                    <Button onClick={handleSaveNotificationSettings} disabled={saveLoading || settingsLoading}>
                      {saveLoading ? "Saving…" : "Save changes"}
                    </Button>
                  </div>
                </>
              )}

              {/* Security */}
              {activeTab === "security" && (
                <SettingsGroup title="Sign-in and security">
                  <SettingsRow title="Password" description="Change the password you use to log in.">
                    <Button variant="secondary" size="sm" onClick={() => setShowPasswordDialog(true)}>
                      Change
                    </Button>
                  </SettingsRow>
                  <SettingsRow title="Two-factor authentication" description="Add a code from your phone when you log in.">
                    <Badge variant="secondary">Coming soon</Badge>
                  </SettingsRow>
                  <SettingsRow title="Active sessions" description="See and sign out devices that are logged in.">
                    <Badge variant="secondary">Coming soon</Badge>
                  </SettingsRow>
                </SettingsGroup>
              )}

              {/* Support */}
              {activeTab === "support" && (
                <>
                  {selectedTicketId ? (
                    (() => {
                      const ticket = supportTickets.find((t) => t.id === selectedTicketId)
                      if (!ticket) return null
                      return (
                        <div className="space-y-5">
                          <button
                            type="button"
                            onClick={() => setSelectedTicketId(null)}
                            className="text-[15px] text-link hover:underline underline-offset-2"
                          >
                            ‹ All tickets
                          </button>
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div>
                              <h2 className="text-[22px] font-semibold tracking-[-0.02em]">{ticket.subject}</h2>
                              <p className="text-[13px] text-muted-foreground">
                                Opened {new Date(ticket.createdAt).toLocaleString()}
                              </p>
                            </div>
                            <Badge variant={ticketBadge(ticket.status)}>{ticketLabel(ticket.status)}</Badge>
                          </div>

                          <div className="rounded-[20px] bg-card p-4">
                            <ScrollArea className="h-[420px] pr-2">
                              <div className="space-y-3">
                                <div className="flex justify-end">
                                  <div className="max-w-[85%] rounded-[20px] rounded-br-md bg-primary px-4 py-2.5 text-white">
                                    <p className="whitespace-pre-wrap text-[15px]">{ticket.message}</p>
                                    <p className="mt-1 text-[11px] text-white/70">
                                      {new Date(ticket.createdAt).toLocaleString()}
                                    </p>
                                  </div>
                                </div>
                                {messagesLoading ? (
                                  <div className="space-y-2 py-2" aria-hidden="true">
                                    <Skeleton className="h-10 w-2/3 rounded-[20px]" />
                                    <Skeleton className="ml-auto h-10 w-1/2 rounded-[20px]" />
                                  </div>
                                ) : (
                                  ticketMessages.map((msg) => (
                                    <div key={msg.id} className={cn("flex", msg.isAdmin ? "justify-start" : "justify-end")}>
                                      <div
                                        className={cn(
                                          "max-w-[85%] rounded-[20px] px-4 py-2.5",
                                          msg.isAdmin ? "rounded-bl-md bg-secondary" : "rounded-br-md bg-primary text-white",
                                        )}
                                      >
                                        {msg.isAdmin && <p className="mb-0.5 text-[13px] font-semibold">Support team</p>}
                                        <p className="whitespace-pre-wrap text-[15px]">{msg.message}</p>
                                        <p className={cn("mt-1 text-[11px]", msg.isAdmin ? "text-muted-foreground" : "text-white/70")}>
                                          {new Date(msg.createdAt).toLocaleString()}
                                        </p>
                                      </div>
                                    </div>
                                  ))
                                )}
                              </div>
                            </ScrollArea>
                          </div>

                          {ticket.status !== "CLOSED" ? (
                            <div className="space-y-3">
                              <Textarea
                                aria-label="Reply to support"
                                placeholder="Write a reply…"
                                value={ticketReply}
                                onChange={(e) => setTicketReply(e.target.value)}
                                disabled={replyLoading}
                                rows={3}
                              />
                              <div className="flex items-center justify-between gap-3">
                                <p className="text-[13px] text-muted-foreground">The support team is notified when you reply.</p>
                                <Button size="sm" onClick={handleSendReply} disabled={replyLoading || !ticketReply.trim()}>
                                  {replyLoading ? "Sending…" : "Send reply"}
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <p className="rounded-[20px] bg-success/10 px-5 py-4 text-[15px] text-success">
                              This ticket is resolved. Open a new one if you still need help.
                            </p>
                          )}
                        </div>
                      )
                    })()
                  ) : (
                    <>
                      <SettingsGroup title="Contact support" footer="We usually reply within a day.">
                        <FieldRow label="Subject" htmlFor="ticket-subject">
                          <Input
                            id="ticket-subject"
                            placeholder="What do you need help with?"
                            value={ticketSubject}
                            onChange={(e) => setTicketSubject(e.target.value)}
                            disabled={ticketLoading}
                          />
                        </FieldRow>
                        <FieldRow label="Topic">
                          <Select value={ticketCategory} onValueChange={setTicketCategory} disabled={ticketLoading}>
                            <SelectTrigger className="w-full">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="GENERAL">General</SelectItem>
                              <SelectItem value="TECHNICAL">Something isn't working</SelectItem>
                              <SelectItem value="ACCOUNT">My account</SelectItem>
                              <SelectItem value="PAYMENT">Payments and billing</SelectItem>
                              <SelectItem value="REPORT">Report a user or listing</SelectItem>
                              <SelectItem value="OTHER">Other</SelectItem>
                            </SelectContent>
                          </Select>
                        </FieldRow>
                        <FieldRow label="Message" htmlFor="ticket-message">
                          <Textarea
                            id="ticket-message"
                            placeholder="Describe what happened, with usernames or listing links if you have them."
                            value={ticketMessage}
                            onChange={(e) => setTicketMessage(e.target.value)}
                            disabled={ticketLoading}
                            rows={5}
                          />
                        </FieldRow>
                      </SettingsGroup>
                      <div className="flex justify-end">
                        <Button onClick={handleSubmitTicket} disabled={ticketLoading}>
                          <Send strokeWidth={1.75} />
                          {ticketLoading ? "Sending…" : "Send ticket"}
                        </Button>
                      </div>

                      <section>
                        <div className="mb-2 flex items-center justify-between gap-3 px-1">
                          <h2 className="text-[13px] font-semibold uppercase tracking-wide text-muted-foreground">
                            Your tickets
                          </h2>
                          <Select value={ticketStatusFilter} onValueChange={setTicketStatusFilter}>
                            <SelectTrigger className="h-8 w-[150px] text-[13px]">
                              <SelectValue placeholder="Filter by status" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">All tickets</SelectItem>
                              <SelectItem value="OPEN">Open</SelectItem>
                              <SelectItem value="IN_PROGRESS">In progress</SelectItem>
                              <SelectItem value="PENDING">Waiting on you</SelectItem>
                              <SelectItem value="CLOSED">Resolved</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        {loadingTickets ? (
                          <div className="space-y-2" aria-hidden="true">
                            {[1, 2, 3].map((i) => (
                              <Skeleton key={i} className="h-16 w-full rounded-[20px]" />
                            ))}
                          </div>
                        ) : (() => {
                            const visible = supportTickets.filter(
                              (t) => ticketStatusFilter === "all" || t.status === ticketStatusFilter,
                            )
                            if (visible.length === 0) {
                              return (
                                <p className="rounded-[20px] bg-card px-5 py-8 text-center text-[15px] text-muted-foreground">
                                  {supportTickets.length === 0 ? "You haven't opened any tickets." : "No tickets with this status."}
                                </p>
                              )
                            }
                            return (
                              <ul className="divide-y divide-white/[0.06] overflow-hidden rounded-[20px] bg-card">
                                {visible.map((ticket) => (
                                  <li key={ticket.id}>
                                    <button
                                      type="button"
                                      onClick={() => setSelectedTicketId(ticket.id)}
                                      className="flex w-full items-center gap-4 px-5 py-4 text-left transition-colors hover:bg-white/[0.03]"
                                    >
                                      <span className="min-w-0 flex-1">
                                        <span className="block truncate text-[15px] font-medium">{ticket.subject}</span>
                                        <span className="block truncate text-[13px] text-muted-foreground">
                                          {new Date(ticket.createdAt).toLocaleDateString()} · {ticket.message}
                                        </span>
                                      </span>
                                      <Badge variant={ticketBadge(ticket.status)}>{ticketLabel(ticket.status)}</Badge>
                                    </button>
                                  </li>
                                ))}
                              </ul>
                            )
                          })()}
                      </section>
                    </>
                  )}
                </>
              )}

              {/* Delete account */}
              {activeTab === "danger" && (
                <SettingsGroup
                  title="Delete account"
                  footer="Deleting removes your profile, listings and messages. Some trade and report records are kept for safety, as explained in our Privacy Policy."
                >
                  <SettingsRow
                    title="Delete your account"
                    description="Email support from the address on your account and we'll delete it within 15 days."
                  >
                    <Button asChild variant="destructive" size="sm">
                      <a
                        href={`mailto:support@rbmarket.app?subject=${encodeURIComponent("Delete my RbMarket account")}&body=${encodeURIComponent(`Please delete my account (${user?.username || ""}).`)}`}
                      >
                        Email support
                      </a>
                    </Button>
                  </SettingsRow>
                </SettingsGroup>
              )}
            </div>
          </div>
        </Container>
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
                className={`mt-1 ${passwordErrors.currentPassword ? "border-destructive/40 focus-visible:ring-red-500" : ""}`}
                value={passwordData.currentPassword}
                onChange={(e) => {
                  setPasswordData({ ...passwordData, currentPassword: e.target.value })
                  if (passwordErrors.currentPassword) {
                    setPasswordErrors({ ...passwordErrors, currentPassword: "" })
                  }
                }}
              />
              {passwordErrors.currentPassword && (
                <p className="text-sm text-destructive mt-1">{passwordErrors.currentPassword}</p>
              )}
            </div>
            <div>
              <Label>New Password</Label>
              <Input
                type="password"
                className={`mt-1 ${passwordErrors.newPassword ? "border-destructive/40 focus-visible:ring-red-500" : ""}`}
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
                <p className="text-sm text-destructive mt-1">{passwordErrors.newPassword}</p>
              )}
            </div>
            <div>
              <Label>Confirm New Password</Label>
              <Input
                type="password"
                className={`mt-1 ${passwordErrors.confirmPassword ? "border-destructive/40 focus-visible:ring-red-500" : ""}`}
                value={passwordData.confirmPassword}
                onChange={(e) => {
                  setPasswordData({ ...passwordData, confirmPassword: e.target.value })
                  if (passwordErrors.confirmPassword) {
                    setPasswordErrors({ ...passwordErrors, confirmPassword: "" })
                  }
                }}
              />
              {passwordErrors.confirmPassword && (
                <p className="text-sm text-destructive mt-1">{passwordErrors.confirmPassword}</p>
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

/** iOS-style grouped list: small section title, rounded card of rows, optional footnote. */
function SettingsGroup({ title, footer, children }: { title: string; footer?: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="mb-2 px-1 text-[13px] font-semibold uppercase tracking-wide text-muted-foreground">{title}</h2>
      <div className="divide-y divide-white/[0.06] overflow-hidden rounded-[20px] bg-card">{children}</div>
      {footer && <p className="mt-2 px-1 text-[13px] text-muted-foreground">{footer}</p>}
    </section>
  )
}

/** A single row: label and description on the left, a control or value on the right. */
function SettingsRow({
  title,
  description,
  htmlFor,
  children,
}: {
  title: string
  description?: string
  htmlFor?: string
  children?: React.ReactNode
}) {
  return (
    <div className="flex items-center justify-between gap-4 px-5 py-4">
      <div className="min-w-0">
        <label htmlFor={htmlFor} className="block text-[15px] font-medium">
          {title}
        </label>
        {description && <p className="mt-0.5 text-[13px] text-muted-foreground">{description}</p>}
      </div>
      {children && <div className="flex min-w-0 shrink-0 justify-end">{children}</div>}
    </div>
  )
}

function ToggleRow({
  id,
  title,
  description,
  checked,
  onChange,
}: {
  id: string
  title: string
  description?: string
  checked: boolean
  onChange: (checked: boolean) => void
}) {
  return (
    <SettingsRow title={title} description={description} htmlFor={id}>
      <Switch id={id} checked={checked} onCheckedChange={onChange} />
    </SettingsRow>
  )
}

/** A row with the label on top and a full-width input below, for text and uploads. */
function FieldRow({
  label,
  hint,
  htmlFor,
  children,
}: {
  label: string
  hint?: string
  htmlFor?: string
  children: React.ReactNode
}) {
  return (
    <div className="space-y-2 px-5 py-4">
      <div className="flex items-baseline justify-between gap-3">
        <label htmlFor={htmlFor} className="text-[15px] font-medium">
          {label}
        </label>
        {hint && <span className="text-[12px] text-muted-foreground">{hint}</span>}
      </div>
      {children}
    </div>
  )
}
