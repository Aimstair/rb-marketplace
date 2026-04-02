import type { Metadata } from "next"
import { prisma } from "@/lib/prisma"
import { PersonJsonLd } from "@/components/json-ld"

const DEFAULT_SITE_URL = "https://rbmarket.app"

function getSiteUrl(): string {
  const candidate = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || DEFAULT_SITE_URL
  try {
    return new URL(candidate).toString().replace(/\/$/, "")
  } catch {
    return DEFAULT_SITE_URL
  }
}

function makeSnippet(value: string | null | undefined, maxLength = 150): string {
  const trimmed = (value || "").trim()
  if (!trimmed) {
    return "Community incident report with submitted evidence and payment identifier details."
  }

  if (trimmed.length <= maxLength) {
    return trimmed
  }

  return `${trimmed.slice(0, maxLength)}...`
}

async function getHallOfShameSeoEntry(id: string) {
  const hallTable = (prisma as any).hallOfShameEntry
  return hallTable.findFirst({
    where: {
      id,
      status: "APPROVED",
    },
    include: {
      aliases: {
        select: { alias: true },
        orderBy: { createdAt: "asc" },
      },
      identifiers: {
        select: { type: true },
      },
      socialLinks: {
        select: { url: true },
      },
      evidence: {
        select: { url: true },
        orderBy: { createdAt: "asc" },
      },
    },
  })
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  try {
    const { id } = await params
    const entry = await getHallOfShameSeoEntry(id)

    if (!entry) {
      return {
        title: "Hall of Shame Record Not Found | RbMarket",
        description: "The Hall of Shame record you requested is unavailable.",
        robots: {
          index: false,
          follow: false,
        },
      }
    }

    const siteUrl = getSiteUrl()
    const aliases = (entry.aliases || []).map((alias: { alias: string }) => alias.alias).filter(Boolean)
    const primaryAlias = aliases[0] || "Reported user"
    const aliasKeywords = aliases.slice(0, 4)
    const identifierTypes = Array.from(
      new Set((entry.identifiers || []).map((identifier: { type: string }) => identifier.type).filter(Boolean))
    ).slice(0, 3)
    const description = `Incident report for ${primaryAlias}. ${makeSnippet(entry.incidentSummary)}`
    const firstEvidence = (entry.evidence || []).find((item: { url: string }) => /^https?:\/\//i.test(item.url))?.url

    return {
      metadataBase: new URL(siteUrl),
      title: `${primaryAlias} Incident Record | Hall of Shame | RbMarket`,
      description,
      alternates: {
        canonical: `/hall-of-shame/${id}`,
      },
      robots: {
        index: true,
        follow: true,
      },
      keywords: [
        "Hall of Shame",
        "scam report",
        "trade safety",
        "RbMarket",
        ...aliasKeywords,
        ...identifierTypes,
      ],
      openGraph: {
        title: `${primaryAlias} Incident Record | RbMarket Hall of Shame`,
        description,
        url: `${siteUrl}/hall-of-shame/${id}`,
        type: "article",
        siteName: "RbMarket",
        images: firstEvidence
          ? [
              {
                url: firstEvidence,
                width: 1200,
                height: 630,
                alt: `${primaryAlias} evidence image`,
              },
            ]
          : [
              {
                url: `${siteUrl}/hall-of-shame/${id}/opengraph-image`,
                width: 1200,
                height: 630,
                alt: `${primaryAlias} incident record on RbMarket`,
              },
            ],
      },
      twitter: {
        card: "summary_large_image",
        title: `${primaryAlias} Incident Record | Hall of Shame`,
        description,
        images: firstEvidence ? [firstEvidence] : [`${siteUrl}/hall-of-shame/${id}/opengraph-image`],
      },
    }
  } catch (error) {
    console.error("Failed to generate Hall of Shame detail metadata:", error)
    return {
      title: "Hall of Shame Record | RbMarket",
      description: "Community incident report and safety details.",
      robots: {
        index: false,
        follow: false,
      },
    }
  }
}

export default async function HallOfShameDetailLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const entry = await getHallOfShameSeoEntry(id)
  const aliases = (entry?.aliases || []).map((alias: { alias: string }) => alias.alias).filter(Boolean)
  const socialUrls = (entry?.socialLinks || [])
    .map((social: { url: string | null }) => social.url || "")
    .filter((url: string) => /^https?:\/\//i.test(url))

  return (
    <>
      {entry && aliases.length > 0 ? (
        <PersonJsonLd
          name={aliases[0]}
          alternateName={aliases.slice(1, 8)}
          profilePath={`/hall-of-shame/${id}`}
          description={makeSnippet(entry.incidentSummary, 220)}
          sameAs={socialUrls}
        />
      ) : null}
      {children}
    </>
  )
}
