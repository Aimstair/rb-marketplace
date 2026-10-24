import type { Metadata } from "next"

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
  const title = "Seller Plans and Listing Boosts"
  const description = "Compare RbMarket Free, Pro and Elite plans for sellers: featured placement, more visibility and boosts for your Roblox listings. Prices in pesos."

  return {
    title,
    description,
    metadataBase: new URL(siteUrl),
    alternates: {
      canonical: "/subscriptions",
    },
    openGraph: {
      title,
      description,
      url: `${siteUrl}/subscriptions`,
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  }
}

export default function SubscriptionsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
