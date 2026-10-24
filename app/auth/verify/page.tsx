"use client"

import type React from "react"
import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { REGEXP_ONLY_DIGITS } from "input-otp"
import { Button } from "@/components/ui/button"
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp"
import { AuthError, AuthShell } from "@/components/site/auth-shell"
import { verifyEmail, resendVerificationCode } from "@/app/actions/auth"
import { useToast } from "@/hooks/use-toast"

export default function VerifyEmailPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { toast } = useToast()
  const email = searchParams.get("email") || ""

  const [code, setCode] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [resending, setResending] = useState(false)
  const [countdown, setCountdown] = useState(0)

  useEffect(() => {
    if (!email) router.push("/auth/login")
  }, [email, router])

  useEffect(() => {
    if (countdown <= 0) return
    const timer = setTimeout(() => setCountdown((c) => c - 1), 1000)
    return () => clearTimeout(timer)
  }, [countdown])

  const submitCode = async (value: string) => {
    if (value.length !== 6 || loading) return
    setError("")
    setLoading(true)
    try {
      const result = await verifyEmail(email, value)
      if (result.success) {
        toast({ title: "Email confirmed", description: "You can log in now." })
        router.push("/auth/login")
      } else {
        setError(result.error || "That code is wrong or has expired.")
        setCode("")
      }
    } catch {
      setError("Something went wrong. Try again in a moment.")
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    submitCode(code)
  }

  const handleResend = async () => {
    if (countdown > 0 || resending) return
    setResending(true)
    setError("")
    try {
      const result = await resendVerificationCode(email)
      if (result.success) {
        toast({ title: "New code sent", description: `Check ${email}.` })
        setCountdown(60)
      } else {
        setError(result.error || "We couldn't send a new code.")
      }
    } catch {
      setError("Something went wrong. Try again in a moment.")
    } finally {
      setResending(false)
    }
  }

  return (
    <AuthShell
      title="Check your email"
      subtitle={
        <>
          Enter the 6-digit code we sent to <span className="text-foreground">{email}</span>.
        </>
      }
      topLink={
        <Link href="/auth/login" className="text-link hover:underline underline-offset-2">
          Back to log in
        </Link>
      }
      footer={
        <>
          Didn't get it?{" "}
          {countdown > 0 ? (
            <span className="tabular-nums">You can resend in {countdown}s.</span>
          ) : (
            <button
              type="button"
              onClick={handleResend}
              disabled={resending}
              className="text-link hover:underline underline-offset-2 disabled:opacity-60"
            >
              {resending ? "Sending…" : "Resend code"}
            </button>
          )}
        </>
      }
    >
      <AuthError>{error}</AuthError>
      <form onSubmit={handleSubmit} className="space-y-6">
        <InputOTP
          maxLength={6}
          pattern={REGEXP_ONLY_DIGITS}
          value={code}
          onChange={(value) => {
            setCode(value)
            if (error) setError("")
          }}
          onComplete={submitCode}
          disabled={loading}
          autoFocus
          aria-label="Verification code"
          containerClassName="justify-between"
        >
          <InputOTPGroup className="w-full justify-between gap-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <InputOTPSlot
                key={i}
                index={i}
                className="h-14 w-12 flex-1 rounded-xl border border-input bg-card text-[22px] font-semibold first:rounded-xl last:rounded-xl sm:w-14"
              />
            ))}
          </InputOTPGroup>
        </InputOTP>
        <Button type="submit" size="lg" className="w-full" disabled={loading || code.length !== 6}>
          {loading ? "Checking…" : "Confirm email"}
        </Button>
      </form>
    </AuthShell>
  )
}
