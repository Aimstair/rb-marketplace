import { Metadata } from "next"
import { prisma } from "@/lib/prisma"

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  try {
    // Await params since it's a Promise in Next.js 15+
    const { id } = await params
    
    // Try to fetch from ItemListing first
    let listing = await prisma.itemListing.findUnique({
      where: { id },
      include: {
        seller: {
          select: {
            username: true,
          },
        },
        game: {
          select: {
            displayName: true,
          },
        },
      },
    })

    let listingType = "ITEM"
    let gameName = listing?.game?.displayName || "Roblox"
    let price = listing?.price || 0
    let category = "item"

    // If not found in ItemListing, try CurrencyListing
    if (!listing) {
      const currencyListing = await prisma.currencyListing.findUnique({
        where: { id },
        include: {
          seller: {
            select: {
              username: true,
            },
          },
          game: {
            select: {
              displayName: true,
            },
          },
        },
      })

      if (currencyListing) {
        listing = currencyListing as any
        listingType = "CURRENCY"
        gameName = currencyListing.game?.displayName || "Roblox"
        price = (currencyListing as any).ratePerPeso || 0
        category = "currency"
      }
    }

    if (!listing) {
      return {
        title: "Listing Not Found - RB Marketplace",
        description: "The listing you're looking for doesn't exist.",
      }
    }

    const formattedPrice = price.toLocaleString()

    return {
      title: `${listing.title} - Buy on RB Marketplace`,
      description: `Buy ${listing.title} from ${listing.seller.username} for ₱${formattedPrice}. ${listing.description?.substring(0, 120)}...`,
      keywords: [listing.title, gameName, category, "Roblox", "marketplace", "buy", "sell"],
      openGraph: {
        title: `${listing.title} - RB Marketplace`,
        description: `Buy ${listing.title} for ₱${formattedPrice} on RB Marketplace`,
        type: "website",
        images: [
          {
            url: listing.image,
            width: 1200,
            height: 630,
            alt: listing.title,
          },
        ],
      },
      twitter: {
        card: "summary_large_image",
        title: `${listing.title} - RB Marketplace`,
        description: `Buy ${listing.title} for ₱${formattedPrice}`,
        images: [listing.image],
      },
    }
  } catch (error) {
    console.error("Error generating listing metadata:", error)
    return {
      title: "Listing - RB Marketplace",
      description: "Browse items on RB Marketplace",
    }
  }
}

export default function ListingLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
