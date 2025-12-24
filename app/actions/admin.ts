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
            vouchesReceived: true,
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
  tickets?: Array<{
    id: string
    subject: string
    message: string
    status: string
    user: { id: string; username: string; email: string }
    createdAt: Date
  }>
  error?: string
}> {
  try {
    const tickets = await prisma.supportTicket.findMany({
      include: {
        user: { select: { id: true, username: true, email: true } },
      },
      orderBy: { createdAt: "desc" },
    })

    return { success: true, tickets }
  } catch (err) {
    console.error("Failed to get support tickets:", err)
    return { success: false, error: "Failed to get support tickets" }
  }
}

/**
 * Close a support ticket
 * Admin only
 */
export async function closeTicket(ticketId: string, adminId: string): Promise<AdminResult> {
  try {
    const ticket = await prisma.supportTicket.findUnique({ where: { id: ticketId } })
    if (!ticket) {
      return { success: false, error: "Ticket not found" }
    }

    await prisma.supportTicket.update({
      where: { id: ticketId },
      data: { status: "CLOSED" },
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
 * Get all announcements
 * Admin only
 */
export async function getAnnouncements(): Promise<{
  success: boolean
  announcements?: Array<{
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

    return { success: true, announcements }
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
