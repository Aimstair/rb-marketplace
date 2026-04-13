import { MetadataRoute } from "next"
import { prisma } from "@/lib/prisma"

const SITEMAP_BATCH_SIZE = 500

async function fetchAllIndexableItemListings() {
  const rows: Array<{ id: string; updatedAt: Date }> = []
  let cursorId: string | undefined

  while (true) {
    const batch = await prisma.itemListing.findMany({
      where: {
        status: "available",
      },
      select: {
        id: true,
        updatedAt: true,
      },
      orderBy: {
        id: "asc",
      },
      take: SITEMAP_BATCH_SIZE,
      ...(cursorId
        ? {
            cursor: { id: cursorId },
            skip: 1,
          }
        : {}),
    })

    if (batch.length === 0) {
      break
    }

    rows.push(...batch)
    cursorId = batch[batch.length - 1]?.id
  }

  return rows
}

async function fetchAllIndexableCurrencyListings() {
  const rows: Array<{ id: string; updatedAt: Date }> = []
  let cursorId: string | undefined

  while (true) {
    const batch = await prisma.currencyListing.findMany({
      where: {
        status: "available",
      },
      select: {
        id: true,
        updatedAt: true,
      },
      orderBy: {
        id: "asc",
      },
      take: SITEMAP_BATCH_SIZE,
      ...(cursorId
        ? {
            cursor: { id: cursorId },
            skip: 1,
          }
        : {}),
    })

    if (batch.length === 0) {
      break
    }

    rows.push(...batch)
    cursorId = batch[batch.length - 1]?.id
  }

  return rows
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = (process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || "https://rbmarket.app").replace(/\/$/, "")

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
      url: `${baseUrl}/currency`,
      changeFrequency: "hourly",
      priority: 0.9,
      lastModified: new Date(),
    },
    {
      url: `${baseUrl}/trends`,
      changeFrequency: "daily",
      priority: 0.8,
      lastModified: new Date(),
    },
    {
      url: `${baseUrl}/hall-of-shame`,
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
  ]

  try {
    // Fetch all indexable listings in batches to improve search coverage.
    const [itemListings, currencyListings] = await Promise.all([
      fetchAllIndexableItemListings(),
      fetchAllIndexableCurrencyListings(),
    ])

    const itemListingRoutes: MetadataRoute.Sitemap = itemListings.map((listing) => ({
      url: `${baseUrl}/listing/${listing.id}`,
      changeFrequency: "weekly" as const,
      priority: 0.7,
      lastModified: listing.updatedAt,
    }))

    const currencyListingRoutes: MetadataRoute.Sitemap = currencyListings.map((listing) => ({
      url: `${baseUrl}/currency/${listing.id}`,
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
        id: "asc",
      },
    })

    const profileRoutes: MetadataRoute.Sitemap = sellers.map((seller) => ({
      url: `${baseUrl}/profile/${seller.id}`,
      changeFrequency: "weekly" as const,
      priority: 0.6,
      lastModified: seller.updatedAt,
    }))

    const hallOfShameEntries = await prisma.hallOfShameEntry.findMany({
      where: {
        status: "APPROVED",
      },
      select: {
        id: true,
        updatedAt: true,
      },
      orderBy: {
        id: "asc",
      },
    })

    const hallOfShameRoutes: MetadataRoute.Sitemap = hallOfShameEntries.map((entry) => ({
      url: `${baseUrl}/hall-of-shame/${entry.id}`,
      changeFrequency: "weekly" as const,
      priority: 0.6,
      lastModified: entry.updatedAt,
    }))

    return [...staticRoutes, ...itemListingRoutes, ...currencyListingRoutes, ...profileRoutes, ...hallOfShameRoutes]
  } catch (error) {
    console.error("Error generating sitemap:", error)
    // Return just static routes if database query fails
    return staticRoutes
  }
}
