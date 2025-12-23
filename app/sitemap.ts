import { MetadataRoute } from "next"
import { prisma } from "@/lib/prisma"

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000"

  // Static routes
  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: `${baseUrl}/`,
      changeFrequency: "daily",
      priority: 1,
      lastModified: new Date(),
    },
    {
      url: `${baseUrl}/marketplace`,
      changeFrequency: "hourly",
      priority: 0.9,
      lastModified: new Date(),
    },
    {
      url: `${baseUrl}/sell`,
      changeFrequency: "monthly",
      priority: 0.8,
      lastModified: new Date(),
    },
    {
      url: `${baseUrl}/trends`,
      changeFrequency: "daily",
      priority: 0.8,
      lastModified: new Date(),
    },
    {
      url: `${baseUrl}/subscriptions`,
      changeFrequency: "monthly",
      priority: 0.7,
      lastModified: new Date(),
    },
    {
      url: `${baseUrl}/auth/login`,
      changeFrequency: "never",
      priority: 0.6,
      lastModified: new Date(),
    },
    {
      url: `${baseUrl}/auth/signup`,
      changeFrequency: "never",
      priority: 0.6,
      lastModified: new Date(),
    },
  ]

  try {
    // Fetch latest 50 active listings from both tables
    const itemListings = await prisma.itemListing.findMany({
      where: {
        status: "available",
      },
      select: {
        id: true,
        updatedAt: true,
      },
      orderBy: {
        updatedAt: "desc",
      },
      take: 25,
    })

    const currencyListings = await prisma.currencyListing.findMany({
      where: {
        status: "available",
      },
      select: {
        id: true,
        updatedAt: true,
      },
      orderBy: {
        updatedAt: "desc",
      },
      take: 25,
    })

    const allListings = [...itemListings, ...currencyListings]
      .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
      .slice(0, 50)

    const listingRoutes: MetadataRoute.Sitemap = allListings.map((listing) => ({
      url: `${baseUrl}/listing/${listing.id}`,
      changeFrequency: "weekly" as const,
      priority: 0.7,
      lastModified: listing.updatedAt,
    }))

    // Fetch some active seller profiles
    const sellers = await prisma.user.findMany({
      where: {
        role: "user",
        isBanned: false,
      },
      select: {
        id: true,
        updatedAt: true,
      },
      orderBy: {
        updatedAt: "desc",
      },
      take: 30,
    })

    const profileRoutes: MetadataRoute.Sitemap = sellers.map((seller) => ({
      url: `${baseUrl}/profile/${seller.id}`,
      changeFrequency: "weekly" as const,
      priority: 0.6,
      lastModified: seller.updatedAt,
    }))

    return [...staticRoutes, ...listingRoutes, ...profileRoutes]
  } catch (error) {
    console.error("Error generating sitemap:", error)
    // Return just static routes if database query fails
    return staticRoutes
  }
}
