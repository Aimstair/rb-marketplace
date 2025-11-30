import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import { PrismaAdapter } from "@auth/prisma-adapter"
import { prisma } from "@/lib/prisma"
import bcrypt from "bcrypt"

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  providers: [
    Credentials({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email", placeholder: "user@example.com" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        // Validate credentials object
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Email and password required")
        }

        // Find user by email
        const user = await prisma.user.findUnique({
          where: { email: credentials.email as string },
        })

        if (!user) {
          throw new Error("User not found")
        }

        // Check if user is banned
        if (user.isBanned) {
          throw new Error("Your account has been banned")
        }

        // Verify password
        const passwordMatch = await bcrypt.compare(
          credentials.password as string,
          user.password || ""
        )

        if (!passwordMatch) {
          throw new Error("Invalid password")
        }

        // Return user object for session
        return {
          id: user.id,
          email: user.email,
          name: user.username,
          image: user.profilePicture,
          role: user.role,
        }
      },
    }),
  ],
  pages: {
    signIn: "/auth/login",
    error: "/auth/login",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.username = user.name
        token.role = user.role
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string
        session.user.username = token.username as string
        session.user.role = token.role as string
      }
      return session
    },
  },
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  events: {
    async signIn({ user }) {
      // Update last active timestamp
      if (user.id) {
        await prisma.user.update({
          where: { id: user.id },
          data: { lastActive: new Date() },
        })
      }
    },
  },
})
