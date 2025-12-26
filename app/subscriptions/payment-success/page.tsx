"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { Check } from "lucide-react"

export default function PaymentSuccessPage() {
  const router = useRouter()

  useEffect(() => {
    // Close this tab and let the parent handle the success
    window.close()

    // If window.close() doesn't work (some browsers prevent it),
    // redirect back to subscriptions after a short delay
    const timeout = setTimeout(() => {
      router.push("/subscriptions")
    }, 2000)

    return () => clearTimeout(timeout)
  }, [router])

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-4">
        <div className="flex justify-center">
          <div className="rounded-full bg-green-500/10 p-6">
            <Check className="w-16 h-16 text-green-500" />
          </div>
        </div>
        <h1 className="text-2xl font-bold">Payment Successful!</h1>
        <p className="text-muted-foreground">
          Your subscription is being processed.
        </p>
        <p className="text-sm text-muted-foreground">
          This window will close automatically...
        </p>
      </div>
    </div>
  )
}
