import { Metadata } from "next"

const DEFAULT_SITE_URL = "https://rbmarket.app"

function getSiteUrl(): string {
  const candidate = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || DEFAULT_SITE_URL
  try {
    return new URL(candidate).toString().replace(/\/$/, "")
  } catch {
    return DEFAULT_SITE_URL
  }
}

export async function generateMetadata(): Promise<Metadata> {
  const siteUrl = getSiteUrl()
  const title = "Marketplace - Buy and Sell Roblox Items"
  const description = "Browse Roblox item listings by game, category, and price. Connect with trusted traders and complete deals safely on RB Marketplace."

  return {
    title,
    description,
    metadataBase: new URL(siteUrl),
    alternates: {
      canonical: "/marketplace",
    },
    keywords: ["Roblox marketplace", "buy Roblox items", "sell Roblox items", "Roblox trading"],
    openGraph: {
      title,
      description,
      url: `${siteUrl}/marketplace`,
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  }
}

export default function MarketplaceLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}