import NextAuth, { CredentialsSignin } from "next-auth"
import Credentials from "next-auth/providers/credentials"
import { PrismaAdapter } from "@auth/prisma-adapter"
import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"
import { findUserByEmail } from "@/lib/user-email"

// Auth.js only passes CredentialsSignin errors (and their `code`) back to the sign-in action;
// anything else surfaces as a generic configuration error.
class InvalidLogin extends CredentialsSignin {
  code = "invalid_credentials"
}
class LockedLogin extends CredentialsSignin {
  code = "locked"
}
class BannedLogin extends CredentialsSignin {
  code = "banned"
}
class UnverifiedLogin extends CredentialsSignin {
  code = "unverified"
}


export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma) as any,
  providers: [
    Credentials({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email", placeholder: "user@example.com" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials, _request) {
        // Wrong email and wrong password get the same error so the form never reveals which
        // emails have accounts. Ban and verification status only show once the password is right.
        if (!credentials?.email || !credentials?.password) {
          throw new InvalidLogin()
        }

        const user = await findUserByEmail(credentials.email as string)
        if (!user) {
          throw new InvalidLogin()
        }

        if (user.lockedUntil && user.lockedUntil > new Date()) {
          throw new LockedLogin()
        }

        const passwordMatch = await bcrypt.compare(credentials.password as string, user.password || "")

        if (!passwordMatch) {
          const lockoutSetting = await prisma.systemSettings.findUnique({
            where: { key: "failed_login_lockout" },
          })
          const maxAttempts = lockoutSetting ? parseInt(lockoutSetting.value) : 5
          const failedAttempts = (user.failedLoginAttempts || 0) + 1

          if (failedAttempts >= maxAttempts) {
            await prisma.user.update({
              where: { id: user.id },
              data: {
                failedLoginAttempts: failedAttempts,
                lockedUntil: new Date(Date.now() + 15 * 60 * 1000), // Lock for 15 minutes
              },
            })
            throw new LockedLogin()
          }

          await prisma.user.update({
            where: { id: user.id },
            data: { failedLoginAttempts: failedAttempts },
          })
          throw new InvalidLogin()
        }

        if (user.isBanned) {
          throw new BannedLogin()
        }

        if (!user.emailVerified) {
          throw new UnverifiedLogin()
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
          username: user.username,
          image: user.profilePicture,
          profilePicture: user.profilePicture,
          role: user.role,
          isBanned: user.isBanned,
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
  session: { strategy: "jwt" }, // Force JWT even with adapter
  secret: process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET,
  trustHost: true, // Crucial for production stability
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
