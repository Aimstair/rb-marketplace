import type React from "react"
import type { Metadata, Viewport } from "next"
import { Inter } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import { SpeedInsights } from "@vercel/speed-insights/next"
import { AuthProvider } from "@/lib/auth-context"
import { NextAuthProvider } from "@/lib/next-auth-provider"
import { ThemeProvider } from "@/components/theme-provider"
import { Toaster } from "@/components/ui/toaster"
import { SiteChrome } from "@/components/site/site-chrome"
import { SiteFooter } from "@/components/site/site-footer"
import { getSystemSettingValue } from "@/lib/system-settings"
import { redirect } from "next/navigation" 
import { headers } from "next/headers"
import { auth } from "@/auth"
import { SiteJsonLd } from "@/components/json-ld"
import { SITE_DESCRIPTION, SITE_LOCALE, SITE_NAME, getSiteUrl } from "@/lib/seo"
import "./globals.css"

const inter = Inter({ subsets: ["latin"], display: "swap", variable: "--font-inter" })

// Served from a cross-request cache: this runs for metadata and the layout on every page.
async function getSystemSetting(key: string) {
  const value = await getSystemSettingValue(key)
  return value === undefined ? null : { value }
}

const SITE_KEYWORDS = [
  "Roblox marketplace",
  "Roblox marketplace Philippines",
  "Roblox buy and sell",
  "buy and sell Roblox items",
  "sell Roblox items for cash",
  "Roblox items GCash",
  "Roblox trading Philippines",
  "Grow a Garden buy and sell",
  "Steal a Brainrot for sale",
  "MM2 items for sale",
  "Blox Fruits for sale",
  "Adopt Me pets for sale",
  "Roblox limiteds",
  "RbMarket",
]

const SAME_AS = (process.env.NEXT_PUBLIC_SOCIAL_LINKS || "")
  .split(",")
  .map((url) => url.trim())
  .filter((url) => /^https?:\/\//i.test(url))

export const metadata: Metadata = {
  metadataBase: new URL(getSiteUrl()),
  title: {
    default: `${SITE_NAME}: Buy & Sell Roblox Items in the Philippines`,
    template: `%s | ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  keywords: SITE_KEYWORDS,
  category: "shopping",
  creator: SITE_NAME,
  publisher: SITE_NAME,
  formatDetection: { telephone: false, email: false, address: false },
  // No site-wide canonical: each page declares its own, otherwise every page would point at "/"
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
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    locale: SITE_LOCALE,
    title: `${SITE_NAME}: Buy & Sell Roblox Items in the Philippines`,
    description: SITE_DESCRIPTION,
  },
  twitter: {
    card: "summary_large_image",
    title: `${SITE_NAME}: Buy & Sell Roblox Items in the Philippines`,
    description: SITE_DESCRIPTION,
  },
  verification: {
    google: process.env.GOOGLE_SITE_VERIFICATION || undefined,
    other: process.env.BING_SITE_VERIFICATION ? { "msvalidate.01": process.env.BING_SITE_VERIFICATION } : undefined,
  },
  icons: {
    icon: [
      { url: "/favicon-48.png", sizes: "48x48", type: "image/png" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
    ],
    apple: "/apple-icon.png",
  },
}


export const viewport: Viewport = {
  themeColor: "#000000",
  colorScheme: "dark",
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
    <html lang="en-PH" className={`dark ${inter.variable}`} suppressHydrationWarning>
      <body className="font-sans antialiased">
        <SiteJsonLd sameAs={SAME_AS} />
        <NextAuthProvider session={session}>
          <ThemeProvider attribute="class" forcedTheme="dark" defaultTheme="dark" disableTransitionOnChange>
            <AuthProvider>
              <SiteChrome footer={<SiteFooter />}>{children}</SiteChrome>
            </AuthProvider>
            <Toaster />
          </ThemeProvider>
        </NextAuthProvider>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  )
}
