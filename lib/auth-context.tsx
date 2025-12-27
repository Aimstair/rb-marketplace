"use client"

import { createContext, useContext, useEffect, useState, type ReactNode } from "react"
import { useSession, signOut as nextAuthSignOut } from "next-auth/react"

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

export function AuthProvider({ children }: { children: ReactNode }) {
  const { data: session, status } = useSession()
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (status === "loading") {
      setIsLoading(true)
      return
    } 
    
    if (session?.user) {
      // Convert NextAuth session to local User format
      const sessionUser = session.user as any
      setUser({
        id: sessionUser.id || "",
        username: sessionUser.username || session.user.name || "",
        email: session.user.email || "",
        role: sessionUser.role || "user", // Now reads from session.user.role
        profilePicture: session.user.image || undefined,
        banner: undefined, // TODO: Fetch from database
        bio: undefined, // TODO: Fetch from database
        joinDate: new Date().toISOString().split("T")[0], // TODO: Fetch  from database
        vouches: {
          total: 0, // TODO: Fetch from database
          buyer: 0,
          seller: 0,
        },
        badges: [], // TODO: Fetch from database
        robloxProfile: undefined, // TODO: Fetch from database
        discordTag: undefined, // TODO: Fetch from database
      })
    } else {
      setUser(null)
    }
    setIsLoading(false)
  }, [session, status])

  const login = async (email: string, password: string) => {
    // This is now handled by NextAuth signIn
    throw new Error("Use signIn from next-auth/react instead")
  }

  const logout = async () => {
    await nextAuthSignOut({ redirect: true, callbackUrl: "/auth/login" })
  }

  const signup = async (email: string, password: string, username: string) => {
    throw new Error("Signup should be handled by dedicated signup endpoint")
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
