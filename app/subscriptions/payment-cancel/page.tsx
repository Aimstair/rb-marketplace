"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { X } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function PaymentCancelPage() {
  const router = useRouter()

  useEffect(() => {
    // Try to close this tab
    const timeout = setTimeout(() => {
      window.close()
    }, 500)

    return () => clearTimeout(timeout)
  }, [])

  const handleRetry = () => {
    window.close()
    // If close doesn't work, redirect
    setTimeout(() => {
      router.push("/subscriptions")
    }, 100)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-4 max-w-md">
        <div className="flex justify-center">
          <div className="rounded-full bg-red-500/10 p-6">
            <X className="w-16 h-16 text-red-500" />
          </div>
        </div>
        <h1 className="text-2xl font-bold">Payment Cancelled</h1>
        <p className="text-muted-foreground">
          Your payment was cancelled. No charges have been made.
        </p>
        <p className="text-sm text-muted-foreground">
          This window will close automatically...
        </p>
        <Button onClick={handleRetry} variant="outline">
          Close & Return to Subscriptions
        </Button>
      </div>
    </div>
  )
}
