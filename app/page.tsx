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
  const title = "RbMarket | Roblox Items, Currency, and Trusted Traders"
  const description =
    "Trade Roblox items and game currency on RbMarket with community trust signals, seller profiles, and safer peer-to-peer workflows."

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
      "Roblox item trading",
      "Roblox currency trading",
      "trusted Roblox sellers",
      "peer to peer marketplace",
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
          alt: "RbMarket social preview",
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
      <OrganizationJsonLd />
      <WebsiteJsonLd />
      <HomePageClient />
    </>
  )
}
