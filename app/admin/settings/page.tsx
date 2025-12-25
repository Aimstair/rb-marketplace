"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { Settings, Shield, Bell, Database, AlertTriangle, Save, RotateCcw, Loader2 } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { getSystemSettings, updateSystemSettings, resetSystemSettings } from "@/app/actions/admin"
import { useToast } from "@/components/ui/use-toast"

export default function SettingsPage() {
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [resetting, setResetting] = useState(false)

  // State for all settings
  const [settings, setSettings] = useState({
    site_name: "RobloxTrade",
    site_description: "Peer-to-peer marketplace for trading Roblox items safely.",
    support_email: "support@robloxtrade.com",
    maintenance_mode: false,
    registration_enabled: true,
    new_user_limit_week: 5000,
    new_user_limit_month: 25000,
    ip_rate_limit: 60,
    failed_login_lockout: 5,
    max_listings_free: 10,
    max_listings_pro: 50,
    max_listings_elite: 100,
    listing_expiry_days: 30,
    featured_duration_hours: 24,
    default_sort: "newest",
    email_notifications: true,
    admin_alert_email: "admin@robloxtrade.com",
    alert_high_value_trades: true,
    alert_new_reports: true,
    alert_system_errors: true,
    alert_daily_summary: false,
    blacklisted_words: ["free robux", "scam", "hack", "exploit", "paypal", "discord", "outside of platform"],
  })

  useEffect(() => {
    loadSettings()
  }, [])

  const loadSettings = async () => {
    try {
      setLoading(true)
      const result = await getSystemSettings()
      if (result.success && result.settings) {
        setSettings(result.settings as any)
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to load settings",
          variant: "destructive",
        })
      }
    } catch (err) {
      console.error("Failed to load settings:", err)
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    try {
      setSaving(true)
      const result = await updateSystemSettings(settings)
      if (result.success) {
        toast({
          title: "✅ Settings Saved",
          description: "System settings have been updated successfully.",
        })
      } else {
        toast({
          title: "❌ Failed to Save",
          description: result.error || "Failed to save settings",
          variant: "destructive",
        })
      }
    } catch (err) {
      console.error("Failed to save settings:", err)
      toast({
        title: "❌ Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  const handleReset = async () => {
    if (!confirm("Are you sure you want to reset all settings to defaults? This action cannot be undone.")) {
      return
    }

    try {
      setResetting(true)
      const result = await resetSystemSettings()
      if (result.success) {
        toast({
          title: "✅ Settings Reset",
          description: "All settings have been reset to defaults.",
        })
        await loadSettings() // Reload to show defaults
      } else {
        toast({
          title: "❌ Failed to Reset",
          description: result.error || "Failed to reset settings",
          variant: "destructive",
        })
      }
    } catch (err) {
      console.error("Failed to reset settings:", err)
      toast({
        title: "❌ Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      })
    } finally {
      setResetting(false)
    }
  }

  const updateSetting = (key: string, value: any) => {
    setSettings((prev) => ({ ...prev, [key]: value }))
  }

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">System Settings</h1>
        <p className="text-muted-foreground">Configure marketplace settings and features</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* General Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              General Settings
            </CardTitle>
            <CardDescription>Basic marketplace configuration</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label>Site Name</Label>
              <Input value={settings.site_name} onChange={(e) => updateSetting("site_name", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Site Description</Label>
              <Textarea value={settings.site_description} onChange={(e) => updateSetting("site_description", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Support Email</Label>
              <Input value={settings.support_email} onChange={(e) => updateSetting("support_email", e.target.value)} />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Maintenance Mode</p>
                <p className="text-sm text-muted-foreground">Disable site access for non-admins</p>
              </div>
              <Switch checked={settings.maintenance_mode} onCheckedChange={(checked) => updateSetting("maintenance_mode", checked)} />
            </div>
            {settings.maintenance_mode && (
              <div className="p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                <p className="text-sm text-yellow-600">
                  <AlertTriangle className="h-4 w-4 inline mr-1" />
                  Maintenance mode is active. Only admins can access the site.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Security Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Security Settings
            </CardTitle>
            <CardDescription>Account and trading security</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">New User Registration</p>
                <p className="text-sm text-muted-foreground">Allow new accounts to be created</p>
              </div>
              <Switch checked={settings.registration_enabled} onCheckedChange={(checked) => updateSetting("registration_enabled", checked)} />
            </div>
            <Separator />
            <div className="space-y-2">
              <Label>New User Selling Limit (First Week)</Label>
              <div className="flex gap-2">
                <Input type="number" value={settings.new_user_limit_week} onChange={(e) => updateSetting("new_user_limit_week", parseInt(e.target.value) || 0)} />
                <span className="flex items-center text-muted-foreground">R$</span>
              </div>
            </div>
            <div className="space-y-2">
              <Label>New User Selling Limit (First Month)</Label>
              <div className="flex gap-2">
                <Input type="number" value={settings.new_user_limit_month} onChange={(e) => updateSetting("new_user_limit_month", parseInt(e.target.value) || 0)} />
                <span className="flex items-center text-muted-foreground">R$</span>
              </div>
            </div>
            <div className="space-y-2">
              <Label>IP Rate Limit (requests/minute)</Label>
              <Input type="number" value={settings.ip_rate_limit} onChange={(e) => updateSetting("ip_rate_limit", parseInt(e.target.value) || 0)} />
            </div>
            <div className="space-y-2">
              <Label>Failed Login Lockout (attempts)</Label>
              <Input type="number" value={settings.failed_login_lockout} onChange={(e) => updateSetting("failed_login_lockout", parseInt(e.target.value) || 0)} />
            </div>
          </CardContent>
        </Card>

        {/* Listing Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              Listing Settings
            </CardTitle>
            <CardDescription>Configure listing limits and features</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label>Max Listings per User (Free)</Label>
              <Input type="number" value={settings.max_listings_free} onChange={(e) => updateSetting("max_listings_free", parseInt(e.target.value) || 0)} />
            </div>
            <div className="space-y-2">
              <Label>Max Listings per User (Pro)</Label>
              <Input type="number" value={settings.max_listings_pro} onChange={(e) => updateSetting("max_listings_pro", parseInt(e.target.value) || 0)} />
            </div>
            <div className="space-y-2">
              <Label>Max Listings per User (Elite)</Label>
              <Input type="number" value={settings.max_listings_elite} onChange={(e) => updateSetting("max_listings_elite", parseInt(e.target.value) || 0)} />
            </div>
            <div className="space-y-2">
              <Label>Listing Expiry (days)</Label>
              <Input type="number" value={settings.listing_expiry_days} onChange={(e) => updateSetting("listing_expiry_days", parseInt(e.target.value) || 0)} />
            </div>
            <div className="space-y-2">
              <Label>Featured Listing Duration (hours)</Label>
              <Input type="number" value={settings.featured_duration_hours} onChange={(e) => updateSetting("featured_duration_hours", parseInt(e.target.value) || 0)} />
            </div>
            <div className="space-y-2">
              <Label>Default Listing Sort</Label>
              <Select value={settings.default_sort} onValueChange={(value) => updateSetting("default_sort", value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="newest">Newest First</SelectItem>
                  <SelectItem value="popular">Most Popular</SelectItem>
                  <SelectItem value="price-low">Price: Low to High</SelectItem>
                  <SelectItem value="price-high">Price: High to Low</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Notification Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Notification Settings
            </CardTitle>
            <CardDescription>Configure email and push notifications</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Email Notifications</p>
                <p className="text-sm text-muted-foreground">Send system emails to users</p>
              </div>
              <Switch checked={settings.email_notifications} onCheckedChange={(checked) => updateSetting("email_notifications", checked)} />
            </div>
            <Separator />
            <div className="space-y-2">
              <Label>Admin Alert Email</Label>
              <Input value={settings.admin_alert_email} onChange={(e) => updateSetting("admin_alert_email", e.target.value)} />
            </div>
            <div className="space-y-3">
              <Label>Admin Alerts</Label>
              <div className="space-y-2">
                <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <span className="text-sm">High-value trades (over $500)</span>
                  <Switch checked={settings.alert_high_value_trades} onCheckedChange={(checked) => updateSetting("alert_high_value_trades", checked)} />
                </div>
                <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <span className="text-sm">New reports</span>
                  <Switch checked={settings.alert_new_reports} onCheckedChange={(checked) => updateSetting("alert_new_reports", checked)} />
                </div>
                <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <span className="text-sm">System errors</span>
                  <Switch checked={settings.alert_system_errors} onCheckedChange={(checked) => updateSetting("alert_system_errors", checked)} />
                </div>
                <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <span className="text-sm">Daily summary</span>
                  <Switch checked={settings.alert_daily_summary} onCheckedChange={(checked) => updateSetting("alert_daily_summary", checked)} />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Moderation Keywords */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Auto-Moderation Keywords
            </CardTitle>
            <CardDescription>Keywords that trigger automatic flagging</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Blacklisted Words (one per line)</Label>
              <Textarea
                rows={6}
                value={Array.isArray(settings.blacklisted_words) ? settings.blacklisted_words.join("\n") : ""}
                onChange={(e) => updateSetting("blacklisted_words", e.target.value.split("\n").filter(w => w.trim()))}
              />
            </div>
            <div className="flex flex-wrap gap-2">
              {Array.isArray(settings.blacklisted_words) && settings.blacklisted_words.map((word, index) => (
                <Badge key={index} variant="outline">{word}</Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-4 justify-end">
        <Button variant="outline" onClick={handleReset} disabled={resetting || saving}>
          {resetting ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <RotateCcw className="h-4 w-4 mr-2" />
          )}
          {resetting ? "Resetting..." : "Reset to Defaults"}
        </Button>
        <Button onClick={handleSave} disabled={saving || resetting}>
          {saving ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Save className="h-4 w-4 mr-2" />
          )}
          {saving ? "Saving..." : "Save Changes"}
        </Button>
      </div>
    </div>
  )
}
