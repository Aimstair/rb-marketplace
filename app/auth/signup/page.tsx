"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { AlertCircle, CheckCircle, Eye, EyeOff } from "lucide-react"
import { signUp } from "@/app/actions/auth"

export default function SignupPage() {
  const router = useRouter()
  const [step, setStep] = useState("account") // account, email-verify, seller
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
    agreeTerms: false,
  })
  const [sellerData, setSellerData] = useState({
    discordHandle: "",
    acceptSellerTerms: false,
  })
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setFormData({
      ...formData,
      [name]: type === "checkbox" ? checked : value,
    })
  }

  const handleSellerChange = (e) => {
    const { name, value, type, checked } = e.target
    setSellerData({
      ...sellerData,
      [name]: type === "checkbox" ? checked : value,
    })
  }

  const validateStep1 = () => {
    if (!formData.username || !formData.email || !formData.password) {
      setError("Please fill in all fields")
      return false
    }
    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match")
      return false
    }
    if (formData.password.length < 8) {
      setError("Password must be at least 8 characters")
      return false
    }
    if (!formData.agreeTerms) {
      setError("You must agree to the Terms of Service")
      return false
    }
    return true
  }

  const handleNext = async (e) => {
    e.preventDefault()
    setError("")

    if (step === "account") {
      if (validateStep1()) {
        // Call server action to create account
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
            // Redirect to verification page
            router.push(`/auth/verify?email=${encodeURIComponent(formData.email)}`)
          } else {
            setError(result.error || "Failed to create account")
          }
        } catch (err) {
          setError("An unexpected error occurred. Please try again.")
          console.error(err)
        } finally {
          setLoading(false)
        }
      }
    }
  }

  const handleBecomeSeller = (e) => {
    e.preventDefault()
    if (sellerData.acceptSellerTerms) {
      setStep("seller")
    } else {
      setError("You must agree to the Seller Terms")
    }
  }

  const handleComplete = async (e) => {
    e.preventDefault()
    setLoading(true)

    try {
      // Redirect to login after successful signup
      router.push("/auth/login?signup=success")
    } catch (err) {
      setError("An error occurred. Please try again.")
      console.error(err)
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

        {/* Signup Card */}
        <Card className="p-8">
          <h1 className="text-3xl font-bold mb-2 text-center">Join RobloxTrade</h1>
          <p className="text-center text-muted-foreground mb-8">
            {step === "account" && "Create your account"}
            {step === "email-verify" && "Verify your email"}
            {step === "seller" && "Become a seller (optional)"}
          </p>

          {/* Error Alert */}
          {error && (
            <div className="mb-6 p-4 rounded-lg bg-destructive/10 border border-destructive/20 flex gap-3">
              <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}

          {/* Step 1: Account Creation */}
          {step === "account" && (
            <form onSubmit={handleNext} className="space-y-4">
              {/* Username */}
              <div>
                <label className="text-sm font-semibold mb-2 block">Username</label>
                <Input
                  type="text"
                  name="username"
                  placeholder="Choose your username"
                  value={formData.username}
                  onChange={handleChange}
                  maxLength="20"
                />
                <p className="text-xs text-muted-foreground mt-1">{formData.username.length}/20 characters</p>
              </div>

              {/* Email */}
              <div>
                <label className="text-sm font-semibold mb-2 block">Email Address</label>
                <Input
                  type="email"
                  name="email"
                  placeholder="your@example.com"
                  value={formData.email}
                  onChange={handleChange}
                />
              </div>

              {/* Password */}
              <div>
                <label className="text-sm font-semibold mb-2 block">Password</label>
                <div className="relative">
                  <Input
                    type={showPassword ? "text" : "password"}
                    name="password"
                    placeholder="••••••••"
                    value={formData.password}
                    onChange={handleChange}
                    className="pr-12"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                <p className="text-xs text-muted-foreground mt-1">At least 8 characters</p>
              </div>

              {/* Confirm Password */}
              <div>
                <label className="text-sm font-semibold mb-2 block">Confirm Password</label>
                <Input
                  type="password"
                  name="confirmPassword"
                  placeholder="••••••••"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                />
              </div>

              {/* Terms */}
              <label className="flex items-start gap-3 text-sm">
                <input
                  type="checkbox"
                  name="agreeTerms"
                  checked={formData.agreeTerms}
                  onChange={handleChange}
                  className="mt-1"
                />
                <span>
                  I agree to the{" "}
                  <Link href="/terms" className="text-primary hover:underline">
                    Terms of Service
                  </Link>{" "}
                  and{" "}
                  <Link href="/privacy" className="text-primary hover:underline">
                    Privacy Policy
                  </Link>
                </span>
              </label>

              {/* Button */}
              <Button type="submit" size="lg" className="w-full mt-6" disabled={loading}>
                {loading ? "Creating account..." : "Continue"}
              </Button>
            </form>
          )}

          {/* Step 2: Email Verification */}
          {step === "email-verify" && (
            <form onSubmit={handleBecomeSeller} className="space-y-4">
              <div className="p-6 bg-secondary/10 rounded-lg text-center">
                <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3" />
                <p className="font-semibold mb-2">Email verification sent</p>
                <p className="text-sm text-muted-foreground mb-4">We've sent a verification link to {formData.email}</p>
                <p className="text-xs text-muted-foreground">Click the link in your email to verify your account</p>
              </div>

              <div className="space-y-2">
                <Button type="submit" size="lg" className="w-full">
                  Become a Seller (Optional)
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="lg"
                  className="w-full bg-transparent"
                  onClick={() => (window.location.href = "/marketplace")}
                >
                  Skip & Start Buying
                </Button>
              </div>
            </form>
          )}

          {/* Step 3: Seller Verification */}
          {step === "seller" && (
            <form onSubmit={handleComplete} className="space-y-4">
              <div>
                <label className="text-sm font-semibold mb-2 block">Primary Contact Method</label>
                <Input
                  type="text"
                  name="discordHandle"
                  placeholder="your#1234 or email"
                  value={sellerData.discordHandle}
                  onChange={handleSellerChange}
                />
                <p className="text-xs text-muted-foreground mt-1">This is how buyers will contact you</p>
              </div>

              <label className="flex items-start gap-3 text-sm">
                <input
                  type="checkbox"
                  name="acceptSellerTerms"
                  checked={sellerData.acceptSellerTerms}
                  onChange={handleSellerChange}
                  className="mt-1"
                />
                <span>
                  I agree to the{" "}
                  <Link href="/seller-terms" className="text-primary hover:underline">
                    Seller Terms
                  </Link>{" "}
                  and understand my responsibilities
                </span>
              </label>

              <div className="p-4 bg-secondary/10 rounded-lg text-sm space-y-2">
                <p className="font-semibold">What happens next:</p>
                <ul className="space-y-1 text-muted-foreground">
                  <li>✓ Your account is created as a buyer</li>
                  <li>✓ You can start posting listings immediately</li>
                  <li>✓ Build trust through vouches</li>
                  <li>✓ Earn seller reputation</li>
                </ul>
              </div>

              <Button type="submit" size="lg" className="w-full mt-6" disabled={loading}>
                {loading ? "Creating account..." : "Complete Signup"}
              </Button>
            </form>
          )}

          {/* Sign In Link */}
          <p className="text-center text-sm text-muted-foreground mt-6">
            Already have an account?{" "}
            <Link href="/auth/login" className="text-primary font-semibold hover:underline">
              Sign in
            </Link>
          </p>
        </Card>

        {/* Security Notice */}
        <div className="mt-6 p-4 rounded-lg bg-secondary/10 text-center text-sm text-muted-foreground">
          🔒 Your data is encrypted and secure. We never share your personal information.
        </div>
      </div>
    </div>
  )
}
