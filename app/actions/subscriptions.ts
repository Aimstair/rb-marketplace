"use server"

import { prisma } from "@/lib/prisma"

interface SubscriptionResult {
  success: boolean
  error?: string
}

interface SubscriptionStats {
  totalRevenue: number
  activeSubscribers: number
  recentSales: Array<{
    id: string
    username: string
    plan: string
    amount: number
    createdAt: Date
  }>
}

// Plan pricing in pesos
const SUBSCRIPTION_PRICING = {
  PRO: 19900, // ₱199
  ELITE: 49900, // ₱499
}

/**
 * Upgrade user subscription to a new tier
 * Simulates payment processing and creates subscription log
 */
export async function upgradeSubscription(userId: string, tier: "PRO" | "ELITE"): Promise<SubscriptionResult> {
  try {
    // Validate tier
    if (!["PRO", "ELITE"].includes(tier)) {
      return { success: false, error: "Invalid subscription tier" }
    }

    // Check if user exists
    const user = await prisma.user.findUnique({ where: { id: userId } })
    if (!user) {
      return { success: false, error: "User not found" }
    }

    // Simulate payment processing delay (in real scenario, this would integrate with Stripe/PayMongo)
    await new Promise((resolve) => setTimeout(resolve, 500))

    // Calculate subscription end date (30 days from now)
    const subscriptionEndsAt = new Date()
    subscriptionEndsAt.setDate(subscriptionEndsAt.getDate() + 30)

    // Get the amount for this tier
    const amount = SUBSCRIPTION_PRICING[tier]

    // Update user subscription
    await prisma.user.update({
      where: { id: userId },
      data: {
        subscriptionTier: tier,
        subscriptionStatus: "ACTIVE",
        subscriptionEndsAt,
      },
    })

    // Create subscription log for revenue tracking
    await prisma.subscriptionLog.create({
      data: {
        userId,
        plan: tier,
        amount,
      },
    })

    return { success: true }
  } catch (err) {
    console.error("Failed to upgrade subscription:", err)
    return { success: false, error: "Failed to process subscription upgrade" }
  }
}

/**
 * Get subscription statistics for admin dashboard
 * Admin only
 */
export async function getSubscriptionStats(): Promise<{
  success: boolean
  data?: SubscriptionStats
  error?: string
}> {
  try {
    // TODO: Verify admin role from auth context

    // Calculate total revenue from all subscription logs
    const revenueResult = await prisma.subscriptionLog.aggregate({
      _sum: {
        amount: true,
      },
    })
    const totalRevenue = revenueResult._sum.amount || 0

    // Count active subscribers (PRO or ELITE)
    const activeSubscribers = await prisma.user.count({
      where: {
        subscriptionTier: {
          in: ["PRO", "ELITE"],
        },
        subscriptionStatus: "ACTIVE",
      },
    })

    // Get recent sales (last 5 subscription logs)
    const recentLogs = await prisma.subscriptionLog.findMany({
      select: {
        id: true,
        plan: true,
        amount: true,
        createdAt: true,
        user: {
          select: {
            username: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 5,
    })

    const recentSales = recentLogs.map((log) => ({
      id: log.id,
      username: log.user.username,
      plan: log.plan,
      amount: log.amount,
      createdAt: log.createdAt,
    }))

    return {
      success: true,
      data: {
        totalRevenue,
        activeSubscribers,
        recentSales,
      },
    }
  } catch (err) {
    console.error("Failed to get subscription stats:", err)
    return { success: false, error: "Failed to load subscription statistics" }
  }
}

/**
 * Get current user's subscription details
 */
export async function getMySubscription(userId: string): Promise<{
  success: boolean
  data?: {
    tier: string
    status: string
    endsAt: Date | null
  }
  error?: string
}> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        subscriptionTier: true,
        subscriptionStatus: true,
        subscriptionEndsAt: true,
      },
    })

    if (!user) {
      return { success: false, error: "User not found" }
    }

    return {
      success: true,
      data: {
        tier: user.subscriptionTier,
        status: user.subscriptionStatus,
        endsAt: user.subscriptionEndsAt,
      },
    }
  } catch (err) {
    console.error("Failed to get subscription:", err)
    return { success: false, error: "Failed to load subscription" }
  }
}
