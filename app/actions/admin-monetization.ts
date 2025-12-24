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

// Get date range helper
function getDateRange(months: number = 6) {
  const now = new Date()
  const startDate = new Date()
  startDate.setMonth(now.getMonth() - months)
  return { startDate, endDate: now }
}

/**
 * Get monetization overview stats
 */
export async function getMonetizationOverview() {
  try {
    if (!(await isAdmin())) {
      return { success: false, error: "Unauthorized" }
    }

    const { startDate, endDate } = getDateRange(1) // Last month

    // Get subscription revenue
    const subscriptionRevenue = await prisma.subscriptionLog.aggregate({
      where: { createdAt: { gte: startDate, lte: endDate } },
      _sum: { amount: true }
    })

    // Get active subscribers count
    const activeSubscribers = await prisma.user.count({
      where: {
        subscriptionTier: { in: ["PRO", "ELITE"] },
        subscriptionStatus: "ACTIVE"
      }
    })

    // Calculate previous month for growth comparison
    const prevStartDate = new Date(startDate)
    prevStartDate.setMonth(prevStartDate.getMonth() - 1)

    const prevSubscriptionRevenue = await prisma.subscriptionLog.aggregate({
      where: { createdAt: { gte: prevStartDate, lt: startDate } },
      _sum: { amount: true }
    })

    const prevActiveSubscribers = await prisma.user.count({
      where: {
        subscriptionTier: { in: ["PRO", "ELITE"] },
        subscriptionStatus: "ACTIVE",
        updatedAt: { lt: startDate }
      }
    })

    const subscriptionGrowth = prevSubscriptionRevenue._sum.amount && prevSubscriptionRevenue._sum.amount > 0
      ? ((((subscriptionRevenue._sum.amount || 0) - prevSubscriptionRevenue._sum.amount) / prevSubscriptionRevenue._sum.amount) * 100).toFixed(1)
      : "0"

    const subscriberGrowth = prevActiveSubscribers > 0
      ? (((activeSubscribers - prevActiveSubscribers) / prevActiveSubscribers) * 100).toFixed(1)
      : "0"

    return {
      success: true,
      data: {
        subscriptionRevenue: subscriptionRevenue._sum.amount || 0,
        subscriptionGrowth: `+${subscriptionGrowth}%`,
        activeSubscribers,
        subscriberGrowth: `+${subscriberGrowth}%`,
        // Note: Boost and Featured revenue would require separate tables/tracking
        boostRevenue: 0,
        boostGrowth: "+0%",
        featuredRevenue: 0,
        featuredGrowth: "+0%"
      }
    }
  } catch (error) {
    console.error("Failed to get monetization overview:", error)
    return { success: false, error: "Failed to load overview" }
  }
}

/**
 * Get subscription plan statistics
 */
export async function getSubscriptionPlanStats() {
  try {
    if (!(await isAdmin())) {
      return { success: false, error: "Unauthorized" }
    }

    const [freeCount, proCount, eliteCount] = await Promise.all([
      prisma.user.count({ where: { subscriptionTier: "FREE" } }),
      prisma.user.count({ where: { subscriptionTier: "PRO", subscriptionStatus: "ACTIVE" } }),
      prisma.user.count({ where: { subscriptionTier: "ELITE", subscriptionStatus: "ACTIVE" } })
    ])

    return {
      success: true,
      data: [
        {
          id: "free",
          name: "Free",
          price: "₱0",
          period: "forever",
          subscribers: freeCount,
          features: ["3 listings", "Basic profile", "Standard search visibility", "Standard support"]
        },
        {
          id: "pro",
          name: "Pro",
          price: "₱199",
          period: "/month",
          subscribers: proCount,
          features: ["Up to 10 listings", "1 Featured Listing", "Priority messaging", "Enhanced visibility", "Featured badge"]
        },
        {
          id: "elite",
          name: "Elite",
          price: "₱499",
          period: "/month",
          subscribers: eliteCount,
          features: ["Up to 30 listings", "3 Featured Listings", "Priority support", "Top visibility", "Elite badge"]
        }
      ]
    }
  } catch (error) {
    console.error("Failed to get plan stats:", error)
    return { success: false, error: "Failed to load plan statistics" }
  }
}

/**
 * Get revenue data for charts (last 6 months)
 */
export async function getRevenueChartData() {
  try {
    if (!(await isAdmin())) {
      return { success: false, error: "Unauthorized" }
    }

    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
    const data = []

    for (let i = 5; i >= 0; i--) {
      const date = new Date()
      date.setMonth(date.getMonth() - i)
      const monthStart = new Date(date.getFullYear(), date.getMonth(), 1)
      const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0)

      const subscriptionRevenue = await prisma.subscriptionLog.aggregate({
        where: { createdAt: { gte: monthStart, lte: monthEnd } },
        _sum: { amount: true }
      })

      data.push({
        month: monthNames[date.getMonth()],
        subscriptions: Math.round((subscriptionRevenue._sum.amount || 0) / 100), // Convert to pesos
        boosts: 0, // Would require separate tracking
        featured: 0 // Would require separate tracking
      })
    }

    return { success: true, data }
  } catch (error) {
    console.error("Failed to get revenue chart data:", error)
    return { success: false, error: "Failed to load revenue data" }
  }
}

/**
 * Get daily revenue for the week
 */
export async function getDailyRevenueData() {
  try {
    if (!(await isAdmin())) {
      return { success: false, error: "Unauthorized" }
    }

    const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
    const data = []

    for (let i = 6; i >= 0; i--) {
      const date = new Date()
      date.setDate(date.getDate() - i)
      const dayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0)
      const dayEnd = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59)

      const revenue = await prisma.subscriptionLog.aggregate({
        where: { createdAt: { gte: dayStart, lte: dayEnd } },
        _sum: { amount: true }
      })

      data.push({
        day: dayNames[date.getDay()],
        revenue: Math.round((revenue._sum.amount || 0) / 100)
      })
    }

    return { success: true, data }
  } catch (error) {
    console.error("Failed to get daily revenue:", error)
    return { success: false, error: "Failed to load daily revenue" }
  }
}

/**
 * Get all user subscriptions with filters
 */
export async function getUserSubscriptions(filters?: {
  search?: string
  plan?: string
  status?: string
}) {
  try {
    if (!(await isAdmin())) {
      return { success: false, error: "Unauthorized" }
    }

    const where: any = {
      subscriptionTier: { not: "FREE" }
    }

    // Apply filters
    if (filters?.plan && filters.plan !== "all") {
      where.subscriptionTier = filters.plan.toUpperCase()
    }

    if (filters?.status && filters.status !== "all") {
      if (filters.status === "active") {
        where.subscriptionStatus = "ACTIVE"
      } else if (filters.status === "cancelled") {
        where.subscriptionStatus = "CANCELLED"
      } else if (filters.status === "expiring") {
        // Expiring within next 7 days
        const sevenDaysFromNow = new Date()
        sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7)
        where.subscriptionStatus = "ACTIVE"
        where.subscriptionEndsAt = {
          lte: sevenDaysFromNow,
          gte: new Date()
        }
      }
    }

    if (filters?.search) {
      where.OR = [
        { username: { contains: filters.search, mode: "insensitive" } },
        { email: { contains: filters.search, mode: "insensitive" } }
      ]
    }

    const users = await prisma.user.findMany({
      where,
      select: {
        id: true,
        username: true,
        email: true,
        subscriptionTier: true,
        subscriptionStatus: true,
        subscriptionEndsAt: true,
        joinDate: true,
        subscriptionLogs: {
          select: { amount: true },
          orderBy: { createdAt: "desc" }
        }
      },
      orderBy: { joinDate: "desc" },
      take: 100
    })

    const data = users.map(user => {
      const totalSpent = user.subscriptionLogs.reduce((sum, log) => sum + log.amount, 0)
      
      // Determine status
      let status = "active"
      if (user.subscriptionStatus === "CANCELLED") {
        status = "cancelled"
      } else if (user.subscriptionEndsAt) {
        const daysUntilExpiry = Math.ceil((user.subscriptionEndsAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
        if (daysUntilExpiry <= 7) {
          status = "expiring"
        }
      }

      return {
        id: user.id,
        username: user.username,
        email: user.email,
        plan: user.subscriptionTier,
        status,
        startDate: user.joinDate.toISOString().split('T')[0],
        renewDate: user.subscriptionEndsAt ? user.subscriptionEndsAt.toISOString().split('T')[0] : "-",
        spent: `₱${(totalSpent / 100).toLocaleString()}`,
        avatar: user.username.charAt(0).toUpperCase()
      }
    })

    return { success: true, data }
  } catch (error) {
    console.error("Failed to get user subscriptions:", error)
    return { success: false, error: "Failed to load subscriptions" }
  }
}

/**
 * Extend user subscription
 */
export async function extendSubscription(userId: string, days: number) {
  try {
    if (!(await isAdmin())) {
      return { success: false, error: "Unauthorized" }
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { subscriptionEndsAt: true, username: true }
    })

    if (!user) {
      return { success: false, error: "User not found" }
    }

    const currentEndDate = user.subscriptionEndsAt || new Date()
    const newEndDate = new Date(currentEndDate)
    newEndDate.setDate(newEndDate.getDate() + days)

    await prisma.user.update({
      where: { id: userId },
      data: { subscriptionEndsAt: newEndDate }
    })

    // Create audit log
    const session = await auth()
    if (session?.user?.email) {
      const admin = await prisma.user.findUnique({
        where: { email: session.user.email },
        select: { id: true }
      })
      
      if (admin) {
        await prisma.auditLog.create({
          data: {
            adminId: admin.id,
            action: "EXTEND_SUBSCRIPTION",
            details: `Extended subscription for ${user.username} by ${days} days`
          }
        })
      }
    }

    return { success: true, message: `Subscription extended by ${days} days` }
  } catch (error) {
    console.error("Failed to extend subscription:", error)
    return { success: false, error: "Failed to extend subscription" }
  }
}

/**
 * Upgrade user subscription plan
 */
export async function upgradeUserPlan(userId: string, newPlan: "PRO" | "ELITE") {
  try {
    if (!(await isAdmin())) {
      return { success: false, error: "Unauthorized" }
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { username: true, subscriptionTier: true }
    })

    if (!user) {
      return { success: false, error: "User not found" }
    }

    await prisma.user.update({
      where: { id: userId },
      data: {
        subscriptionTier: newPlan,
        subscriptionStatus: "ACTIVE"
      }
    })

    // Create audit log
    const session = await auth()
    if (session?.user?.email) {
      const admin = await prisma.user.findUnique({
        where: { email: session.user.email },
        select: { id: true }
      })
      
      if (admin) {
        await prisma.auditLog.create({
          data: {
            adminId: admin.id,
            action: "UPGRADE_SUBSCRIPTION",
            details: `Upgraded ${user.username} from ${user.subscriptionTier} to ${newPlan}`
          }
        })
      }
    }

    return { success: true, message: `Plan upgraded to ${newPlan}` }
  } catch (error) {
    console.error("Failed to upgrade plan:", error)
    return { success: false, error: "Failed to upgrade plan" }
  }
}

/**
 * Cancel user subscription
 */
export async function cancelUserSubscription(userId: string) {
  try {
    if (!(await isAdmin())) {
      return { success: false, error: "Unauthorized" }
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { username: true }
    })

    if (!user) {
      return { success: false, error: "User not found" }
    }

    await prisma.user.update({
      where: { id: userId },
      data: {
        subscriptionStatus: "CANCELLED"
      }
    })

    // Create audit log
    const session = await auth()
    if (session?.user?.email) {
      const admin = await prisma.user.findUnique({
        where: { email: session.user.email },
        select: { id: true }
      })
      
      if (admin) {
        await prisma.auditLog.create({
          data: {
            adminId: admin.id,
            action: "CANCEL_SUBSCRIPTION",
            details: `Cancelled subscription for ${user.username}`
          }
        })
      }
    }

    return { success: true, message: "Subscription cancelled" }
  } catch (error) {
    console.error("Failed to cancel subscription:", error)
    return { success: false, error: "Failed to cancel subscription" }
  }
}

/**
 * Issue refund (marks in audit log, actual refund would be manual)
 */
export async function issueRefund(userId: string, amount: number, reason: string) {
  try {
    if (!(await isAdmin())) {
      return { success: false, error: "Unauthorized" }
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { username: true, email: true }
    })

    if (!user) {
      return { success: false, error: "User not found" }
    }

    // Create audit log for refund
    const session = await auth()
    if (session?.user?.email) {
      const admin = await prisma.user.findUnique({
        where: { email: session.user.email },
        select: { id: true }
      })
      
      if (admin) {
        await prisma.auditLog.create({
          data: {
            adminId: admin.id,
            action: "ISSUE_REFUND",
            details: `Refunded ₱${amount} to ${user.username} (${user.email}). Reason: ${reason}`
          }
        })
      }
    }

    return { success: true, message: `Refund of ₱${amount} recorded for manual processing` }
  } catch (error) {
    console.error("Failed to issue refund:", error)
    return { success: false, error: "Failed to record refund" }
  }
}
