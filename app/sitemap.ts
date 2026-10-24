import { MetadataRoute } from "next"
import { prisma } from "@/lib/prisma"
import { getSeoGames } from "@/lib/games"
import { gamePath, getSiteUrl } from "@/lib/seo"

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
  const baseUrl = getSiteUrl()

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
      url: `${baseUrl}/games`,
      changeFrequency: "daily",
      priority: 0.9,
      lastModified: new Date(),
    },
    {
      url: `${baseUrl}/faq`,
      changeFrequency: "monthly",
      priority: 0.7,
      lastModified: new Date("2026-10-25"),
    },
    {
      url: `${baseUrl}/blog`,
      changeFrequency: "weekly",
      priority: 0.6,
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
    {
      url: `${baseUrl}/terms`,
      changeFrequency: "yearly",
      priority: 0.3,
      lastModified: new Date("2026-10-24"),
    },
    {
      url: `${baseUrl}/privacy`,
      changeFrequency: "yearly",
      priority: 0.3,
      lastModified: new Date("2026-10-24"),
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

    // Only traders with something to show: empty profiles are thin pages
    const sellers = await prisma.user.findMany({
      where: {
        isBanned: false,
        OR: [
          { itemListings: { some: { status: "available" } } },
          { currencyListings: { some: { status: "available" } } },
          { vouchesReceived: { some: { status: "VALID" } } },
        ],
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

    const [games, posts] = await Promise.all([
      getSeoGames(),
      prisma.blogPost.findMany({ where: { published: true }, select: { slug: true, updatedAt: true } }),
    ])

    // Game pages are only indexable once they have live listings (see app/games/[slug])
    const gameRoutes: MetadataRoute.Sitemap = games
      .filter((game) => game.itemCount + game.currencyCount > 0)
      .map((game) => ({
        url: `${baseUrl}${gamePath(game.displayName)}`,
        changeFrequency: "daily" as const,
        priority: 0.85,
        lastModified: new Date(),
      }))

    const blogRoutes: MetadataRoute.Sitemap = posts.map((post) => ({
      url: `${baseUrl}/blog/${post.slug}`,
      changeFrequency: "monthly" as const,
      priority: 0.6,
      lastModified: post.updatedAt,
    }))

    return [
      ...staticRoutes,
      ...gameRoutes,
      ...itemListingRoutes,
      ...currencyListingRoutes,
      ...blogRoutes,
      ...profileRoutes,
      ...hallOfShameRoutes,
    ]
  } catch (error) {
    console.error("Error generating sitemap:", error)
    // Return just static routes if database query fails
    return staticRoutes
  }
}
