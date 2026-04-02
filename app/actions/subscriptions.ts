"use server"

import { prisma } from "@/lib/prisma"
import { headers } from "next/headers"
import { checkRateLimit, getRateLimitIdentifier } from "@/lib/rate-limit"

const ONE_MINUTE_MS = 60 * 1000
const ONE_HOUR_MS = 60 * ONE_MINUTE_MS

const SUBSCRIPTION_RATE_LIMITS = {
  read: { maxRequests: 120, windowMs: ONE_MINUTE_MS },
  mutate: { maxRequests: 30, windowMs: ONE_HOUR_MS },
  maintenance: { maxRequests: 20, windowMs: ONE_HOUR_MS },
} as const

async function enforceSubscriptionRateLimit(params: {
  namespace: string
  maxRequests: number
  windowMs: number
  userId?: string | null
  email?: string | null
  fallback?: string
  message: string
}): Promise<{ success: true } | { success: false; error: string }> {
  const requestHeaders = await headers()
  const rate = await checkRateLimit(
    getRateLimitIdentifier({
      headers: requestHeaders,
      userId: params.userId,
      email: params.email,
      fallback: params.fallback,
    }),
    params.maxRequests,
    params.windowMs,
    { namespace: params.namespace }
  )

  if (rate.allowed) {
    return { success: true }
  }

  return {
    success: false,
    error: `${params.message} Please try again in ${rate.retryAfterSeconds} seconds.`,
  }
}

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
    const upgradeRate = await enforceSubscriptionRateLimit({
      namespace: "subscriptions-upgrade",
      maxRequests: SUBSCRIPTION_RATE_LIMITS.mutate.maxRequests,
      windowMs: SUBSCRIPTION_RATE_LIMITS.mutate.windowMs,
      userId,
      message: "Too many subscription upgrade attempts.",
    })

    if (!upgradeRate.success) {
      return { success: false, error: upgradeRate.error }
    }

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
    const statsRate = await enforceSubscriptionRateLimit({
      namespace: "subscriptions-stats",
      maxRequests: SUBSCRIPTION_RATE_LIMITS.read.maxRequests,
      windowMs: SUBSCRIPTION_RATE_LIMITS.read.windowMs,
      fallback: "subscriptions-stats",
      message: "Too many subscription statistics requests.",
    })

    if (!statsRate.success) {
      return { success: false, error: statsRate.error }
    }

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
    const mySubscriptionRate = await enforceSubscriptionRateLimit({
      namespace: "subscriptions-my-plan",
      maxRequests: SUBSCRIPTION_RATE_LIMITS.read.maxRequests,
      windowMs: SUBSCRIPTION_RATE_LIMITS.read.windowMs,
      userId,
      message: "Too many subscription detail requests.",
    })

    if (!mySubscriptionRate.success) {
      return { success: false, error: mySubscriptionRate.error }
    }

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

/**
 * Get subscription limits from system settings
 */
export async function getSubscriptionLimitsFromSettings(): Promise<{
  success: boolean
  limits?: {
    free: number
    pro: number
    elite: number
  }
  error?: string
}> {
  try {
    const limitsRate = await enforceSubscriptionRateLimit({
      namespace: "subscriptions-limits-settings",
      maxRequests: SUBSCRIPTION_RATE_LIMITS.read.maxRequests,
      windowMs: SUBSCRIPTION_RATE_LIMITS.read.windowMs,
      fallback: "subscriptions-limits",
      message: "Too many subscription limits requests.",
    })

    if (!limitsRate.success) {
      return { success: false, error: limitsRate.error }
    }

    const [freeSetting, proSetting, eliteSetting] = await Promise.all([
      prisma.systemSettings.findUnique({ where: { key: "max_listings_free" } }),
      prisma.systemSettings.findUnique({ where: { key: "max_listings_pro" } }),
      prisma.systemSettings.findUnique({ where: { key: "max_listings_elite" } })
    ])

    return {
      success: true,
      limits: {
        free: freeSetting ? parseInt(freeSetting.value) : 10,
        pro: proSetting ? parseInt(proSetting.value) : 50,
        elite: eliteSetting ? parseInt(eliteSetting.value) : 100
      }
    }
  } catch (err) {
    console.error("Failed to get subscription limits:", err)
    return { 
      success: false, 
      error: "Failed to load subscription limits",
      limits: { free: 10, pro: 50, elite: 100 } // Fallback defaults
    }
  }
}

/**
 * Enforce listing limits after subscription change
 * Hides excess listings and notifies user
 */
export async function enforceListingLimits(userId: string): Promise<{
  success: boolean
  hiddenCount?: number
  error?: string
}> {
  try {
    const enforceLimitsRate = await enforceSubscriptionRateLimit({
      namespace: "subscriptions-enforce-listing-limits",
      maxRequests: SUBSCRIPTION_RATE_LIMITS.mutate.maxRequests,
      windowMs: SUBSCRIPTION_RATE_LIMITS.mutate.windowMs,
      userId,
      message: "Too many listing limit enforcement attempts.",
    })

    if (!enforceLimitsRate.success) {
      return { success: false, error: enforceLimitsRate.error }
    }

    // Get user with subscription info and all active listings
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        itemListings: {
          where: {
            status: { in: ["available", "pending"] }
          },
          orderBy: {
            createdAt: "desc" // Most recent first
          }
        }
      }
    })

    if (!user) {
      return { success: false, error: "User not found" }
    }

    // Get current listing limit from system settings
    const limitsResult = await getSubscriptionLimitsFromSettings()
    if (!limitsResult.success || !limitsResult.limits) {
      return { success: false, error: "Failed to get listing limits" }
    }

    // Determine max listings based on subscription tier
    const tier = user.subscriptionTier
    let maxListings = limitsResult.limits.free

    if (tier === "ELITE") {
      maxListings = limitsResult.limits.elite
    } else if (tier === "PRO") {
      maxListings = limitsResult.limits.pro
    }

    const currentListings = user.itemListings
    const excessCount = currentListings.length - maxListings

    // If user is within limits, do nothing
    if (excessCount <= 0) {
      return { success: true, hiddenCount: 0 }
    }

    // Hide excess listings (most recent ones)
    const listingsToHide = currentListings.slice(0, excessCount)
    const hiddenListingIds = listingsToHide.map(l => l.id)

    await prisma.itemListing.updateMany({
      where: {
        id: { in: hiddenListingIds }
      },
      data: {
        status: "hidden"
      }
    })

    // Create notification for user
    await prisma.notification.create({
      data: {
        userId,
        type: "SYSTEM",
        title: "Listings Hidden Due to Subscription Expiration",
        message: `Your subscription has expired and you now have ${currentListings.length} listings, which exceeds your free plan limit of ${maxListings}. We've temporarily hidden ${excessCount} of your most recent listings. Subscribe to a Pro or Elite plan to restore them and list more items!`,
        link: "/subscriptions"
      }
    })

    return { success: true, hiddenCount: excessCount }
  } catch (err) {
    console.error("Failed to enforce listing limits:", err)
    return { success: false, error: "Failed to enforce listing limits" }
  }
}

/**
 * Check and expire subscriptions, then enforce listing limits
 * Should be called periodically (cron job) or on user login
 */
export async function checkAndExpireSubscriptions(userId?: string): Promise<{
  success: boolean
  expiredCount?: number
  error?: string
}> {
  try {
    const expireRate = await enforceSubscriptionRateLimit({
      namespace: "subscriptions-expire-check",
      maxRequests: SUBSCRIPTION_RATE_LIMITS.maintenance.maxRequests,
      windowMs: SUBSCRIPTION_RATE_LIMITS.maintenance.windowMs,
      userId,
      fallback: "subscriptions-expire-check",
      message: "Too many subscription expiration checks.",
    })

    if (!expireRate.success) {
      return { success: false, error: expireRate.error }
    }

    const now = new Date()
    
    // Build where clause
    const whereClause: any = {
      subscriptionStatus: "ACTIVE",
      subscriptionEndsAt: { lte: now },
      subscriptionTier: { not: "FREE" }
    }

    // If userId provided, only check that user
    if (userId) {
      whereClause.id = userId
    }

    // Find all users with expired subscriptions
    const expiredUsers = await prisma.user.findMany({
      where: whereClause,
      select: { id: true, subscriptionTier: true }
    })

    // Update expired subscriptions to FREE
    await prisma.user.updateMany({
      where: whereClause,
      data: {
        subscriptionTier: "FREE",
        subscriptionStatus: "EXPIRED",
        subscriptionEndsAt: null
      }
    })

    // Enforce listing limits for each expired user
    await Promise.all(
      expiredUsers.map(user => enforceListingLimits(user.id))
    )

    return { success: true, expiredCount: expiredUsers.length }
  } catch (err) {
    console.error("Failed to check and expire subscriptions:", err)
    return { success: false, error: "Failed to process subscription expiration" }
  }
}
