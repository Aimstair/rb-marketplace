import type { Metadata } from "next"
import { OrganizationJsonLd, WebPageJsonLd } from "@/components/json-ld"

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
  const title = "Roblox Marketplace Price Trends — Pets, Items & Units | RbMarket"
  const description =
    "Track Roblox marketplace trends: pet prices, item demand, currency unit rates, and active trader activity across all major Roblox games on RbMarket."

  return {
    metadataBase: new URL(siteUrl),
    title,
    description,
    alternates: {
      canonical: "/trends",
    },
    keywords: [
      "RbMarket trends",
      "Roblox marketplace trends",
      "Roblox sell pets price",
      "Roblox sell units price",
      "Roblox item prices",
      "Roblox currency rates",
      "Roblox buy and sell trends",
      "trading insights",
    ],
    openGraph: {
      title,
      description,
      url: `${siteUrl}/trends`,
      type: "website",
      siteName: "RbMarket",
      images: [
        {
          url: "/trends/opengraph-image",
          width: 1200,
          height: 630,
          alt: "RbMarket Roblox marketplace trends",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: ["/trends/opengraph-image"],
    },
  }
}

export default function TrendsLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <OrganizationJsonLd />
      <WebPageJsonLd
        name="RbMarket Trends"
        description="Marketplace trend dashboards for Roblox item and currency trading activity on RbMarket."
        path="/trends"
      />
      {children}
    </>
  )
}
