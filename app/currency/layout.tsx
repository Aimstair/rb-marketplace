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
  const title = "Currency Marketplace - Roblox Game Currencies"
  const description = "Find Roblox game currency offers with transparent exchange rates, seller vouches, and stock visibility on RB Marketplace."

  return {
    title,
    description,
    metadataBase: new URL(siteUrl),
    alternates: {
      canonical: "/currency",
    },
    keywords: ["Roblox currency", "buy game currency", "currency marketplace", "Robux trading"],
    openGraph: {
      title,
      description,
      url: `${siteUrl}/currency`,
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  }
}

export default function CurrencyLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}