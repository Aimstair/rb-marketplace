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
  const title = "Subscriptions - RB Marketplace"
  const description = "Compare Free, Pro, and Elite plans to boost listing visibility, featured placement, and seller growth on RB Marketplace."

  return {
    title,
    description,
    metadataBase: new URL(siteUrl),
    alternates: {
      canonical: "/subscriptions",
    },
    keywords: ["RB Marketplace subscriptions", "Pro plan", "Elite plan", "featured listings"],
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
