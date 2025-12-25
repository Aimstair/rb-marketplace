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
          throw new Error("Invalid credentials")
        }

        // Check if user is banned
        if (user.isBanned) {
          throw new Error("Your account has been banned")
        }

        // Check if email is verified
        if (!user.emailVerified) {
          throw new Error("Please verify your email before logging in")
        }

        // Check if account is locked
        if (user.lockedUntil && user.lockedUntil > new Date()) {
          const remainingMinutes = Math.ceil((user.lockedUntil.getTime() - Date.now()) / 1000 / 60)
          throw new Error(`Account locked due to failed login attempts. Try again in ${remainingMinutes} minute(s)`)
        }

        // Verify password
        const passwordMatch = await bcrypt.compare(
          credentials.password as string,
          user.password || ""
        )

        if (!passwordMatch) {
          // Get failed login lockout setting
          const lockoutSetting = await prisma.systemSettings.findUnique({
            where: { key: "failed_login_lockout" },
          })
          const maxAttempts = lockoutSetting ? parseInt(lockoutSetting.value) : 5

          // Increment failed login attempts
          const failedAttempts = (user.failedLoginAttempts || 0) + 1
          
          // Lock account if max attempts reached
          if (failedAttempts >= maxAttempts) {
            await prisma.user.update({
              where: { id: user.id },
              data: {
                failedLoginAttempts: failedAttempts,
                lockedUntil: new Date(Date.now() + 15 * 60 * 1000), // Lock for 15 minutes
              },
            })
            throw new Error("Too many failed attempts. Account locked for 15 minutes")
          } else {
            // Just increment the counter
            await prisma.user.update({
              where: { id: user.id },
              data: { failedLoginAttempts: failedAttempts },
            })
            throw new Error(`Invalid password. ${maxAttempts - failedAttempts} attempt(s) remaining`)
          }
        }

        // Reset failed login attempts on successful login
        if (user.failedLoginAttempts > 0 || user.lockedUntil) {
          await prisma.user.update({
            where: { id: user.id },
            data: {
              failedLoginAttempts: 0,
              lockedUntil: null,
            },
          })
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
  },
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id
        token.username = user.name
        token.role = user.role
        token.picture = user.image
      }
      
      // Update token when session is updated (e.g., profile picture change)
      if (trigger === "update" && session) {
        // Fetch fresh user data from database
        const updatedUser = await prisma.user.findUnique({
          where: { id: token.id as string },
          select: {
            profilePicture: true,
            username: true,
          },
        })
        
        if (updatedUser) {
          token.picture = updatedUser.profilePicture
          token.username = updatedUser.username
        }
      }
      
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string
        session.user.username = token.username as string
        session.user.role = token.role as string
        session.user.image = token.picture as string
      }
      return session
    },
  },
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  secret: process.env.NEXTAUTH_SECRET,
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
