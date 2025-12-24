"use server"

import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

// Check if user is admin
async function isAdmin() {
  const session = await auth()
  if (!session?.user || session.user.role !== "admin") {
    return false
  }
  return true
}

// Get date range based on time range filter
function getDateRange(timeRange: string) {
  const now = new Date()
  const startDate = new Date()

  switch (timeRange) {
    case "7d":
      startDate.setDate(now.getDate() - 7)
      break
    case "30d":
      startDate.setDate(now.getDate() - 30)
      break
    case "3m":
      startDate.setMonth(now.getMonth() - 3)
      break
    case "6m":
      startDate.setMonth(now.getMonth() - 6)
      break
    case "1y":
      startDate.setFullYear(now.getFullYear() - 1)
      break
    default:
      startDate.setMonth(now.getMonth() - 6)
  }

  return { startDate, endDate: now }
}

export async function getAnalyticsOverview(timeRange: string = "6m") {
  try {
    if (!(await isAdmin())) {
      return { success: false, error: "Unauthorized" }
    }

    const { startDate, endDate } = getDateRange(timeRange)

    // Get total users and new users in period
    const [totalUsers, newUsers, prevPeriodUsers] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({
        where: { createdAt: { gte: startDate, lte: endDate } }
      }),
      prisma.user.count({
        where: {
          createdAt: {
            gte: new Date(startDate.getTime() - (endDate.getTime() - startDate.getTime())),
            lt: startDate
          }
        }
      })
    ])

    const userGrowth = prevPeriodUsers > 0 
      ? ((newUsers - prevPeriodUsers) / prevPeriodUsers * 100).toFixed(1)
      : "0"

    // Get active listings (available status)
    const [itemListings, currencyListings, prevItemListings, prevCurrencyListings] = await Promise.all([
      prisma.itemListing.count({ where: { status: "available" } }),
      prisma.currencyListing.count({ where: { status: "available" } }),
      prisma.itemListing.count({
        where: {
          status: "available",
          createdAt: { lt: startDate }
        }
      }),
      prisma.currencyListing.count({
        where: {
          status: "available",
          createdAt: { lt: startDate }
        }
      })
    ])

    const activeListings = itemListings + currencyListings
    const prevActiveListings = prevItemListings + prevCurrencyListings

    const listingGrowth = prevActiveListings > 0
      ? ((activeListings - prevActiveListings) / prevActiveListings * 100).toFixed(1)
      : "0"

    // Get trades this period
    const [currentTrades, prevPeriodTrades] = await Promise.all([
      prisma.transaction.count({
        where: {
          status: "COMPLETED",
          createdAt: { gte: startDate, lte: endDate }
        }
      }),
      prisma.transaction.count({
        where: {
          status: "COMPLETED",
          createdAt: {
            gte: new Date(startDate.getTime() - (endDate.getTime() - startDate.getTime())),
            lt: startDate
          }
        }
      })
    ])

    const tradeGrowth = prevPeriodTrades > 0
      ? ((currentTrades - prevPeriodTrades) / prevPeriodTrades * 100).toFixed(1)
      : "0"

    // Calculate revenue from subscriptions
    const subscriptions = await prisma.user.count({
      where: {
        subscriptionStatus: "ACTIVE",
        subscriptionTier: { not: "FREE" }
      }
    })

    // Estimate monthly revenue (Elite: $10, Premium: $5)
    const eliteCount = await prisma.user.count({
      where: { subscriptionTier: "ELITE", subscriptionStatus: "ACTIVE" }
    })
    const premiumCount = await prisma.user.count({
      where: { subscriptionTier: "PREMIUM", subscriptionStatus: "ACTIVE" }
    })

    const monthlyRevenue = (eliteCount * 10) + (premiumCount * 5)
    
    // Get previous month revenue
    const prevEliteCount = await prisma.user.count({
      where: {
        subscriptionTier: "ELITE",
        subscriptionStatus: "ACTIVE",
        updatedAt: { lt: startDate }
      }
    })
    const prevPremiumCount = await prisma.user.count({
      where: {
        subscriptionTier: "PREMIUM",
        subscriptionStatus: "ACTIVE",
        updatedAt: { lt: startDate }
      }
    })
    const prevRevenue = (prevEliteCount * 10) + (prevPremiumCount * 5)

    const revenueGrowth = prevRevenue > 0
      ? ((monthlyRevenue - prevRevenue) / prevRevenue * 100).toFixed(1)
      : "0"

    return {
      success: true,
      metrics: {
        totalUsers,
        userGrowth: `+${userGrowth}%`,
        activeListings,
        listingGrowth: `+${listingGrowth}%`,
        currentTrades,
        tradeGrowth: `+${tradeGrowth}%`,
        monthlyRevenue,
        revenueGrowth: `+${revenueGrowth}%`
      }
    }
  } catch (error) {
    console.error("Failed to get analytics overview:", error)
    return { success: false, error: "Failed to load analytics" }
  }
}

export async function getUserGrowthData(timeRange: string = "6m") {
  try {
    if (!(await isAdmin())) {
      return { success: false, error: "Unauthorized" }
    }

    const { startDate } = getDateRange(timeRange)
    const months = []
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]

    // Generate last 6 months data
    for (let i = 5; i >= 0; i--) {
      const date = new Date()
      date.setMonth(date.getMonth() - i)
      const monthStart = new Date(date.getFullYear(), date.getMonth(), 1)
      const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0)

      const [totalUsers, newUsers] = await Promise.all([
        prisma.user.count({
          where: { createdAt: { lte: monthEnd } }
        }),
        prisma.user.count({
          where: {
            createdAt: { gte: monthStart, lte: monthEnd }
          }
        })
      ])

      months.push({
        month: monthNames[date.getMonth()],
        users: totalUsers,
        newUsers
      })
    }

    return { success: true, data: months }
  } catch (error) {
    console.error("Failed to get user growth data:", error)
    return { success: false, error: "Failed to load user growth data" }
  }
}

export async function getListingActivityData(timeRange: string = "6m") {
  try {
    if (!(await isAdmin())) {
      return { success: false, error: "Unauthorized" }
    }

    const months = []
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]

    for (let i = 5; i >= 0; i--) {
      const date = new Date()
      date.setMonth(date.getMonth() - i)
      const monthStart = new Date(date.getFullYear(), date.getMonth(), 1)
      const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0)

      const [itemsPosted, itemsSold, currencyPosted, currencySold] = await Promise.all([
        prisma.itemListing.count({
          where: { createdAt: { gte: monthStart, lte: monthEnd } }
        }),
        prisma.itemListing.count({
          where: {
            status: "sold",
            updatedAt: { gte: monthStart, lte: monthEnd }
          }
        }),
        prisma.currencyListing.count({
          where: { createdAt: { gte: monthStart, lte: monthEnd } }
        }),
        prisma.currencyListing.count({
          where: {
            status: "sold",
            updatedAt: { gte: monthStart, lte: monthEnd }
          }
        })
      ])

      months.push({
        month: monthNames[date.getMonth()],
        posted: itemsPosted + currencyPosted,
        sold: itemsSold + currencySold
      })
    }

    return { success: true, data: months }
  } catch (error) {
    console.error("Failed to get listing activity data:", error)
    return { success: false, error: "Failed to load listing activity" }
  }
}

export async function getRevenueData(timeRange: string = "6m") {
  try {
    if (!(await isAdmin())) {
      return { success: false, error: "Unauthorized" }
    }

    const months = []
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]

    for (let i = 5; i >= 0; i--) {
      const date = new Date()
      date.setMonth(date.getMonth() - i)
      const monthStart = new Date(date.getFullYear(), date.getMonth(), 1)
      const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0)

      // Count active subscriptions in that month
      const [eliteCount, premiumCount] = await Promise.all([
        prisma.user.count({
          where: {
            subscriptionTier: "ELITE",
            subscriptionStatus: "ACTIVE",
            updatedAt: { lte: monthEnd }
          }
        }),
        prisma.user.count({
          where: {
            subscriptionTier: "PREMIUM",
            subscriptionStatus: "ACTIVE",
            updatedAt: { lte: monthEnd }
          }
        })
      ])

      // Estimate revenue (simplified - in real app would track actual transactions)
      const subscriptions = (eliteCount * 10) + (premiumCount * 5)
      const boosts = Math.floor(subscriptions * 0.6) // Estimate boost revenue
      const featured = Math.floor(subscriptions * 0.3) // Estimate featured listing revenue

      months.push({
        month: monthNames[date.getMonth()],
        subscriptions,
        boosts,
        featured
      })
    }

    return { success: true, data: months }
  } catch (error) {
    console.error("Failed to get revenue data:", error)
    return { success: false, error: "Failed to load revenue data" }
  }
}

export async function getCategoryDistribution() {
  try {
    if (!(await isAdmin())) {
      return { success: false, error: "Unauthorized" }
    }

    // Get game distribution from listings
    const games = await prisma.game.findMany({
      include: {
        _count: {
          select: {
            itemListings: { where: { status: "available" } },
            currencyListings: { where: { status: "available" } }
          }
        }
      },
      orderBy: {
        displayName: "asc"
      }
    })

    const totalListings = games.reduce(
      (sum, g) => sum + g._count.itemListings + g._count.currencyListings,
      0
    )

    // Group small games into "Other"
    const categoryData = games
      .map(game => ({
        name: game.displayName,
        value: game._count.itemListings + game._count.currencyListings,
        percentage: totalListings > 0 
          ? Math.round(((game._count.itemListings + game._count.currencyListings) / totalListings) * 100)
          : 0
      }))
      .sort((a, b) => b.value - a.value)

    // Take top 4 and group rest as "Other"
    const top4 = categoryData.slice(0, 4)
    const others = categoryData.slice(4)
    const otherPercentage = others.reduce((sum, item) => sum + item.percentage, 0)

    const result = [
      ...top4.map(item => ({ name: item.name, value: item.percentage })),
      ...(otherPercentage > 0 ? [{ name: "Other", value: otherPercentage }] : [])
    ]

    return { success: true, data: result }
  } catch (error) {
    console.error("Failed to get category distribution:", error)
    return { success: false, error: "Failed to load category data" }
  }
}

export async function getTopSellers(limit: number = 5) {
  try {
    if (!(await isAdmin())) {
      return { success: false, error: "Unauthorized" }
    }

    // Get users with most completed transactions as seller
    const sellers = await prisma.user.findMany({
      select: {
        id: true,
        username: true,
        profilePicture: true,
        _count: {
          select: {
            sellerTransactions: {
              where: { status: "COMPLETED" }
            },
            vouchesReceived: true
          }
        },
        sellerTransactions: {
          where: { status: "COMPLETED" },
          select: {
            price: true,
            totalPrice: true
          }
        }
      },
      orderBy: {
        sellerTransactions: {
          _count: "desc"
        }
      },
      take: limit
    })

    const topSellers = sellers.map(seller => {
      const revenue = seller.sellerTransactions.reduce(
        (sum, t) => sum + (t.totalPrice || t.price),
        0
      )
      
      return {
        username: seller.username,
        avatar: seller.profilePicture,
        sales: seller._count.sellerTransactions,
        revenue: `₱${revenue.toLocaleString()}`,
        vouches: seller._count.vouchesReceived
      }
    })

    return { success: true, data: topSellers }
  } catch (error) {
    console.error("Failed to get top sellers:", error)
    return { success: false, error: "Failed to load top sellers" }
  }
}

export async function getTopFlaggedUsers(limit: number = 4) {
  try {
    if (!(await isAdmin())) {
      return { success: false, error: "Unauthorized" }
    }

    // Get users with most reports
    const flaggedUsers = await prisma.user.findMany({
      where: {
        userReportsReceived: {
          some: {}
        }
      },
      select: {
        id: true,
        username: true,
        profilePicture: true,
        _count: {
          select: {
            userReportsReceived: true
          }
        },
        userReportsReceived: {
          select: {
            status: true
          }
        }
      },
      orderBy: {
        userReportsReceived: {
          _count: "desc"
        }
      },
      take: limit
    })

    const topFlagged = flaggedUsers.map(user => ({
      username: user.username,
      avatar: user.profilePicture,
      reports: user._count.userReportsReceived,
      flags: user.userReportsReceived.filter(r => r.status === "PENDING").length
    }))

    return { success: true, data: topFlagged }
  } catch (error) {
    console.error("Failed to get top flagged users:", error)
    return { success: false, error: "Failed to load flagged users" }
  }
}
