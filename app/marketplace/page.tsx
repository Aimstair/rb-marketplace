import type { Metadata } from "next"
import { getFilterOptions, getListings } from "@/app/actions/listings"
import MarketplacePageClient from "./marketplace-page-client"
import { MarketplaceJsonLd } from "@/components/json-ld"

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
    : "Roblox Marketplace — Buy & Sell Roblox Pets, Items & Units | RbMarket"
  const description = effectiveSearch
    ? `Browse Roblox item listings matching "${effectiveSearch}" on RB Marketplace.`
    : "Browse the RbMarket Roblox marketplace to buy and sell Roblox pets, game items, and in-game units for cash. Find trusted sellers, list your pets, and sell your Roblox items safely."

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
    keywords: effectiveSearch
      ? [effectiveSearch, "Roblox marketplace", "Roblox buy and sell"]
      : [
          "Roblox marketplace",
          "Roblox buy and sell",
          "Roblox sell for cash",
          "Roblox sell pets",
          "Roblox sell units",
          "buy Roblox items",
          "sell Roblox items for cash",
          "Roblox pet marketplace",
          "Roblox currency marketplace",
          "RbMarket",
        ],
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
    <>
      <MarketplaceJsonLd itemCount={initialResult.total} />
      <MarketplacePageClient
        initialSearchQuery={effectiveSearch}
        initialListings={initialResult.listings}
        initialTotalListings={initialResult.total}
        initialCategoryOptions={initialCategoryOptions}
        initialGameOptions={initialGameOptions}
        initialItemTypeOptions={initialItemTypeOptions}
      />
      {/* Server-rendered SEO content block — indexed by Google, visually hidden */}
      {!effectiveSearch && (
        <section
          aria-hidden="true"
          style={{
            position: "absolute",
            width: "1px",
            height: "1px",
            padding: 0,
            margin: "-1px",
            overflow: "hidden",
            clip: "rect(0,0,0,0)",
            whiteSpace: "nowrap",
            border: 0,
          }}
        >
          <h1>Roblox Marketplace — Buy &amp; Sell Roblox Items for Cash</h1>
          <p>
            RbMarket is the go-to Roblox marketplace for players who want to buy and sell Roblox
            pets, game items, and in-game units for real cash. Whether you’re looking to sell your
            Roblox pets, trade rare items, or exchange in-game currency units, RbMarket connects
            you with trusted sellers across all major Roblox games.
          </p>
          <h2>Roblox Buy and Sell — How It Works</h2>
          <p>
            Browse thousands of listings from verified Roblox sellers. Use filters to find pets,
            items, accessories, gamepasses, and in-game currency units by game, category, and price.
            Message sellers directly and confirm trades through our secure workflow.
          </p>
          <h2>Sell Roblox Pets for Cash</h2>
          <p>
            List your Roblox pets and rare items on RbMarket and sell them for cash. Our
            peer-to-peer Roblox marketplace lets you set your own price, connect with buyers, and
            get paid safely. Sell pets from Blox Fruits, Pet Simulator X, and other top Roblox games.
          </p>
          <h2>Sell Roblox Units &amp; Currency</h2>
          <p>
            Have in-game currency units to spare? Sell Roblox game currency and units on RbMarket.
            Find buyers looking for Blox Fruits fragments, Pet Simulator X gems, and other in-game
            units across popular Roblox games. Get cash for your Roblox currency today.
          </p>
        </section>
      )}
    </>
  )
}
