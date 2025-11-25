"use client"

import { createContext, useContext, useState, type ReactNode } from "react"

export interface User {
  id: string
  username: string
  email: string
  role: "user" | "admin"
  profilePicture?: string
  banner?: string
  bio?: string
  joinDate: string
  vouches: {
    total: number
    buyer: number
    seller: number
  }
  badges: string[]
  robloxProfile?: string
  discordTag?: string
}

interface AuthContextType {
  user: User | null
  isLoading: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => void
  signup: (email: string, password: string, username: string) => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

const DUMMY_ACCOUNTS = {
  user: {
    id: "user-1",
    username: "TrustedTrader",
    email: "user@test.com",
    password: "password123",
    role: "user" as const,
    profilePicture: "/diverse-user-avatars.png",
    banner: "/profile-banner.png",
    bio: "Active Roblox trader with 2+ years experience. Specializing in limited items and currency. Fast and safe trades!",
    joinDate: "2022-03-15",
    vouches: {
      total: 156,
      buyer: 89,
      seller: 67,
    },
    badges: ["Verified Seller", "Pro"],
    robloxProfile: "TrustedTrader_123",
    discordTag: "TrustedTrader#1234",
  },
  admin: {
    id: "admin-1",
    username: "AdminModerator",
    email: "admin@test.com",
    password: "admin123",
    role: "admin" as const,
    profilePicture: "/admin-avatar.png",
    banner: "/admin-banner.jpg",
    bio: "RobloxTrade Admin & Moderator. Here to ensure safe and fair trading for all users.",
    joinDate: "2021-01-01",
    vouches: {
      total: 500,
      buyer: 250,
      seller: 250,
    },
    badges: ["Verified Seller", "Elite", "Admin"],
    robloxProfile: "AdminMod_RobloxTrade",
  },
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const login = async (email: string, password: string) => {
    setIsLoading(true)
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 500))

    let foundUser: typeof DUMMY_ACCOUNTS.user | null = null
    if (email === DUMMY_ACCOUNTS.user.email && password === DUMMY_ACCOUNTS.user.password) {
      foundUser = DUMMY_ACCOUNTS.user
    } else if (email === DUMMY_ACCOUNTS.admin.email && password === DUMMY_ACCOUNTS.admin.password) {
      foundUser = DUMMY_ACCOUNTS.admin
    }

    if (foundUser) {
      const { password: _, ...userWithoutPassword } = foundUser
      setUser(userWithoutPassword as User)
    } else {
      throw new Error("Invalid email or password")
    }
    setIsLoading(false)
  }

  const logout = () => {
    setUser(null)
  }

  const signup = async (email: string, password: string, username: string) => {
    setIsLoading(true)
    await new Promise((resolve) => setTimeout(resolve, 500))

    const newUser: User = {
      id: `user-${Date.now()}`,
      username,
      email,
      role: "user",
      profilePicture: "/abstract-user-avatar.png",
      banner: "/profile-banner.png",
      bio: "",
      joinDate: new Date().toISOString().split("T")[0],
      vouches: {
        total: 0,
        buyer: 0,
        seller: 0,
      },
      badges: [],
    }

    setUser(newUser)
    setIsLoading(false)
  }

  return <AuthContext.Provider value={{ user, isLoading, login, logout, signup }}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
