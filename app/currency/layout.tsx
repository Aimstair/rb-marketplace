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
  const title = "Buy Roblox In-Game Currency with GCash: Live Rates"
  const description = "Compare live rates per ₱1 for Roblox in-game currency like Sheckles, Gems and Coins. Vouched sellers, stock and order limits shown, pay with GCash or PayPal."

  return {
    title,
    description,
    metadataBase: new URL(siteUrl),
    alternates: {
      canonical: "/currency",
    },
    keywords: ["buy Roblox currency Philippines", "Grow a Garden Sheckles for sale", "Roblox in-game currency GCash", "Roblox currency rates"],
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