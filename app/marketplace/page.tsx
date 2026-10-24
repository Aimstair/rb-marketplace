import type { Metadata } from "next"
import { getFilterOptions, getListings } from "@/app/actions/listings"
import MarketplacePageClient from "./marketplace-page-client"
import Link from "next/link"
import { ItemListJsonLd, WebPageJsonLd } from "@/components/json-ld"
import { Container, Section } from "@/components/site/container"
import { FaqSection } from "@/components/seo/faq-section"
import { getSeoGames } from "@/lib/games"
import { GENERAL_FAQ } from "@/lib/seo-content"
import { gamePath } from "@/lib/seo"

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
  const title = effectiveSearch
    ? `${effectiveSearch} for sale: Roblox Marketplace`
    : "Roblox Items for Sale Philippines: Pets & Limiteds"
  const description = effectiveSearch
    ? `Roblox listings matching "${effectiveSearch}" on RbMarket, priced in pesos. Pay vouched sellers with GCash or PayPal.`
    : "Browse Roblox items, pets and limiteds for sale from vouched sellers in the Philippines. Prices in pesos, pay with GCash or PayPal, and list your own items for free."

  return {
    title,
    description,
    alternates: effectiveSearch ? undefined : { canonical: "/marketplace" },
    // Internal search results stay out of the index (thin, near-duplicate pages); links are still followed
    robots: { index: !effectiveSearch && !normalizedSearch, follow: true },
    openGraph: { title, description, url: "/marketplace", type: "website" },
    twitter: { card: "summary_large_image", title, description },
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

  const [initialResult, initialCategoryOptions, initialGameOptions, initialItemTypeOptions, games] = await Promise.all([
    getListings({
      search: effectiveSearch,
      mainCategory: "All",
      selectedGame: "All Games",
      selectedItemType: "All",
      sortBy: "newest",
      priceRange: { min: 0, max: 1000000 },
      page: 1,
      itemsPerPage: 20,
    }),
    getFilterOptions("CATEGORY"),
    getFilterOptions("GAME"),
    getFilterOptions("ITEM_TYPE"),
    getSeoGames().catch(() => []),
  ])

  return (
    <>
      <WebPageJsonLd
        type="CollectionPage"
        name="Roblox items for sale"
        description="Roblox items, pets and limiteds for sale on RbMarket, priced in Philippine pesos."
        path="/marketplace"
        crumbs={[{ name: "Marketplace", path: "/marketplace" }]}
      />
      {initialResult.listings.length > 0 && (
        <ItemListJsonLd
          name="Latest Roblox items for sale"
          path="/marketplace"
          items={initialResult.listings.map((l) => ({ name: l.title, path: `/listing/${l.id}`, image: l.image }))}
        />
      )}
      <MarketplacePageClient
        initialSearchQuery={effectiveSearch}
        initialListings={initialResult.listings}
        initialTotalListings={initialResult.total}
        initialCategoryOptions={initialCategoryOptions}
        initialGameOptions={initialGameOptions}
        initialItemTypeOptions={initialItemTypeOptions}
      />
      {!effectiveSearch && (
        <Section surface>
          <Container>
            <h2 className="text-section">Shop by game</h2>
            <p className="mt-2 max-w-[60ch] text-[15px] text-muted-foreground">
              Every game has its own page with live listings, the lowest price and currency offers.
            </p>
            <ul className="mt-6 flex flex-wrap gap-2">
              {games.map((game) => (
                <li key={game.slug}>
                  <Link
                    href={gamePath(game.displayName)}
                    className="inline-flex h-9 items-center gap-2 rounded-full bg-secondary px-4 text-sm font-medium transition-colors hover:bg-[#3a3a3c]"
                  >
                    {game.displayName} items
                  </Link>
                </li>
              ))}
            </ul>
            <FaqSection entries={GENERAL_FAQ.slice(6)} title="Marketplace questions" className="mt-14 md:mt-20" />
          </Container>
        </Section>
      )}
    </>
  )
}
