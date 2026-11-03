"use client"

import type React from "react"

import { useState } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { AuthError, AuthField, AuthInput, AuthShell, PasswordInput } from "@/components/site/auth-shell"
import { signInWithCredentials, resendVerificationCode, type LoginResult } from "@/app/actions/auth"
import { useToast } from "@/hooks/use-toast"

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [errorCode, setErrorCode] = useState<LoginResult["code"]>()
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()
  const { toast } = useToast()

  const redirectUrl = searchParams.get("redirect") || "/marketplace"

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setErrorCode(undefined)
    setLoading(true)

    try {
      const result = await signInWithCredentials(email, password)

      if (result?.success) {
        router.refresh()
        window.location.href = redirectUrl
        return
      }

      // Right password, unverified email: send a fresh code and continue on the verify page
      if (result?.code === "unverified") {
        toast({
          title: "Verify your email",
          description: "We've sent you a new verification code.",
        })
        await resendVerificationCode(email)
        router.push(`/auth/verify?email=${encodeURIComponent(email.trim())}`)
        return
      }

      setError(result?.error || "Incorrect email or password.")
      setErrorCode(result?.code)
      setLoading(false)
    } catch (err: any) {
      // A Next.js redirect is a successful sign-in, not a failure
      if (err?.message === "NEXT_REDIRECT") return

      setError("Login failed. Please try again.")
      setLoading(false)
    }
  }

  return (
    <AuthShell
      title="Log in"
      subtitle="Welcome back. Pick up where you left off."
      topLink={
        <>
          New here?{" "}
          <Link href="/auth/signup" className="text-link hover:underline underline-offset-2">
            Create an account
          </Link>
        </>
      }
    >
      <AuthError>
        {error && (
          <>
            {error}
            {errorCode === "invalid_credentials" && (
              <>
                {" "}
                Don&apos;t have an account?{" "}
                <Link href="/auth/signup" className="font-medium underline underline-offset-2">
                  Sign up
                </Link>
              </>
            )}
          </>
        )}
      </AuthError>
      <form onSubmit={handleLogin} className="space-y-5" noValidate>
        <AuthField id="login-email" label="Email">
          <AuthInput
            id="login-email"
            type="email"
            autoComplete="email"
            inputMode="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={loading}
            required
            autoFocus
          />
        </AuthField>
        <AuthField
          id="login-password"
          label="Password"
          aside={
            <Link href="/auth/forgot-password" className="text-[13px] text-link hover:underline underline-offset-2">
              Forgot password?
            </Link>
          }
        >
          <PasswordInput
            id="login-password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={loading}
            required
          />
        </AuthField>
        <Button type="submit" size="lg" className="w-full" disabled={loading || !email || !password}>
          {loading ? "Logging in…" : "Log in"}
        </Button>
      </form>
    </AuthShell>
  )
}
