import type React from "react"
import type { Metadata } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import { AuthProvider } from "@/lib/auth-context"
import { NextAuthProvider } from "@/lib/next-auth-provider"
import { ThemeProvider } from "@/components/theme-provider"
import { Toaster } from "@/components/ui/toaster"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation" 
import { headers } from "next/headers"
import { auth } from "@/auth"
import "./globals.css"

const _geist = Geist({ subsets: ["latin"] })
const _geistMono = Geist_Mono({ subsets: ["latin"] })
const DEFAULT_SITE_URL = "https://rbmarket.app"

function getSiteUrl(): string {
  const candidate = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || DEFAULT_SITE_URL
  try {
    return new URL(candidate).toString().replace(/\/$/, "")
  } catch {
    return DEFAULT_SITE_URL
  }
}

async function getSystemSetting(key: string) {
  try {
    return await prisma.systemSettings.findUnique({ where: { key } })
  } catch (error) {
    console.error(`Error fetching system setting (${key}):`, error)
    return null
  }
}

async function getMetadata(): Promise<Metadata> {
  try {
    const [siteNameSetting, siteDescSetting] = await Promise.all([
      getSystemSetting("site_name"),
      getSystemSetting("site_description")
    ])

    const siteName = siteNameSetting?.value || "RbMarket"
    const siteDescription = siteDescSetting?.value || "Peer-to-peer marketplace for trading Roblox items anonymously. Browse listings, connect with sellers, and build trust through our vouch system."
    const siteUrl = getSiteUrl()

    return {
      metadataBase: new URL(siteUrl),
      title: siteName,
      description: siteDescription,
      applicationName: siteName,
      keywords: [
        "RbMarket",
        "Roblox marketplace",
        "buy Roblox items",
        "sell Roblox items",
        "Roblox currency",
        "trusted Roblox trading",
      ],
      robots: {
        index: true,
        follow: true,
        googleBot: {
          index: true,
          follow: true,
          "max-image-preview": "large",
          "max-snippet": -1,
          "max-video-preview": -1,
        },
      },
      alternates: {
        canonical: "/",
      },
      openGraph: {
        title: siteName,
        description: siteDescription,
        type: "website",
        siteName,
        url: siteUrl,
      },
      twitter: {
        card: "summary_large_image",
        title: siteName,
        description: siteDescription,
      },
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
    const siteUrl = getSiteUrl()
    return {
      metadataBase: new URL(siteUrl),
      title: "RbMarket - Buy & Sell Roblox Items Safely",
      description: "Peer-to-peer marketplace for trading Roblox items anonymously. Browse listings, connect with sellers, and build trust through our vouch system.",
      applicationName: "RbMarket",
      keywords: [
        "RbMarket",
        "Roblox marketplace",
        "buy Roblox items",
        "sell Roblox items",
        "Roblox currency",
        "trusted Roblox trading",
      ],
      robots: {
        index: true,
        follow: true,
        googleBot: {
          index: true,
          follow: true,
          "max-image-preview": "large",
          "max-snippet": -1,
          "max-video-preview": -1,
        },
      },
      alternates: {
        canonical: "/",
      },
      openGraph: {
        title: "RbMarket - Buy & Sell Roblox Items Safely",
        description: "Peer-to-peer marketplace for trading Roblox items anonymously. Browse listings, connect with sellers, and build trust through our vouch system.",
        type: "website",
        siteName: "RbMarket",
        url: siteUrl,
      },
      twitter: {
        card: "summary_large_image",
        title: "RbMarket - Buy & Sell Roblox Items Safely",
        description: "Peer-to-peer marketplace for trading Roblox items anonymously. Browse listings, connect with sellers, and build trust through our vouch system.",
      },
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

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const [session, maintenanceSetting] = await Promise.all([
    auth().catch((error) => {
      console.error("Error fetching auth session:", error)
      return null
    }),
    getSystemSetting("maintenance_mode")
  ])

  const isMaintenance = maintenanceSetting?.value === "true"
  
  // 2. Determine if we are on the maintenance page
  const headerList = await headers()
  const fullUrl = headerList.get("x-url") || ""
  const isMaintenancePage = fullUrl.includes("/maintenance")

  // 3. Maintenance Redirect Logic
  if (isMaintenance && session?.user?.role !== "admin" && !isMaintenancePage) {
    redirect("/maintenance")
  }

  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`font-sans antialiased`}>
        <NextAuthProvider session={session}>
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
