import type { DefaultSession } from "next-auth"

declare module "next-auth" {
  interface Session {
    user: {
      id: string
      role: string
      username: string
    } & DefaultSession["user"]
  }

  interface User {
    id: string
    email: string
    username: string
    role: string
    profilePicture: string | null
    isBanned: boolean
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string
    username: string
    role: string
  }
}
