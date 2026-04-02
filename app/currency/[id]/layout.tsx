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
    const { id } = await params
    const listing = await prisma.currencyListing.findUnique({
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
        gameCurrency: {
          select: {
            displayName: true,
          },
        },
      },
    })

    if (!listing) {
      return {
        title: "Currency Listing Not Found - RB Marketplace",
        description: "The currency listing you're looking for doesn't exist.",
        robots: {
          index: false,
          follow: false,
        },
      }
    }

    const siteUrl = getSiteUrl()
    const listingStatus = String(listing.status || "").toLowerCase()
    const isIndexable = listingStatus === "available"
    const formattedRate = Number(listing.ratePerPeso || 0).toLocaleString()
    const gameName = listing.game?.displayName || "Roblox"
    const currencyName = listing.gameCurrency?.displayName || "In-game Currency"
    const description = `Buy ${currencyName} for ${gameName} from ${listing.seller.username} at ${formattedRate} per P1. Stock available: ${listing.stock.toLocaleString()}.`

    return {
      title: `${listing.title} - Currency Offer on RB Marketplace`,
      description,
      metadataBase: new URL(siteUrl),
      alternates: {
        canonical: `/currency/${id}`,
      },
      robots: {
        index: isIndexable,
        follow: isIndexable,
      },
      keywords: [listing.title, gameName, currencyName, "currency", "Roblox", "marketplace", "buy", "sell"],
      openGraph: {
        title: `${listing.title} - RB Marketplace`,
        description,
        type: "website",
        url: `${siteUrl}/currency/${id}`,
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
    console.error("Error generating currency listing metadata:", error)
    return {
      title: "Currency Listing - RB Marketplace",
      description: "Browse currency offers on RB Marketplace",
    }
  }
}

export default function CurrencyListingLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}