"use server"

import { prisma } from "@/lib/prisma"
import { createNotification } from "./notifications"
import { z } from "zod"

export interface TransactionData {
  id: string
  buyerId: string
  sellerId: string
  buyer: { id: string; username: string }
  seller: { id: string; username: string }
  listing: { id: string; title: string; price: number; image: string }
  price: number
  status: "PENDING" | "COMPLETED" | "CANCELLED"
  buyerConfirmed: boolean
  sellerConfirmed: boolean
  createdAt: Date
  updatedAt: Date
}

export interface GetTransactionsResult {
  success: boolean
  transactions?: TransactionData[]
  error?: string
}

export interface CreateTransactionResult {
  success: boolean
  transactionId?: string
  error?: string
}

export interface ToggleConfirmationResult {
  success: boolean
  transaction?: TransactionData
  error?: string
}

export interface SubmitVouchResult {
  success: boolean
  vouchId?: string
  error?: string
}

/**
 * Create a new transaction for a listing
 * Current user becomes the buyer, listing owner becomes the seller
 */
export async function createTransaction(
  listingId: string,
  price: number
): Promise<CreateTransactionResult> {
  try {
    // Get the current user (placeholder - first user in DB)
    const currentUser = await prisma.user.findFirst({
      where: { role: "user" },
    })

    if (!currentUser) {
      return {
        success: false,
        error: "No user found. Please contact support.",
      }
    }

    // Find the listing and verify it exists
    const listing = await prisma.listing.findUnique({
      where: { id: listingId },
      select: { id: true, sellerId: true, status: true },
    })

    if (!listing) {
      return {
        success: false,
        error: "Listing not found",
      }
    }

    // Prevent user from buying their own listing
    if (listing.sellerId === currentUser.id) {
      return {
        success: false,
        error: "Cannot buy your own listing",
      }
    }

    // Check if listing is still available
    if (listing.status !== "available") {
      return {
        success: false,
        error: "This listing is no longer available",
      }
    }

    // Check if transaction already exists
    const existingTransaction = await (prisma.transaction as any).findFirst({
      where: {
        listingId,
        buyerId: currentUser.id,
        status: { in: ["PENDING", "COMPLETED"] },
      },
    })

    if (existingTransaction) {
      return {
        success: false,
        error: "You already have an active transaction for this listing",
      }
    }

    // Create the transaction
    const transaction = await (prisma.transaction as any).create({
      data: {
        buyerId: currentUser.id,
        sellerId: listing.sellerId,
        listingId,
        price,
        status: "PENDING",
      },
    })

    // Create notification for seller
    await createNotification(
      listing.sellerId,
      "ORDER_NEW",
      `New order from ${currentUser.id}`,
      `Someone wants to buy your listing for ${price} Robux`,
      `/my-transactions`
    ).catch((error) => {
      console.error("Failed to create ORDER_NEW notification:", error)
      // Don't fail the transaction creation if notification fails
    })

    return {
      success: true,
      transactionId: transaction.id,
    }
  } catch (error) {
    console.error("Error creating transaction:", error)
    return {
      success: false,
      error: "Failed to create transaction",
    }
  }
}

/**
 * Get all transactions for the current user
 * Can filter by role: "buyer" or "seller"
 */
export async function getTransactions(
  role?: "buyer" | "seller"
): Promise<GetTransactionsResult> {
  try {
    // Get the current user (placeholder - first user in DB)
    const currentUser = await prisma.user.findFirst({
      where: { role: "user" },
    })

    if (!currentUser) {
      return {
        success: false,
        error: "No user found. Please contact support.",
      }
    }

    // Build where clause based on role
    let whereClause: any = {
      OR: [{ buyerId: currentUser.id }, { sellerId: currentUser.id }],
    }

    if (role === "buyer") {
      whereClause = { buyerId: currentUser.id }
    } else if (role === "seller") {
      whereClause = { sellerId: currentUser.id }
    }

    // Fetch transactions
    const transactions = await (prisma.transaction as any).findMany({
      where: whereClause,
      include: {
        buyer: {
          select: { id: true, username: true },
        },
        seller: {
          select: { id: true, username: true },
        },
        listing: {
          select: { id: true, title: true, price: true, image: true },
        },
      },
      orderBy: { createdAt: "desc" },
    })

    // Transform to response format
    const transformedTransactions: TransactionData[] = transactions.map((tx: any) => ({
      id: tx.id,
      buyerId: tx.buyerId,
      sellerId: tx.sellerId,
      buyer: tx.buyer,
      seller: tx.seller,
      listing: tx.listing,
      price: tx.price,
      status: tx.status,
      buyerConfirmed: tx.buyerConfirmed,
      sellerConfirmed: tx.sellerConfirmed,
      createdAt: tx.createdAt,
      updatedAt: tx.updatedAt,
    }))

    return {
      success: true,
      transactions: transformedTransactions,
    }
  } catch (error) {
    console.error("Error fetching transactions:", error)
    return {
      success: false,
      error: "Failed to fetch transactions",
    }
  }
}

/**
 * Get a single transaction by ID
 */
export async function getTransactionById(transactionId: string): Promise<{
  success: boolean
  transaction?: TransactionData
  error?: string
}> {
  try {
    const transaction = await (prisma.transaction as any).findUnique({
      where: { id: transactionId },
      include: {
        buyer: {
          select: { id: true, username: true },
        },
        seller: {
          select: { id: true, username: true },
        },
        listing: {
          select: { id: true, title: true, price: true, image: true },
        },
      },
    })

    if (!transaction) {
      return {
        success: false,
        error: "Transaction not found",
      }
    }

    return {
      success: true,
      transaction: {
        id: transaction.id,
        buyerId: transaction.buyerId,
        sellerId: transaction.sellerId,
        buyer: transaction.buyer,
        seller: transaction.seller,
        listing: transaction.listing,
        price: transaction.price,
        status: transaction.status,
        buyerConfirmed: transaction.buyerConfirmed,
        sellerConfirmed: transaction.sellerConfirmed,
        createdAt: transaction.createdAt,
        updatedAt: transaction.updatedAt,
      },
    }
  } catch (error) {
    console.error("Error fetching transaction:", error)
    return {
      success: false,
      error: "Failed to fetch transaction",
    }
  }
}

/**
 * Toggle confirmation status for a transaction
 * Buyer or seller confirms their part of the transaction
 * If both confirm, status automatically becomes COMPLETED and listing becomes sold
 */
export async function toggleTransactionConfirmation(
  transactionId: string
): Promise<ToggleConfirmationResult> {
  try {
    // Get the current user (placeholder - first user in DB)
    const currentUser = await prisma.user.findFirst({
      where: { role: "user" },
    })

    if (!currentUser) {
      return {
        success: false,
        error: "No user found. Please contact support.",
      }
    }

    // Find the transaction
    const transaction = await (prisma.transaction as any).findUnique({
      where: { id: transactionId },
    })

    if (!transaction) {
      return {
        success: false,
        error: "Transaction not found",
      }
    }

    // Verify user is part of the transaction
    if (
      transaction.buyerId !== currentUser.id &&
      transaction.sellerId !== currentUser.id
    ) {
      return {
        success: false,
        error: "You don't have access to this transaction",
      }
    }

    // Determine which confirmation flag to toggle
    const isBuyer = transaction.buyerId === currentUser.id
    const updateData: any = {}

    if (isBuyer) {
      updateData.buyerConfirmed = !transaction.buyerConfirmed
    } else {
      updateData.sellerConfirmed = !transaction.sellerConfirmed
    }

    // Update transaction
    const updatedTransaction = await (prisma.transaction as any).update({
      where: { id: transactionId },
      data: updateData,
      include: {
        buyer: { select: { id: true, username: true } },
        seller: { select: { id: true, username: true } },
        listing: { select: { id: true, title: true, price: true, image: true } },
      },
    })

    // Check if both have confirmed
    if (updatedTransaction.buyerConfirmed && updatedTransaction.sellerConfirmed) {
      // Update transaction status to COMPLETED
      const completedTransaction = await (prisma.transaction as any).update({
        where: { id: transactionId },
        data: { status: "COMPLETED" },
      })

      // Update listing status to sold
      await prisma.listing.update({
        where: { id: updatedTransaction.listingId },
        data: { status: "sold" },
      })

      // Create notification to both parties about completion
      await createNotification(
        updatedTransaction.buyerId,
        "ORDER_UPDATE",
        "Transaction completed!",
        `Your transaction for ${updatedTransaction.listing.title} has been completed by both parties.`,
        `/my-transactions`
      ).catch((error) => {
        console.error("Failed to create completion notification for buyer:", error)
      })

      await createNotification(
        updatedTransaction.sellerId,
        "ORDER_UPDATE",
        "Transaction completed!",
        `Your transaction for ${updatedTransaction.listing.title} has been completed by both parties.`,
        `/my-transactions`
      ).catch((error) => {
        console.error("Failed to create completion notification for seller:", error)
      })
    } else {
      // Create notification for the counterparty about the confirmation
      const counterpartyId = isBuyer ? updatedTransaction.sellerId : updatedTransaction.buyerId
      const confirmer = isBuyer ? "Buyer" : "Seller"

      await createNotification(
        counterpartyId,
        "ORDER_UPDATE",
        `${confirmer} confirmed the transaction`,
        `The ${confirmer.toLowerCase()} has confirmed the transaction for ${updatedTransaction.listing.title}.`,
        `/my-transactions`
      ).catch((error) => {
        console.error("Failed to create confirmation notification:", error)
      })
    }

    return {
      success: true,
      transaction: {
        id: updatedTransaction.id,
        buyerId: updatedTransaction.buyerId,
        sellerId: updatedTransaction.sellerId,
        buyer: updatedTransaction.buyer,
        seller: updatedTransaction.seller,
        listing: updatedTransaction.listing,
        price: updatedTransaction.price,
        status: updatedTransaction.status,
        buyerConfirmed: updatedTransaction.buyerConfirmed,
        sellerConfirmed: updatedTransaction.sellerConfirmed,
        createdAt: updatedTransaction.createdAt,
        updatedAt: updatedTransaction.updatedAt,
      },
    }
  } catch (error) {
    console.error("Error toggling transaction confirmation:", error)
    return {
      success: false,
      error: "Failed to update transaction confirmation",
    }
  }
}

/**
 * Submit a vouch for a user related to a transaction
 */
export async function submitVouch(
  transactionId: string,
  rating: number,
  comment?: string
): Promise<SubmitVouchResult> {
  try {
    // Validate rating
    if (rating < 1 || rating > 5 || !Number.isInteger(rating)) {
      return {
        success: false,
        error: "Rating must be between 1 and 5",
      }
    }

    // Get the current user (placeholder - first user in DB)
    const currentUser = await prisma.user.findFirst({
      where: { role: "user" },
    })

    if (!currentUser) {
      return {
        success: false,
        error: "No user found. Please contact support.",
      }
    }

    // Find the transaction
    const transaction = await (prisma.transaction as any).findUnique({
      where: { id: transactionId },
    })

    if (!transaction) {
      return {
        success: false,
        error: "Transaction not found",
      }
    }

    // Verify user is part of the transaction
    if (
      transaction.buyerId !== currentUser.id &&
      transaction.sellerId !== currentUser.id
    ) {
      return {
        success: false,
        error: "You don't have access to this transaction",
      }
    }

    // Verify transaction is completed
    if (transaction.status !== "COMPLETED") {
      return {
        success: false,
        error: "Can only vouch for completed transactions",
      }
    }

    // Determine who to vouch for
    const vouchToUserId =
      transaction.buyerId === currentUser.id
        ? transaction.sellerId
        : transaction.buyerId
    const vouchType =
      transaction.buyerId === currentUser.id ? "seller" : "buyer"

    // Check if vouch already exists
    const existingVouch = await prisma.vouch.findUnique({
      where: {
        fromUserId_toUserId: {
          fromUserId: currentUser.id,
          toUserId: vouchToUserId,
        },
      },
    })

    if (existingVouch) {
      return {
        success: false,
        error: "You have already vouched for this user",
      }
    }

    // Create the vouch
    const vouch = await (prisma.vouch as any).create({
      data: {
        fromUserId: currentUser.id,
        toUserId: vouchToUserId,
        transactionId,
        type: vouchType,
        message: comment,
        rating,
      },
    })

    return {
      success: true,
      vouchId: vouch.id,
    }
  } catch (error) {
    console.error("Error submitting vouch:", error)
    return {
      success: false,
      error: "Failed to submit vouch",
    }
  }
}

/**
 * Cancel a transaction
 */
export async function cancelTransaction(transactionId: string): Promise<{
  success: boolean
  error?: string
}> {
  try {
    // Get the current user (placeholder)
    const currentUser = await prisma.user.findFirst({
      where: { role: "user" },
    })

    if (!currentUser) {
      return {
        success: false,
        error: "No user found",
      }
    }

    // Find the transaction
    const transaction = await (prisma.transaction as any).findUnique({
      where: { id: transactionId },
    })

    if (!transaction) {
      return {
        success: false,
        error: "Transaction not found",
      }
    }

    // Verify user is part of the transaction
    if (
      transaction.buyerId !== currentUser.id &&
      transaction.sellerId !== currentUser.id
    ) {
      return {
        success: false,
        error: "You don't have access to this transaction",
      }
    }

    // Can only cancel pending transactions
    if (transaction.status !== "PENDING") {
      return {
        success: false,
        error: "Can only cancel pending transactions",
      }
    }

    // Cancel the transaction
    await (prisma.transaction as any).update({
      where: { id: transactionId },
      data: { status: "CANCELLED" },
    })

    return {
      success: true,
    }
  } catch (error) {
    console.error("Error cancelling transaction:", error)
    return {
      success: false,
      error: "Failed to cancel transaction",
    }
  }
}
