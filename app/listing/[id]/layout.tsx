import { Metadata } from "next"
import { prisma } from "@/lib/prisma"

const DEFAULT_SITE_URL = "https://rbmarket.app"

function getSiteUrl(): string {
  const candidate = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || DEFAULT_SITE_URL
  try {
    return new URL(candidate).toString().replace(/\/$/, "")
  } catch {
    return DEFAULT_SITE_URL
  }
}

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
        gameName = currencyListing.game?.displayName || "Roblox"
        price = (currencyListing as any).ratePerPeso || 0
        category = "currency"
      }
    }

    if (!listing) {
      return {
        title: "Listing Not Found - RB Marketplace",
        description: "The listing you're looking for doesn't exist.",
        robots: {
          index: false,
          follow: false,
        },
      }
    }

    const siteUrl = getSiteUrl()
    const listingStatus = String((listing as any).status || "").toLowerCase()
    const isIndexable = listingStatus === "available"
    const formattedPrice = price.toLocaleString()
    const rawDescription = (listing.description || "").trim()
    const snippet = rawDescription ? `${rawDescription.slice(0, 120)}${rawDescription.length > 120 ? "..." : ""}` : "Trusted Roblox marketplace listing."
    const description = `Buy ${listing.title} from ${listing.seller.username} for P${formattedPrice}. ${snippet}`

    return {
      title: `${listing.title} - Buy on RB Marketplace`,
      description,
      metadataBase: new URL(siteUrl),
      alternates: {
        canonical: `/listing/${id}`,
      },
      robots: {
        index: isIndexable,
        follow: isIndexable,
      },
      keywords: [listing.title, gameName, category, "Roblox", "marketplace", "buy", "sell"],
      openGraph: {
        title: `${listing.title} - RB Marketplace`,
        description,
        type: "website",
        url: `${siteUrl}/listing/${id}`,
        images: listing.image
          ? [
              {
                url: listing.image,
                width: 1200,
                height: 630,
                alt: listing.title,
              },
            ]
          : [],
      },
      twitter: {
        card: "summary_large_image",
        title: `${listing.title} - RB Marketplace`,
        description,
        images: listing.image ? [listing.image] : [],
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
