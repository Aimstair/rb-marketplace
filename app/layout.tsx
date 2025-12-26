import type React from "react"
import type { Metadata } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import { AuthProvider } from "@/lib/auth-context"
import { NextAuthProvider } from "@/lib/next-auth-provider"
import { ThemeProvider } from "@/components/theme-provider"
import { Toaster } from "@/components/ui/toaster"
import { prisma } from "@/lib/prisma"
import "./globals.css"

const _geist = Geist({ subsets: ["latin"] })
const _geistMono = Geist_Mono({ subsets: ["latin"] })

async function getMetadata(): Promise<Metadata> {
  try {
    const [siteNameSetting, siteDescSetting] = await Promise.all([
      prisma.systemSettings.findUnique({ where: { key: "site_name" } }),
      prisma.systemSettings.findUnique({ where: { key: "site_description" } })
    ])

    const siteName = siteNameSetting?.value || "RbMarket"
    const siteDescription = siteDescSetting?.value || "Peer-to-peer marketplace for trading Roblox items anonymously. Browse listings, connect with sellers, and build trust through our vouch system."

    return {
      title: siteName,
      description: siteDescription,
      generator: "Aerox Software",
      icons: {
        icon: [
          {
            url: "/logo.png",
            media: "(prefers-color-scheme: light)",
          },
          {
            url: "/logo.png",
            media: "(prefers-color-scheme: dark)",
          },
          {
            url: "/logo.png",
            type: "image/png",
          },
        ],
        apple: "/logo.png",
      },
    }
  } catch (error) {
    console.error("Error fetching metadata settings:", error)
    // Return defaults if there's an error
    return {
      title: "RbMarket - Buy & Sell Roblox Items Safely",
      description: "Peer-to-peer marketplace for trading Roblox items anonymously. Browse listings, connect with sellers, and build trust through our vouch system.",
      generator: "Aerox Software",
      icons: {
        icon: [
          {
            url: "/logo.png",
            media: "(prefers-color-scheme: light)",
          },
          {
            url: "/logo.png",
            media: "(prefers-color-scheme: dark)",
          },
          {
            url: "/logo.png",
            type: "image/png",
          },
        ],
        apple: "/logo.png",
      },
    }
  }
}

export async function generateMetadata(): Promise<Metadata> {
  return getMetadata()
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`font-sans antialiased`}>
        <NextAuthProvider>
          <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
            <AuthProvider>{children}</AuthProvider>
            <Toaster />
          </ThemeProvider>
        </NextAuthProvider>
        <Analytics />
      </body>
    </html>
  )
}
