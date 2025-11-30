"use server"

import { prisma } from "@/lib/prisma"

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
  seller: {
    username: string
    vouch: number
  }
  views: number
  vouchCount: number
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

/**
 * Increment view count for a listing
 * Atomically updates the listing to avoid race conditions
 */
export async function incrementListingView(listingId: string): Promise<{ success: boolean; error?: string }> {
  try {
    await prisma.listing.update({
      where: { id: listingId },
      data: { views: { increment: 1 } },
    })

    return { success: true }
  } catch (err) {
    console.error("Failed to increment listing view:", err)
    return { success: false, error: "Failed to track view" }
  }
}

/**
 * Get landing page statistics
 * Returns key metrics for the homepage
 */
export async function getLandingStats(): Promise<{
  success: boolean
  data?: LandingStats
  error?: string
}> {
  try {
    // Total users (excluding admins for active trader count)
    const totalUsers = await prisma.user.count()

    // Total listings
    const totalListings = await prisma.listing.count()

    // Total volume from transactions
    const volumeResult = await prisma.transaction.aggregate({
      _sum: {
        price: true,
      },
    })
    const totalVolume = volumeResult._sum.price || 0

    // Active traders (users with listings)
    const activeTraders = await prisma.user.count({
      where: {
        listings: { some: {} },
      },
    })

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
}

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
  try {
    const listings = await prisma.listing.findMany({
      where: { status: "available" },
      select: {
        id: true,
        title: true,
        game: true,
        price: true,
        image: true,
        views: true,
        vouchCount: true,
        seller: {
          select: {
            username: true,
            vouchesReceived: {
              select: { id: true },
            },
          },
        },
      },
      orderBy: [
        { views: "desc" }, // Primary sort by views
        { vouchCount: "desc" }, // Secondary sort by vouch count
      ],
      take: limit,
    })

    const formatted = listings.map((listing) => ({
      id: listing.id,
      title: listing.title,
      game: listing.game,
      price: listing.price,
      image: listing.image,
      seller: {
        username: listing.seller.username,
        vouch: listing.seller.vouchesReceived.length,
      },
      views: listing.views,
      vouchCount: listing.vouchCount,
    }))

    return { success: true, data: formatted }
  } catch (err) {
    console.error("Failed to get trending listings:", err)
    return { success: false, error: "Failed to load trending listings" }
  }
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

/**
 * Get most popular games on the marketplace
 * Aggregates listings by game name
 */
export async function getPopularGames(limit: number = 10): Promise<{
  success: boolean
  data?: PopularGame[]
  error?: string
}> {
  try {
    // Get all listings with game info
    const listings = await prisma.listing.findMany({
      where: { status: "available" },
      select: {
        game: true,
        price: true,
        views: true,
      },
    })

    // Aggregate by game
    const gameMap = new Map<string, { listings: number; totalPrice: number; totalViews: number }>()

    listings.forEach((listing) => {
      const existing = gameMap.get(listing.game) || {
        listings: 0,
        totalPrice: 0,
        totalViews: 0,
      }

      existing.listings += 1
      existing.totalPrice += listing.price
      existing.totalViews += listing.views

      gameMap.set(listing.game, existing)
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
}

/**
 * Get top selling items (by transaction count)
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
    const items = await prisma.listing.findMany({
      select: {
        title: true,
        price: true,
        transactions: {
          select: { id: true },
        },
      },
      orderBy: {
        transactions: {
          _count: "desc",
        },
      },
      take: limit,
    })

    const formatted = items.map((item) => ({
      listing: item.title,
      price: item.price,
      sales: item.transactions.length,
    }))

    return { success: true, data: formatted }
  } catch (err) {
    console.error("Failed to get top selling items:", err)
    return { success: false, error: "Failed to load top selling items" }
  }
}

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
  }>
  error?: string
}> {
  try {
    const traders = await prisma.user.findMany({
      select: {
        id: true,
        username: true,
        profilePicture: true,
        isVerified: true,
        joinDate: true,
        vouchesReceived: {
          select: { id: true },
        },
        listings: {
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

    const formatted = traders.map((trader) => ({
      id: trader.id,
      username: trader.username,
      avatar: trader.profilePicture,
      vouch: trader.vouchesReceived.length,
      joinDate: trader.joinDate,
      listings: trader.listings.length,
      verified: trader.isVerified,
    }))

    return { success: true, data: formatted }
  } catch (err) {
    console.error("Failed to get top traders:", err)
    return { success: false, error: "Failed to load top traders" }
  }
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
    const listings = await prisma.listing.findMany({
      where: { status: "available" },
      select: {
        title: true,
        views: true,
        conversations: {
          select: { id: true },
        },
      },
      orderBy: { views: "desc" },
      take: limit,
    })

    const formatted = listings.map((listing) => ({
      title: listing.title,
      views: listing.views,
      inquiries: listing.conversations.length,
    }))

    return { success: true, data: formatted }
  } catch (err) {
    console.error("Failed to get most viewed listings:", err)
    return { success: false, error: "Failed to load most viewed listings" }
  }
}
