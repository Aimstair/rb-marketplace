"use client"

import type React from "react"
import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { Check, CircleCheck, Link2Off } from "lucide-react"
import { Button } from "@/components/ui/button"
import { AuthSkeleton } from "@/components/site/skeletons"
import { AuthError, AuthField, AuthShell, AuthStatusIcon, PasswordInput } from "@/components/site/auth-shell"
import { verifyResetToken, resetPassword } from "@/app/actions/auth"
import { cn } from "@/lib/utils"

export default function ResetPasswordPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get("token") || ""

  const [validating, setValidating] = useState(true)
  const [tokenValid, setTokenValid] = useState(false)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    const validateToken = async () => {
      if (!token) {
        setValidating(false)
        return
      }
      const result = await verifyResetToken(token)
      if (result.success && result.email) {
        setTokenValid(true)
        setEmail(result.email)
      }
      setValidating(false)
    }
    validateToken()
  }, [token])

  const longEnough = password.length >= 8
  const matches = confirmPassword.length > 0 && password === confirmPassword

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    if (!longEnough) {
      setError("Your password needs at least 8 characters.")
      return
    }
    if (password !== confirmPassword) {
      setError("The two passwords don't match.")
      return
    }

    setLoading(true)
    try {
      const result = await resetPassword(token, password)
      if (result.success) {
        setSuccess(true)
        setTimeout(() => router.push("/auth/login"), 2000)
      } else {
        setError(result.error || "We couldn't update your password. Try again.")
      }
    } catch {
      setError("Something went wrong. Try again in a moment.")
    } finally {
      setLoading(false)
    }
  }

  if (validating) return <AuthSkeleton />

  if (!tokenValid) {
    return (
      <AuthShell
        icon={
          <AuthStatusIcon tone="destructive">
            <Link2Off className="size-7" strokeWidth={1.75} />
          </AuthStatusIcon>
        }
        title="This link has expired"
        subtitle="Reset links work for 1 hour and only once. Ask for a new one and we'll email it right away."
      >
        <div className="space-y-3">
          <Button asChild size="lg" className="w-full">
            <Link href="/auth/forgot-password">Send a new link</Link>
          </Button>
          <Button asChild size="lg" variant="secondary" className="w-full">
            <Link href="/auth/login">Back to log in</Link>
          </Button>
        </div>
      </AuthShell>
    )
  }

  if (success) {
    return (
      <AuthShell
        icon={
          <AuthStatusIcon tone="success">
            <CircleCheck className="size-7" strokeWidth={1.75} />
          </AuthStatusIcon>
        }
        title="Password updated"
        subtitle="Taking you to log in…"
      >
        <Button asChild size="lg" variant="secondary" className="w-full">
          <Link href="/auth/login">Log in now</Link>
        </Button>
      </AuthShell>
    )
  }

  return (
    <AuthShell
      title="Choose a new password"
      subtitle={
        <>
          For <span className="text-foreground">{email}</span>
        </>
      }
      topLink={
        <Link href="/auth/login" className="text-link hover:underline underline-offset-2">
          Back to log in
        </Link>
      }
    >
      <AuthError>{error}</AuthError>
      <form onSubmit={handleSubmit} className="space-y-5" noValidate>
        <AuthField
          id="reset-password"
          label="New password"
          hint={
            <span className={cn("inline-flex items-center gap-1", longEnough ? "text-success" : "text-muted-foreground")}>
              <Check className={cn("size-3.5", !longEnough && "opacity-40")} strokeWidth={2.5} />
              At least 8 characters
            </span>
          }
        >
          <PasswordInput
            id="reset-password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={loading}
            required
            autoFocus
          />
        </AuthField>
        <AuthField
          id="reset-confirm"
          label="Confirm new password"
          hint={
            confirmPassword ? (
              <span className={cn("inline-flex items-center gap-1", matches ? "text-success" : "text-muted-foreground")}>
                <Check className={cn("size-3.5", !matches && "opacity-40")} strokeWidth={2.5} />
                Passwords match
              </span>
            ) : undefined
          }
        >
          <PasswordInput
            id="reset-confirm"
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            disabled={loading}
            required
          />
        </AuthField>
        <Button type="submit" size="lg" className="w-full" disabled={loading || !password || !confirmPassword}>
          {loading ? "Saving…" : "Save new password"}
        </Button>
      </form>
    </AuthShell>
  )
}
