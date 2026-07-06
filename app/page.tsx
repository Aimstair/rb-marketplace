import type { Metadata } from "next"
import HomePageClient from "@/components/home-page-client"
import { OrganizationJsonLd, WebsiteJsonLd } from "@/components/json-ld"

const DEFAULT_SITE_URL = "https://rbmarket.app"

function getSiteUrl(): string {
  const candidate = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || DEFAULT_SITE_URL
  try {
    return new URL(candidate).toString().replace(/\/$/, "")
  } catch {
    return DEFAULT_SITE_URL
  }
}

export function generateMetadata(): Metadata {
  const siteUrl = getSiteUrl()
  const title = "RbMarket | Buy & Sell Roblox Pets, Items & Units for Cash"
  const description =
    "RbMarket is the trusted Roblox marketplace to buy and sell Roblox pets, game items, and in-game units for cash. Connect with verified traders and sell your Roblox items safely."

  return {
    metadataBase: new URL(siteUrl),
    title,
    description,
    alternates: {
      canonical: "/",
    },
    keywords: [
      "RbMarket",
      "Roblox marketplace",
      "Roblox buy and sell",
      "Roblox sell for cash",
      "Roblox sell pets",
      "Roblox sell units",
      "Roblox item trading",
      "Roblox currency trading",
      "Roblox pet marketplace",
      "trusted Roblox sellers",
      "peer to peer Roblox marketplace",
    ],
    openGraph: {
      title,
      description,
      url: siteUrl,
      type: "website",
      siteName: "RbMarket",
      images: [
        {
          url: "/opengraph-image",
          width: 1200,
          height: 630,
          alt: "RbMarket — Roblox buy and sell marketplace",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: ["/opengraph-image"],
    },
  }
}

export default function HomePage() {
  return (
    <>
      <OrganizationJsonLd
        description="RbMarket is the trusted peer-to-peer Roblox marketplace to buy and sell Roblox pets, items, and in-game units for cash."
      />
      <WebsiteJsonLd
        description="Buy and sell Roblox pets, game items, and in-game units for cash on RbMarket — the trusted Roblox marketplace."
      />
      <HomePageClient />
    </>
  )
}
