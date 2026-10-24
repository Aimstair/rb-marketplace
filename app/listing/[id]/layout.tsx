import { Metadata } from "next"
import { unstable_cache } from "next/cache"
import { prisma } from "@/lib/prisma"
import { truncate } from "@/lib/seo"

const sellerAndGame = {
  seller: { select: { username: true } },
  game: { select: { displayName: true } },
} as const

// Metadata lookups are cached so a warm page view runs no extra query
const getCachedItemListingMeta = unstable_cache(
  async (id: string) => prisma.itemListing.findUnique({ where: { id }, include: sellerAndGame }),
  ["listing-itemListing-meta-v1"],
  { revalidate: 60 },
)

const getCachedCurrencyListingMeta2 = unstable_cache(
  async (id: string) => prisma.currencyListing.findUnique({ where: { id }, include: sellerAndGame }),
  ["listing-currencyListing-meta-v1"],
  { revalidate: 60 },
)

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  try {
    const { id } = await params
    const item = await getCachedItemListingMeta(id)
    const listing = item ?? (await getCachedCurrencyListingMeta2(id))

    if (!listing) {
      return {
        title: "Listing not found",
        description: "The listing you're looking for doesn't exist.",
        robots: { index: false, follow: false },
      }
    }

    const gameName = listing.game?.displayName || "Roblox"
    const isIndexable = String(listing.status || "").toLowerCase() === "available"
    const priceLabel = item
      ? `₱${item.price.toLocaleString("en-PH")}`
      : `${Number((listing as { ratePerPeso?: number }).ratePerPeso || 0).toLocaleString("en-PH")} per ₱1`
    const rawDescription = (listing.description || "").trim()
    const title = `${listing.title} (${gameName}) for ${priceLabel}`
    const description = truncate(
      `Buy ${listing.title} for ${gameName} at ${priceLabel} from ${listing.seller.username}. Pay with GCash or PayPal on RbMarket, the Roblox marketplace in the Philippines.${rawDescription ? ` ${rawDescription}` : ""}`,
      160,
    )
    const images = listing.image ? [{ url: listing.image, alt: `${listing.title} (${gameName})` }] : undefined

    return {
      title,
      description,
      alternates: { canonical: `/listing/${id}` },
      // Sold listings drop out of the index but still pass link value to the seller and game
      robots: { index: isIndexable, follow: true },
      keywords: [listing.title, `buy ${listing.title}`, `${listing.title} price`, `${gameName} items for sale`, "Roblox marketplace Philippines"],
      openGraph: { title, description, type: "website", url: `/listing/${id}`, images },
      twitter: { card: "summary_large_image", title, description, images: listing.image ? [listing.image] : undefined },
    }
  } catch (error) {
    console.error("Error generating listing metadata:", error)
    return { title: "Roblox item listing" }
  }
}

export default function ListingLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
