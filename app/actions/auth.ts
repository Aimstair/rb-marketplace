"use server"

import { prisma } from "@/lib/prisma"
import bcrypt from "bcrypt"
import { z } from "zod"
import { signUpSchema, type SignUpInput, type SignUpResult } from "@/lib/schemas"
import { signIn } from "@/auth"

export async function signUp(input: SignUpInput): Promise<SignUpResult> {
  try {
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
      },
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
