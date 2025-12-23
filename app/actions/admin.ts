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

    // Get active listings count from both tables
    const itemListingsCount = await prisma.itemListing.count({
      where: { status: "available" },
    })
    const currencyListingsCount = await prisma.currencyListing.count({
      where: { status: "available" },
    })
    const activeListings = itemListingsCount + currencyListingsCount

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

    const listing = await prisma.listing.findUnique({ where: { id: listingId } })
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

    await prisma.listing.update({
      where: { id: listingId },
      data: { status: newStatus },
    })

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
