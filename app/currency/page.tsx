import CurrencyMarketplaceClient from "./currency-marketplace-client"
import { getCurrencyListings, getNewCurrencyListings, type CurrencyListing as DBCurrencyListing } from "@/app/actions/listings"
import { getGames } from "@/app/actions/games"

interface CurrencyListingViewModel {
  id: string
  game: string
  currencyType: string
  ratePerPeso: number
  stock: number
  sellerVouches: number
  status: "Available" | "Sold" | "Pending"
  deliveryMethods: string[]
  sellerId: string
  sellerName: string
  sellerAvatar: string
  upvotes: number
  downvotes: number
}

function normalizeStatus(status: string): "Available" | "Sold" | "Pending" {
  if (status.toLowerCase() === "available") {
    return "Available"
  }

  if (status.toLowerCase() === "sold") {
    return "Sold"
  }

  return "Pending"
}

function mapLegacyCurrencyListing(listing: DBCurrencyListing): CurrencyListingViewModel {
  const description = listing.description || ""
  const currencyMatch = description.match(/Currency: (.+?)(?:\n|$)/)
  const rateMatch = description.match(/Rate: ₱([\d.]+)/)
  const currencyType = currencyMatch ? currencyMatch[1].trim() : "Unknown"
  const ratePerPeso = rateMatch ? parseFloat(rateMatch[1]) : 0

  return {
    id: listing.id,
    game: listing.game,
    currencyType,
    ratePerPeso,
    stock: listing.stock || 0,
    sellerVouches: listing.sellerVouches || 0,
    status: normalizeStatus(listing.status),
    deliveryMethods: ["Instant", "Manual"],
    sellerId: listing.sellerId,
    sellerName: listing.sellerUsername || "Unknown Seller",
    sellerAvatar: "/placeholder-user.jpg",
    upvotes: listing.upvotes || 0,
    downvotes: listing.downvotes || 0,
  }
}

async function getInitialCurrencyListings(): Promise<CurrencyListingViewModel[]> {
  try {
    const dbListings = await getNewCurrencyListings()
    return dbListings.map((listing) => ({
      id: listing.id,
      game: listing.gameName,
      currencyType: listing.currencyName,
      ratePerPeso: listing.ratePerPeso,
      stock: listing.stock,
      sellerVouches: listing.sellerVouches,
      status: normalizeStatus(listing.status),
      deliveryMethods: ["Instant", "Manual"],
      sellerId: listing.sellerId,
      sellerName: listing.sellerUsername,
      sellerAvatar: "/placeholder-user.jpg",
      upvotes: listing.upvotes,
      downvotes: listing.downvotes,
    }))
  } catch {
    const dbListings = await getCurrencyListings()
    return (dbListings || []).map(mapLegacyCurrencyListing)
  }
}

export default async function CurrencyPage() {
  const [games, initialListings] = await Promise.all([getGames(), getInitialCurrencyListings()])

  return <CurrencyMarketplaceClient initialListings={initialListings} initialGames={games} />
}
