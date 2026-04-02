"use server"

import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"
import { z } from "zod"
import { signUpSchema, type SignUpInput, type SignUpResult } from "@/lib/schemas"
import { signIn } from "@/auth"
import { sendEmail, generateVerificationEmail, generatePasswordResetEmail } from "@/lib/email"
import crypto from "crypto"
import { AuthError } from "next-auth"
import { headers } from "next/headers"
import { checkRateLimit, getRateLimitIdentifier } from "@/lib/rate-limit"

const ONE_MINUTE_MS = 60 * 1000
const ONE_HOUR_MS = 60 * ONE_MINUTE_MS

const AUTH_RATE_LIMITS = {
  signUp: { maxRequests: 5, windowMs: ONE_HOUR_MS },
  signIn: { maxRequests: 10, windowMs: 10 * ONE_MINUTE_MS },
  verifyEmail: { maxRequests: 8, windowMs: 15 * ONE_MINUTE_MS },
  resendVerificationCode: { maxRequests: 3, windowMs: ONE_HOUR_MS },
  sendPasswordResetLink: { maxRequests: 3, windowMs: ONE_HOUR_MS },
} as const

async function rateLimitAuthAction(params: {
  namespace: string
  identifier: string
  maxRequests: number
  windowMs: number
  message: string
}): Promise<{ success: true } | { success: false; error: string }> {
  const rate = await checkRateLimit(params.identifier, params.maxRequests, params.windowMs, {
    namespace: params.namespace,
  })

  if (rate.allowed) {
    return { success: true }
  }

  return {
    success: false,
    error: `${params.message} Please try again in ${rate.retryAfterSeconds} seconds.`,
  }
}

export async function signUp(input: SignUpInput): Promise<SignUpResult> {
  try {
    const requestHeaders = await headers()

    // Check if registration is enabled
    const registrationSetting = await prisma.systemSettings.findUnique({
      where: { key: "registration_enabled" }
    })

    if (registrationSetting && registrationSetting.value === "false") {
      return {
        success: false,
        error: "New user registration is currently disabled. Please check back later."
      }
    }

    // Validate input
    if (!input.agreeTerms) {
      return {
        success: false,
        error: "You must agree to the terms of service",
      }
    }

    if (input.password !== input.confirmPassword) {
      return {
        success: false,
        error: "Passwords do not match",
      }
    }

    const validatedData = signUpSchema.parse(input)

    const signUpRateLimit = await rateLimitAuthAction({
      namespace: "auth-signup",
      identifier: getRateLimitIdentifier({
        headers: requestHeaders,
        email: validatedData.email,
      }),
      maxRequests: AUTH_RATE_LIMITS.signUp.maxRequests,
      windowMs: AUTH_RATE_LIMITS.signUp.windowMs,
      message: "Too many sign up attempts.",
    })

    if (!signUpRateLimit.success) {
      return {
        success: false,
        error: signUpRateLimit.error,
      }
    }

    // Check if email already exists
    const existingEmail = await prisma.user.findUnique({
      where: { email: validatedData.email },
    })

    if (existingEmail) {
      return {
        success: false,
        error: "Email already registered. Please log in or use a different email.",
      }
    }

    // Check if username already exists
    const existingUsername = await prisma.user.findUnique({
      where: { username: validatedData.username },
    })

    if (existingUsername) {
      return {
        success: false,
        error: "Username already taken. Please choose another username.",
      }
    }

    // Hash password with bcrypt (matching NextAuth auth.ts bcrypt.compare logic)
    const hashedPassword = await bcrypt.hash(validatedData.password, 12)

    // Create new user
    const newUser = await prisma.user.create({
      data: {
        username: validatedData.username,
        email: validatedData.email,
        password: hashedPassword,
        role: "user",
        joinDate: new Date(),
        emailVerified: null, // Not verified yet
      },
    })

    // Generate and send verification code
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString()
    
    // Store verification code in database
    await prisma.emailVerification.create({
      data: {
        email: validatedData.email,
        code: verificationCode,
        expiresAt: new Date(Date.now() + 15 * 60 * 1000), // 15 minutes
      },
    })

    // Send verification email
    await sendEmail({
      to: validatedData.email,
      subject: "Verify Your Email - RbMarket",
      html: generateVerificationEmail(verificationCode, validatedData.username),
      text: `Welcome to RbMarket! Your verification code is: ${verificationCode}. This code will expire in 15 minutes.`,
    })

    return {
      success: true,
      userId: newUser.id,
    }
  } catch (error) {
    console.error("Error during signup:", error)

    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: error.errors[0]?.message || "Validation error",
      }
    }

    return {
      success: false,
      error: "Failed to create account. Please try again.",
    }
  }
}

export interface LoginResult {
  success: boolean
  error?: string
}

export async function signInWithCredentials(
  email: string,
  password: string
): Promise<LoginResult> {
  try {
    const requestHeaders = await headers()
    const normalizedEmail = email.trim().toLowerCase()

    const signInRateLimit = await rateLimitAuthAction({
      namespace: "auth-signin",
      identifier: getRateLimitIdentifier({
        headers: requestHeaders,
        email: normalizedEmail,
      }),
      maxRequests: AUTH_RATE_LIMITS.signIn.maxRequests,
      windowMs: AUTH_RATE_LIMITS.signIn.windowMs,
      message: "Too many login attempts.",
    })

    if (!signInRateLimit.success) {
      return {
        success: false,
        error: signInRateLimit.error,
      }
    }

    // 1. Remove 'redirect: false'. 
    // Auth.js v5 needs to control the redirect to update the session properly.
    await signIn("credentials", {
      email,
      password,
      redirect: false, // Where the user should go after success
    })

    // This line will actually never be reached on success 
    // because signIn throws a redirect error
    return { success: true }
    
  } catch (error) {
    // 2. Handle specific Auth.js errors
    if (error instanceof AuthError) {
      switch (error.type) {
        case "CredentialsSignin":
          return { success: false, error: "Invalid email or password." }
        default:
          return { success: false, error: "Something went wrong. Please try again." }
      }
    }

    // 3. CRITICAL: Re-throw the error if it is NOT an AuthError.
    // This allows the Next.js internal RedirectError to work and move the user to "/"
    throw error 
  }
}

// Verify email with code
export async function verifyEmail(email: string, code: string): Promise<{ success: boolean; error?: string }> {
  try {
    const requestHeaders = await headers()
    const normalizedEmail = email.trim().toLowerCase()

    const verifyRateLimit = await rateLimitAuthAction({
      namespace: "auth-verify-email",
      identifier: getRateLimitIdentifier({
        headers: requestHeaders,
        email: normalizedEmail,
      }),
      maxRequests: AUTH_RATE_LIMITS.verifyEmail.maxRequests,
      windowMs: AUTH_RATE_LIMITS.verifyEmail.windowMs,
      message: "Too many verification attempts.",
    })

    if (!verifyRateLimit.success) {
      return {
        success: false,
        error: verifyRateLimit.error,
      }
    }

    // Find verification code
    const verification = await prisma.emailVerification.findFirst({
      where: {
        email: normalizedEmail,
        code,
        expiresAt: {
          gt: new Date(),
        },
      },
    })

    if (!verification) {
      return {
        success: false,
        error: "Invalid or expired verification code",
      }
    }

    // Update user's emailVerified field
    await prisma.user.update({
      where: { email: normalizedEmail },
      data: { emailVerified: new Date() },
    })

    // Delete used verification code
    await prisma.emailVerification.delete({
      where: { id: verification.id },
    })

    return {
      success: true,
    }
  } catch (error) {
    console.error("Error verifying email:", error)
    return {
      success: false,
      error: "Failed to verify email. Please try again.",
    }
  }
}

// Resend verification code
export async function resendVerificationCode(email: string): Promise<{ success: boolean; error?: string }> {
  try {
    const requestHeaders = await headers()
    const normalizedEmail = email.trim().toLowerCase()

    const resendRateLimit = await rateLimitAuthAction({
      namespace: "auth-resend-verification",
      identifier: getRateLimitIdentifier({
        headers: requestHeaders,
        email: normalizedEmail,
      }),
      maxRequests: AUTH_RATE_LIMITS.resendVerificationCode.maxRequests,
      windowMs: AUTH_RATE_LIMITS.resendVerificationCode.windowMs,
      message: "Too many verification resend attempts.",
    })

    if (!resendRateLimit.success) {
      return {
        success: false,
        error: resendRateLimit.error,
      }
    }

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    })

    if (!user) {
      return {
        success: false,
        error: "User not found",
      }
    }

    if (user.emailVerified) {
      return {
        success: false,
        error: "Email already verified",
      }
    }

    // Delete old verification codes for this email
    await prisma.emailVerification.deleteMany({
      where: { email: normalizedEmail },
    })

    // Generate new verification code
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString()
    
    // Store verification code in database
    await prisma.emailVerification.create({
      data: {
        email: normalizedEmail,
        code: verificationCode,
        expiresAt: new Date(Date.now() + 15 * 60 * 1000), // 15 minutes
      },
    })

    // Send verification email
    await sendEmail({
      to: normalizedEmail,
      subject: "Verify Your Email - RbMarket",
      html: generateVerificationEmail(verificationCode, user.username),
      text: `Your new verification code is: ${verificationCode}. This code will expire in 15 minutes.`,
    })

    return {
      success: true,
    }
  } catch (error) {
    console.error("Error resending verification code:", error)
    return {
      success: false,
      error: "Failed to resend verification code. Please try again.",
    }
  }
}

// Send password reset link
export async function sendPasswordResetLink(email: string): Promise<{ success: boolean; error?: string }> {
  try {
    const requestHeaders = await headers()
    const normalizedEmail = email.trim().toLowerCase()

    const passwordResetRateLimit = await rateLimitAuthAction({
      namespace: "auth-password-reset-request",
      identifier: getRateLimitIdentifier({
        headers: requestHeaders,
        email: normalizedEmail,
      }),
      maxRequests: AUTH_RATE_LIMITS.sendPasswordResetLink.maxRequests,
      windowMs: AUTH_RATE_LIMITS.sendPasswordResetLink.windowMs,
      message: "Too many password reset requests.",
    })

    if (!passwordResetRateLimit.success) {
      return {
        success: false,
        error: passwordResetRateLimit.error,
      }
    }

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    })

    // Return error if user doesn't exist
    if (!user) {
      return {
        success: false,
        error: "No account found with this email address.",
      }
    }

    // Delete old password reset tokens for this email
    await prisma.passwordReset.deleteMany({
      where: { email: normalizedEmail },
    })

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString("hex")
    
    // Store reset token in database
    await prisma.passwordReset.create({
      data: {
        email: normalizedEmail,
        token: resetToken,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
      },
    })

    // Generate reset link
    const resetLink = `${process.env.NEXTAUTH_URL || "https://rbmarket.app"}/auth/reset-password?token=${resetToken}`

    // Send password reset email
    await sendEmail({
      to: normalizedEmail,
      subject: "Reset Your Password - RbMarket",
      html: generatePasswordResetEmail(resetLink, user.username),
      text: `Click the following link to reset your password: ${resetLink}. This link will expire in 1 hour.`,
    })

    return {
      success: true,
    }
  } catch (error) {
    console.error("Error sending password reset link:", error)
    return {
      success: false,
      error: "Failed to send password reset link. Please try again.",
    }
  }
}

// Verify reset token
export async function verifyResetToken(token: string): Promise<{ success: boolean; email?: string; error?: string }> {
  try {
    const resetToken = await prisma.passwordReset.findFirst({
      where: {
        token,
        expiresAt: {
          gt: new Date(),
        },
      },
    })

    if (!resetToken) {
      return {
        success: false,
        error: "Invalid or expired reset token",
      }
    }

    return {
      success: true,
      email: resetToken.email,
    }
  } catch (error) {
    console.error("Error verifying reset token:", error)
    return {
      success: false,
      error: "Failed to verify reset token. Please try again.",
    }
  }
}

// Reset password with token
export async function resetPassword(token: string, newPassword: string): Promise<{ success: boolean; error?: string }> {
  try {
    // Find and validate reset token
    const resetToken = await prisma.passwordReset.findFirst({
      where: {
        token,
        expiresAt: {
          gt: new Date(),
        },
      },
    })

    if (!resetToken) {
      return {
        success: false,
        error: "Invalid or expired reset token",
      }
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 12)

    // Update user's password and verify email (since they proved ownership via email link)
    await prisma.user.update({
      where: { email: resetToken.email },
      data: { 
        password: hashedPassword,
        emailVerified: new Date(), // Mark email as verified
      },
    })

    // Delete used reset token
    await prisma.passwordReset.delete({
      where: { id: resetToken.id },
    })

    return {
      success: true,
    }
  } catch (error) {
    console.error("Error resetting password:", error)
    return {
      success: false,
      error: "Failed to reset password. Please try again.",
    }
  }
}

// Check if user email is verified
export async function checkEmailVerification(email: string): Promise<{ verified: boolean }> {
  try {
    const user = await prisma.user.findUnique({
      where: { email },
      select: { emailVerified: true },
    })

    return {
      verified: !!user?.emailVerified,
    }
  } catch (error) {
    console.error("Error checking email verification:", error)
    return {
      verified: false,
    }
  }
  
}

export async function doesUserExist(email: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true },
  })
  return !!user
}
