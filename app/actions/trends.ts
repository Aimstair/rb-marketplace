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
 * Get landing page statistics
 * Returns key metrics for the homepage
 */
export async function getLandingStats(): Promise<{
  success: boolean
  data?: LandingStats
  error?: string
}> {
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
            username: true,
            vouchesReceived: {
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
            username: true,
            vouchesReceived: {
              select: { id: true },
            },
          },
        },
      },
      orderBy: { views: "desc" },
      take: limit,
    })

    // Combine and format
    const allListings = [
      ...itemListings.map((listing) => ({
        id: listing.id,
        title: listing.title,
        game: listing.game.displayName,
        price: listing.price,
        image: listing.image,
        seller: {
          username: listing.seller.username,
          vouch: listing.seller.vouchesReceived.length,
        },
        views: listing.views,
        vouchCount: listing.upvotes,
      })),
      ...currencyListings.map((listing) => ({
        id: listing.id,
        title: listing.title,
        game: listing.game.displayName,
        price: listing.ratePerPeso,
        image: listing.image,
        seller: {
          username: listing.seller.username,
          vouch: listing.seller.vouchesReceived.length,
        },
        views: listing.views,
        vouchCount: listing.upvotes,
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

    const formatted = traders.map((trader) => ({
      id: trader.id,
      username: trader.username,
      avatar: trader.profilePicture,
      vouch: trader.vouchesReceived.length,
      joinDate: trader.joinDate,
      listings: trader.itemListings.length + trader.currencyListings.length,
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

    // Count conversations/inquiries for each listing
    const allListingsWithInquiries = await Promise.all([
      ...itemListings.map(async (listing) => {
        const inquiryCount = await prisma.conversation.count({
          where: {
            listingId: listing.id,
            listingType: "ITEM",
          },
        })
        return {
          title: listing.title,
          views: listing.views,
          inquiries: inquiryCount,
        }
      }),
      ...currencyListings.map(async (listing) => {
        const inquiryCount = await prisma.conversation.count({
          where: {
            listingId: listing.id,
            listingType: "CURRENCY",
          },
        })
        return {
          title: listing.title,
          views: listing.views,
          inquiries: inquiryCount,
        }
      }),
    ])

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

    // Fetch listing titles for each transaction
    const formattedTransactions = await Promise.all(
      transactions.map(async (tx) => {
        let listingTitle = "Unknown Item"

        if (tx.listingId && tx.listingType) {
          try {
            if (tx.listingType === "ITEM") {
              const itemListing = await prisma.itemListing.findUnique({
                where: { id: tx.listingId },
                select: { title: true },
              })
              if (itemListing) {
                listingTitle = itemListing.title
              } else {
                console.log(`Item listing not found for transaction ${tx.id}, listingId: ${tx.listingId}`)
              }
            } else if (tx.listingType === "CURRENCY") {
              const currencyListing = await prisma.currencyListing.findUnique({
                where: { id: tx.listingId },
                select: { title: true },
              })
              if (currencyListing) {
                listingTitle = currencyListing.title
              } else {
                console.log(`Currency listing not found for transaction ${tx.id}, listingId: ${tx.listingId}`)
              }
            }
          } catch (error) {
            console.error(`Error fetching listing for transaction ${tx.id}:`, error)
          }
        } else {
          console.log(`Transaction ${tx.id} missing listingId or listingType - ID: ${tx.listingId}, Type: ${tx.listingType}`)
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
      }),
    )

    return { success: true, data: formattedTransactions }
  } catch (err) {
    console.error("Failed to get recent activity:", err)
    return { success: false, error: "Failed to load recent activity" }
  }
}
