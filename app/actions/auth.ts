"use server"

import { prisma } from "@/lib/prisma"
import bcrypt from "bcrypt"
import { z } from "zod"
import { signUpSchema, type SignUpInput, type SignUpResult } from "@/lib/schemas"
import { signIn } from "@/auth"
import { sendEmail, generateVerificationEmail, generatePasswordResetEmail } from "@/lib/email"
import crypto from "crypto"

export async function signUp(input: SignUpInput): Promise<SignUpResult> {
  try {
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
      subject: "Verify Your Email - RobloxTrade",
      html: generateVerificationEmail(verificationCode, validatedData.username),
      text: `Welcome to RobloxTrade! Your verification code is: ${verificationCode}. This code will expire in 15 minutes.`,
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
    // Call NextAuth signIn with redirect disabled
    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    })

    if (result?.error) {
      return {
        success: false,
        error: result.error,
      }
    }

    return {
      success: true,
    }
  } catch (error) {
    console.error("Error during login:", error)
    return {
      success: false,
      error: "Failed to sign in. Please try again.",
    }
  }
}

// Verify email with code
export async function verifyEmail(email: string, code: string): Promise<{ success: boolean; error?: string }> {
  try {
    // Find verification code
    const verification = await prisma.emailVerification.findFirst({
      where: {
        email,
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
      where: { email },
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
    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { email },
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
      where: { email },
    })

    // Generate new verification code
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString()
    
    // Store verification code in database
    await prisma.emailVerification.create({
      data: {
        email,
        code: verificationCode,
        expiresAt: new Date(Date.now() + 15 * 60 * 1000), // 15 minutes
      },
    })

    // Send verification email
    await sendEmail({
      to: email,
      subject: "Verify Your Email - RobloxTrade",
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
    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { email },
    })

    // Always return success to prevent email enumeration
    if (!user) {
      return {
        success: true,
      }
    }

    // Delete old password reset tokens for this email
    await prisma.passwordReset.deleteMany({
      where: { email },
    })

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString("hex")
    
    // Store reset token in database
    await prisma.passwordReset.create({
      data: {
        email,
        token: resetToken,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
      },
    })

    // Generate reset link
    const resetLink = `${process.env.NEXTAUTH_URL || "http://localhost:3000"}/auth/reset-password?token=${resetToken}`

    // Send password reset email
    await sendEmail({
      to: email,
      subject: "Reset Your Password - RobloxTrade",
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

    // Update user's password
    await prisma.user.update({
      where: { email: resetToken.email },
      data: { password: hashedPassword },
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
