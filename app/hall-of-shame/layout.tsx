import type { Metadata } from "next"
import { CollectionPageJsonLd, OrganizationJsonLd } from "@/components/json-ld"

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
  const title = "Hall of Shame Reports and Scam Records | RbMarket"
  const description =
    "Review community-maintained scam reports, aliases, and payment identifiers to make safer Roblox trades on RbMarket."

  return {
    metadataBase: new URL(siteUrl),
    title,
    description,
    alternates: {
      canonical: "/hall-of-shame",
    },
    keywords: [
      "RbMarket Hall of Shame",
      "Roblox scam reports",
      "trade safety",
      "payment identifier checks",
      "community scam records",
    ],
    openGraph: {
      title,
      description,
      url: `${siteUrl}/hall-of-shame`,
      type: "website",
      siteName: "RbMarket",
      images: [
        {
          url: "/hall-of-shame/opengraph-image",
          width: 1200,
          height: 630,
          alt: "RbMarket hall of shame social preview",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: ["/hall-of-shame/opengraph-image"],
    },
  }
}

export default function HallOfShameLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <OrganizationJsonLd />
      <CollectionPageJsonLd
        name="RbMarket Hall of Shame"
        description="Collection of community-maintained scam reports and incident records for safer Roblox trading."
        path="/hall-of-shame"
      />
      {children}
    </>
  )
}
