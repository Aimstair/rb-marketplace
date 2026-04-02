// @ts-nocheck
"use server"

import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { headers } from "next/headers"
import { checkRateLimit, getRateLimitIdentifier } from "@/lib/rate-limit"

const ONE_MINUTE_MS = 60 * 1000
const ONE_HOUR_MS = 60 * ONE_MINUTE_MS

const ADMIN_CURRENCY_RATE_LIMITS = {
  read: { maxRequests: 80, windowMs: ONE_MINUTE_MS },
  mutate: { maxRequests: 40, windowMs: ONE_HOUR_MS },
} as const

async function enforceAdminCurrencyRateLimit(params: {
  namespace: string
  maxRequests: number
  windowMs: number
  fallback: string
  message: string
}): Promise<{ success: true } | { success: false; error: string }> {
  const requestHeaders = await headers()
  const rate = await checkRateLimit(
    getRateLimitIdentifier({ headers: requestHeaders, fallback: params.fallback }),
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

// Check if user is admin
async function isAdmin() {
  const session = await auth()
  if (!session?.user || session.user.role !== "admin") {
    return false
  }
  return true
}

// Calculate risk score based on user data
function calculateRiskScore(user: any, isNewAccount: boolean): number {
  let score = 0

  // Account age (0-30 points)
  const accountAge = Date.now() - new Date(user.createdAt).getTime()
  const daysOld = accountAge / (1000 * 60 * 60 * 24)
  if (daysOld < 7) score += 30
  else if (daysOld < 30) score += 20
  else if (daysOld < 90) score += 10

  // Vouches (0-20 points - fewer vouches = higher risk)
  const vouchCount = user._count?.vouchesReceived || 0
  if (vouchCount === 0) score += 20
  else if (vouchCount < 5) score += 15
  else if (vouchCount < 10) score += 10
  else if (vouchCount < 20) score += 5

  // Reports (0-30 points)
  const reportCount = user._count?.userReportsReceived?.filter((r: any) => r.status === "RESOLVED").length || 0
  if (reportCount > 5) score += 30
  else if (reportCount > 2) score += 20
  else if (reportCount > 0) score += 10

  // Banned status (50 points)
  if (user.isBanned) score += 50

  // Verification (reduce risk)
  if (user.isVerified) score -= 10

  return Math.min(100, Math.max(0, score))
}

export async function getCurrencyTrades(filters?: {
  search?: string
  status?: string
}) {
  try {
    const tradesRate = await enforceAdminCurrencyRateLimit({
      namespace: "admin-currency-trades",
      maxRequests: ADMIN_CURRENCY_RATE_LIMITS.read.maxRequests,
      windowMs: ADMIN_CURRENCY_RATE_LIMITS.read.windowMs,
      fallback: "admin-currency-trades",
      message: "Too many currency trade requests.",
    })

    if (!tradesRate.success) {
      return { success: false, error: tradesRate.error }
    }

    if (!(await isAdmin())) {
      return { success: false, error: "Unauthorized" }
    }

    const where: any = {
      listingType: "CURRENCY"
    }

    if (filters?.status && filters.status !== "all") {
      where.status = filters.status.toUpperCase()
    }

    // Get transactions
    const transactions = await prisma.transaction.findMany({
      where,
      include: {
        buyer: {
          select: {
            id: true,
            username: true,
            profilePicture: true,
            createdAt: true,
            isVerified: true,
            isBanned: true,
            _count: {
              select: {
                vouchesReceived: {
                  where: { status: "VALID" },
                },
                userReportsReceived: {
                  where: { status: "RESOLVED" }
                }
              }
            }
          }
        },
        seller: {
          select: {
            id: true,
            username: true,
            profilePicture: true,
            createdAt: true,
            isVerified: true,
            isBanned: true,
            _count: {
              select: {
                vouchesReceived: {
                  where: { status: "VALID" },
                },
                userReportsReceived: {
                  where: { status: "RESOLVED" }
                }
              }
            }
          }
        },
        dispute: {
          include: {
            reporter: {
              select: {
                id: true,
                username: true
              }
            }
          }
        },
        conversation: {
          include: {
            messages: {
              orderBy: { createdAt: "asc" },
              take: 50,
              select: {
                id: true,
                content: true,
                senderId: true,
                createdAt: true
              }
            }
          }
        }
      },
      orderBy: { createdAt: "desc" },
      take: 100
    })

    // Apply search filter if provided
    let filteredTransactions = transactions
    if (filters?.search) {
      const searchLower = filters.search.toLowerCase()
      filteredTransactions = transactions.filter(
        t => 
          t.buyer.username.toLowerCase().includes(searchLower) ||
          t.seller.username.toLowerCase().includes(searchLower)
      )
    }

    // Format transactions with risk scores and flags
    const formattedTrades = filteredTransactions.map(transaction => {
      const sellerRiskScore = calculateRiskScore(transaction.seller, false)
      const buyerRiskScore = calculateRiskScore(transaction.buyer, false)

      // Generate flags
      const flags: string[] = []
      
      // High value (over 50k Robux worth)
      if ((transaction.totalPrice || transaction.price) > 15000) {
        flags.push("high-value")
      }

      // New seller
      const sellerAge = Date.now() - new Date(transaction.seller.createdAt).getTime()
      if (sellerAge < 7 * 24 * 60 * 60 * 1000) {
        flags.push("new-seller")
      }

      // High risk
      if (sellerRiskScore > 70 || buyerRiskScore > 70) {
        flags.push("high-risk-user")
      }

      // Suspicious rate (too good to be true)
      const rate = transaction.pricePerUnit || 0.35
      if (rate < 0.25) {
        flags.push("suspicious-rate")
      }

      // Has dispute
      if (transaction.dispute) {
        flags.push("dispute-filed")
      }

      // Format messages for chat history
      const chatHistory = transaction.conversation?.messages.map(msg => ({
        sender: msg.senderId === transaction.buyerId ? "buyer" : "seller",
        message: msg.content,
        time: new Date(msg.createdAt).toLocaleTimeString()
      })) || []

      return {
        id: transaction.id,
        seller: {
          id: transaction.seller.id,
          username: transaction.seller.username,
          avatar: transaction.seller.profilePicture,
          vouches: transaction.seller._count.vouchesReceived,
          joinDate: new Date(transaction.seller.createdAt).toLocaleDateString("en-US", { 
            month: "short", 
            year: "numeric" 
          }),
          riskScore: sellerRiskScore
        },
        buyer: {
          id: transaction.buyer.id,
          username: transaction.buyer.username,
          avatar: transaction.buyer.profilePicture,
          vouches: transaction.buyer._count.vouchesReceived,
          joinDate: new Date(transaction.buyer.createdAt).toLocaleDateString("en-US", { 
            month: "short", 
            year: "numeric" 
          }),
          riskScore: buyerRiskScore
        },
        amount: transaction.amount || 0,
        price: transaction.totalPrice || transaction.price,
        rate: transaction.pricePerUnit || 0.35,
        status: transaction.status.toLowerCase(),
        createdAt: getTimeAgo(transaction.createdAt),
        flags,
        chatHistory,
        dispute: transaction.dispute ? {
          reason: transaction.dispute.reason,
          filedBy: transaction.dispute.reporter.username,
          evidence: transaction.dispute.evidence ? 
            JSON.parse(transaction.dispute.evidence as string) : []
        } : undefined
      }
    })

    // Calculate stats
    const stats = {
      total: formattedTrades.length,
      completed: formattedTrades.filter(t => t.status === "completed").length,
      pending: formattedTrades.filter(t => t.status === "pending").length,
      flagged: formattedTrades.filter(t => t.flags.length > 0 && t.status !== "completed").length,
      disputed: formattedTrades.filter(t => t.dispute).length,
      totalVolume: formattedTrades.reduce((acc, t) => acc + t.amount, 0)
    }

    // Get high value alerts
    const highValueAlerts = formattedTrades
      .filter(t => 
        (t.flags.includes("high-value") || t.seller.riskScore > 80) &&
        t.status !== "completed"
      )
      .slice(0, 5)
      .map(t => ({
        id: t.id,
        user: t.seller.username,
        amount: t.amount,
        riskScore: t.seller.riskScore,
        reason: t.seller.riskScore > 80 ? 
          "High risk seller with large transaction" : 
          "New account selling large amount"
      }))

    return {
      success: true,
      trades: formattedTrades,
      stats,
      highValueAlerts
    }
  } catch (error) {
    console.error("Failed to get currency trades:", error)
    return { success: false, error: "Failed to load trades" }
  }
}

export async function approveTransaction(transactionId: string, notes?: string) {
  try {
    const approveRate = await enforceAdminCurrencyRateLimit({
      namespace: "admin-currency-approve-transaction",
      maxRequests: ADMIN_CURRENCY_RATE_LIMITS.mutate.maxRequests,
      windowMs: ADMIN_CURRENCY_RATE_LIMITS.mutate.windowMs,
      fallback: "admin-currency-approve-transaction",
      message: "Too many approve transaction attempts.",
    })

    if (!approveRate.success) {
      return { success: false, error: approveRate.error }
    }

    if (!(await isAdmin())) {
      return { success: false, error: "Unauthorized" }
    }

    // Update transaction status
    await prisma.transaction.update({
      where: { id: transactionId },
      data: { 
        status: "COMPLETED",
        buyerConfirmed: true,
        sellerConfirmed: true
      }
    })

    // Create audit log
    const session = await auth()
    await prisma.auditLog.create({
      data: {
        userId: session?.user?.id || "",
        action: "APPROVE_TRANSACTION",
        targetId: transactionId,
        targetType: "TRANSACTION",
        details: notes || "Transaction approved by admin",
        ipAddress: "admin-panel",
        userAgent: "admin-panel"
      }
    })

    return { success: true }
  } catch (error) {
    console.error("Failed to approve transaction:", error)
    return { success: false, error: "Failed to approve transaction" }
  }
}

export async function cancelTransaction(transactionId: string, notes?: string) {
  try {
    const cancelRate = await enforceAdminCurrencyRateLimit({
      namespace: "admin-currency-cancel-transaction",
      maxRequests: ADMIN_CURRENCY_RATE_LIMITS.mutate.maxRequests,
      windowMs: ADMIN_CURRENCY_RATE_LIMITS.mutate.windowMs,
      fallback: "admin-currency-cancel-transaction",
      message: "Too many cancel transaction attempts.",
    })

    if (!cancelRate.success) {
      return { success: false, error: cancelRate.error }
    }

    if (!(await isAdmin())) {
      return { success: false, error: "Unauthorized" }
    }

    // Update transaction status
    await prisma.transaction.update({
      where: { id: transactionId },
      data: { status: "CANCELLED" }
    })

    // Create audit log
    const session = await auth()
    await prisma.auditLog.create({
      data: {
        userId: session?.user?.id || "",
        action: "CANCEL_TRANSACTION",
        targetId: transactionId,
        targetType: "TRANSACTION",
        details: notes || "Transaction cancelled by admin",
        ipAddress: "admin-panel",
        userAgent: "admin-panel"
      }
    })

    return { success: true }
  } catch (error) {
    console.error("Failed to cancel transaction:", error)
    return { success: false, error: "Failed to cancel transaction" }
  }
}

export async function resolveDispute(
  transactionId: string, 
  resolution: "approve" | "cancel", 
  notes: string
) {
  try {
    const disputeRate = await enforceAdminCurrencyRateLimit({
      namespace: "admin-currency-resolve-dispute",
      maxRequests: ADMIN_CURRENCY_RATE_LIMITS.mutate.maxRequests,
      windowMs: ADMIN_CURRENCY_RATE_LIMITS.mutate.windowMs,
      fallback: "admin-currency-resolve-dispute",
      message: "Too many dispute resolution attempts.",
    })

    if (!disputeRate.success) {
      return { success: false, error: disputeRate.error }
    }

    if (!(await isAdmin())) {
      return { success: false, error: "Unauthorized" }
    }

    const transaction = await prisma.transaction.findUnique({
      where: { id: transactionId },
      include: { dispute: true }
    })

    if (!transaction?.dispute) {
      return { success: false, error: "No dispute found" }
    }

    // Update dispute status
    await prisma.dispute.update({
      where: { id: transaction.dispute.id },
      data: {
        status: "RESOLVED",
        resolution: notes,
        resolvedAt: new Date()
      }
    })

    // Update transaction based on resolution
    if (resolution === "approve") {
      await approveTransaction(transactionId, `Dispute resolved: ${notes}`)
    } else {
      await cancelTransaction(transactionId, `Dispute resolved: ${notes}`)
    }

    return { success: true }
  } catch (error) {
    console.error("Failed to resolve dispute:", error)
    return { success: false, error: "Failed to resolve dispute" }
  }
}

export async function getPriceHistory() {
  try {
    const historyRate = await enforceAdminCurrencyRateLimit({
      namespace: "admin-currency-price-history",
      maxRequests: ADMIN_CURRENCY_RATE_LIMITS.read.maxRequests,
      windowMs: ADMIN_CURRENCY_RATE_LIMITS.read.windowMs,
      fallback: "admin-currency-price-history",
      message: "Too many price history requests.",
    })

    if (!historyRate.success) {
      return { success: false, error: historyRate.error }
    }

    if (!(await isAdmin())) {
      return { success: false, error: "Unauthorized" }
    }

    // Get last 7 days of completed transactions
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

    const transactions = await prisma.transaction.findMany({
      where: {
        listingType: "CURRENCY",
        status: "COMPLETED",
        createdAt: { gte: sevenDaysAgo }
      },
      select: {
        pricePerUnit: true,
        createdAt: true
      },
      orderBy: { createdAt: "asc" }
    })

    // Group by day and calculate average
    const dayMap = new Map<string, number[]>()
    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
    
    transactions.forEach(t => {
      const day = days[new Date(t.createdAt).getDay()]
      if (!dayMap.has(day)) {
        dayMap.set(day, [])
      }
      dayMap.get(day)!.push(t.pricePerUnit || 0.35)
    })

    const priceHistory = Array.from(dayMap.entries()).map(([day, rates]) => ({
      date: day,
      rate: rates.reduce((a, b) => a + b, 0) / rates.length
    }))

    return { success: true, priceHistory }
  } catch (error) {
    console.error("Failed to get price history:", error)
    return { success: false, error: "Failed to load price history" }
  }
}

function getTimeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000)
  
  if (seconds < 60) return "just now"
  if (seconds < 3600) return `${Math.floor(seconds / 60)} min ago`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`
  if (seconds < 604800) return `${Math.floor(seconds / 86400)} days ago`
  
  return new Date(date).toLocaleDateString()
}
