"use client"

import type React from "react"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { AlertCircle, ArrowLeft, Mail, CheckCircle } from "lucide-react"
import { sendPasswordResetLink } from "@/app/actions/auth"
import { useToast } from "@/hooks/use-toast"

type Step = "email" | "success"

export default function ForgotPasswordPage() {
  const [step, setStep] = useState<Step>("email")
  const [email, setEmail] = useState("")
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()
  const { toast } = useToast()

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    if (!email) {
      setError("Please enter your email address")
      return
    }

    setIsLoading(true)
    
    try {
      const result = await sendPasswordResetLink(email)
      
      if (result.success) {
        toast({
          title: "Reset Link Sent!",
          description: "Check your email for the password reset link.",
        })
        setStep("success")
      } else {
        setError(result.error || "Failed to send reset link. Please try again.")
      }
    } catch (err) {
      setError("An unexpected error occurred. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <Link href="/" className="flex items-center justify-center mb-8">
          <div className="text-3xl font-bold text-primary">RobloxTrade</div>
        </Link>

        <Card className="p-8">
          {step === "email" && (
            <>
              <Link
                href="/auth/login"
                className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-6"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to login
              </Link>

              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Mail className="w-8 h-8 text-primary" />
                </div>
                <h1 className="text-2xl font-bold mb-2">Forgot Password?</h1>
                <p className="text-muted-foreground text-sm">
                  Enter your email address and we'll send you a link to reset your password.
                </p>
              </div>

              {error && (
                <div className="mb-6 p-4 rounded-lg bg-destructive/10 border border-destructive/20 flex gap-3">
                  <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0" />
                  <p className="text-sm text-destructive">{error}</p>
                </div>
              )}

              <form onSubmit={handleEmailSubmit} className="space-y-4">
                <div>
                  <label className="text-sm font-semibold mb-2 block">Email Address</label>
                  <Input
                    type="email"
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full"
                    disabled={isLoading}
                  />
                </div>

                <Button type="submit" size="lg" className="w-full" disabled={isLoading}>
                  {isLoading ? "Sending..." : "Send Reset Link"}
                </Button>
              </form>
            </>
          )}

          {step === "success" && (
            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
              </div>
              <h1 className="text-2xl font-bold mb-2">Check Your Email</h1>
              <p className="text-muted-foreground mb-6">
                We've sent a password reset link to <span className="font-medium text-foreground">{email}</span>. Click
                the link in the email to reset your password.
              </p>
              <div className="space-y-2 text-sm text-muted-foreground mb-6">
                <p>The link will expire in 1 hour for security reasons.</p>
                <p>If you don't see the email, check your spam folder.</p>
              </div>
              <Button size="lg" className="w-full" onClick={() => router.push("/auth/login")}>
                Return to Login
              </Button>
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}
