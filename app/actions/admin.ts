"use server"

import { prisma } from "@/lib/prisma"
import { createNotification } from "@/app/actions/notifications"
import { auth } from "@/auth"

/**
 * Type definitions for admin responses
 */
interface DashboardStats {
  totalRevenue: number
  totalUsers: number
  activeListings: number
  pendingReports: number
  previousPeriod: {
    totalRevenue: number
    totalUsers: number
    activeListings: number
    pendingReports: number
  }
  recentReports: Array<{
    id: string
    type: "user" | "listing"
    reason: string
    reporterUsername: string
    reportedUsername?: string
    listingTitle?: string
    createdAt: Date
  }>
  recentActivity: Array<{
    id: string
    type: "user_joined" | "transaction_completed"
    user?: {
      id: string
      username: string
      avatar?: string
    }
    transaction?: {
      id: string
      price: number
      buyer: { username: string }
      seller: { username: string }
      listing: { title: string }
    }
    createdAt: Date
  }>
  weeklyTraffic: Array<{
    date: string
    users: number
    listings: number
    trades: number
  }>
  monthlyRevenue: Array<{
    month: string
    revenue: number
    subscriptions: number
  }>
}

interface PaginatedUsers {
  users: Array<{
    id: string
    username: string
    email: string
    profilePicture?: string
    role: string
    isBanned: boolean
    isVerified: boolean
    joinDate: Date
    lastActive: Date
    listingCount: number
    salesCount: number
    vouchCount: number
  }>
  total: number
  pages: number
  currentPage: number
}

interface AdminResult {
  success: boolean
  error?: string
}

interface ReportsResult {
  success: boolean
  reports?: Array<{
    id: string
    reporter: { id: string; username: string }
    reported?: { id: string; username: string }
    listing?: { id: string; title: string }
    reason: string
    details?: string
    status: string
    createdAt: Date
  }>
  error?: string
}

/**
 * Get dashboard statistics
 * Admin only
 */
export async function getDashboardStats(): Promise<{ success: boolean; data?: DashboardStats; error?: string }> {
  try {
    // TODO: Verify admin role from auth context
    // For now, we'll proceed but this should check: if (user.role !== "admin") throw new Error("Unauthorized")

    // Get total platform revenue from completed transactions (assuming 5% platform fee)
    const PLATFORM_FEE_PERCENTAGE = 0.05 // 5% platform fee
    const transactionData = await prisma.transaction.aggregate({
      where: { status: "COMPLETED" },
      _sum: { price: true },
    })
    const totalTransactionValue = transactionData._sum.price || 0
    const totalRevenue = Math.round(totalTransactionValue * PLATFORM_FEE_PERCENTAGE) // Platform's cut

    // Get total users count
    const totalUsers = await prisma.user.count()

    // Get active listings count from both tables
    const itemListingsCount = await prisma.itemListing.count({
      where: { status: "available" },
    })
    const currencyListingsCount = await prisma.currencyListing.count({
      where: { status: "available" },
    })
    const activeListings = itemListingsCount + currencyListingsCount

    // Get pending reports count from both report tables
    const pendingListingReports = await prisma.reportListing.count({
      where: { status: "PENDING" },
    })
    const pendingUserReports = await prisma.reportUser.count({
      where: { status: "PENDING" },
    })
    const pendingReports = pendingListingReports + pendingUserReports

    // Get 5 most recent pending reports from both tables
    const recentListingReports = await prisma.reportListing.findMany({
      where: { status: "PENDING" },
      select: {
        id: true,
        reason: true,
        createdAt: true,
        listingId: true,
        listingType: true,
        reporter: { select: { username: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 5,
    })

    const recentUserReports = await prisma.reportUser.findMany({
      where: { status: "PENDING" },
      select: {
        id: true,
        reason: true,
        createdAt: true,
        reporter: { select: { username: true } },
        reported: { select: { username: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 5,
    })

    // Fetch listing titles for listing reports
    const listingReportsWithTitles = await Promise.all(
      recentListingReports.map(async (report) => {
        let listingTitle = "Unknown Listing"
        if (report.listingType === "ITEM") {
          const listing = await prisma.itemListing.findUnique({
            where: { id: report.listingId },
            select: { title: true },
          })
          if (listing) listingTitle = listing.title
        } else if (report.listingType === "CURRENCY") {
          const listing = await prisma.currencyListing.findUnique({
            where: { id: report.listingId },
            select: { title: true },
          })
          if (listing) listingTitle = listing.title
        }
        return {
          id: report.id,
          type: "listing" as const,
          reason: report.reason,
          reporterUsername: report.reporter.username,
          listingTitle,
          createdAt: report.createdAt,
        }
      })
    )

    // Combine and sort reports
    const recentReports = [
      ...listingReportsWithTitles,
      ...recentUserReports.map(r => ({
        id: r.id,
        type: "user" as const,
        reason: r.reason,
        reporterUsername: r.reporter.username,
        reportedUsername: r.reported.username,
        createdAt: r.createdAt,
      })),
    ].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()).slice(0, 5)

    // Get recent activity: 5 most recent users + 5 most recent transactions
    const recentUsers = await prisma.user.findMany({
      select: {
        id: true,
        username: true,
        profilePicture: true,
        joinDate: true,
      },
      orderBy: { joinDate: "desc" },
      take: 5,
    })

    const recentTransactions = await prisma.transaction.findMany({
      where: { status: "COMPLETED" },
      select: {
        id: true,
        price: true,
        createdAt: true,
        listingId: true,
        listingType: true,
        buyer: { select: { username: true } },
        seller: { select: { username: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 5,
    })

    // Manually fetch listing titles
    const transactionsWithListings = await Promise.all(
      recentTransactions.map(async (t) => {
        let listingTitle = "Unknown Item"
        if (t.listingId && t.listingType) {
          if (t.listingType === "ITEM") {
            const listing = await prisma.itemListing.findUnique({
              where: { id: t.listingId },
              select: { title: true },
            })
            if (listing) listingTitle = listing.title
          } else if (t.listingType === "CURRENCY") {
            const listing = await prisma.currencyListing.findUnique({
              where: { id: t.listingId },
              select: { title: true },
            })
            if (listing) listingTitle = listing.title
          }
        }
        return { ...t, listingTitle }
      })
    )

    // Combine and sort by date (most recent first)
    const recentActivity = [
      ...recentUsers.map((u) => ({
        id: u.id,
        type: "user_joined" as const,
        user: { id: u.id, username: u.username, avatar: u.profilePicture },
        createdAt: u.joinDate,
      })),
      ...transactionsWithListings.map((t) => ({
        id: t.id,
        type: "transaction_completed" as const,
        transaction: {
          id: t.id,
          price: t.price,
          buyer: { username: t.buyer.username },
          seller: { username: t.seller.username },
          listing: { title: t.listingTitle },
        },
        createdAt: t.createdAt,
      })),
    ].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())

    // Get weekly traffic data (last 7 days)
    const weeklyTraffic = []
    const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
    for (let i = 6; i >= 0; i--) {
      const date = new Date()
      date.setDate(date.getDate() - i)
      date.setHours(0, 0, 0, 0)
      const nextDay = new Date(date)
      nextDay.setDate(nextDay.getDate() + 1)

      // Count active users for this day (users who created listings, transactions, or messages)
      const activeUsersFromListings = await prisma.itemListing.findMany({
        where: {
          createdAt: {
            gte: date,
            lt: nextDay,
          },
        },
        select: { sellerId: true },
        distinct: ['sellerId'],
      })
      
      const activeUsersFromCurrencyListings = await prisma.currencyListing.findMany({
        where: {
          createdAt: {
            gte: date,
            lt: nextDay,
          },
        },
        select: { sellerId: true },
        distinct: ['sellerId'],
      })

      const activeUsersFromTransactions = await prisma.transaction.findMany({
        where: {
          createdAt: {
            gte: date,
            lt: nextDay,
          },
        },
        select: { buyerId: true, sellerId: true },
      })

      const activeUsersFromMessages = await prisma.message.findMany({
        where: {
          createdAt: {
            gte: date,
            lt: nextDay,
          },
        },
        select: { senderId: true },
        distinct: ['senderId'],
      })

      // Combine all unique user IDs
      const uniqueUsers = new Set([
        ...activeUsersFromListings.map(u => u.sellerId),
        ...activeUsersFromCurrencyListings.map(u => u.sellerId),
        ...activeUsersFromTransactions.flatMap(t => [t.buyerId, t.sellerId]),
        ...activeUsersFromMessages.map(m => m.senderId),
      ])

      // Count new listings for this day (both item and currency)
      const itemListingsCount = await prisma.itemListing.count({
        where: {
          createdAt: {
            gte: date,
            lt: nextDay,
          },
        },
      })
      const currencyListingsCount = await prisma.currencyListing.count({
        where: {
          createdAt: {
            gte: date,
            lt: nextDay,
          },
        },
      })

      // Count completed trades for this day
      const tradesCount = await prisma.transaction.count({
        where: {
          status: "COMPLETED",
          updatedAt: {
            gte: date,
            lt: nextDay,
          },
        },
      })

      weeklyTraffic.push({
        date: daysOfWeek[date.getDay()],
        users: uniqueUsers.size,
        listings: itemListingsCount + currencyListingsCount,
        trades: tradesCount,
      })
    }

    // Get monthly revenue data (last 6 months)
    const monthlyRevenue = []
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    for (let i = 5; i >= 0; i--) {
      const date = new Date()
      date.setMonth(date.getMonth() - i)
      const startOfMonth = new Date(date.getFullYear(), date.getMonth(), 1)
      const endOfMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999)

      // Sum transaction value for this month and calculate platform revenue
      const monthTransactionData = await prisma.transaction.aggregate({
        where: {
          status: "COMPLETED",
          updatedAt: {
            gte: startOfMonth,
            lte: endOfMonth,
          },
        },
        _sum: { price: true },
      })
      const monthTransactionValue = monthTransactionData._sum.price || 0
      const monthRevenue = Math.round(monthTransactionValue * PLATFORM_FEE_PERCENTAGE) // Platform's cut

      // Count transactions for this month
      const subscriptionsCount = await prisma.transaction.count({
        where: {
          status: "COMPLETED",
          updatedAt: {
            gte: startOfMonth,
            lte: endOfMonth,
          },
        },
      })

      monthlyRevenue.push({
        month: monthNames[date.getMonth()],
        revenue: monthRevenue,
        subscriptions: subscriptionsCount,
      })
    }

    // Get previous period stats for comparison (30 days ago)
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    const sixtyDaysAgo = new Date()
    sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60)

    // Previous revenue (30-60 days ago) with platform fee
    const previousRevenueData = await prisma.transaction.aggregate({
      where: { 
        status: "COMPLETED",
        updatedAt: {
          gte: sixtyDaysAgo,
          lt: thirtyDaysAgo,
        }
      },
      _sum: { price: true },
    })
    const previousTransactionValue = previousRevenueData._sum.price || 0
    const previousRevenue = Math.round(previousTransactionValue * PLATFORM_FEE_PERCENTAGE) // Platform's cut

    // Previous users count (users who joined 30-60 days ago)
    const previousUsers = await prisma.user.count({
      where: {
        joinDate: {
          lt: thirtyDaysAgo,
        },
      },
    })

    // Previous active listings (we'll use current - new in last 30 days as approximation)
    const newListingsLast30Days = await prisma.itemListing.count({
      where: {
        createdAt: {
          gte: thirtyDaysAgo,
        },
      },
    }) + await prisma.currencyListing.count({
      where: {
        createdAt: {
          gte: thirtyDaysAgo,
        },
      },
    })
    const previousActiveListings = Math.max(0, activeListings - newListingsLast30Days)

    // Previous pending reports (reports that were pending 30 days ago)
    const previousPendingListingReports = await prisma.reportListing.count({
      where: {
        status: "PENDING",
        createdAt: {
          lt: thirtyDaysAgo,
        },
      },
    })
    const previousPendingUserReports = await prisma.reportUser.count({
      where: {
        status: "PENDING",
        createdAt: {
          lt: thirtyDaysAgo,
        },
      },
    })
    const previousPendingReports = previousPendingListingReports + previousPendingUserReports

    return {
      success: true,
      data: {
        totalRevenue,
        totalUsers,
        activeListings,
        pendingReports,
        previousPeriod: {
          totalRevenue: previousRevenue,
          totalUsers: previousUsers,
          activeListings: previousActiveListings,
          pendingReports: previousPendingReports,
        },
        recentReports,
        recentActivity: recentActivity.slice(0, 10), // Limit to 10 most recent
        weeklyTraffic,
        monthlyRevenue,
      },
    }
  } catch (err) {
    console.error("Failed to get dashboard stats:", err)
    return { success: false, error: "Failed to load dashboard statistics" }
  }
}

/**
 * Get paginated users with filters
 * Admin only
 */
export async function getUsers(
  page: number = 1,
  searchQuery: string = "",
  statusFilter: string = "all",
): Promise<PaginatedUsers> {
  try {
    // TODO: Verify admin role from auth context
    const pageSize = 10
    const skip = (page - 1) * pageSize

    // Build where clause
    let where: any = {}

    if (searchQuery) {
      where.OR = [
        { username: { contains: searchQuery, mode: "insensitive" } },
        { email: { contains: searchQuery, mode: "insensitive" } },
      ]
    }

    if (statusFilter === "banned") {
      where.isBanned = true
    } else if (statusFilter === "verified") {
      where.isVerified = true
    } else if (statusFilter === "admin") {
      where.role = "admin"
    }

    // Get total count
    const total = await prisma.user.count({ where })
    const pages = Math.ceil(total / pageSize)

    // Get paginated users with counts
    const users = await prisma.user.findMany({
      where,
      select: {
        id: true,
        username: true,
        email: true,
        profilePicture: true,
        role: true,
        isBanned: true,
        isVerified: true,
        joinDate: true,
        lastActive: true,
        _count: {
          select: {
            itemListings: true,
            currencyListings: true,
            sellerTransactions: true,
            vouchesReceived: { where: { status: "VALID" } }, // Only count valid vouches
          },
        },
      },
      orderBy: { joinDate: "desc" },
      skip,
      take: pageSize,
    })

    return {
      users: users.map((u) => ({
        id: u.id,
        username: u.username,
        email: u.email,
        profilePicture: u.profilePicture || undefined,
        role: u.role,
        isBanned: u.isBanned,
        isVerified: u.isVerified,
        joinDate: u.joinDate,
        lastActive: u.lastActive,
        listingCount: u._count.itemListings + u._count.currencyListings,
        salesCount: u._count.sellerTransactions,
        vouchCount: u._count.vouchesReceived,
      })),
      total,
      pages,
      currentPage: page,
    }
  } catch (err) {
    console.error("Failed to get users:", err)
    return { users: [], total: 0, pages: 0, currentPage: page }
  }
}

/**
 * Ban or unban a user
 * Admin only
 */
export async function banUser(userId: string, ban: boolean = true, adminId?: string): Promise<AdminResult> {
  try {
    // TODO: Verify admin role from auth context
    // TODO: Verify current user is admin

    if (!userId) {
      return { success: false, error: "User ID is required" }
    }

    // Check if user exists
    const user = await prisma.user.findUnique({ where: { id: userId } })
    if (!user) {
      return { success: false, error: "User not found" }
    }

    // Prevent banning admins
    if (user.role === "admin" && ban) {
      return { success: false, error: "Cannot ban admin users" }
    }

    // Update user ban status
    await prisma.user.update({
      where: { id: userId },
      data: { isBanned: ban },
    })

    // If banning, also hide their active listings from both tables
    if (ban) {
      await prisma.itemListing.updateMany({
        where: { sellerId: userId, status: "available" },
        data: { status: "hidden" },
      })
      await prisma.currencyListing.updateMany({
        where: { sellerId: userId, status: "available" },
        data: { status: "hidden" },
      })
    }

    // Send notification to the user about their ban status
    try {
      if (ban) {
        await createNotification(
          userId,
          "SYSTEM",
          "Account Banned",
          "Your account has been banned due to violations of our community guidelines. If you believe this is a mistake, please contact support.",
          undefined
        )
      } else {
        await createNotification(
          userId,
          "SYSTEM",
          "Account Unbanned",
          "Your account has been unbanned. You can now resume normal marketplace activities.",
          undefined
        )
      }
    } catch (notifErr) {
      console.error("Failed to send ban notification:", notifErr)
      // Don't fail the main operation if notification fails
    }

    // Create audit log (non-blocking - don't fail the action if logging fails)
    if (adminId) {
      try {
        await prisma.auditLog.create({
          data: {
            adminId,
            action: ban ? "USER_BANNED" : "USER_UNBANNED",
            targetId: userId,
            details: ban
              ? `Banned user ${user.username}. Hidden ${0} active listings.`
              : `Unbanned user ${user.username}`,
          },
        })
      } catch (logErr) {
        console.error("Failed to create audit log:", logErr)
        // Don't fail the main operation if logging fails
      }
    }

    return { success: true }
  } catch (err) {
    console.error("Failed to ban user:", err)
    return { success: false, error: "Failed to update user ban status" }
  }
}

/**
 * Get reports filtered by status
 * Admin only
 */
export async function getReports(
  status: string = "PENDING",
  page: number = 1,
): Promise<ReportsResult> {
  try {
    // TODO: Verify admin role from auth context
    const pageSize = 15
    const skip = (page - 1) * pageSize

    const where = status === "all" ? {} : { status }

    // Fetch both listing and user reports
    const [listingReports, userReports] = await Promise.all([
      prisma.reportListing.findMany({
        where,
        select: {
          id: true,
          reason: true,
          details: true,
          status: true,
          createdAt: true,
          reporterId: true,
          listingId: true,
          listingType: true,
          reporter: {
            select: { id: true, username: true, profilePicture: true },
          },
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.reportUser.findMany({
        where,
        select: {
          id: true,
          reason: true,
          details: true,
          status: true,
          createdAt: true,
          reporterId: true,
          reportedId: true,
          reporter: {
            select: { id: true, username: true, profilePicture: true },
          },
          reported: {
            select: { id: true, username: true, profilePicture: true },
          },
        },
        orderBy: { createdAt: "desc" },
      }),
    ])

    // Manually fetch listing data for listing reports
    const listingReportsWithData = await Promise.all(
      listingReports.map(async (report) => {
        let listing = null
        
        if (report.listingId && report.listingType) {
          try {
            if (report.listingType === "ITEM") {
              listing = await prisma.itemListing.findUnique({
                where: { id: report.listingId },
                select: { 
                  id: true, 
                  title: true, 
                  image: true,
                  sellerId: true,
                  seller: {
                    select: {
                      id: true,
                      username: true,
                      profilePicture: true,
                    },
                  },
                },
              })
            } else if (report.listingType === "CURRENCY") {
              listing = await prisma.currencyListing.findUnique({
                where: { id: report.listingId },
                select: { 
                  id: true, 
                  title: true, 
                  image: true,
                  sellerId: true,
                  seller: {
                    select: {
                      id: true,
                      username: true,
                      profilePicture: true,
                    },
                  },
                },
              })
            }
          } catch (err) {
            console.error(`Failed to fetch listing ${report.listingId}:`, err)
          }
        }

        return {
          ...report,
          listing,
          reported: null,
          reportedId: null,
        }
      })
    )

    // Transform user reports to match structure
    const userReportsWithData = userReports.map(report => ({
      ...report,
      listing: null,
      listingId: null,
      listingType: null,
    }))

    // Combine and sort by date
    const allReports = [...listingReportsWithData, ...userReportsWithData]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(skip, skip + pageSize)

    return { success: true, reports: allReports }
  } catch (err) {
    console.error("Failed to get reports:", err)
    return { success: false, error: "Failed to load reports" }
  }
}

/**
 * Resolve or dismiss a report
 * Admin only
 */
export async function resolveReport(
  reportId: string,
  resolution: "RESOLVED" | "DISMISSED",
): Promise<AdminResult> {
  try {
    // TODO: Verify admin role from auth context

    if (!reportId) {
      return { success: false, error: "Report ID is required" }
    }

    // Try to find in listing reports first
    let report = await prisma.reportListing.findUnique({ 
      where: { id: reportId },
      select: {
        id: true,
        reporterId: true,
        listingId: true,
        listingType: true,
      },
    })
    
    let isListingReport = true

    // If not found, try user reports
    if (!report) {
      const userReport = await prisma.reportUser.findUnique({ 
        where: { id: reportId },
        select: {
          id: true,
          reporterId: true,
          reportedId: true,
        },
      })
      
      if (!userReport) {
        return { success: false, error: "Report not found" }
      }
      
      report = userReport as any
      isListingReport = false
    }

    // Update the appropriate table
    if (isListingReport) {
      await prisma.reportListing.update({
        where: { id: reportId },
        data: { status: resolution },
      })
    } else {
      await prisma.reportUser.update({
        where: { id: reportId },
        data: { status: resolution },
      })
    }

    // Send notification to the reporter about the report status
    try {
      let notificationMessage = ""
      let notificationLink: string | undefined
      
      if (isListingReport && report.listingId && report.listingType) {
        // Handle listing report notification
        let listingTitle = "the listing"
        
        try {
          if (report.listingType === "ITEM") {
            const listing = await prisma.itemListing.findUnique({
              where: { id: report.listingId },
              select: { title: true },
            })
            if (listing) listingTitle = listing.title
          } else if (report.listingType === "CURRENCY") {
            const listing = await prisma.currencyListing.findUnique({
              where: { id: report.listingId },
              select: { title: true },
            })
            if (listing) listingTitle = listing.title
          }
        } catch (listingErr) {
          console.error("Failed to fetch listing for notification:", listingErr)
        }
        
        notificationMessage = resolution === "RESOLVED" 
          ? `Your report on "${listingTitle}" has been reviewed and resolved. Thank you for helping keep our community safe.`
          : `Your report on "${listingTitle}" has been reviewed and dismissed. Thank you for your vigilance.`
        
        notificationLink = report.listingType === "CURRENCY" 
          ? `/currency/${report.listingId}` 
          : `/listing/${report.listingId}`
      } else {
        // Handle user report notification
        const userReport = report as any
        let reportedUsername = "the user"
        
        try {
          const reported = await prisma.user.findUnique({
            where: { id: userReport.reportedId },
            select: { username: true },
          })
          if (reported) reportedUsername = reported.username
        } catch (userErr) {
          console.error("Failed to fetch reported user for notification:", userErr)
        }
        
        notificationMessage = resolution === "RESOLVED" 
          ? `Your report on user "${reportedUsername}" has been reviewed and resolved. Thank you for helping keep our community safe.`
          : `Your report on user "${reportedUsername}" has been reviewed and dismissed. Thank you for your vigilance.`
        
        notificationLink = `/profile/${userReport.reportedId}`
      }
      
      await createNotification(
        report.reporterId,
        "SYSTEM",
        resolution === "RESOLVED" ? "Report Resolved" : "Report Dismissed",
        notificationMessage,
        notificationLink
      )
    } catch (notifErr) {
      console.error("Failed to send notification:", notifErr)
      // Don't fail the main operation if notification fails
    }

    return { success: true }
  } catch (err) {
    console.error("Failed to resolve report:", err)
    return { success: false, error: "Failed to resolve report" }
  }
}

/**
 * Deprecated: Use resolveReport instead
 */
export async function updateReportStatus(
  reportId: string,
  newStatus: "RESOLVED" | "DISMISSED",
): Promise<AdminResult> {
  return resolveReport(reportId, newStatus)
}

/**
 * Create a report (user-facing)
 */
export async function createReport(data: {
  reportedUserId?: string
  listingId?: string
  listingType?: string
  reason: string
  details?: string
}): Promise<AdminResult> {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return { success: false, error: "You must be logged in to report" }
    }

    const reporterId = session.user.id

    if (!data.reason) {
      return { success: false, error: "Reason is required" }
    }

    if (!data.reportedUserId && !data.listingId) {
      return { success: false, error: "Either reported user or listing must be specified" }
    }

    // Validate that reported user exists if reporting a user
    if (data.reportedUserId) {
      const user = await prisma.user.findUnique({ where: { id: data.reportedUserId } })
      if (!user) {
        return { success: false, error: "Reported user not found" }
      }
      
      // Create user report
      await prisma.reportUser.create({
        data: {
          reporterId,
          reportedId: data.reportedUserId,
          reason: data.reason,
          details: data.details || null,
          status: "PENDING",
        },
      })
    }

    // Validate that listing exists if reporting a listing
    if (data.listingId && data.listingType) {
      let listing: any = null
      
      if (data.listingType === "ITEM") {
        listing = await prisma.itemListing.findUnique({ where: { id: data.listingId } })
      } else if (data.listingType === "CURRENCY") {
        listing = await prisma.currencyListing.findUnique({ where: { id: data.listingId } })
      }
      
      if (!listing) {
        return { success: false, error: "Reported listing not found" }
      }
      
      // Create listing report
      await prisma.reportListing.create({
        data: {
          reporterId,
          listingId: data.listingId,
          listingType: data.listingType,
          reason: data.reason,
          details: data.details || null,
          status: "PENDING",
        },
      })
    }

    return { success: true }
  } catch (err) {
    console.error("Failed to create report:", err)
    return { success: false, error: "Failed to create report" }
  }
}

/**
 * Get paginated admin listings with filters
 * Admin only - returns all listings including hidden/sold
 */
export async function getAdminListings(
  page: number = 1,
  searchQuery: string = "",
  statusFilter: string = "all",
  listingTypeFilter: string = "all",
): Promise<{
  success: boolean
  listings?: Array<{
    id: string
    title: string
    description?: string
    price: number
    image: string
    status: string
    sellerId: string
    seller: { id: string; username: string; profilePicture?: string }
    createdAt: Date
    views?: number
  }>
  total?: number
  pages?: number
  currentPage?: number
  error?: string
}> {
  try {
    // TODO: Verify admin role from auth context
    const pageSize = 15
    const skip = (page - 1) * pageSize

    // Build where clause
    let where: any = {}

    if (searchQuery) {
      where.OR = [
        { title: { contains: searchQuery, mode: "insensitive" } },
        { description: { contains: searchQuery, mode: "insensitive" } },
        { seller: { username: { contains: searchQuery, mode: "insensitive" } } },
      ]
    }

    if (statusFilter !== "all") {
      where.status = statusFilter
    }

    // Determine which listing types to fetch
    const fetchItems = listingTypeFilter === "all" || listingTypeFilter === "item"
    const fetchCurrency = listingTypeFilter === "all" || listingTypeFilter === "currency"

    // Get total count from both tables
    const itemCount = fetchItems ? await prisma.itemListing.count({ where }) : 0
    const currencyCount = fetchCurrency ? await prisma.currencyListing.count({ where }) : 0
    const total = itemCount + currencyCount
    const pages = Math.ceil(total / pageSize)

    // Get paginated listings from both tables
    const itemListings = fetchItems ? await prisma.itemListing.findMany({
      where,
      select: {
        id: true,
        title: true,
        description: true,
        price: true,
        image: true,
        status: true,
        sellerId: true,
        seller: {
          select: {
            id: true,
            username: true,
            profilePicture: true,
          },
        },
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    }).then(listings => listings.map(l => ({ ...l, listingType: "ITEM" as const }))) : []

    const currencyListings = fetchCurrency ? await prisma.currencyListing.findMany({
      where,
      select: {
        id: true,
        title: true,
        description: true,
        ratePerPeso: true,
        image: true,
        status: true,
        sellerId: true,
        seller: {
          select: {
            id: true,
            username: true,
            profilePicture: true,
          },
        },
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    }) : []

    // Map currency listings to include price field (using ratePerPeso) and listingType
    const mappedCurrencyListings = currencyListings.map(listing => ({
      ...listing,
      price: listing.ratePerPeso,
      listingType: "CURRENCY" as const,
    }))

    // Combine and sort all listings
    const allListings = [...itemListings, ...mappedCurrencyListings]
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(skip, skip + pageSize)

    return {
      success: true,
      listings: allListings,
      total,
      pages,
      currentPage: page,
    }
  } catch (err) {
    console.error("Failed to get admin listings:", err)
    return { success: false, error: "Failed to load listings" }
  }
}

/**
 * Get listing stats for admin dashboard
 * Admin only
 */
export async function getAdminListingStats(): Promise<{
  success: boolean
  stats?: {
    total: number
    available: number
    pending: number
    hidden: number
    banned: number
    sold: number
  }
  error?: string
}> {
  try {
    // Get counts for each status from both tables
    const [itemAvailable, itemPending, itemHidden, itemBanned, itemSold] = await Promise.all([
      prisma.itemListing.count({ where: { status: "available" } }),
      prisma.itemListing.count({ where: { status: "pending" } }),
      prisma.itemListing.count({ where: { status: "hidden" } }),
      prisma.itemListing.count({ where: { status: "banned" } }),
      prisma.itemListing.count({ where: { status: "sold" } }),
    ])

    const [currencyAvailable, currencyPending, currencyHidden, currencyBanned, currencySold] = await Promise.all([
      prisma.currencyListing.count({ where: { status: "available" } }),
      prisma.currencyListing.count({ where: { status: "pending" } }),
      prisma.currencyListing.count({ where: { status: "hidden" } }),
      prisma.currencyListing.count({ where: { status: "banned" } }),
      prisma.currencyListing.count({ where: { status: "sold" } }),
    ])

    const stats = {
      total: itemAvailable + itemPending + itemHidden + itemBanned + itemSold + 
             currencyAvailable + currencyPending + currencyHidden + currencyBanned + currencySold,
      available: itemAvailable + currencyAvailable,
      pending: itemPending + currencyPending,
      hidden: itemHidden + currencyHidden,
      banned: itemBanned + currencyBanned,
      sold: itemSold + currencySold,
    }

    return { success: true, stats }
  } catch (err) {
    console.error("Failed to get listing stats:", err)
    return { success: false, error: "Failed to load listing stats" }
  }
}

/**
 * Update listing status by admin
 * Admin only
 */
export async function adminUpdateListingStatus(
  listingId: string,
  newStatus: string,
  adminId?: string,
): Promise<AdminResult> {
  try {
    // TODO: Verify admin role from auth context

    if (!listingId) {
      return { success: false, error: "Listing ID is required" }
    }

    if (!newStatus) {
      return { success: false, error: "New status is required" }
    }

    // Try to find listing in ItemListing first
    let listing = await prisma.itemListing.findUnique({ where: { id: listingId } })
    let isItemListing = true
    
    // If not found, try CurrencyListing
    if (!listing) {
      listing = await prisma.currencyListing.findUnique({ where: { id: listingId } })
      isItemListing = false
    }
    
    if (!listing) {
      return { success: false, error: "Listing not found" }
    }

    // Valid admin statuses
    const validStatuses = ["available", "sold", "hidden", "banned", "pending"]
    if (!validStatuses.includes(newStatus)) {
      return { success: false, error: "Invalid status" }
    }

    // Store old status for audit log
    const oldStatus = listing.status

    // Update the correct table
    if (isItemListing) {
      await prisma.itemListing.update({
        where: { id: listingId },
        data: { status: newStatus },
      })
    } else {
      await prisma.currencyListing.update({
        where: { id: listingId },
        data: { status: newStatus },
      })
    }

    // Send notification to the seller about status change
    if (oldStatus !== newStatus) {
      try {
        const statusMessages: Record<string, { title: string; message: string }> = {
          banned: {
            title: "Listing Banned",
            message: `Your listing "${listing.title}" has been banned by an administrator due to policy violations. Please review our marketplace guidelines.`
          },
          hidden: {
            title: "Listing Hidden",
            message: `Your listing "${listing.title}" has been hidden by an administrator and is no longer visible to buyers.`
          },
          available: {
            title: "Listing Status Updated",
            message: `Your listing "${listing.title}" has been marked as available by an administrator.`
          },
          sold: {
            title: "Listing Marked as Sold",
            message: `Your listing "${listing.title}" has been marked as sold by an administrator.`
          },
          pending: {
            title: "Listing Under Review",
            message: `Your listing "${listing.title}" has been placed under review by an administrator.`
          }
        }

        const notificationData = statusMessages[newStatus] || {
          title: "Listing Status Changed",
          message: `Your listing "${listing.title}" status has been changed from ${oldStatus} to ${newStatus} by an administrator.`
        }

        const listingUrl = isItemListing ? `/listing/${listingId}` : `/currency/${listingId}`

        await createNotification(
          listing.sellerId,
          "SYSTEM",
          notificationData.title,
          notificationData.message,
          listingUrl
        )
      } catch (notifErr) {
        console.error("Failed to send notification:", notifErr)
        // Don't fail the main operation if notification fails
      }
    }

    // Create audit log (non-blocking - don't fail the action if logging fails)
    if (adminId) {
      try {
        await prisma.auditLog.create({
          data: {
            adminId,
            action: "LISTING_STATUS_UPDATED",
            targetId: listingId,
            details: `Changed listing "${listing.title}" status from ${oldStatus} to ${newStatus}`,
          },
        })
      } catch (logErr) {
        console.error("Failed to create audit log:", logErr)
        // Don't fail the main operation if logging fails
      }
    }

    return { success: true }
  } catch (err) {
    console.error("Failed to update listing status:", err)
    return { success: false, error: "Failed to update listing status" }
  }
}

/**
 * Get all disputes
 * Admin only
 */
export async function getDisputes(): Promise<{
  success: boolean
  disputes?: Array<{
    id: string
    reason: string
    status: string
    resolution?: string
    transaction: {
      id: string
      buyer: { id: string; username: string }
      seller: { id: string; username: string }
      listing: { id: string; title: string; price: number }
      price: number
    }
    createdAt: Date
  }>
  error?: string
}> {
  try {
    const disputes = await prisma.dispute.findMany({
      include: {
        transaction: {
          include: {
            buyer: { select: { id: true, username: true } },
            seller: { select: { id: true, username: true } },
            listing: { select: { id: true, title: true, price: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    })

    return { success: true, disputes }
  } catch (err) {
    console.error("Failed to get disputes:", err)
    return { success: false, error: "Failed to get disputes" }
  }
}

/**
 * Resolve a dispute
 * Admin only
 */
export async function resolveDispute(
  disputeId: string,
  resolution: string,
  adminId: string,
): Promise<AdminResult> {
  try {
    const dispute = await prisma.dispute.findUnique({ where: { id: disputeId } })
    if (!dispute) {
      return { success: false, error: "Dispute not found" }
    }

    await prisma.dispute.update({
      where: { id: disputeId },
      data: {
        status: "RESOLVED",
        resolution,
      },
    })

    // Log audit trail
    await prisma.auditLog.create({
      data: {
        adminId,
        action: "DISPUTE_RESOLVED",
        targetId: disputeId,
        details: `Dispute resolved with resolution: ${resolution}`,
      },
    })

    return { success: true }
  } catch (err) {
    console.error("Failed to resolve dispute:", err)
    return { success: false, error: "Failed to resolve dispute" }
  }
}

/**
 * Get all support tickets
 * Admin only
 */
export async function getSupportTickets(): Promise<{
  success: boolean
  data?: Array<{
    id: string
    subject: string
    message: string
    status: string
    priority: string
    category: string
    user: { id: string; username: string; email: string; profilePicture?: string }
    createdAt: Date
  }>
  error?: string
}> {
  try {
    const tickets = await prisma.supportTicket.findMany({
      include: {
        user: { select: { id: true, username: true, email: true, profilePicture: true } },
      },
      orderBy: { createdAt: "desc" },
    })

    return { success: true, data: tickets }
  } catch (err) {
    console.error("Failed to get support tickets:", err)
    return { success: false, error: "Failed to get support tickets" }
  }
}

/**
 * Create a support ticket (user-facing)
 */
export async function createSupportTicket(data: {
  userId: string
  subject: string
  message: string
  category?: string
  priority?: string
}): Promise<{ success: boolean; ticketId?: string; error?: string }> {
  try {
    if (!data.subject || !data.message) {
      return { success: false, error: "Subject and message are required" }
    }

    const ticket = await prisma.supportTicket.create({
      data: {
        userId: data.userId,
        subject: data.subject,
        message: data.message,
        category: data.category || "GENERAL",
        priority: data.priority || "MEDIUM",
        status: "OPEN"
      }
    })

    // Create notification for user
    await prisma.notification.create({
      data: {
        userId: data.userId,
        type: "SYSTEM",
        title: "Support Ticket Created",
        message: `Your support ticket "${data.subject}" has been submitted. We'll respond soon.`,
        link: "/settings?tab=support",
        isRead: false
      }
    })

    return { success: true, ticketId: ticket.id }
  } catch (err) {
    console.error("Failed to create support ticket:", err)
    return { success: false, error: "Failed to create support ticket" }
  }
}

/**
 * Get user's own support tickets
 */
export async function getMyTickets(userId: string): Promise<{
  success: boolean
  data?: Array<{
    id: string
    subject: string
    message: string
    status: string
    category: string
    priority: string
    createdAt: Date
  }>
  error?: string
}> {
  try {
    const tickets = await prisma.supportTicket.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" }
    })

    return { success: true, data: tickets }
  } catch (err) {
    console.error("Failed to get tickets:", err)
    return { success: false, error: "Failed to get tickets" }
  }
}

/**
 * Update ticket status
 * Admin only
 */
export async function updateTicketStatus(
  ticketId: string,
  status: string,
  adminId: string
): Promise<AdminResult> {
  try {
    const ticket = await prisma.supportTicket.findUnique({ 
      where: { id: ticketId },
      include: { user: true }
    })
    if (!ticket) {
      return { success: false, error: "Ticket not found" }
    }

    await prisma.supportTicket.update({
      where: { id: ticketId },
      data: { status: status.toUpperCase() }
    })

    // Notify user of status change
    await prisma.notification.create({
      data: {
        userId: ticket.userId,
        type: "SYSTEM",
        title: "Support Ticket Updated",
        message: `Your ticket "${ticket.subject}" status changed to ${status}`,
        link: "/settings?tab=support",
        isRead: false
      }
    })

    // Log audit trail
    await prisma.auditLog.create({
      data: {
        adminId,
        action: "TICKET_STATUS_UPDATE",
        targetId: ticketId,
        details: `Updated ticket status to ${status}`
      }
    })

    return { success: true }
  } catch (err) {
    console.error("Failed to update ticket status:", err)
    return { success: false, error: "Failed to update ticket status" }
  }
}

/**
 * Close a support ticket
 * Admin only
 */
export async function closeTicket(ticketId: string, adminId: string): Promise<AdminResult> {
  try {
    const ticket = await prisma.supportTicket.findUnique({ 
      where: { id: ticketId },
      include: { user: true }
    })
    if (!ticket) {
      return { success: false, error: "Ticket not found" }
    }

    await prisma.supportTicket.update({
      where: { id: ticketId },
      data: { status: "CLOSED" },
    })

    // Notify user
    await prisma.notification.create({
      data: {
        userId: ticket.userId,
        type: "SYSTEM",
        title: "Support Ticket Resolved",
        message: `Your ticket "${ticket.subject}" has been resolved`,
        link: "/settings?tab=support",
        isRead: false
      }
    })

    // Log audit trail
    await prisma.auditLog.create({
      data: {
        adminId,
        action: "TICKET_CLOSED",
        targetId: ticketId,
        details: `Support ticket closed`,
      },
    })

    return { success: true }
  } catch (err) {
    console.error("Failed to close ticket:", err)
    return { success: false, error: "Failed to close ticket" }
  }
}

/**
 * Reopen a support ticket
 * Admin only
 */
export async function reopenTicket(ticketId: string, adminId: string): Promise<AdminResult> {
  try {
    const ticket = await prisma.supportTicket.findUnique({ 
      where: { id: ticketId },
      include: { user: true }
    })
    if (!ticket) {
      return { success: false, error: "Ticket not found" }
    }

    await prisma.supportTicket.update({
      where: { id: ticketId },
      data: { status: "OPEN" }
    })

    // Notify user
    await prisma.notification.create({
      data: {
        userId: ticket.userId,
        type: "SYSTEM",
        title: "Support Ticket Reopened",
        message: `Your ticket "${ticket.subject}" has been reopened`,
        link: "/settings?tab=support",
        isRead: false
      }
    })

    // Log audit trail
    await prisma.auditLog.create({
      data: {
        adminId,
        action: "TICKET_REOPENED",
        targetId: ticketId,
        details: `Support ticket reopened`
      }
    })

    return { success: true }
  } catch (err) {
    console.error("Failed to reopen ticket:", err)
    return { success: false, error: "Failed to reopen ticket" }
  }
}

/**
 * Add a reply to a support ticket
 */
export async function addTicketReply(
  ticketId: string,
  userId: string,
  message: string,
  isAdmin: boolean = false
): Promise<{ success: boolean; error?: string; data?: any }> {
  try {
    if (!message.trim()) {
      return { success: false, error: "Message cannot be empty" }
    }

    // Verify ticket exists
    const ticket = await prisma.supportTicket.findUnique({
      where: { id: ticketId },
      include: { user: true }
    })

    if (!ticket) {
      return { success: false, error: "Ticket not found" }
    }

    // Create the reply
    const reply = await prisma.supportTicketMessage.create({
      data: {
        ticketId,
        userId,
        message: message.trim(),
        isAdmin
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            profilePicture: true
          }
        }
      }
    })

    // Update ticket's updatedAt timestamp
    await prisma.supportTicket.update({
      where: { id: ticketId },
      data: { updatedAt: new Date() }
    })

    // Create notification for the other party
    const notificationUserId = isAdmin ? ticket.userId : ticket.user.id
    if (notificationUserId !== userId) {
      await prisma.notification.create({
        data: {
          userId: notificationUserId,
          type: "SYSTEM",
          title: isAdmin ? "Support Ticket Response" : "New Ticket Reply",
          message: isAdmin 
            ? `A support team member replied to your ticket "${ticket.subject}"`
            : `User replied to ticket "${ticket.subject}"`,
          link: isAdmin ? "/settings?tab=support" : "/admin/support",
          isRead: false
        }
      })
    }

    return { success: true, data: reply }
  } catch (err) {
    console.error("Failed to add ticket reply:", err)
    return { success: false, error: "Failed to send reply" }
  }
}

/**
 * Get all messages for a support ticket
 */
export async function getTicketMessages(ticketId: string): Promise<{
  success: boolean
  data?: Array<{
    id: string
    message: string
    isAdmin: boolean
    createdAt: Date
    user: {
      id: string
      username: string
      profilePicture: string | null
    }
  }>
  error?: string
}> {
  try {
    const messages = await prisma.supportTicketMessage.findMany({
      where: { ticketId },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            profilePicture: true
          }
        }
      },
      orderBy: { createdAt: "asc" }
    })

    return { success: true, data: messages }
  } catch (err) {
    console.error("Failed to get ticket messages:", err)
    return { success: false, error: "Failed to load messages" }
  }
}

/**
 * Get all announcements
 * Admin only
 */
export async function getAnnouncements(): Promise<{
  success: boolean
  data?: Array<{
    id: string
    title: string
    content: string
    type: string
    isActive: boolean
    expiresAt?: Date
    createdAt: Date
  }>
  error?: string
}> {
  try {
    const announcements = await prisma.announcement.findMany({
      orderBy: { createdAt: "desc" },
    })

    return { success: true, data: announcements }
  } catch (err) {
    console.error("Failed to get announcements:", err)
    return { success: false, error: "Failed to get announcements" }
  }
}

/**
 * Create an announcement
 * Admin only
 */
export async function createAnnouncement(
  data: {
    title: string
    content: string
    type: string
    expiresAt?: string
  },
  adminId: string,
): Promise<AdminResult & { announcementId?: string }> {
  try {
    if (!data.title || !data.content) {
      return { success: false, error: "Title and content are required" }
    }

    const announcement = await prisma.announcement.create({
      data: {
        title: data.title,
        content: data.content,
        type: data.type || "info",
        isActive: true,
        expiresAt: data.expiresAt ? new Date(data.expiresAt) : undefined,
      },
    })

    // Broadcast notification to all users (non-blocking)
    try {
      const allUsers = await prisma.user.findMany({
        select: { id: true },
      })

      if (allUsers.length > 0) {
        await prisma.notification.createMany({
          data: allUsers.map((user) => ({
            userId: user.id,
            type: "SYSTEM",
            title: data.title,
            message: data.content,
            link: "/notifications",
            isRead: false,
          })),
        })
      }
    } catch (notificationErr) {
      console.error("Failed to broadcast notifications:", notificationErr)
      // Don't fail the announcement creation if notifications fail
    }

    // Log audit trail
    try {
      await prisma.auditLog.create({
        data: {
          adminId,
          action: "ANNOUNCEMENT_CREATED",
          targetId: announcement.id,
          details: `Created announcement: ${data.title} (broadcast to ${await prisma.user.count()} users)`,
        },
      })
    } catch (logErr) {
      console.error("Failed to log announcement creation:", logErr)
      // Don't fail the announcement creation if logging fails
    }

    return { success: true, announcementId: announcement.id }
  } catch (err) {
    console.error("Failed to create announcement:", err)
    return { success: false, error: "Failed to create announcement" }
  }
}

/**
 * Delete an announcement
 * Admin only
 */
export async function deleteAnnouncement(announcementId: string, adminId: string): Promise<AdminResult> {
  try {
    const announcement = await prisma.announcement.findUnique({ where: { id: announcementId } })
    if (!announcement) {
      return { success: false, error: "Announcement not found" }
    }

    await prisma.announcement.delete({ where: { id: announcementId } })

    // Log audit trail
    await prisma.auditLog.create({
      data: {
        adminId,
        action: "ANNOUNCEMENT_DELETED",
        targetId: announcementId,
        details: `Deleted announcement: ${announcement.title}`,
      },
    })

    return { success: true }
  } catch (err) {
    console.error("Failed to delete announcement:", err)
    return { success: false, error: "Failed to delete announcement" }
  }
}

/**
 * Update an announcement
 * Admin only
 */
export async function updateAnnouncement(
  announcementId: string,
  data: {
    title?: string
    content?: string
    type?: string
    isActive?: boolean
    expiresAt?: string | null
  },
  adminId: string
): Promise<AdminResult> {
  try {
    const announcement = await prisma.announcement.findUnique({ where: { id: announcementId } })
    if (!announcement) {
      return { success: false, error: "Announcement not found" }
    }

    const updateData: any = {}
    if (data.title !== undefined) updateData.title = data.title
    if (data.content !== undefined) updateData.content = data.content
    if (data.type !== undefined) updateData.type = data.type
    if (data.isActive !== undefined) updateData.isActive = data.isActive
    if (data.expiresAt !== undefined) {
      updateData.expiresAt = data.expiresAt ? new Date(data.expiresAt) : null
    }

    await prisma.announcement.update({
      where: { id: announcementId },
      data: updateData
    })

    // Log audit trail
    await prisma.auditLog.create({
      data: {
        adminId,
        action: "ANNOUNCEMENT_UPDATED",
        targetId: announcementId,
        details: `Updated announcement: ${announcement.title}`
      }
    })

    return { success: true }
  } catch (err) {
    console.error("Failed to update announcement:", err)
    return { success: false, error: "Failed to update announcement" }
  }
}

/**
 * Get audit logs
 * Admin only
 */
export async function getAuditLogs(limit: number = 50): Promise<{
  success: boolean
  logs?: Array<{
    id: string
    action: string
    targetId?: string
    details?: string
    admin: { id: string; username: string }
    createdAt: Date
  }>
  error?: string
}> {
  try {
    const logs = await prisma.auditLog.findMany({
      include: {
        admin: { select: { id: true, username: true } },
      },
      orderBy: { createdAt: "desc" },
      take: limit,
    })

    return { success: true, logs }
  } catch (err) {
    console.error("Failed to get audit logs:", err)
    return { success: false, error: "Failed to get audit logs" }
  }
}

/**
 * Export audit logs as CSV
 * Admin only
 */
export async function exportAuditLogs(
  filters?: {
    action?: string
    adminUsername?: string
    startDate?: Date
    endDate?: Date
  }
): Promise<{
  success: boolean
  csv?: string
  error?: string
}> {
  try {
    const session = await auth()
    if (!session?.user || session.user.role !== "admin") {
      return { success: false, error: "Unauthorized" }
    }

    // Build where clause based on filters
    const where: any = {}
    
    if (filters?.action && filters.action !== "all") {
      where.action = filters.action
    }

    if (filters?.adminUsername && filters.adminUsername !== "all") {
      where.admin = {
        username: filters.adminUsername
      }
    }

    if (filters?.startDate || filters?.endDate) {
      where.createdAt = {}
      if (filters.startDate) {
        where.createdAt.gte = filters.startDate
      }
      if (filters.endDate) {
        where.createdAt.lte = filters.endDate
      }
    }

    const logs = await prisma.auditLog.findMany({
      where,
      include: {
        admin: { select: { id: true, username: true, email: true } },
      },
      orderBy: { createdAt: "desc" },
    })

    // Generate CSV
    const headers = ["Timestamp", "Admin", "Admin Email", "Action", "Target ID", "Details"]
    const rows = logs.map(log => [
      new Date(log.createdAt).toISOString(),
      log.admin.username,
      log.admin.email,
      log.action,
      log.targetId || "",
      log.details?.replace(/"/g, '""') || "" // Escape quotes in CSV
    ])

    const csv = [
      headers.join(","),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(","))
    ].join("\n")

    return { success: true, csv }
  } catch (err) {
    console.error("Failed to export audit logs:", err)
    return { success: false, error: "Failed to export audit logs" }
  }
}

/**
 * Get all admin users
 * Admin only
 */
export async function getAdmins(): Promise<{
  success: boolean
  admins?: Array<{
    id: string
    username: string
    email: string
    profilePicture?: string
    role: string
    joinDate: Date
  }>
  error?: string
}> {
  try {
    const admins = await prisma.user.findMany({
      where: { role: "admin" },
      select: {
        id: true,
        username: true,
        email: true,
        profilePicture: true,
        role: true,
        joinDate: true,
      },
      orderBy: { joinDate: "desc" },
    })

    return { success: true, admins }
  } catch (err) {
    console.error("Failed to get admins:", err)
    return { success: false, error: "Failed to get admin users" }
  }
}

/**
 * Get all staff users (admins, moderators, support staff)
 * Admin only
 */
export async function getStaffUsers(): Promise<{
  success: boolean
  staff?: Array<{
    id: string
    username: string
    email: string
    profilePicture?: string
    role: string
    joinDate: Date
  }>
  error?: string
}> {
  try {
    const staff = await prisma.user.findMany({
      where: {
        role: {
          in: ["admin", "moderator", "support"],
        },
      },
      select: {
        id: true,
        username: true,
        email: true,
        profilePicture: true,
        role: true,
        joinDate: true,
      },
      orderBy: { joinDate: "desc" },
    })

    return { success: true, staff }
  } catch (err) {
    console.error("Failed to get staff users:", err)
    return { success: false, error: "Failed to get staff users" }
  }
}

/**
 * Update a user's role
 * Admin only
 */
export async function updateUserRole(
  userId: string,
  newRole: string,
  adminId: string,
): Promise<AdminResult> {
  try {
    if (!userId) {
      return { success: false, error: "User ID is required" }
    }

    // Validate role
    const validRoles = ["user", "admin", "moderator", "support"]
    if (!validRoles.includes(newRole)) {
      return { success: false, error: "Invalid role" }
    }

    // Check if user exists
    const user = await prisma.user.findUnique({ where: { id: userId } })
    if (!user) {
      return { success: false, error: "User not found" }
    }

    // Prevent removing admin role from last admin (optional safety check)
    if (user.role === "admin" && newRole !== "admin") {
      const adminCount = await prisma.user.count({ where: { role: "admin" } })
      if (adminCount <= 1) {
        return { success: false, error: "Cannot remove admin role from last admin" }
      }
    }

    // Update user role
    await prisma.user.update({
      where: { id: userId },
      data: { role: newRole },
    })

    // Log audit trail
    await prisma.auditLog.create({
      data: {
        adminId,
        action: "USER_ROLE_UPDATED",
        targetId: userId,
        details: `Changed role from ${user.role} to ${newRole}`,
      },
    })

    return { success: true }
  } catch (err) {
    console.error("Failed to update user role:", err)
    return { success: false, error: "Failed to update user role" }
  }
}

/**
 * Get all custom roles
 * Admin only
 */
export async function getRoles(): Promise<{
  success: boolean
  roles?: Array<{
    id: string
    name: string
    description?: string
    color: string
    permissions: string[]
    userCount: number
    users: Array<{
      id: string
      username: string
      email: string
      profilePicture?: string
    }>
  }>
  error?: string
}> {
  try {
    const roles = await prisma.role.findMany({
      include: {
        _count: { select: { users: true } },
        users: {
          select: {
            id: true,
            username: true,
            email: true,
            profilePicture: true,
          },
        },
      },
      orderBy: { name: "asc" },
    })

    return {
      success: true,
      roles: roles.map((r) => ({
        id: r.id,
        name: r.name,
        description: r.description || undefined,
        color: r.color,
        permissions: r.permissions,
        userCount: r._count.users,
        users: r.users,
      })),
    }
  } catch (err) {
    console.error("Failed to get roles:", err)
    return { success: false, error: "Failed to load roles" }
  }
}

/**
 * Create a new custom role
 * Admin only
 */
export async function createRole(
  data: {
    name: string
    description?: string
    color: string
    permissions: string[]
  },
  adminId: string,
): Promise<{ success: boolean; roleId?: string; error?: string }> {
  try {
    if (!data.name || !data.color) {
      return { success: false, error: "Name and color are required" }
    }

    // Check if role already exists
    const existing = await prisma.role.findUnique({ where: { name: data.name } })
    if (existing) {
      return { success: false, error: "Role with this name already exists" }
    }

    // Create the role
    const role = await prisma.role.create({
      data: {
        name: data.name,
        description: data.description,
        color: data.color,
        permissions: data.permissions || [],
      },
    })

    // Log audit trail
    await prisma.auditLog.create({
      data: {
        adminId,
        action: "ROLE_CREATED",
        targetId: role.id,
        details: `Created role "${data.name}" with ${(data.permissions || []).length} permissions`,
      },
    }).catch((err) => console.error("Failed to log role creation:", err))

    return { success: true, roleId: role.id }
  } catch (err) {
    console.error("Failed to create role:", err)
    return { success: false, error: "Failed to create role" }
  }
}

/**
 * Update role permissions
 * Admin only
 */
export async function updateRolePermissions(
  roleId: string,
  permissions: string[],
  adminId: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    if (!roleId) {
      return { success: false, error: "Role ID is required" }
    }

    const role = await prisma.role.findUnique({ where: { id: roleId } })
    if (!role) {
      return { success: false, error: "Role not found" }
    }

    const oldPermissions = role.permissions
    await prisma.role.update({
      where: { id: roleId },
      data: { permissions },
    })

    // Log audit trail
    await prisma.auditLog.create({
      data: {
        adminId,
        action: "ROLE_PERMISSIONS_UPDATED",
        targetId: roleId,
        details: `Updated permissions for role "${role.name}": ${oldPermissions.length} → ${permissions.length} permissions`,
      },
    }).catch((err) => console.error("Failed to log permission update:", err))

    return { success: true }
  } catch (err) {
    console.error("Failed to update role permissions:", err)
    return { success: false, error: "Failed to update permissions" }
  }
}

/**
 * Assign a user to a custom role
 * Admin only
 */
export async function assignUserRole(
  username: string,
  roleId: string,
  adminId: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    if (!username || !roleId) {
      return { success: false, error: "Username and Role ID are required" }
    }

    // Find user by username
    const user = await prisma.user.findUnique({
      where: { username },
      include: { customRole: true },
    })
    if (!user) {
      return { success: false, error: "User not found" }
    }

    // Find role
    const role = await prisma.role.findUnique({ where: { id: roleId } })
    if (!role) {
      return { success: false, error: "Role not found" }
    }

    // Update user's customRoleId
    await prisma.user.update({
      where: { id: user.id },
      data: { customRoleId: roleId },
    })

    // Log audit trail
    await prisma.auditLog.create({
      data: {
        adminId,
        action: "USER_ASSIGNED_ROLE",
        targetId: user.id,
        details: `Assigned user "${username}" to custom role "${role.name}"`,
      },
    }).catch((err) => console.error("Failed to log role assignment:", err))

    return { success: true }
  } catch (err) {
    console.error("Failed to assign user role:", err)
    return { success: false, error: "Failed to assign user to role" }
  }
}

/**
 * Chat Monitoring - Get conversations with flagging
 * Admin only
 */
export async function getChatConversations(searchQuery: string = "", filterType: string = "all"): Promise<{
  success: boolean
  conversations?: Array<{
    id: string
    participants: Array<{ id: string; username: string; avatar: string | null; isBanned: boolean }>
    lastMessage: string | null
    lastMessageTime: Date | null
    flagged: boolean
    flagReason?: string
    messageCount: number
  }>
  stats?: {
    total: number
    flagged: number
    aiDetections: number
    usersMuted: number
  }
  error?: string
}> {
  try {
    // TODO: Verify admin role from auth context

    // Get all conversations with messages
    const conversations = await prisma.conversation.findMany({
      include: {
        buyer: { select: { id: true, username: true, profilePicture: true, isBanned: true } },
        seller: { select: { id: true, username: true, profilePicture: true, isBanned: true } },
        messages: {
          orderBy: { createdAt: "desc" },
          take: 1,
          select: { content: true, createdAt: true },
        },
        _count: { select: { messages: true } },
      },
      orderBy: { updatedAt: "desc" },
    })

    // Define suspicious keywords for flagging
    const suspiciousKeywords = [
      "send first",
      "trust me",
      "promise",
      "quick before",
      "another site",
      "free robux",
      "outside of platform",
      "paypal",
      "gift card",
      "discord",
      "private message",
      "cashapp",
      "venmo",
      "zelle",
      "wire transfer",
      "refund later",
      "guaranteed",
    ]

    // Format conversations
    const formattedConversations = await Promise.all(
      conversations.map(async (conv) => {
        const participants = [
          {
            id: conv.buyer.id,
            username: conv.buyer.username,
            avatar: conv.buyer.profilePicture,
            isBanned: conv.buyer.isBanned,
          },
          {
            id: conv.seller.id,
            username: conv.seller.username,
            avatar: conv.seller.profilePicture,
            isBanned: conv.seller.isBanned,
          },
        ]

        // Check last message for suspicious content
        const lastMessage = conv.messages[0]?.content || null
        let flagged = false
        let flagReason = undefined

        if (lastMessage) {
          const lowerMessage = lastMessage.toLowerCase()
          const foundKeywords = suspiciousKeywords.filter((kw) => lowerMessage.includes(kw))
          if (foundKeywords.length > 0) {
            flagged = true
            flagReason = `Suspicious keywords detected: ${foundKeywords.slice(0, 2).join(", ")}`
          }
        }

        // Also flag if either participant is banned
        if (conv.buyer.isBanned || conv.seller.isBanned) {
          flagged = true
          flagReason = "Banned user in conversation"
        }

        return {
          id: conv.id,
          participants,
          lastMessage,
          lastMessageTime: conv.messages[0]?.createdAt || null,
          flagged,
          flagReason,
          messageCount: conv._count.messages,
        }
      })
    )

    // Apply filters
    let filteredConversations = formattedConversations

    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filteredConversations = filteredConversations.filter((conv) =>
        conv.participants.some((p) => p.username.toLowerCase().includes(query))
      )
    }

    if (filterType === "flagged") {
      filteredConversations = filteredConversations.filter((conv) => conv.flagged)
    } else if (filterType === "normal") {
      filteredConversations = filteredConversations.filter((conv) => !conv.flagged)
    }

    // Calculate stats
    const usersMuted = await prisma.user.count({
      where: {
        isMuted: true,
        OR: [
          { mutedUntil: null }, // permanent mute
          { mutedUntil: { gt: new Date() } }, // active temporary mute
        ],
      },
    })

    const stats = {
      total: formattedConversations.length,
      flagged: formattedConversations.filter((c) => c.flagged).length,
      aiDetections: formattedConversations.filter((c) => c.flagged && c.flagReason?.includes("Suspicious keywords"))
        .length,
      usersMuted,
    }

    return {
      success: true,
      conversations: filteredConversations,
      stats,
    }
  } catch (err) {
    console.error("Failed to get chat conversations:", err)
    return { success: false, error: `Failed to load conversations: ${err instanceof Error ? err.message : String(err)}` }
  }
}

/**
 * Get conversation messages for chat monitoring
 * Admin only
 */
export async function getConversationMessages(conversationId: string): Promise<{
  success: boolean
  messages?: Array<{
    id: string
    sender: string
    senderId: string
    message: string
    time: string
    createdAt: Date
    flagged: boolean
  }>
  error?: string
}> {
  try {
    // TODO: Verify admin role from auth context

    const messages = await prisma.message.findMany({
      where: { conversationId },
      include: {
        sender: { select: { username: true, id: true } },
      },
      orderBy: { createdAt: "asc" },
    })

    // Suspicious keywords for flagging
    const suspiciousKeywords = [
      "send first",
      "trust me",
      "promise",
      "quick before",
      "another site",
      "free robux",
      "outside of platform",
      "paypal",
      "gift card",
      "discord",
      "private message",
      "cashapp",
      "venmo",
      "zelle",
      "wire transfer",
      "refund later",
      "guaranteed",
    ]

    const formattedMessages = messages.map((msg) => {
      const lowerContent = msg.content.toLowerCase()
      const flagged = suspiciousKeywords.some((kw) => lowerContent.includes(kw))

      return {
        id: msg.id,
        sender: msg.sender.username,
        senderId: msg.sender.id,
        message: msg.content,
        time: msg.createdAt.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }),
        createdAt: msg.createdAt,
        flagged,
      }
    })

    return {
      success: true,
      messages: formattedMessages,
    }
  } catch (err) {
    console.error("Failed to get conversation messages:", err)
    return { success: false, error: "Failed to load messages" }
  }
}

/**
 * Mute user - prevents them from sending messages
 * Admin only
 */
export async function muteUser(
  userId: string,
  reason: string,
  duration?: number // duration in hours, undefined = permanent
): Promise<AdminResult> {
  try {
    const session = await auth()
    if (!session?.user || session.user.role !== "admin") {
      return { success: false, error: "Unauthorized" }
    }

    // Get admin user from database
    const adminUser = await prisma.user.findUnique({
      where: { email: session.user.email! },
      select: { id: true },
    })

    if (!adminUser) {
      return { success: false, error: "Admin user not found" }
    }

    if (!userId || !reason) {
      return { success: false, error: "User ID and reason are required" }
    }

    const user = await prisma.user.findUnique({ where: { id: userId } })
    if (!user) {
      return { success: false, error: "User not found" }
    }

    // Prevent muting admins
    if (user.role === "admin") {
      return { success: false, error: "Cannot mute admin users" }
    }

    // Calculate mute end time if duration provided
    const mutedUntil = duration ? new Date(Date.now() + duration * 60 * 60 * 1000) : null

    // Update user mute status
    await prisma.user.update({
      where: { id: userId },
      data: {
        isMuted: true,
        mutedUntil,
        mutedReason: reason,
      },
    })

    // Send notification
    await createNotification(
      userId,
      "SYSTEM",
      "Account Muted",
      `Your messaging privileges have been ${duration ? `temporarily suspended for ${duration} hours` : "permanently suspended"}. Reason: ${reason}`,
      undefined
    )

    // Create audit log
    await prisma.auditLog.create({
      data: {
        adminId: adminUser.id,
        action: "USER_MUTED",
        targetId: userId,
        details: `Muted user ${user.username}${duration ? ` for ${duration} hours` : " permanently"}. Reason: ${reason}`,
      },
    })

    return { success: true }
  } catch (err) {
    console.error("Failed to mute user:", err)
    return { success: false, error: "Failed to mute user" }
  }
}

/**
 * Get all vouches with detection of suspicious patterns
 * Admin only
 */
export async function getVouches(searchQuery: string = "", statusFilter: string = "all"): Promise<{
  success: boolean
  vouches?: Array<{
    id: string
    giver: {
      id: string
      username: string
      avatar: string | null
      vouchCount: number
      joinDate: Date
    }
    receiver: {
      id: string
      username: string
      avatar: string | null
      vouchCount: number
      joinDate: Date
    }
    type: string
    message: string | null
    rating: number
    createdAt: Date
    status: "valid" | "suspicious" | "invalid"
    flags: string[]
    transaction?: {
      id: string
      item: string
      price: number
      date: Date
    } | null
    invalidReason?: string
  }>
  stats?: {
    total: number
    valid: number
    suspicious: number
    invalid: number
  }
  suspiciousPatterns?: Array<{
    id: string
    type: "circular" | "rapid" | "new-accounts"
    users: string[]
    description: string
    severity: "high" | "medium" | "low"
    vouchCount: number
  }>
  trendData?: Array<{
    date: string
    vouches: number
    invalid: number
  }>
  error?: string
}> {
  try {
    // Fetch all vouches with user details and transaction info
    const vouches = await prisma.vouch.findMany({
      select: {
        id: true,
        fromUserId: true,
        toUserId: true,
        transactionId: true,
        type: true,
        message: true,
        rating: true,
        createdAt: true,
        status: true,
        invalidatedBy: true,
        invalidatedAt: true,
        invalidReason: true,
        fromUser: {
          select: {
            id: true,
            username: true,
            profilePicture: true,
            joinDate: true,
            vouchesReceived: { where: { status: "VALID" }, select: { id: true } }, // Only count valid vouches
          },
        },
        toUser: {
          select: {
            id: true,
            username: true,
            profilePicture: true,
            joinDate: true,
            vouchesReceived: { where: { status: "VALID" }, select: { id: true } }, // Only count valid vouches
          },
        },
        transaction: {
          select: {
            id: true,
            price: true,
            createdAt: true,
            listingId: true,
            listingType: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    })

    // Detect suspicious patterns
    const suspiciousVouches = new Set<string>()
    const vouchFlags = new Map<string, string[]>()

    // Pattern 1: Rapid vouching (more than 5 vouches in last hour)
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000)
    const recentVouchesByUser = new Map<string, number>()
    vouches.forEach((v) => {
      if (v.createdAt > oneHourAgo) {
        recentVouchesByUser.set(v.fromUserId, (recentVouchesByUser.get(v.fromUserId) || 0) + 1)
      }
    })
    recentVouchesByUser.forEach((count, userId) => {
      if (count > 5) {
        vouches
          .filter((v) => v.fromUserId === userId && v.createdAt > oneHourAgo)
          .forEach((v) => {
            suspiciousVouches.add(v.id)
            const flags = vouchFlags.get(v.id) || []
            flags.push("rapid-vouching")
            vouchFlags.set(v.id, flags)
          })
      }
    })

    // Pattern 2: New accounts (joined less than 7 days ago)
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    vouches.forEach((v) => {
      if (v.fromUser.joinDate > sevenDaysAgo || v.toUser.joinDate > sevenDaysAgo) {
        suspiciousVouches.add(v.id)
        const flags = vouchFlags.get(v.id) || []
        flags.push("new-account")
        vouchFlags.set(v.id, flags)
      }
    })

    // Pattern 3: Circular vouching (A vouches B, B vouches A)
    const vouchPairs = new Map<string, Set<string>>()
    vouches.forEach((v) => {
      const key = `${v.fromUserId}-${v.toUserId}`
      const reverseKey = `${v.toUserId}-${v.fromUserId}`
      
      if (!vouchPairs.has(v.fromUserId)) {
        vouchPairs.set(v.fromUserId, new Set())
      }
      vouchPairs.get(v.fromUserId)!.add(v.toUserId)

      // Check if reverse vouch exists
      const hasReverseVouch = vouches.some(
        (rv) => rv.fromUserId === v.toUserId && rv.toUserId === v.fromUserId
      )
      if (hasReverseVouch) {
        suspiciousVouches.add(v.id)
        const flags = vouchFlags.get(v.id) || []
        flags.push("circular-vouch")
        vouchFlags.set(v.id, flags)
      }
    })

    // Fetch listing titles for transactions
    const formattedVouches = await Promise.all(
      vouches.map(async (v) => {
        let transactionData = null
        if (v.transaction) {
          let listingTitle = "Unknown Item"
          if (v.transaction.listingType === "ITEM") {
            const listing = await prisma.itemListing.findUnique({
              where: { id: v.transaction.listingId },
              select: { title: true },
            })
            if (listing) listingTitle = listing.title
          } else if (v.transaction.listingType === "CURRENCY") {
            const listing = await prisma.currencyListing.findUnique({
              where: { id: v.transaction.listingId },
              select: { title: true },
            })
            if (listing) listingTitle = listing.title
          }

          transactionData = {
            id: v.transaction.id,
            item: listingTitle,
            price: v.transaction.price,
            date: v.transaction.createdAt,
          }
        }

        const flags = vouchFlags.get(v.id) || []
        const isSuspicious = suspiciousVouches.has(v.id)
        
        // Use database status if INVALID, otherwise check suspicious flags
        let status: "valid" | "suspicious" | "invalid" = "valid"
        if (v.status === "INVALID") {
          status = "invalid"
        } else if (isSuspicious) {
          status = "suspicious"
        }

        return {
          id: v.id,
          giver: {
            id: v.fromUser.id,
            username: v.fromUser.username,
            avatar: v.fromUser.profilePicture,
            vouchCount: v.fromUser.vouchesReceived.length,
            joinDate: v.fromUser.joinDate,
          },
          receiver: {
            id: v.toUser.id,
            username: v.toUser.username,
            avatar: v.toUser.profilePicture,
            vouchCount: v.toUser.vouchesReceived.length,
            joinDate: v.toUser.joinDate,
          },
          type: v.type,
          message: v.message,
          rating: v.rating,
          createdAt: v.createdAt,
          status,
          flags,
          transaction: transactionData,
        }
      })
    )

    // Apply filters
    let filteredVouches = formattedVouches
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filteredVouches = filteredVouches.filter(
        (v) =>
          v.giver.username.toLowerCase().includes(query) || v.receiver.username.toLowerCase().includes(query)
      )
    }
    if (statusFilter !== "all") {
      filteredVouches = filteredVouches.filter((v) => v.status === statusFilter)
    }

    // Generate suspicious patterns summary
    const suspiciousPatterns: Array<{
      id: string
      type: "circular" | "rapid" | "new-accounts"
      users: string[]
      description: string
      severity: "high" | "medium" | "low"
      vouchCount: number
    }> = []

    // Detect circular patterns
    const circularGroups = new Map<string, Set<string>>()
    formattedVouches
      .filter((v) => v.flags.includes("circular-vouch"))
      .forEach((v) => {
        const key = [v.giver.username, v.receiver.username].sort().join("-")
        if (!circularGroups.has(key)) {
          circularGroups.set(key, new Set())
        }
        circularGroups.get(key)!.add(v.giver.username)
        circularGroups.get(key)!.add(v.receiver.username)
      })

    circularGroups.forEach((users, key) => {
      suspiciousPatterns.push({
        id: key,
        type: "circular",
        users: Array.from(users),
        description: `${users.size} accounts vouching each other in a circle`,
        severity: users.size > 3 ? "high" : "medium",
        vouchCount: formattedVouches.filter(
          (v) => users.has(v.giver.username) && users.has(v.receiver.username)
        ).length,
      })
    })

    // Detect rapid vouching patterns
    recentVouchesByUser.forEach((count, userId) => {
      if (count > 5) {
        const user = formattedVouches.find((v) => v.giver.id === userId)
        if (user) {
          suspiciousPatterns.push({
            id: `rapid-${userId}`,
            type: "rapid",
            users: [user.giver.username],
            description: `Gave ${count} vouches in the last hour`,
            severity: count > 10 ? "high" : "medium",
            vouchCount: count,
          })
        }
      }
    })

    // Detect new account patterns
    const newAccountVouches = formattedVouches.filter((v) => v.flags.includes("new-account"))
    if (newAccountVouches.length > 3) {
      const newUsers = new Set<string>()
      newAccountVouches.forEach((v) => {
        if (v.giver.joinDate > sevenDaysAgo) newUsers.add(v.giver.username)
        if (v.receiver.joinDate > sevenDaysAgo) newUsers.add(v.receiver.username)
      })
      suspiciousPatterns.push({
        id: "new-accounts",
        type: "new-accounts",
        users: Array.from(newUsers),
        description: `${newUsers.size} new accounts (< 7 days) involved in vouching`,
        severity: "medium",
        vouchCount: newAccountVouches.length,
      })
    }

    // Generate trend data (last 7 days)
    const trendData = []
    const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
    for (let i = 6; i >= 0; i--) {
      const date = new Date()
      date.setDate(date.getDate() - i)
      date.setHours(0, 0, 0, 0)
      const nextDay = new Date(date)
      nextDay.setDate(nextDay.getDate() + 1)

      const dayVouches = formattedVouches.filter(
        (v) => v.createdAt >= date && v.createdAt < nextDay
      )

      trendData.push({
        date: dayNames[date.getDay()],
        vouches: dayVouches.length,
        invalid: dayVouches.filter((v) => v.status === "suspicious" || v.status === "invalid").length,
      })
    }

    // Calculate stats
    const stats = {
      total: formattedVouches.length,
      valid: formattedVouches.filter((v) => v.status === "valid").length,
      suspicious: formattedVouches.filter((v) => v.status === "suspicious").length,
      invalid: formattedVouches.filter((v) => v.status === "invalid").length,
    }

    return {
      success: true,
      vouches: filteredVouches,
      stats,
      suspiciousPatterns,
      trendData,
    }
  } catch (err) {
    console.error("Failed to get vouches:", err)
    return { success: false, error: `Failed to load vouches: ${err instanceof Error ? err.message : String(err)}` }
  }
}

/**
 * Invalidate a vouch
 * Admin only
 */
export async function invalidateVouch(vouchId: string, reason: string): Promise<AdminResult> {
  try {
    const session = await auth()
    if (!session?.user || session.user.role !== "admin") {
      return { success: false, error: "Unauthorized" }
    }

    // Get admin user from database
    const adminUser = await prisma.user.findUnique({
      where: { email: session.user.email! },
      select: { id: true },
    })

    if (!adminUser) {
      return { success: false, error: "Admin user not found" }
    }

    if (!vouchId || !reason) {
      return { success: false, error: "Vouch ID and reason are required" }
    }

    const vouch = await prisma.vouch.findUnique({
      where: { id: vouchId },
      include: {
        fromUser: { select: { username: true } },
        toUser: { select: { id: true, username: true } },
      },
    })

    if (!vouch) {
      return { success: false, error: "Vouch not found" }
    }

    // Mark vouch as invalid instead of deleting
    await prisma.vouch.update({
      where: { id: vouchId },
      data: {
        status: "INVALID",
        invalidatedBy: adminUser.id,
        invalidatedAt: new Date(),
        invalidReason: reason,
      },
    })

    // Notify the receiver
    await createNotification(
      vouch.toUser.id,
      "SYSTEM",
      "Vouch Removed",
      `A vouch from ${vouch.fromUser.username} has been removed. Reason: ${reason}`,
      undefined
    )

    // Create audit log
    await prisma.auditLog.create({
      data: {
        adminId: adminUser.id,
        action: "VOUCH_INVALIDATED",
        targetId: vouchId,
        details: `Invalidated vouch from ${vouch.fromUser.username} to ${vouch.toUser.username}. Reason: ${reason}`,
      },
    })

    return { success: true }
  } catch (err) {
    console.error("Failed to invalidate vouch:", err)
    return { success: false, error: "Failed to invalidate vouch" }
  }
}

/**
 * Approve a suspicious vouch (mark as valid)
 * Admin only
 */
export async function approveVouch(vouchId: string): Promise<AdminResult> {
  try {
    const session = await auth()
    if (!session?.user || session.user.role !== "admin") {
      return { success: false, error: "Unauthorized" }
    }

    // Get admin user from database
    const adminUser = await prisma.user.findUnique({
      where: { email: session.user.email! },
      select: { id: true },
    })

    if (!adminUser) {
      return { success: false, error: "Admin user not found" }
    }

    const vouch = await prisma.vouch.findUnique({
      where: { id: vouchId },
      include: {
        fromUser: { select: { username: true } },
        toUser: { select: { username: true } },
      },
    })

    if (!vouch) {
      return { success: false, error: "Vouch not found" }
    }

    // Mark vouch as valid (in case it was flagged as suspicious)
    await prisma.vouch.update({
      where: { id: vouchId },
      data: {
        status: "VALID",
        // Clear invalidation data if it was previously invalid
        invalidatedBy: null,
        invalidatedAt: null,
        invalidReason: null,
      },
    })

    // Create audit log
    await prisma.auditLog.create({
      data: {
        adminId: adminUser.id,
        action: "VOUCH_APPROVED",
        targetId: vouchId,
        details: `Approved vouch from ${vouch.fromUser.username} to ${vouch.toUser.username}`,
      },
    })

    return { success: true }
  } catch (err) {
    console.error("Failed to approve vouch:", err)
    return { success: false, error: "Failed to approve vouch" }
  }
}

/**
 * Invalidate multiple vouches in a pattern
 * Admin only
 */
export async function invalidatePattern(
  vouchIds: string[],
  reason: string
): Promise<AdminResult> {
  try {
    const session = await auth()
    if (!session?.user || session.user.role !== "admin") {
      return { success: false, error: "Unauthorized" }
    }

    // Get admin user from database
    const adminUser = await prisma.user.findUnique({
      where: { email: session.user.email! },
      select: { id: true },
    })

    if (!adminUser) {
      return { success: false, error: "Admin user not found" }
    }

    if (!vouchIds.length || !reason) {
      return { success: false, error: "Vouch IDs and reason are required" }
    }

    const vouches = await prisma.vouch.findMany({
      where: { id: { in: vouchIds } },
      include: {
        toUser: { select: { id: true } },
      },
    })

    // Mark all vouches as invalid
    await prisma.vouch.updateMany({
      where: { id: { in: vouchIds } },
      data: {
        status: "INVALID",
        invalidatedBy: adminUser.id,
        invalidatedAt: new Date(),
        invalidReason: reason,
      },
    })

    // Notify affected users
    const uniqueUserIds = [...new Set(vouches.map((v) => v.toUser.id))]
    await Promise.all(
      uniqueUserIds.map((userId) =>
        createNotification(
          userId,
          "SYSTEM",
          "Vouches Removed",
          `Multiple vouches have been removed from your account. Reason: ${reason}`,
          undefined
        )
      )
    )

    // Create audit log
    await prisma.auditLog.create({
      data: {
        adminId: adminUser.id,
        action: "VOUCH_PATTERN_INVALIDATED",
        targetId: vouchIds[0], // First vouch ID as reference
        details: `Invalidated ${vouchIds.length} vouches in pattern. Reason: ${reason}`,
      },
    })

    return { success: true }
  } catch (err) {
    console.error("Failed to invalidate pattern:", err)
    return { success: false, error: "Failed to invalidate pattern" }
  }
}

/**
 * Get system settings
 * Admin only
 */
export async function getSystemSettings(): Promise<{
  success: boolean
  settings?: Record<string, any>
  error?: string
}> {
  try {
    const session = await auth()
    if (!session?.user || session.user.role !== "admin") {
      return { success: false, error: "Unauthorized" }
    }

    const settingsData = await prisma.systemSettings.findMany()
    
    // Convert to key-value object
    const settings: Record<string, any> = {}
    settingsData.forEach((setting) => {
      try {
        // Try to parse as JSON, if fails use raw value
        settings[setting.key] = JSON.parse(setting.value)
      } catch {
        settings[setting.key] = setting.value
      }
    })

    // Set defaults if not in database
    const defaults = {
      site_name: "RobloxTrade",
      site_description: "Peer-to-peer marketplace for trading Roblox items safely.",
      support_email: "support@robloxtrade.com",
      maintenance_mode: false,
      registration_enabled: true,
      new_user_limit_week: 5000,
      new_user_limit_month: 25000,
      ip_rate_limit: 60,
      failed_login_lockout: 5,
      max_listings_free: 10,
      max_listings_pro: 50,
      max_listings_elite: 100,
      listing_expiry_days: 30,
      featured_duration_hours: 24,
      default_sort: "newest",
      email_notifications: true,
      admin_alert_email: "admin@robloxtrade.com",
      alert_high_value_trades: true,
      alert_new_reports: true,
      alert_system_errors: true,
      alert_daily_summary: false,
      blacklisted_words: ["free robux", "scam", "hack", "exploit", "paypal", "discord", "outside of platform"],
    }

    return { success: true, settings: { ...defaults, ...settings } }
  } catch (err) {
    console.error("Failed to get system settings:", err)
    return { success: false, error: "Failed to get system settings" }
  }
}

/**
 * Update system settings
 * Admin only
 */
export async function updateSystemSettings(
  settings: Record<string, any>
): Promise<AdminResult> {
  try {
    const session = await auth()
    if (!session?.user || session.user.role !== "admin") {
      return { success: false, error: "Unauthorized" }
    }

    // Get admin user from database
    const adminUser = await prisma.user.findUnique({
      where: { email: session.user.email! },
      select: { id: true },
    })

    if (!adminUser) {
      return { success: false, error: "Admin user not found" }
    }

    // Define setting categories
    const categoryMap: Record<string, string> = {
      site_name: "general",
      site_description: "general",
      support_email: "general",
      maintenance_mode: "general",
      registration_enabled: "security",
      new_user_limit_week: "security",
      new_user_limit_month: "security",
      ip_rate_limit: "security",
      failed_login_lockout: "security",
      max_listings_free: "listings",
      max_listings_pro: "listings",
      max_listings_elite: "listings",
      listing_expiry_days: "listings",
      featured_duration_hours: "listings",
      default_sort: "listings",
      email_notifications: "notifications",
      admin_alert_email: "notifications",
      alert_high_value_trades: "notifications",
      alert_new_reports: "notifications",
      alert_system_errors: "notifications",
      alert_daily_summary: "notifications",
      blacklisted_words: "moderation",
    }

    // Update or create settings
    await Promise.all(
      Object.entries(settings).map(async ([key, value]) => {
        const category = categoryMap[key] || "general"
        const stringValue = typeof value === "string" ? value : JSON.stringify(value)

        await prisma.systemSettings.upsert({
          where: { key },
          update: {
            value: stringValue,
            category,
            updatedAt: new Date(),
          },
          create: {
            key,
            value: stringValue,
            category,
          },
        })
      })
    )

    // Create audit log
    await prisma.auditLog.create({
      data: {
        adminId: adminUser.id,
        action: "SETTINGS_CHANGED",
        details: `Updated ${Object.keys(settings).length} system settings`,
      },
    })

    return { success: true }
  } catch (err) {
    console.error("Failed to update system settings:", err)
    return { success: false, error: "Failed to update system settings" }
  }
}

/**
 * Reset system settings to defaults
 * Admin only
 */
export async function resetSystemSettings(): Promise<AdminResult> {
  try {
    const session = await auth()
    if (!session?.user || session.user.role !== "admin") {
      return { success: false, error: "Unauthorized" }
    }

    // Get admin user from database
    const adminUser = await prisma.user.findUnique({
      where: { email: session.user.email! },
      select: { id: true },
    })

    if (!adminUser) {
      return { success: false, error: "Admin user not found" }
    }

    // Delete all settings (will use defaults)
    await prisma.systemSettings.deleteMany({})

    // Create audit log
    await prisma.auditLog.create({
      data: {
        adminId: adminUser.id,
        action: "SETTINGS_CHANGED",
        details: "Reset all system settings to defaults",
      },
    })

    return { success: true }
  } catch (err) {
    console.error("Failed to reset system settings:", err)
    return { success: false, error: "Failed to reset system settings" }
  }
}
