"use client"

import { useSession, signOut as nextAuthSignOut } from "next-auth/react"
import { signIn } from "next-auth/react"
import { createContext, useContext, type ReactNode } from "react"
import { useRouter } from "next/navigation"

export interface User {
  id: string
  username: string
  email: string
  role: "user" | "admin"
  profilePicture?: string
  banner?: string
  bio?: string
  joinDate?: string
  vouches?: {
    total: number
    buyer: number
    seller: number
  }
  badges?: string[]
  robloxProfile?: string
  discordTag?: string
}

interface AuthContextType {
  user: User | null
  isLoading: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => void
  signup?: (email: string, password: string, username: string) => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const { data: session, status } = useSession()
  const router = useRouter()
  const isLoading = status === "loading"

  const user: User | null = session?.user
    ? {
        id: (session.user as any).id || "",
        username: session.user.name || "",
        email: session.user.email || "",
        role: ((session.user as any).role as "user" | "admin") || "user",
        profilePicture: session.user.image || undefined,
      }
    : null

  const login = async (email: string, password: string) => {
    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    })

    if (result?.error) {
      throw new Error(result.error)
    }

    router.push("/marketplace")
  }

  const logout = async () => {
    await nextAuthSignOut({ redirect: false })
    router.push("/")
  }

  return <AuthContext.Provider value={{ user, isLoading, login, logout }}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
