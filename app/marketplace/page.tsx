import type { Metadata } from "next"
import { getFilterOptions, getListings } from "@/app/actions/listings"
import MarketplacePageClient from "./marketplace-page-client"

const DEFAULT_SITE_URL = "https://rbmarket.app"

function getSiteUrl(): string {
  const candidate = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || DEFAULT_SITE_URL
  try {
    return new URL(candidate).toString().replace(/\/$/, "")
  } catch {
    return DEFAULT_SITE_URL
  }
}

function firstParamValue(value: string | string[] | undefined): string {
  if (Array.isArray(value)) {
    return value[0] || ""
  }

  return value || ""
}

function normalizeSearchTerm(term: string): string {
  const trimmed = term.trim()
  if (trimmed === "{search_term_string}") {
    return ""
  }

  return trimmed
}

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}): Promise<Metadata> {
  const resolvedSearchParams = await searchParams
  const rawSearch = firstParamValue(resolvedSearchParams.search) || firstParamValue(resolvedSearchParams.item)
  const normalizedSearch = rawSearch.trim()
  const effectiveSearch = normalizeSearchTerm(normalizedSearch)
  const siteUrl = getSiteUrl()
  const title = effectiveSearch
    ? `Marketplace Search: ${effectiveSearch} - RB Marketplace`
    : "Marketplace - Buy and Sell Roblox Items"
  const description = effectiveSearch
    ? `Browse Roblox item listings matching \"${effectiveSearch}\" on RB Marketplace.`
    : "Browse Roblox item listings by game, category, and price. Connect with trusted traders and complete deals safely on RB Marketplace."

  const canonicalPath = effectiveSearch
    ? `/marketplace?search=${encodeURIComponent(effectiveSearch)}`
    : "/marketplace"

  return {
    title,
    description,
    metadataBase: new URL(siteUrl),
    alternates: {
      canonical: canonicalPath,
    },
    openGraph: {
      title,
      description,
      url: `${siteUrl}${canonicalPath}`,
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
    robots: {
      index: normalizedSearch !== "{search_term_string}",
      follow: normalizedSearch !== "{search_term_string}",
    },
  }
}

export default async function MarketplacePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const resolvedSearchParams = await searchParams
  const rawSearch = firstParamValue(resolvedSearchParams.search) || firstParamValue(resolvedSearchParams.item)
  const effectiveSearch = normalizeSearchTerm(rawSearch)

  const [initialResult, initialCategoryOptions, initialGameOptions, initialItemTypeOptions] = await Promise.all([
    getListings({
      search: effectiveSearch,
      mainCategory: "All",
      selectedGame: "All Games",
      selectedItemType: "All",
      sortBy: "newest",
      priceRange: { min: 0, max: 1000000 },
      page: 1,
      itemsPerPage: 9,
    }),
    getFilterOptions("CATEGORY"),
    getFilterOptions("GAME"),
    getFilterOptions("ITEM_TYPE"),
  ])

  return (
    <MarketplacePageClient
      initialSearchQuery={effectiveSearch}
      initialListings={initialResult.listings}
      initialTotalListings={initialResult.total}
      initialCategoryOptions={initialCategoryOptions}
      initialGameOptions={initialGameOptions}
      initialItemTypeOptions={initialItemTypeOptions}
    />
  )
}
