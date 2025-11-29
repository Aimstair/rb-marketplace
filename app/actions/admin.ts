"use server"

import { prisma } from "@/lib/prisma"

/**
 * Type definitions for admin responses
 */
interface DashboardStats {
  totalRevenue: number
  totalUsers: number
  activeListings: number
  pendingReports: number
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

    // Get total revenue from completed transactions
    const revenueData = await prisma.transaction.aggregate({
      where: { status: "COMPLETED" },
      _sum: { price: true },
    })
    const totalRevenue = revenueData._sum.price || 0

    // Get total users count
    const totalUsers = await prisma.user.count()

    // Get active listings count
    const activeListings = await prisma.listing.count({
      where: { status: "available" },
    })

    // Get pending reports count
    const pendingReports = await prisma.report.count({
      where: { status: "PENDING" },
    })

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
        buyer: { select: { username: true } },
        seller: { select: { username: true } },
        listing: { select: { title: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 5,
    })

    // Combine and sort by date (most recent first)
    const recentActivity = [
      ...recentUsers.map((u) => ({
        id: u.id,
        type: "user_joined" as const,
        user: { id: u.id, username: u.username, avatar: u.profilePicture },
        createdAt: u.joinDate,
      })),
      ...recentTransactions.map((t) => ({
        id: t.id,
        type: "transaction_completed" as const,
        transaction: {
          id: t.id,
          price: t.price,
          buyer: { username: t.buyer.username },
          seller: { username: t.seller.username },
          listing: { title: t.listing.title },
        },
        createdAt: t.createdAt,
      })),
    ].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())

    return {
      success: true,
      data: {
        totalRevenue,
        totalUsers,
        activeListings,
        pendingReports,
        recentActivity: recentActivity.slice(0, 10), // Limit to 10 most recent
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
            listings: true,
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
        listingCount: u._count.listings,
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
export async function banUser(userId: string, ban: boolean = true): Promise<AdminResult> {
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

    // If banning, also hide their active listings
    if (ban) {
      await prisma.listing.updateMany({
        where: { sellerId: userId, status: "available" },
        data: { status: "hidden" },
      })
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

    const reports = await prisma.report.findMany({
      where,
      select: {
        id: true,
        reason: true,
        details: true,
        status: true,
        createdAt: true,
        reporterId: true,
        reportedId: true,
        listingId: true,
        reporter: {
          select: { id: true, username: true, profilePicture: true },
        },
        reported: {
          select: { id: true, username: true, profilePicture: true },
        },
        listing: {
          select: { id: true, title: true, image: true },
        },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: pageSize,
    })

    return { success: true, reports }
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

    const report = await prisma.report.findUnique({ where: { id: reportId } })
    if (!report) {
      return { success: false, error: "Report not found" }
    }

    await prisma.report.update({
      where: { id: reportId },
      data: { status: resolution },
    })

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
export async function createReport(
  reporterId: string,
  reason: string,
  details?: string,
  reportedId?: string,
  listingId?: string,
): Promise<AdminResult> {
  try {
    if (!reporterId || !reason) {
      return { success: false, error: "Reporter ID and reason are required" }
    }

    if (!reportedId && !listingId) {
      return { success: false, error: "Either reported user or listing must be specified" }
    }

    // Validate that reported user or listing exists
    if (reportedId) {
      const user = await prisma.user.findUnique({ where: { id: reportedId } })
      if (!user) {
        return { success: false, error: "Reported user not found" }
      }
    }

    if (listingId) {
      const listing = await prisma.listing.findUnique({ where: { id: listingId } })
      if (!listing) {
        return { success: false, error: "Reported listing not found" }
      }
    }

    await prisma.report.create({
      data: {
        reporterId,
        reportedId,
        listingId,
        reason,
        details,
        status: "PENDING",
      },
    })

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

    // Get total count
    const total = await prisma.listing.count({ where })
    const pages = Math.ceil(total / pageSize)

    // Get paginated listings
    const listings = await prisma.listing.findMany({
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
      skip,
      take: pageSize,
    })

    return {
      success: true,
      listings,
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
 * Update listing status by admin
 * Admin only
 */
export async function adminUpdateListingStatus(
  listingId: string,
  newStatus: string,
): Promise<AdminResult> {
  try {
    // TODO: Verify admin role from auth context

    if (!listingId) {
      return { success: false, error: "Listing ID is required" }
    }

    if (!newStatus) {
      return { success: false, error: "New status is required" }
    }

    const listing = await prisma.listing.findUnique({ where: { id: listingId } })
    if (!listing) {
      return { success: false, error: "Listing not found" }
    }

    // Valid admin statuses
    const validStatuses = ["available", "sold", "hidden", "banned", "pending"]
    if (!validStatuses.includes(newStatus)) {
      return { success: false, error: "Invalid status" }
    }

    await prisma.listing.update({
      where: { id: listingId },
      data: { status: newStatus },
    })

    return { success: true }
  } catch (err) {
    console.error("Failed to update listing status:", err)
    return { success: false, error: "Failed to update listing status" }
  }
}
