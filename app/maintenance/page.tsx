"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { AlertTriangle, Home, Shield } from "lucide-react"

export default function MaintenancePage() {
  const router = useRouter()

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="p-4 bg-yellow-500/10 rounded-full">
              <AlertTriangle className="h-12 w-12 text-yellow-500" />
            </div>
          </div>
          <CardTitle className="text-2xl">Site Under Maintenance</CardTitle>
          <CardDescription>
            We're currently performing scheduled maintenance to improve your experience.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 bg-muted rounded-lg">
            <p className="text-sm text-center text-muted-foreground">
              Our marketplace is temporarily unavailable. We'll be back online shortly. Thank you for your patience!
            </p>
          </div>
          <Button
            variant="outline"
            className="w-full"
            onClick={() => router.refresh()}
          >
            <Home className="w-4 h-4 mr-2" />
            Check if we're back
          </Button>
          <Link href="/auth/login" className="block">
            <Button
              variant="ghost"
              className="w-full text-muted-foreground"
            >
              <Shield className="w-4 h-4 mr-2" />
              Admin Login
            </Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  )
}
