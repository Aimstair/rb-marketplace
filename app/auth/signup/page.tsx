"use client"

import type React from "react"
import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { AuthError, AuthField, AuthInput, AuthShell, PasswordInput } from "@/components/site/auth-shell"
import { signUp } from "@/app/actions/auth"
import { cn } from "@/lib/utils"

function Requirement({ met, children }: { met: boolean; children: React.ReactNode }) {
  return (
    <span className={cn("inline-flex items-center gap-1", met ? "text-success" : "text-muted-foreground")}>
      <Check className={cn("size-3.5", !met && "opacity-40")} strokeWidth={2.5} />
      {children}
    </span>
  )
}

export default function SignupPage() {
  const router = useRouter()
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
    agreeTerms: false,
  })
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target
    setFormData({ ...formData, [name]: type === "checkbox" ? checked : value })
  }

  const longEnough = formData.password.length >= 8
  const matches = formData.confirmPassword.length > 0 && formData.password === formData.confirmPassword

  const validate = () => {
    if (!formData.username || !formData.email || !formData.password) return "Fill in every field to continue."
    if (!longEnough) return "Your password needs at least 8 characters."
    if (formData.password !== formData.confirmPassword) return "The two passwords don't match."
    if (!formData.agreeTerms) return "Please agree to the terms to create an account."
    return ""
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const problem = validate()
    setError(problem)
    if (problem) return

    setLoading(true)
    try {
      const result = await signUp({
        username: formData.username,
        email: formData.email,
        password: formData.password,
        confirmPassword: formData.confirmPassword,
        agreeTerms: formData.agreeTerms,
      })
      if (result.success) {
        router.push(`/auth/verify?email=${encodeURIComponent(formData.email)}`)
      } else {
        setError(result.error || "We couldn't create your account. Try again.")
      }
    } catch (err) {
      console.error(err)
      setError("Something went wrong. Try again in a moment.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthShell
      title="Create your account"
      subtitle="Buy and sell Roblox items with vouched traders."
      topLink={
        <>
          Have an account?{" "}
          <Link href="/auth/login" className="text-link hover:underline underline-offset-2">
            Log in
          </Link>
        </>
      }
    >
      <AuthError>{error}</AuthError>
      <form onSubmit={handleSubmit} className="space-y-5" noValidate>
        <AuthField
          id="signup-username"
          label="Username"
          hint={`Shown on your listings and vouches · ${formData.username.length}/20`}
        >
          <AuthInput
            id="signup-username"
            name="username"
            autoComplete="username"
            placeholder="e.g. kyle_trades"
            value={formData.username}
            onChange={handleChange}
            maxLength={20}
            disabled={loading}
            required
            autoFocus
          />
        </AuthField>

        <AuthField id="signup-email" label="Email" hint="We'll send a code to confirm it.">
          <AuthInput
            id="signup-email"
            name="email"
            type="email"
            inputMode="email"
            autoComplete="email"
            placeholder="you@example.com"
            value={formData.email}
            onChange={handleChange}
            disabled={loading}
            required
          />
        </AuthField>

        <AuthField id="signup-password" label="Password" hint={<Requirement met={longEnough}>At least 8 characters</Requirement>}>
          <PasswordInput
            id="signup-password"
            name="password"
            autoComplete="new-password"
            value={formData.password}
            onChange={handleChange}
            disabled={loading}
            required
          />
        </AuthField>

        <AuthField
          id="signup-confirm"
          label="Confirm password"
          hint={formData.confirmPassword ? <Requirement met={matches}>Passwords match</Requirement> : undefined}
        >
          <PasswordInput
            id="signup-confirm"
            name="confirmPassword"
            autoComplete="new-password"
            value={formData.confirmPassword}
            onChange={handleChange}
            disabled={loading}
            required
          />
        </AuthField>

        <label className="flex items-start gap-3 text-[15px] text-muted-foreground">
          <input
            type="checkbox"
            name="agreeTerms"
            checked={formData.agreeTerms}
            onChange={handleChange}
            className="mt-1 size-4 shrink-0 accent-[var(--primary)]"
          />
          <span>
            I agree to the{" "}
            <Link href="/terms" target="_blank" className="text-link hover:underline underline-offset-2">
              Terms of Service
            </Link>{" "}
            and{" "}
            <Link href="/privacy" target="_blank" className="text-link hover:underline underline-offset-2">
              Privacy Policy
            </Link>
            .
          </span>
        </label>

        <Button type="submit" size="lg" className="w-full" disabled={loading}>
          {loading ? "Creating account…" : "Create account"}
        </Button>
      </form>
    </AuthShell>
  )
}
