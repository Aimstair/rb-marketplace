// next-auth-provider.tsx
"use client"

import { SessionProvider } from "next-auth/react"
import type { ReactNode } from "react"
import type { Session } from "next-auth"

interface NextAuthProviderProps {
  children: ReactNode
  session?: Session | null // Accept session from server
}

export function NextAuthProvider({ children, session }: NextAuthProviderProps) {
  return <SessionProvider session={session}>{children}</SessionProvider>
}