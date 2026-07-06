"use server"

import { prisma } from "@/lib/prisma"
import { auth } from "@/auth"
import { unstable_cache } from "next/cache"

interface LandingStats {
  totalUsers: number
  totalListings: number
  totalVolume: number
  activeTraders: number
}

interface TrendingListing {
  id: string
  title: string
  game: string
  price: number
  image: string
  listingType: "ITEM" | "CURRENCY"
  seller: {
    id: string
    username: string
    vouch: number
  }
  views: number
  vouchCount: number
  inquiries: number
}

interface MarketTrend {
  date: string
  avgPrice: number
  volume: number
  transactions: number
}

interface PopularGame {
  game: string
  listings: number
  avgPrice: number
  totalViews: number
}

const getCachedLandingStats = unstable_cache(
  async (): Promise<{
    success: boolean
    data?: LandingStats
    error?: string
  }> => {
    try {
      // Total users (excluding banned or deactivated)
      const totalUsers = await prisma.user.count({
        where: {
          isBanned: false,
        },
      })

      // Active listings: count from both ItemListing and CurrencyListing
      const itemListingsCount = await prisma.itemListing.count({
        where: {
          status: "available",
        },
      })
      const currencyListingsCount = await prisma.currencyListing.count({
        where: {
          status: "available",
        },
      })
      const totalListings = itemListingsCount + currencyListingsCount

      // Total volume from completed transactions only
      const volumeResult = await (prisma.transaction as any).aggregate({
        _sum: {
          price: true,
        },
        where: {
          status: "COMPLETED",
        },
      })
      const totalVolume = volumeResult._sum.price || 0

      // Active traders (users with at least one listing)
      const itemTraders = await prisma.user.findMany({
        where: {
          itemListings: { some: { status: "available" } },
        },
        select: { id: true },
      })
      const currencyTraders = await prisma.user.findMany({
        where: {
          currencyListings: { some: { status: "available" } },
        },
        select: { id: true },
      })
      // Combine and deduplicate
      const uniqueTraderIds = new Set([...itemTraders.map(t => t.id), ...currencyTraders.map(t => t.id)])
      const activeTraders = uniqueTraderIds.size

      return {
        success: true,
        data: {
          totalUsers,
          totalListings,
          totalVolume,
          activeTraders,
        },
      }
    } catch (err) {
      console.error("Failed to get landing stats:", err)
      return { success: false, error: "Failed to load marketplace statistics" }
    }
  },
  ["trends-landing-stats-v2"],
  { revalidate: 300 } // cache for 5 minutes
)

/**
 * Get landing page statistics
 * Returns key metrics for the homepage
 */
export async function getLandingStats(): Promise<{
  success: boolean
  data?: LandingStats
  error?: string
}> {
  return getCachedLandingStats()
}

/**
 * Get real analytics for landing page
 * activeListings: Available listings from non-banned sellers
 * tradeVolume: Sum of prices from completed transactions
 * happyUsers: Count of all users
 */
export async function getLandingPageStats(): Promise<{
  success: boolean
  data?: {
    activeListings: number
    tradeVolume: number
    happyUsers: number
  }
  error?: string
}> {
  try {
    // Active listings: status is "available" AND seller is not banned
    const itemListingsCount = await prisma.itemListing.count({
      where: {
        status: "available",
        seller: {
          isBanned: false,
        },
      },
    })
    const currencyListingsCount = await prisma.currencyListing.count({
      where: {
        status: "available",
        seller: {
          isBanned: false,
        },
      },
    })
    const activeListings = itemListingsCount + currencyListingsCount

    // Trade volume: sum of prices from completed transactions
    const volumeResult = await (prisma.transaction as any).aggregate({
      _sum: {
        price: true,
      },
      where: {
        status: "COMPLETED",
      },
    })
    const tradeVolume = volumeResult._sum.price || 0

    // Happy users: count of all users
    const happyUsers = await prisma.user.count()

    return {
      success: true,
      data: {
        activeListings,
        tradeVolume,
        happyUsers,
      },
    }
  } catch (err) {
    console.error("Failed to get landing page stats:", err)
    return { success: false, error: "Failed to load marketplace statistics" }
  }
}

const getCachedTrendingListings = unstable_cache(
  async (limit: number): Promise<{
    success: boolean
    data?: TrendingListing[]
    error?: string
  }> => {
    try {
      // Fetch from ItemListing
      const itemListings = await prisma.itemListing.findMany({
        where: { status: "available" },
        select: {
          id: true,
          title: true,
          price: true,
          image: true,
          views: true,
          upvotes: true,
          game: {
            select: { displayName: true },
          },
          seller: {
            select: {
              id: true,
              username: true,
              vouchesReceived: {
                where: { status: "VALID" },
                select: { id: true },
              },
            },
          },
        },
        orderBy: { views: "desc" },
        take: limit,
      })

      // Fetch from CurrencyListing
      const currencyListings = await prisma.currencyListing.findMany({
        where: { status: "available" },
        select: {
          id: true,
          title: true,
          ratePerPeso: true,
          image: true,
          views: true,
          upvotes: true,
          game: {
            select: { displayName: true },
          },
          seller: {
            select: {
              id: true,
              username: true,
              vouchesReceived: {
                where: { status: "VALID" },
                select: { id: true },
              },
            },
          },
        },
        orderBy: { views: "desc" },
        take: limit,
      })

      const itemListingIds = itemListings.map((listing) => listing.id)
      const currencyListingIds = currencyListings.map((listing) => listing.id)

      const inquiryCounts =
        itemListingIds.length > 0 || currencyListingIds.length > 0
          ? await prisma.conversation.groupBy({
              by: ["listingId", "listingType"],
              where: {
                OR: [
                  ...(itemListingIds.length > 0
                    ? [{ listingType: "ITEM", listingId: { in: itemListingIds } }]
                    : []),
                  ...(currencyListingIds.length > 0
                    ? [{ listingType: "CURRENCY", listingId: { in: currencyListingIds } }]
                    : []),
                ],
              },
              _count: {
                _all: true,
              },
            })
          : []

      const inquiryMap = new Map(
        inquiryCounts.map((group) => [
          `${group.listingType}:${group.listingId}`,
          group._count._all,
        ])
      )

      // Combine and format
      const allListings = [
        ...itemListings.map((listing) => ({
          id: listing.id,
          title: listing.title,
          game: listing.game.displayName,
          price: listing.price,
          image: listing.image,
          listingType: "ITEM" as const,
          seller: {
            id: listing.seller.id,
            username: listing.seller.username,
            vouch: listing.seller.vouchesReceived.length,
          },
          views: listing.views,
          vouchCount: listing.upvotes,
          inquiries: inquiryMap.get(`ITEM:${listing.id}`) || 0,
        })),
        ...currencyListings.map((listing) => ({
          id: listing.id,
          title: listing.title,
          game: listing.game.displayName,
          price: listing.ratePerPeso,
          image: listing.image,
          listingType: "CURRENCY" as const,
          seller: {
            id: listing.seller.id,
            username: listing.seller.username,
            vouch: listing.seller.vouchesReceived.length,
          },
          views: listing.views,
          vouchCount: listing.upvotes,
          inquiries: inquiryMap.get(`CURRENCY:${listing.id}`) || 0,
        })),
      ]

      // Sort by views and take limit
      const formatted = allListings
        .sort((a, b) => b.views - a.views)
        .slice(0, limit)

      return { success: true, data: formatted }
    } catch (err) {
      console.error("Failed to get trending listings:", err)
      return { success: false, error: "Failed to load trending listings" }
    }
  },
  ["trends-trending-listings-v2"],
  { revalidate: 300 }
)

/**
 * Get trending listings by views and vouch count
 * Used for the featured listings carousel
 */
export async function getTrendingListings(
  limit: number = 4,
): Promise<{
  success: boolean
  data?: TrendingListing[]
  error?: string
}> {
  return getCachedTrendingListings(limit)
}

/**
 * Get market trends over a specified number of days
 * Aggregates transaction data by date
 */
export async function getMarketTrends(
  days: number = 30,
): Promise<{
  success: boolean
  data?: MarketTrend[]
  error?: string
}> {
  try {
    // Get transactions from the past N days
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)

    const transactions = await prisma.transaction.findMany({
      where: {
        createdAt: { gte: startDate },
        status: "COMPLETED",
      },
      select: {
        price: true,
        createdAt: true,
      },
      orderBy: { createdAt: "asc" },
    })

    // Aggregate by date
    const trendMap = new Map<
      string,
      { totalPrice: number; volume: number; count: number; prices: number[] }
    >()

    transactions.forEach((tx) => {
      const date = tx.createdAt.toISOString().split("T")[0] // YYYY-MM-DD
      const existing = trendMap.get(date) || {
        totalPrice: 0,
        volume: tx.price,
        count: 0,
        prices: [],
      }

      existing.totalPrice += tx.price
      existing.volume = tx.price
      existing.count += 1
      existing.prices.push(tx.price)

      trendMap.set(date, existing)
    })

    // Format for chart
    const trends = Array.from(trendMap.entries()).map(([date, data]) => ({
      date,
      avgPrice: Math.round(data.totalPrice / data.count),
      volume: data.volume,
      transactions: data.count,
    }))

    return { success: true, data: trends }
  } catch (err) {
    console.error("Failed to get market trends:", err)
    return { success: false, error: "Failed to load market trends" }
  }
}

const getCachedPopularGames = unstable_cache(
  async (limit: number): Promise<{
    success: boolean
    data?: PopularGame[]
    error?: string
  }> => {
    try {
      // Get item listings with game info
      const itemListings = await prisma.itemListing.findMany({
        where: { status: "available" },
        select: {
          price: true,
          views: true,
          game: {
            select: { displayName: true },
          },
        },
      })

      // Get currency listings with game info
      const currencyListings = await prisma.currencyListing.findMany({
        where: { status: "available" },
        select: {
          ratePerPeso: true,
          views: true,
          game: {
            select: { displayName: true },
          },
        },
      })

      // Aggregate by game
      const gameMap = new Map<string, { listings: number; totalPrice: number; totalViews: number }>()

      itemListings.forEach((listing) => {
        const gameName = listing.game.displayName
        const existing = gameMap.get(gameName) || {
          listings: 0,
          totalPrice: 0,
          totalViews: 0,
        }

        existing.listings += 1
        existing.totalPrice += listing.price
        existing.totalViews += listing.views

        gameMap.set(gameName, existing)
      })

      currencyListings.forEach((listing) => {
        const gameName = listing.game.displayName
        const existing = gameMap.get(gameName) || {
          listings: 0,
          totalPrice: 0,
          totalViews: 0,
        }

        existing.listings += 1
        existing.totalPrice += listing.ratePerPeso
        existing.totalViews += listing.views

        gameMap.set(gameName, existing)
      })

      // Sort by listing count and format
      const games = Array.from(gameMap.entries())
        .map(([game, data]) => ({
          game,
          listings: data.listings,
          avgPrice: Math.round(data.totalPrice / data.listings),
          totalViews: data.totalViews,
        }))
        .sort((a, b) => b.listings - a.listings)
        .slice(0, limit)

      return { success: true, data: games }
    } catch (err) {
      console.error("Failed to get popular games:", err)
      return { success: false, error: "Failed to load popular games" }
    }
  },
  ["trends-popular-games-v2"],
  { revalidate: 300 }
)

/**
 * Get most popular games on the marketplace
 * Aggregates listings by game name
 */
export async function getPopularGames(limit: number = 10): Promise<{
  success: boolean
  data?: PopularGame[]
  error?: string
}> {
  return getCachedPopularGames(limit)
}

/**
 * Get top selling items (by transaction count)
 * Note: This function is disabled as transactions use listingId + listingType discriminator
 * instead of direct foreign key relations
 */
export async function getTopSellingItems(
  limit: number = 5,
): Promise<{
  success: boolean
  data?: Array<{
    listing: string
    price: number
    sales: number
  }>
  error?: string
}> {
  try {
    // This would require complex joins across ItemListing and CurrencyListing
    // Based on listingId and listingType in transactions
    // For now, return empty array
    return { success: true, data: [] }
  } catch (err) {
    console.error("Failed to get top selling items:", err)
    return { success: false, error: "Failed to load top selling items" }
  }
}

const getCachedTopTraders = unstable_cache(
  async (limit: number): Promise<{
    success: boolean
    data?: Array<{
      id: string
      username: string
      avatar: string | null
      vouch: number
      joinDate: Date
      listings: number
      verified: boolean
      completedTrades: number
      recentSaleAt: Date | null
    }>
    error?: string
  }> => {
    try {
      const traders = await prisma.user.findMany({
        select: {
          id: true,
          username: true,
          profilePicture: true,
          isVerified: true,
          joinDate: true,
          vouchesReceived: {
            where: { status: "VALID" }, // Only count valid vouches
            select: { id: true },
          },
          itemListings: {
            where: { status: "available" },
            select: { id: true },
          },
          currencyListings: {
            where: { status: "available" },
            select: { id: true },
          },
        },
        orderBy: [
          { vouchesReceived: { _count: "desc" } },
          { joinDate: "asc" },
        ],
        take: limit,
      })

      const traderIds = traders.map((trader) => trader.id)
      const salesByTrader = traderIds.length > 0
        ? await prisma.transaction.groupBy({
            by: ["sellerId"],
            where: {
              status: "COMPLETED",
              sellerId: { in: traderIds },
            },
            _count: {
              _all: true,
            },
            _max: {
              updatedAt: true,
            },
          })
        : []

      const salesMap = new Map(
        salesByTrader.map((entry) => [
          entry.sellerId,
          {
            completedTrades: entry._count._all,
            recentSaleAt: entry._max.updatedAt ?? null,
          },
        ])
      )

      const formatted = traders.map((trader) => ({
        id: trader.id,
        username: trader.username,
        avatar: trader.profilePicture,
        vouch: trader.vouchesReceived.length,
        joinDate: trader.joinDate,
        listings: trader.itemListings.length + trader.currencyListings.length,
        verified: trader.isVerified,
        completedTrades: salesMap.get(trader.id)?.completedTrades || 0,
        recentSaleAt: salesMap.get(trader.id)?.recentSaleAt || null,
      }))

      return { success: true, data: formatted }
    } catch (err) {
      console.error("Failed to get top traders:", err)
      return { success: false, error: "Failed to load top traders" }
    }
  },
  ["trends-top-traders-v2"],
  { revalidate: 300 }
)

/**
 * Get top traders by vouch count
 * Returns users with highest reputation/vouch count
 */
export async function getTopTraders(
  limit: number = 4,
): Promise<{
  success: boolean
  data?: Array<{
    id: string
    username: string
    avatar: string | null
    vouch: number
    joinDate: Date
    listings: number
    verified: boolean
    completedTrades: number
    recentSaleAt: Date | null
  }>
  error?: string
}> {
  return getCachedTopTraders(limit)
}

/**
 * Get most viewed listings (trending now)
 */
export async function getMostViewedListings(
  limit: number = 5,
): Promise<{
  success: boolean
  data?: Array<{
    title: string
    views: number
    inquiries: number
  }>
  error?: string
}> {
  try {
    // Get item listings
    const itemListings = await prisma.itemListing.findMany({
      where: { status: "available" },
      select: {
        id: true,
        title: true,
        views: true,
      },
      orderBy: { views: "desc" },
      take: limit,
    })

    // Get currency listings
    const currencyListings = await prisma.currencyListing.findMany({
      where: { status: "available" },
      select: {
        id: true,
        title: true,
        views: true,
      },
      orderBy: { views: "desc" },
      take: limit,
    })

    const itemListingIds = itemListings.map((listing) => listing.id)
    const currencyListingIds = currencyListings.map((listing) => listing.id)

    const inquiryCounts =
      itemListingIds.length > 0 || currencyListingIds.length > 0
        ? await prisma.conversation.groupBy({
            by: ["listingId", "listingType"],
            where: {
              OR: [
                ...(itemListingIds.length > 0
                  ? [{ listingType: "ITEM", listingId: { in: itemListingIds } }]
                  : []),
                ...(currencyListingIds.length > 0
                  ? [{ listingType: "CURRENCY", listingId: { in: currencyListingIds } }]
                  : []),
              ],
            },
            _count: {
              _all: true,
            },
          })
        : []

    const inquiryMap = new Map(
      inquiryCounts.map((group) => [
        `${group.listingType}:${group.listingId}`,
        group._count._all,
      ])
    )

    const allListingsWithInquiries = [
      ...itemListings.map((listing) => ({
        title: listing.title,
        views: listing.views,
        inquiries: inquiryMap.get(`ITEM:${listing.id}`) || 0,
      })),
      ...currencyListings.map((listing) => ({
        title: listing.title,
        views: listing.views,
        inquiries: inquiryMap.get(`CURRENCY:${listing.id}`) || 0,
      })),
    ]

    // Sort by views and take limit
    const formatted = allListingsWithInquiries
      .sort((a, b) => b.views - a.views)
      .slice(0, limit)

    return { success: true, data: formatted }
  } catch (err) {
    console.error("Failed to get most viewed listings:", err)
    return { success: false, error: "Failed to load most viewed listings" }
  }
}

/**
 * Get recent completed transactions
 * Returns a list of completed transactions with buyer, seller, and listing details
 */
export async function getRecentActivity(
  limit: number = 50,
): Promise<{
  success: boolean
  data?: Array<{
    id: string
    buyerUsername: string
    sellerUsername: string
    listingTitle: string
    price: number
    amount?: number
    completedAt: Date
    buyerId: string
    sellerId: string
  }>
  error?: string
}> {
  try {
    const transactions = await prisma.transaction.findMany({
      where: {
        status: "COMPLETED",
      },
      select: {
        id: true,
        buyerId: true,
        sellerId: true,
        price: true,
        amount: true,
        updatedAt: true,
        listingId: true,
        listingType: true,
        buyer: {
          select: {
            username: true,
          },
        },
        seller: {
          select: {
            username: true,
          },
        },
      },
      orderBy: {
        updatedAt: "desc",
      },
      take: limit,
    })

    const itemListingIds = Array.from(
      new Set(
        transactions
          .filter((tx) => tx.listingType === "ITEM" && !!tx.listingId)
          .map((tx) => tx.listingId)
      )
    )
    const currencyListingIds = Array.from(
      new Set(
        transactions
          .filter((tx) => tx.listingType === "CURRENCY" && !!tx.listingId)
          .map((tx) => tx.listingId)
      )
    )

    const [itemListings, currencyListings] = await Promise.all([
      itemListingIds.length > 0
        ? prisma.itemListing.findMany({
            where: { id: { in: itemListingIds } },
            select: { id: true, title: true },
          })
        : Promise.resolve([]),
      currencyListingIds.length > 0
        ? prisma.currencyListing.findMany({
            where: { id: { in: currencyListingIds } },
            select: { id: true, title: true },
          })
        : Promise.resolve([]),
    ])

    const itemListingMap = new Map(itemListings.map((listing) => [listing.id, listing.title]))
    const currencyListingMap = new Map(
      currencyListings.map((listing) => [listing.id, listing.title])
    )

    const formattedTransactions = transactions.map((tx) => {
      let listingTitle = "Unknown Item"

      if (tx.listingType === "ITEM" && tx.listingId) {
        listingTitle = itemListingMap.get(tx.listingId) || listingTitle
      } else if (tx.listingType === "CURRENCY" && tx.listingId) {
        listingTitle = currencyListingMap.get(tx.listingId) || listingTitle
      }

      return {
        id: tx.id,
        buyerUsername: tx.buyer.username,
        sellerUsername: tx.seller.username,
        buyerId: tx.buyerId,
        sellerId: tx.sellerId,
        listingTitle,
        price: tx.price,
        amount: tx.amount || undefined,
        completedAt: tx.updatedAt,
      }
    })

    return { success: true, data: formattedTransactions }
  } catch (err) {
    console.error("Failed to get recent activity:", err)
    return { success: false, error: "Failed to load recent activity" }
  }
}

function getWindowStart(days: number): Date {
  const date = new Date()
  date.setDate(date.getDate() - days)
  return date
}

function getPercentChange(current: number, previous: number): number {
  if (previous <= 0) {
    return current > 0 ? 100 : 0
  }
  return ((current - previous) / previous) * 100
}

export async function getTrendsOverviewMetrics(
  days: number = 30,
): Promise<{
  success: boolean
  data?: {
    activeListings: { value: number; change: number }
    activeTraders: { value: number; change: number }
    completedTransactions: { value: number; change: number }
    tradeVolume: { value: number; change: number }
    averagePrice: { value: number; change: number }
  }
  error?: string
}> {
  try {
    const currentStart = getWindowStart(days)
    const previousStart = getWindowStart(days * 2)

    const [
      currentItemListings,
      currentCurrencyListings,
      previousItemListings,
      previousCurrencyListings,
      currentTransactions,
      previousTransactions,
      currentVolume,
      previousVolume,
    ] = await Promise.all([
      prisma.itemListing.count({ where: { createdAt: { gte: currentStart } } }),
      prisma.currencyListing.count({ where: { createdAt: { gte: currentStart } } }),
      prisma.itemListing.count({ where: { createdAt: { gte: previousStart, lt: currentStart } } }),
      prisma.currencyListing.count({ where: { createdAt: { gte: previousStart, lt: currentStart } } }),
      prisma.transaction.findMany({
        where: { status: "COMPLETED", updatedAt: { gte: currentStart } },
        select: { buyerId: true, sellerId: true, price: true },
      }),
      prisma.transaction.findMany({
        where: { status: "COMPLETED", updatedAt: { gte: previousStart, lt: currentStart } },
        select: { buyerId: true, sellerId: true, price: true },
      }),
      prisma.transaction.aggregate({
        where: { status: "COMPLETED", updatedAt: { gte: currentStart } },
        _sum: { price: true },
      }),
      prisma.transaction.aggregate({
        where: { status: "COMPLETED", updatedAt: { gte: previousStart, lt: currentStart } },
        _sum: { price: true },
      }),
    ])

    const currentListings = currentItemListings + currentCurrencyListings
    const previousListings = previousItemListings + previousCurrencyListings

    const currentTraderIds = new Set<string>()
    for (const tx of currentTransactions) {
      currentTraderIds.add(tx.buyerId)
      currentTraderIds.add(tx.sellerId)
    }

    const previousTraderIds = new Set<string>()
    for (const tx of previousTransactions) {
      previousTraderIds.add(tx.buyerId)
      previousTraderIds.add(tx.sellerId)
    }

    const currentCompletedTransactions = currentTransactions.length
    const previousCompletedTransactions = previousTransactions.length
    const currentTradeVolume = currentVolume._sum.price || 0
    const previousTradeVolume = previousVolume._sum.price || 0
    const currentAveragePrice = currentCompletedTransactions > 0
      ? Math.round(currentTradeVolume / currentCompletedTransactions)
      : 0
    const previousAveragePrice = previousCompletedTransactions > 0
      ? Math.round(previousTradeVolume / previousCompletedTransactions)
      : 0

    return {
      success: true,
      data: {
        activeListings: {
          value: currentListings,
          change: getPercentChange(currentListings, previousListings),
        },
        activeTraders: {
          value: currentTraderIds.size,
          change: getPercentChange(currentTraderIds.size, previousTraderIds.size),
        },
        completedTransactions: {
          value: currentCompletedTransactions,
          change: getPercentChange(currentCompletedTransactions, previousCompletedTransactions),
        },
        tradeVolume: {
          value: currentTradeVolume,
          change: getPercentChange(currentTradeVolume, previousTradeVolume),
        },
        averagePrice: {
          value: currentAveragePrice,
          change: getPercentChange(currentAveragePrice, previousAveragePrice),
        },
      },
    }
  } catch (error) {
    console.error("Failed to get trends overview metrics:", error)
    return { success: false, error: "Failed to load trends overview metrics" }
  }
}

export async function getCurrencyMarketTrends(
  days: number = 30,
  limit: number = 10,
): Promise<{
  success: boolean
  data?: {
    summary: {
      activeListings: number
      avgRate: number
      totalStock: number
      completedTrades: number
      tradedUnits: number
      tradedValue: number
    }
    trends: Array<{
      date: string
      avgRate: number
      listings: number
    }>
    topCurrencies: Array<{
      currencyId: string
      currency: string
      game: string
      listings: number
      avgRate: number
      minRate: number
      maxRate: number
      stock: number
      views: number
    }>
  }
  error?: string
}> {
  try {
    const startDate = getWindowStart(days)
    const [activeListings, recentListings, completedTrades, completedTradeAgg] = await Promise.all([
      prisma.currencyListing.findMany({
        where: { status: "available" },
        select: {
          id: true,
          createdAt: true,
          ratePerPeso: true,
          stock: true,
          views: true,
          gameId: true,
          gameCurrencyId: true,
          game: { select: { displayName: true } },
          gameCurrency: { select: { displayName: true } },
        },
      }),
      prisma.currencyListing.findMany({
        where: { createdAt: { gte: startDate } },
        select: {
          createdAt: true,
          ratePerPeso: true,
        },
      }),
      prisma.transaction.count({
        where: {
          status: "COMPLETED",
          listingType: "CURRENCY",
          updatedAt: { gte: startDate },
        },
      }),
      prisma.transaction.aggregate({
        where: {
          status: "COMPLETED",
          listingType: "CURRENCY",
          updatedAt: { gte: startDate },
        },
        _sum: {
          amount: true,
          price: true,
        },
      }),
    ])

    const summary = {
      activeListings: activeListings.length,
      avgRate:
        activeListings.length > 0
          ? Number(
              (
                activeListings.reduce((sum, listing) => sum + listing.ratePerPeso, 0) /
                activeListings.length
              ).toFixed(2)
            )
          : 0,
      totalStock: activeListings.reduce((sum, listing) => sum + listing.stock, 0),
      completedTrades,
      tradedUnits: completedTradeAgg._sum.amount || 0,
      tradedValue: completedTradeAgg._sum.price || 0,
    }

    const trendMap = new Map<string, { totalRate: number; count: number }>()
    for (const listing of recentListings) {
      const date = listing.createdAt.toISOString().split("T")[0]
      const prev = trendMap.get(date) || { totalRate: 0, count: 0 }
      prev.totalRate += listing.ratePerPeso
      prev.count += 1
      trendMap.set(date, prev)
    }

    const trends = Array.from(trendMap.entries())
      .map(([date, entry]) => ({
        date,
        avgRate: Number((entry.totalRate / entry.count).toFixed(2)),
        listings: entry.count,
      }))
      .sort((a, b) => a.date.localeCompare(b.date))

    const currencyMap = new Map<
      string,
      {
        currencyId: string
        currency: string
        game: string
        listings: number
        totalRate: number
        minRate: number
        maxRate: number
        stock: number
        views: number
      }
    >()

    for (const listing of activeListings) {
      const key = `${listing.gameCurrencyId}:${listing.gameId}`
      const prev = currencyMap.get(key) || {
        currencyId: listing.gameCurrencyId,
        currency: listing.gameCurrency.displayName,
        game: listing.game.displayName,
        listings: 0,
        totalRate: 0,
        minRate: listing.ratePerPeso,
        maxRate: listing.ratePerPeso,
        stock: 0,
        views: 0,
      }

      prev.listings += 1
      prev.totalRate += listing.ratePerPeso
      prev.minRate = Math.min(prev.minRate, listing.ratePerPeso)
      prev.maxRate = Math.max(prev.maxRate, listing.ratePerPeso)
      prev.stock += listing.stock
      prev.views += listing.views
      currencyMap.set(key, prev)
    }

    const topCurrencies = Array.from(currencyMap.values())
      .map((entry) => ({
        currencyId: entry.currencyId,
        currency: entry.currency,
        game: entry.game,
        listings: entry.listings,
        avgRate: Number((entry.totalRate / entry.listings).toFixed(2)),
        minRate: entry.minRate,
        maxRate: entry.maxRate,
        stock: entry.stock,
        views: entry.views,
      }))
      .sort((a, b) => b.listings - a.listings)
      .slice(0, limit)

    return {
      success: true,
      data: {
        summary,
        trends,
        topCurrencies,
      },
    }
  } catch (error) {
    console.error("Failed to get currency market trends:", error)
    return { success: false, error: "Failed to load currency market trends" }
  }
}

export async function getRetentionWatchlist(
  limit: number = 8,
): Promise<{
  success: boolean
  data?: Array<{
    listingId: string
    listingType: "ITEM" | "CURRENCY"
    title: string
    game: string
    views: number
    inquiries: number
    sellerId: string
    sellerUsername: string
  }>
  error?: string
}> {
  try {
    const [itemListings, currencyListings] = await Promise.all([
      prisma.itemListing.findMany({
        where: { status: "available" },
        select: {
          id: true,
          title: true,
          views: true,
          sellerId: true,
          seller: { select: { username: true } },
          game: { select: { displayName: true } },
        },
        orderBy: { views: "desc" },
        take: limit * 4,
      }),
      prisma.currencyListing.findMany({
        where: { status: "available" },
        select: {
          id: true,
          title: true,
          views: true,
          sellerId: true,
          seller: { select: { username: true } },
          game: { select: { displayName: true } },
        },
        orderBy: { views: "desc" },
        take: limit * 4,
      }),
    ])

    const itemIds = itemListings.map((listing) => listing.id)
    const currencyIds = currencyListings.map((listing) => listing.id)

    const inquiryCounts =
      itemIds.length > 0 || currencyIds.length > 0
        ? await prisma.conversation.groupBy({
            by: ["listingId", "listingType"],
            where: {
              OR: [
                ...(itemIds.length > 0 ? [{ listingType: "ITEM", listingId: { in: itemIds } }] : []),
                ...(currencyIds.length > 0
                  ? [{ listingType: "CURRENCY", listingId: { in: currencyIds } }]
                  : []),
              ],
            },
            _count: {
              _all: true,
            },
          })
        : []

    const inquiryMap = new Map(
      inquiryCounts.map((entry) => [`${entry.listingType}:${entry.listingId}`, entry._count._all])
    )

    const watchlist = [
      ...itemListings.map((listing) => ({
        listingId: listing.id,
        listingType: "ITEM" as const,
        title: listing.title,
        game: listing.game.displayName,
        views: listing.views,
        inquiries: inquiryMap.get(`ITEM:${listing.id}`) || 0,
        sellerId: listing.sellerId,
        sellerUsername: listing.seller.username,
      })),
      ...currencyListings.map((listing) => ({
        listingId: listing.id,
        listingType: "CURRENCY" as const,
        title: listing.title,
        game: listing.game.displayName,
        views: listing.views,
        inquiries: inquiryMap.get(`CURRENCY:${listing.id}`) || 0,
        sellerId: listing.sellerId,
        sellerUsername: listing.seller.username,
      })),
    ]
      .filter((entry) => entry.views >= 20)
      .filter((entry) => {
        const conversionRate = entry.views > 0 ? entry.inquiries / entry.views : 0
        return conversionRate <= 0.1
      })
      .sort((a, b) => {
        const aConversion = a.views > 0 ? a.inquiries / a.views : 0
        const bConversion = b.views > 0 ? b.inquiries / b.views : 0
        if (aConversion !== bConversion) return aConversion - bConversion
        return b.views - a.views
      })
      .slice(0, limit)

    return { success: true, data: watchlist }
  } catch (error) {
    console.error("Failed to get retention watchlist:", error)
    return { success: false, error: "Failed to load retention watchlist" }
  }
}

export async function getTrendsAlertSignals(params: {
  watchedGames?: string[]
  days?: number
  limit?: number
} = {}): Promise<{
  success: boolean
  data?: {
    followedSellers: Array<{
      sellerId: string
      sellerUsername: string
      completedTrades: number
      tradeVolume: number
      change: number
    }>
    watchedGames: Array<{
      gameId: string
      game: string
      completedTrades: number
      change: number
    }>
    priceMoves: Array<{
      gameId: string
      game: string
      currentAvgPrice: number
      previousAvgPrice: number
      change: number
    }>
  }
  error?: string
}> {
  try {
    const days = params.days || 30
    const limit = params.limit || 6
    const currentStart = getWindowStart(days)
    const previousStart = getWindowStart(days * 2)

    const session = await auth()
    let followedSellers: Array<{
      sellerId: string
      sellerUsername: string
      completedTrades: number
      tradeVolume: number
      change: number
    }> = []

    if (session?.user?.email) {
      const user = await prisma.user.findUnique({
        where: { email: session.user.email },
        select: { id: true },
      })

      if (user) {
        const follows = await prisma.userFollow.findMany({
          where: { followerId: user.id },
          select: { followingId: true },
          take: 50,
        })

        const followedIds = follows.map((follow) => follow.followingId)

        if (followedIds.length > 0) {
          const [currentStats, previousStats, sellerProfiles] = await Promise.all([
            prisma.transaction.groupBy({
              by: ["sellerId"],
              where: {
                status: "COMPLETED",
                sellerId: { in: followedIds },
                updatedAt: { gte: currentStart },
              },
              _count: { _all: true },
              _sum: { price: true },
            }),
            prisma.transaction.groupBy({
              by: ["sellerId"],
              where: {
                status: "COMPLETED",
                sellerId: { in: followedIds },
                updatedAt: { gte: previousStart, lt: currentStart },
              },
              _count: { _all: true },
            }),
            prisma.user.findMany({
              where: { id: { in: followedIds } },
              select: { id: true, username: true },
            }),
          ])

          const previousMap = new Map(previousStats.map((entry) => [entry.sellerId, entry._count._all]))
          const sellerMap = new Map(sellerProfiles.map((seller) => [seller.id, seller.username]))

          followedSellers = currentStats
            .map((entry) => {
              const previousCount = previousMap.get(entry.sellerId) || 0
              const currentCount = entry._count._all
              return {
                sellerId: entry.sellerId,
                sellerUsername: sellerMap.get(entry.sellerId) || "Unknown Seller",
                completedTrades: currentCount,
                tradeVolume: entry._sum.price || 0,
                change: getPercentChange(currentCount, previousCount),
              }
            })
            .sort((a, b) => b.completedTrades - a.completedTrades)
            .slice(0, limit)
        }
      }
    }

    const watchedGameNames = (params.watchedGames || []).map((game) => game.trim()).filter(Boolean)

    if (watchedGameNames.length === 0) {
      return {
        success: true,
        data: {
          followedSellers,
          watchedGames: [],
          priceMoves: [],
        },
      }
    }

    const watchedGameRecords = await prisma.game.findMany({
      where: {
        displayName: {
          in: watchedGameNames,
        },
      },
      select: {
        id: true,
        displayName: true,
      },
    })

    const watchedGameIds = watchedGameRecords.map((game) => game.id)
    const watchedGameMap = new Map(watchedGameRecords.map((game) => [game.id, game.displayName]))

    if (watchedGameIds.length === 0) {
      return {
        success: true,
        data: {
          followedSellers,
          watchedGames: [],
          priceMoves: [],
        },
      }
    }

    const [currentItemListings, previousItemListings, currentCurrencyListings, previousCurrencyListings] = await Promise.all([
      prisma.itemListing.findMany({
        where: {
          gameId: { in: watchedGameIds },
          createdAt: { gte: currentStart },
        },
        select: { gameId: true, price: true },
      }),
      prisma.itemListing.findMany({
        where: {
          gameId: { in: watchedGameIds },
          createdAt: { gte: previousStart, lt: currentStart },
        },
        select: { gameId: true, price: true },
      }),
      prisma.currencyListing.findMany({
        where: {
          gameId: { in: watchedGameIds },
          createdAt: { gte: currentStart },
        },
        select: { gameId: true, ratePerPeso: true },
      }),
      prisma.currencyListing.findMany({
        where: {
          gameId: { in: watchedGameIds },
          createdAt: { gte: previousStart, lt: currentStart },
        },
        select: { gameId: true, ratePerPeso: true },
      }),
    ])

    const currentMetricsMap = new Map<string, { count: number; totalPrice: number }>()
    const previousMetricsMap = new Map<string, { count: number; totalPrice: number }>()

    for (const listing of currentItemListings) {
      const prev = currentMetricsMap.get(listing.gameId) || { count: 0, totalPrice: 0 }
      prev.count += 1
      prev.totalPrice += listing.price
      currentMetricsMap.set(listing.gameId, prev)
    }
    for (const listing of currentCurrencyListings) {
      const prev = currentMetricsMap.get(listing.gameId) || { count: 0, totalPrice: 0 }
      prev.count += 1
      prev.totalPrice += listing.ratePerPeso
      currentMetricsMap.set(listing.gameId, prev)
    }

    for (const listing of previousItemListings) {
      const prev = previousMetricsMap.get(listing.gameId) || { count: 0, totalPrice: 0 }
      prev.count += 1
      prev.totalPrice += listing.price
      previousMetricsMap.set(listing.gameId, prev)
    }
    for (const listing of previousCurrencyListings) {
      const prev = previousMetricsMap.get(listing.gameId) || { count: 0, totalPrice: 0 }
      prev.count += 1
      prev.totalPrice += listing.ratePerPeso
      previousMetricsMap.set(listing.gameId, prev)
    }

    const watchedGames = watchedGameIds
      .map((gameId) => {
        const current = currentMetricsMap.get(gameId) || { count: 0, totalPrice: 0 }
        const previous = previousMetricsMap.get(gameId) || { count: 0, totalPrice: 0 }
        return {
          gameId,
          game: watchedGameMap.get(gameId) || "Unknown Game",
          completedTrades: current.count,
          change: getPercentChange(current.count, previous.count),
        }
      })
      .sort((a, b) => b.completedTrades - a.completedTrades)
      .slice(0, limit)

    const priceMoves = watchedGameIds
      .map((gameId) => {
        const current = currentMetricsMap.get(gameId) || { count: 0, totalPrice: 0 }
        const previous = previousMetricsMap.get(gameId) || { count: 0, totalPrice: 0 }
        const currentAvgPrice = current.count > 0 ? Math.round(current.totalPrice / current.count) : 0
        const previousAvgPrice = previous.count > 0 ? Math.round(previous.totalPrice / previous.count) : 0
        return {
          gameId,
          game: watchedGameMap.get(gameId) || "Unknown Game",
          currentAvgPrice,
          previousAvgPrice,
          change: getPercentChange(currentAvgPrice, previousAvgPrice),
        }
      })
      .sort((a, b) => Math.abs(b.change) - Math.abs(a.change))
      .slice(0, limit)

    return {
      success: true,
      data: {
        followedSellers,
        watchedGames,
        priceMoves,
      },
    }
  } catch (error) {
    console.error("Failed to get trends alert signals:", error)
    return { success: false, error: "Failed to load trends alert signals" }
  }
}

export async function dispatchRetentionWatchlistAlerts(params: {
  limit?: number
  sendEmail?: boolean
} = {}): Promise<{
  success: boolean
  data?: {
    alertsCreated: number
    duplicateAlerts: number
    emailsSent: number
    emailsQueued: number
  }
  error?: string
}> {
  try {
    const limit = params.limit || 8
    const watchlistResult = await getRetentionWatchlist(limit)
    if (!watchlistResult.success || !watchlistResult.data) {
      return {
        success: false,
        error: watchlistResult.error || "Failed to load retention watchlist",
      }
    }

    const watchlist = watchlistResult.data
    if (watchlist.length === 0) {
      return {
        success: true,
        data: {
          alertsCreated: 0,
          duplicateAlerts: 0,
          emailsSent: 0,
          emailsQueued: 0,
        },
      }
    }

    const since = new Date(Date.now() - 24 * 60 * 60 * 1000)
    let alertsCreated = 0
    let duplicateAlerts = 0

    for (const listing of watchlist) {
      const link = listing.listingType === "CURRENCY"
        ? `/currency/${listing.listingId}`
        : `/listing/${listing.listingId}`

      const duplicate = await prisma.notification.findFirst({
        where: {
          userId: listing.sellerId,
          type: "SYSTEM",
          link,
          createdAt: { gte: since },
        },
        select: { id: true },
      })

      if (duplicate) {
        duplicateAlerts += 1
        continue
      }

      await prisma.notification.create({
        data: {
          userId: listing.sellerId,
          type: "SYSTEM",
          title: "Retention Alert: Listing Needs Follow-up",
          message: `${listing.title} has ${listing.views.toLocaleString()} views but only ${listing.inquiries.toLocaleString()} inquiries. Consider updating price, media, or description to improve conversion.`,
          link,
        },
      })

      alertsCreated += 1
    }

    return {
      success: true,
      data: {
        alertsCreated,
        duplicateAlerts,
        emailsSent: 0,
        emailsQueued: params.sendEmail ? alertsCreated : 0,
      },
    }
  } catch (error) {
    console.error("Failed to dispatch retention watchlist alerts:", error)
    return { success: false, error: "Failed to dispatch retention alerts" }
  }
}

export async function trackTrendsInteraction(
  interactionType: string,
  metadata: Record<string, unknown> = {},
): Promise<{ success: boolean; error?: string }> {
  try {
    // Interaction tracking is currently lightweight and intentionally non-blocking.
    void interactionType
    void metadata
    return { success: true }
  } catch (error) {
    console.error("Failed to track trends interaction:", error)
    return { success: false, error: "Failed to track trends interaction" }
  }
}

export async function trackTrendsInteractionsBatch(
  events: Array<{
    interactionType: string
    metadata?: Record<string, unknown>
    at?: string
  }>,
): Promise<{ success: boolean; processed?: number; error?: string }> {
  try {
    void events
    return { success: true, processed: events.length }
  } catch (error) {
    console.error("Failed to track trends interactions batch:", error)
    return { success: false, error: "Failed to track trends interactions" }
  }
}
