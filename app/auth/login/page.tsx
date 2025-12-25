"use client"

import type React from "react"

import { useState } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { AlertCircle, Eye, EyeOff } from "lucide-react"
import { signIn } from "next-auth/react"
import { checkEmailVerification } from "@/app/actions/auth"
import { useToast } from "@/hooks/use-toast"

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
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
      // Use NextAuth signIn with credentials provider
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      })

      if (result?.error) {
        // Map common NextAuth errors to user-friendly messages
        let errorMessage = result.error
        
        if (result.error === "CredentialsSignin" || result.error === "Invalid credentials") {
          errorMessage = "Invalid email or password. Please try again."
        } else if (result.error.includes("locked")) {
          errorMessage = "Your account has been temporarily locked due to multiple failed login attempts. Please try again later."
        } else if (result.error.includes("email not verified")) {
          // Check if email verification is pending
          const verification = await checkEmailVerification(email)
          if (!verification.verified) {
            toast({
              title: "Email Not Verified",
              description: "Please verify your email before logging in. We'll resend the verification code.",
            })
            router.push(`/auth/verify?email=${encodeURIComponent(email)}`)
            return
          }
        }
        
        setError(errorMessage)
      } else if (result?.ok) {
        // Successful login
        toast({
          title: "Welcome Back!",
          description: "You've successfully logged in.",
        })
        router.push(redirectUrl)
      }
    } catch (err: any) {
      setError(err.message || "Login failed. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <Link href="/" className="flex items-center justify-center mb-8">
          <div className="text-3xl font-bold text-primary">RobloxTrade</div>
        </Link>

        {/* Login Card */}
        <Card className="p-8">
          <h1 className="text-3xl font-bold mb-2 text-center">Welcome Back</h1>
          <p className="text-center text-muted-foreground mb-8">Sign in to your account to continue</p>

          {/* Error Alert */}
          {error && (
            <div className="mb-6 p-4 rounded-lg bg-destructive/10 border border-destructive/20 flex gap-3">
              <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            {/* Email */}
            <div>
              <label className="text-sm font-semibold mb-2 block">Email Address</label>
              <Input
                type="email"
                placeholder="user@test.com or admin@test.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full"
                disabled={loading}
              />
              <p className="text-xs text-muted-foreground mt-1">Demo: user@test.com / admin@test.com</p>
            </div>

            {/* Password */}
            <div>
              <label className="text-sm font-semibold mb-2 block">Password</label>
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pr-12"
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  disabled={loading}
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              <p className="text-xs text-muted-foreground mt-1">Demo: password123 (user) / admin123 (admin)</p>
            </div>

            {/* Remember & Forgot */}
            <div className="flex items-center justify-between text-sm">
              <label className="flex items-center gap-2">
                <input type="checkbox" className="rounded" disabled={loading} />
                <span>Remember me</span>
              </label>
              <Link href="/auth/forgot-password" className="text-primary hover:underline">
                Forgot password?
              </Link>
            </div>

            {/* Login Button */}
            <Button type="submit" size="lg" className="w-full mt-6" disabled={loading}>
              {loading ? "Signing in..." : "Sign In"}
            </Button>
          </form>

          {/* Sign Up Link */}
          <p className="text-center text-sm text-muted-foreground mt-6">
            Don't have an account?{" "}
            <Link href="/auth/signup" className="text-primary font-semibold hover:underline">
              Sign up for free
            </Link>
          </p>
        </Card>

        {/* Security Notice */}
        <div className="mt-6 p-4 rounded-lg bg-secondary/10 text-center text-sm text-muted-foreground">
          Your data is encrypted and secure. We never share your personal information.
        </div>
      </div>
    </div>
  )
}
