"use client"

import type React from "react"
import { useState } from "react"
import Link from "next/link"
import { MailCheck } from "lucide-react"
import { Button } from "@/components/ui/button"
import { AuthError, AuthField, AuthInput, AuthShell, AuthStatusIcon } from "@/components/site/auth-shell"
import { sendPasswordResetLink } from "@/app/actions/auth"

type Step = "email" | "success"

export default function ForgotPasswordPage() {
  const [step, setStep] = useState<Step>("email")
  const [email, setEmail] = useState("")
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    if (!email) {
      setError("Enter the email you signed up with.")
      return
    }

    setIsLoading(true)
    try {
      const result = await sendPasswordResetLink(email)
      if (result.success) {
        setStep("success")
      } else {
        setError(result.error || "We couldn't send the link. Try again.")
      }
    } catch {
      setError("Something went wrong. Try again in a moment.")
    } finally {
      setIsLoading(false)
    }
  }

  const backToLogin = (
    <Link href="/auth/login" className="text-link hover:underline underline-offset-2">
      Back to log in
    </Link>
  )

  if (step === "success") {
    return (
      <AuthShell
        icon={
          <AuthStatusIcon tone="success">
            <MailCheck className="size-7" strokeWidth={1.75} />
          </AuthStatusIcon>
        }
        title="Check your email"
        subtitle={
          <>
            We sent a reset link to <span className="text-foreground">{email}</span>. It expires in 1 hour.
          </>
        }
        footer={
          <>
            Nothing there? Check your spam folder, or{" "}
            <button type="button" onClick={() => setStep("email")} className="text-link hover:underline underline-offset-2">
              try a different email
            </button>
            .
          </>
        }
      >
        <Button asChild size="lg" variant="secondary" className="w-full">
          <Link href="/auth/login">Back to log in</Link>
        </Button>
      </AuthShell>
    )
  }

  return (
    <AuthShell
      title="Reset your password"
      subtitle="Enter your email and we'll send you a link to choose a new password."
      topLink={backToLogin}
    >
      <AuthError>{error}</AuthError>
      <form onSubmit={handleEmailSubmit} className="space-y-5" noValidate>
        <AuthField id="forgot-email" label="Email">
          <AuthInput
            id="forgot-email"
            type="email"
            inputMode="email"
            autoComplete="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={isLoading}
            required
            autoFocus
          />
        </AuthField>
        <Button type="submit" size="lg" className="w-full" disabled={isLoading || !email}>
          {isLoading ? "Sending…" : "Send reset link"}
        </Button>
      </form>
    </AuthShell>
  )
}
