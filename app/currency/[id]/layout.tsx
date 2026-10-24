import { Metadata } from "next"
import { unstable_cache } from "next/cache"
import { prisma } from "@/lib/prisma"

// Metadata lookups are cached so a warm page view runs no extra query
const getCachedCurrencyListingMeta = unstable_cache(
  async (id: string) =>
    prisma.currencyListing.findUnique({
      where: { id },
      include: {
        seller: { select: { username: true } },
        game: { select: { displayName: true } },
        gameCurrency: { select: { displayName: true } },
      },
    }),
  ["currency-currencyListing-meta-v1"],
  { revalidate: 60 },
)

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  try {
    const { id } = await params
    const listing = await getCachedCurrencyListingMeta(id)

    if (!listing) {
      return {
        title: "Currency offer not found",
        description: "The currency listing you're looking for doesn't exist.",
        robots: { index: false, follow: false },
      }
    }

    const isIndexable = String(listing.status || "").toLowerCase() === "available"
    const rate = Number(listing.ratePerPeso || 0).toLocaleString("en-PH")
    const gameName = listing.game?.displayName || "Roblox"
    const currencyName = listing.gameCurrency?.displayName || "in-game currency"
    const title = `Buy ${gameName} ${currencyName}: ${rate} per ₱1`
    const description = `Buy ${gameName} ${currencyName} from ${listing.seller.username} at ${rate} per ₱1, ${listing.stock.toLocaleString("en-PH")} in stock (orders ${listing.minOrder.toLocaleString("en-PH")} to ${listing.maxOrder.toLocaleString("en-PH")}). Pay with GCash or PayPal on RbMarket.`
    const images = listing.image ? [{ url: listing.image, alt: `${gameName} ${currencyName}` }] : undefined

    return {
      title,
      description,
      alternates: { canonical: `/currency/${id}` },
      robots: { index: isIndexable, follow: true },
      keywords: [`buy ${gameName} ${currencyName}`, `${gameName} ${currencyName} for sale`, `${currencyName} GCash`, "Roblox currency Philippines"],
      openGraph: { title, description, type: "website", url: `/currency/${id}`, images },
      twitter: { card: "summary_large_image", title, description, images: listing.image ? [listing.image] : undefined },
    }
  } catch (error) {
    console.error("Error generating currency listing metadata:", error)
    return { title: "Roblox currency offer" }
  }
}

export default function CurrencyListingLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
