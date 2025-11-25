"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { Settings, Shield, Bell, Database, AlertTriangle, Save, RotateCcw } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

export default function SettingsPage() {
  const [maintenanceMode, setMaintenanceMode] = useState(false)
  const [registrationEnabled, setRegistrationEnabled] = useState(true)
  const [emailNotifications, setEmailNotifications] = useState(true)

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
              <Input defaultValue="RobloxTrade" />
            </div>
            <div className="space-y-2">
              <Label>Site Description</Label>
              <Textarea defaultValue="Peer-to-peer marketplace for trading Roblox items safely." />
            </div>
            <div className="space-y-2">
              <Label>Support Email</Label>
              <Input defaultValue="support@robloxtrade.com" />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Maintenance Mode</p>
                <p className="text-sm text-muted-foreground">Disable site access for non-admins</p>
              </div>
              <Switch checked={maintenanceMode} onCheckedChange={setMaintenanceMode} />
            </div>
            {maintenanceMode && (
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
              <Switch checked={registrationEnabled} onCheckedChange={setRegistrationEnabled} />
            </div>
            <Separator />
            <div className="space-y-2">
              <Label>New User Selling Limit (First Week)</Label>
              <div className="flex gap-2">
                <Input type="number" defaultValue="5000" />
                <span className="flex items-center text-muted-foreground">R$</span>
              </div>
            </div>
            <div className="space-y-2">
              <Label>New User Selling Limit (First Month)</Label>
              <div className="flex gap-2">
                <Input type="number" defaultValue="25000" />
                <span className="flex items-center text-muted-foreground">R$</span>
              </div>
            </div>
            <div className="space-y-2">
              <Label>IP Rate Limit (requests/minute)</Label>
              <Input type="number" defaultValue="60" />
            </div>
            <div className="space-y-2">
              <Label>Failed Login Lockout (attempts)</Label>
              <Input type="number" defaultValue="5" />
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
              <Input type="number" defaultValue="10" />
            </div>
            <div className="space-y-2">
              <Label>Max Listings per User (Pro)</Label>
              <Input type="number" defaultValue="50" />
            </div>
            <div className="space-y-2">
              <Label>Listing Expiry (days)</Label>
              <Input type="number" defaultValue="30" />
            </div>
            <div className="space-y-2">
              <Label>Featured Listing Duration (hours)</Label>
              <Input type="number" defaultValue="24" />
            </div>
            <div className="space-y-2">
              <Label>Default Listing Sort</Label>
              <Select defaultValue="newest">
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
              <Switch checked={emailNotifications} onCheckedChange={setEmailNotifications} />
            </div>
            <Separator />
            <div className="space-y-2">
              <Label>Admin Alert Email</Label>
              <Input defaultValue="admin@robloxtrade.com" />
            </div>
            <div className="space-y-3">
              <Label>Admin Alerts</Label>
              <div className="space-y-2">
                <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <span className="text-sm">High-value trades (over $500)</span>
                  <Switch defaultChecked />
                </div>
                <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <span className="text-sm">New reports</span>
                  <Switch defaultChecked />
                </div>
                <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <span className="text-sm">System errors</span>
                  <Switch defaultChecked />
                </div>
                <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <span className="text-sm">Daily summary</span>
                  <Switch />
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
                defaultValue={`free robux
scam
hack
exploit
paypal
discord
outside of platform`}
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline">free robux</Badge>
              <Badge variant="outline">scam</Badge>
              <Badge variant="outline">hack</Badge>
              <Badge variant="outline">exploit</Badge>
              <Badge variant="outline">paypal</Badge>
              <Badge variant="outline">discord</Badge>
              <Badge variant="outline">outside of platform</Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-4 justify-end">
        <Button variant="outline">
          <RotateCcw className="h-4 w-4 mr-2" />
          Reset to Defaults
        </Button>
        <Button>
          <Save className="h-4 w-4 mr-2" />
          Save Changes
        </Button>
      </div>
    </div>
  )
}
