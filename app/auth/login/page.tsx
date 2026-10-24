"use client"

import type React from "react"

import { useState } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { AuthError, AuthField, AuthInput, AuthShell, PasswordInput } from "@/components/site/auth-shell"
import { signIn } from "next-auth/react"
import { signInWithCredentials, doesUserExist, resendVerificationCode, checkEmailVerification } from "@/app/actions/auth"
import { useToast } from "@/hooks/use-toast"

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()
  const { toast } = useToast()

  const redirectUrl = searchParams.get("redirect") || "/marketplace"

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setLoading(true)

    try {
      // Check if user exists first
    const userExists = await doesUserExist(email)
    if (!userExists) {
      setError("Account not found. Please sign up.")
      setLoading(false)
      return
    }
      // First, check if email is verified
      const verificationStatus = await checkEmailVerification(email)
      
      if (!verificationStatus.verified) {
        // Email not verified - resend code and redirect
        toast({
          title: "Email Not Verified",
          description: "Please verify your email. We're sending you a new verification code.",
        })
        
        // Resend verification code
        await resendVerificationCode(email)
        
        // Redirect to verification page
        router.push(`/auth/verify?email=${encodeURIComponent(email)}`)
        setLoading(false)
        return
      }

      // Use NextAuth signIn with credentials provider
      const result = await signInWithCredentials(email, password)
      if (result && result.success) {
        // 1. Refresh the router to clear the cache and update the session state
        router.refresh(); 
        // 2. Navigate to the marketplace
        window.location.href = redirectUrl;
      } else if (result && !result.success && result.error) {
      let errorMessage = result.error
      
      // Keep your custom error mapping logic here
      if (result.error.includes("locked") || result.error.includes("Too many failed attempts")) {
        errorMessage = result.error
      } else if (result.error.includes("Invalid password")) {
        errorMessage = result.error
      } else if (result.error.includes("Invalid credentials")) {
        errorMessage = "Invalid email or password. Please try again."
      } else if (result.error.includes("banned")) {
        errorMessage = "Your account has been banned. Please contact support."
      } else if (result.error === "CredentialsSignin" || result.error === "Configuration") {
        errorMessage = "Invalid email or password. Please try again."
      }
      
      setError(errorMessage)
      setLoading(false) // Only stop loading if there is an error
    } 
    
    // NOTE: You don't need 'else if (result.success)' with router.push here
    // because the Server Action will trigger a redirect automatically.
    // If it reaches here without an error, the browser will navigate away.

    } catch (err: any) {
      // 4. Handle unexpected errors
      // If the error is a Next.js redirect, don't show it as a login failure
      if (err.message === "NEXT_REDIRECT") return;

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
      <AuthError>{error}</AuthError>
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
