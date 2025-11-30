import { Metadata } from "next"
import { prisma } from "@/lib/prisma"

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  try {
    // Await params since it's a Promise in Next.js 15+
    const { id } = await params
    
    // Fetch listing from database
    const listing = await prisma.listing.findUnique({
      where: { id },
      include: {
        seller: {
          select: {
            username: true,
          },
        },
      },
    })

    if (!listing) {
      return {
        title: "Listing Not Found - RB Marketplace",
        description: "The listing you're looking for doesn't exist.",
      }
    }

    const price = (listing.price / 100).toFixed(2)

    return {
      title: `${listing.title} - Buy on RB Marketplace`,
      description: `Buy ${listing.title} from ${listing.seller.username} for ₱${price}. ${listing.description?.substring(0, 120)}...`,
      keywords: [listing.title, listing.game, listing.category, "Roblox", "marketplace", "buy", "sell"],
      openGraph: {
        title: `${listing.title} - RB Marketplace`,
        description: `Buy ${listing.title} for ₱${price} on RB Marketplace`,
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
        description: `Buy ${listing.title} for ₱${price}`,
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
