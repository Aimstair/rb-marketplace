"use server"

import { prisma } from "@/lib/prisma"
import { auth } from "@/auth"
import { createNotification } from "./notifications"
import { z } from "zod"

// Helper function to get listing details based on type
async function getListingDetails(listingId: string, listingType: string) {
  if (listingType === "ITEM") {
    return await prisma.itemListing.findUnique({
      where: { id: listingId },
      select: {
        id: true,
        sellerId: true,
        status: true,
        price: true,
        title: true,
        stock: true,
      },
    })
  } else if (listingType === "CURRENCY") {
    return await prisma.currencyListing.findUnique({
      where: { id: listingId },
      select: {
        id: true,
        sellerId: true,
        status: true,
        ratePerPeso: true,
        title: true,
        stock: true,
      },
    })
  }
  return null
}

export interface TransactionData {
  id: string
  buyerId: string
  sellerId: string
  buyer: { id: string; username: string }
  seller: { id: string; username: string }
  listing: { id: string; title: string; price: number; image: string }
  price: number
  amount?: number
  status: "PENDING" | "COMPLETED" | "CANCELLED"
  buyerConfirmed: boolean
  sellerConfirmed: boolean
  userVouched: boolean
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
 * Accepts optional conversationId to link the transaction to a conversation
 */
export async function createTransaction(
  listingId: string,
  price: number,
  conversationId?: string,
  listingType: string = "ITEM"
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
    const listing = await getListingDetails(listingId, listingType)

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

    // Check if PENDING transaction already exists
    // Allow creation if existing transactions are COMPLETED or CANCELLED
    const existingPendingTransaction = await (prisma.transaction as any).findFirst({
      where: {
        listingId,
        buyerId: currentUser.id,
        status: "PENDING",
      },
    })

    if (existingPendingTransaction) {
      return {
        success: false,
        error: "You already have a pending transaction for this listing",
      }
    }

    // Create the transaction with optional conversationId
    const transaction = await (prisma.transaction as any).create({
      data: {
        buyerId: currentUser.id,
        sellerId: listing.sellerId,
        listingId,
        price,
        status: "PENDING",
        conversationId: conversationId || undefined,
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
    // Get authenticated user from session
    const session = await auth()
    if (!session?.user?.email) {
      return {
        success: false,
        error: "You must be logged in to view transactions.",
      }
    }

    const currentUser = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true },
    })

    if (!currentUser) {
      return {
        success: false,
        error: "User account not found.",
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
      },
      orderBy: { createdAt: "desc" },
    })

    // Manually fetch listings for each transaction
    const transformedTransactions: TransactionData[] = await Promise.all(
      transactions.map(async (tx: any) => {
        let listing = { id: "", title: "Unknown Item", price: 0, image: "" }

        if (tx.listingId && tx.listingType) {
          if (tx.listingType === "ITEM") {
            const itemListing = await prisma.itemListing.findUnique({
              where: { id: tx.listingId },
              select: { id: true, title: true, price: true, image: true },
            })
            if (itemListing) {
              listing = itemListing
            }
          } else if (tx.listingType === "CURRENCY") {
            const currencyListing = await prisma.currencyListing.findUnique({
              where: { id: tx.listingId },
              select: { id: true, title: true, ratePerPeso: true, image: true },
            })
            if (currencyListing) {
              listing = {
                id: currencyListing.id,
                title: currencyListing.title,
                price: currencyListing.ratePerPeso,
                image: currencyListing.image,
              }
            }
          }
        }

        return {
          id: tx.id,
          buyerId: tx.buyerId,
          sellerId: tx.sellerId,
          buyer: tx.buyer,
          seller: tx.seller,
          listing,
          price: tx.price,
          amount: tx.amount,
          status: tx.status,
          buyerConfirmed: tx.buyerConfirmed,
          sellerConfirmed: tx.sellerConfirmed,
          userVouched: false, // Would need to check Vouch table
          createdAt: tx.createdAt,
          updatedAt: tx.updatedAt,
        }
      })
    )

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
    // Get current authenticated user
    const session = await auth()
    if (!session?.user?.email) {
      return {
        success: false,
        error: "Unauthorized",
      }
    }

    const currentUser = await prisma.user.findUnique({
      where: { email: session.user.email },
    })

    if (!currentUser) {
      return {
        success: false,
        error: "User not found",
      }
    }

    const transaction = await (prisma.transaction as any).findUnique({
      where: { id: transactionId },
      include: {
        buyer: {
          select: { id: true, username: true },
        },
        seller: {
          select: { id: true, username: true },
        },
      },
    })

    if (!transaction) {
      return {
        success: false,
        error: "Transaction not found",
      }
    }

    // Manually fetch listing based on listingType
    let listing = { id: "", title: "Unknown Item", price: 0, image: "" }
    if (transaction.listingId && transaction.listingType) {
      if (transaction.listingType === "ITEM") {
        const itemListing = await prisma.itemListing.findUnique({
          where: { id: transaction.listingId },
          select: { id: true, title: true, price: true, image: true },
        })
        if (itemListing) {
          listing = itemListing
        }
      } else if (transaction.listingType === "CURRENCY") {
        const currencyListing = await prisma.currencyListing.findUnique({
          where: { id: transaction.listingId },
          select: { id: true, title: true, ratePerPeso: true, image: true },
        })
        if (currencyListing) {
          listing = {
            id: currencyListing.id,
            title: currencyListing.title,
            price: currencyListing.ratePerPeso,
            image: currencyListing.image,
          }
        }
      }
    }

    // Check if current user has already vouched for the counterparty (global vouch rule)
    const counterpartyId = transaction.buyerId === currentUser.id ? transaction.sellerId : transaction.buyerId
    const userVouch = await prisma.vouch.findUnique({
      where: {
        fromUserId_toUserId: {
          fromUserId: currentUser.id,
          toUserId: counterpartyId,
        },
      },
    })

    return {
      success: true,
      transaction: {
        id: transaction.id,
        buyerId: transaction.buyerId,
        sellerId: transaction.sellerId,
        buyer: transaction.buyer,
        seller: transaction.seller,
        listing,
        price: transaction.price,
        amount: transaction.amount,
        status: transaction.status,
        buyerConfirmed: transaction.buyerConfirmed,
        sellerConfirmed: transaction.sellerConfirmed,
        userVouched: !!userVouch,
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
 * Get a transaction by listing ID and the other user involved
 * Finds a transaction where the listing matches and participants are current user and otherUserId
 * Covers both viewing angles: (currentUser as buyer, otherUser as seller) OR (otherUser as buyer, currentUser as seller)
 */
export async function getTransactionByPeers(
  listingId: string,
  otherUserId: string
): Promise<{
  success: boolean
  transaction?: TransactionData
  error?: string
}> {
  try {
    if (!listingId || !otherUserId) {
      return {
        success: true,
        transaction: undefined,
      }
    }

    // Get the current authenticated user
    const session = await auth()
    if (!session?.user?.email) {
      return {
        success: true,
        transaction: undefined,
      }
    }

    const currentUser = await prisma.user.findUnique({
      where: { email: session.user.email },
    })

    if (!currentUser) {
      return {
        success: true,
        transaction: undefined,
      }
    }

    // Find transaction where listing matches AND participants are currentUser and otherUserId
    // This covers both viewing angles:
    // (currentUser as buyer, otherUser as seller) OR (otherUser as buyer, currentUser as seller)
    // ALWAYS prioritize PENDING transactions - check for them first
    let transaction = await (prisma.transaction as any).findFirst({
      where: {
        listingId,
        status: "PENDING", // Only look for PENDING transactions
        OR: [
          // Current user is buyer, other user is seller
          {
            buyerId: currentUser.id,
            sellerId: otherUserId,
          },
          // Other user is buyer, current user is seller
          {
            buyerId: otherUserId,
            sellerId: currentUser.id,
          },
        ],
      },
      orderBy: {
        createdAt: 'desc', // Most recent PENDING transaction
      },
      include: {
        buyer: {
          select: { id: true, username: true },
        },
        seller: {
          select: { id: true, username: true },
        },
      },
    })

    // If no PENDING transaction found, fall back to most recent transaction of any status
    if (!transaction) {
      transaction = await (prisma.transaction as any).findFirst({
        where: {
          listingId,
          OR: [
            // Current user is buyer, other user is seller
            {
              buyerId: currentUser.id,
              sellerId: otherUserId,
            },
            // Other user is buyer, current user is seller
            {
              buyerId: otherUserId,
              sellerId: currentUser.id,
            },
          ],
        },
        orderBy: {
          createdAt: 'desc', // Most recent transaction
        },
        include: {
          buyer: {
            select: { id: true, username: true },
          },
          seller: {
            select: { id: true, username: true },
          },
        },
      })
    }

    if (!transaction) {
      return {
        success: true,
        transaction: undefined, // No transaction found (not an error)
      }
    }

    // Check if current user has already vouched for the counterparty (global vouch rule)
    const counterpartyId = transaction.buyerId === currentUser.id ? transaction.sellerId : transaction.buyerId
    const userVouch = await prisma.vouch.findFirst({
      where: {
        fromUserId: currentUser.id,
        toUserId: counterpartyId,
        // No status filter - users can only vouch once, even if invalidated
      },
    })

    // Manually fetch listing data based on listingType
    let listing = null
    if (transaction.listingId && transaction.listingType) {
      try {
        if (transaction.listingType === "ITEM") {
          const itemListing = await prisma.itemListing.findUnique({
            where: { id: transaction.listingId },
            select: { id: true, title: true, price: true, image: true },
          })
          listing = itemListing
        } else if (transaction.listingType === "CURRENCY") {
          const currencyListing = await prisma.currencyListing.findUnique({
            where: { id: transaction.listingId },
            select: { id: true, title: true, ratePerPeso: true, image: true },
          })
          if (currencyListing) {
            listing = {
              id: currencyListing.id,
              title: currencyListing.title,
              price: currencyListing.ratePerPeso,
              image: currencyListing.image,
            }
          }
        }
      } catch (error) {
        console.error(`Failed to fetch listing ${transaction.listingId}:`, error)
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
        listing: listing || { id: transaction.listingId || "", title: "Unknown Item", price: transaction.price, image: "" },
        price: transaction.price,
        amount: transaction.amount,
        status: transaction.status,
        buyerConfirmed: transaction.buyerConfirmed,
        sellerConfirmed: transaction.sellerConfirmed,
        userVouched: !!userVouch,
        createdAt: transaction.createdAt,
        updatedAt: transaction.updatedAt,
      },
    }
  } catch (error) {
    console.error("Error fetching transaction by peers:", error)
    return {
      success: true, // Return success with no transaction rather than error
      transaction: undefined,
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
    // Get the current authenticated user from session
    const session = await auth()
    
    if (!session?.user?.email) {
      return {
        success: false,
        error: "Unauthorized. Please log in to confirm transactions.",
      }
    }

    const currentUser = await prisma.user.findUnique({
      where: { email: session.user.email },
    })

    if (!currentUser) {
      return {
        success: false,
        error: "User not found. Please contact support.",
      }
    }

    // Find the transaction with amount field
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
      },
    })

    // Check if both have confirmed
    if (updatedTransaction.buyerConfirmed && updatedTransaction.sellerConfirmed) {
      // Update transaction status to COMPLETED
      const completedTransaction = await (prisma.transaction as any).update({
        where: { id: transactionId },
        data: { status: "COMPLETED" },
        include: {
          buyer: { select: { id: true, username: true } },
          seller: { select: { id: true, username: true } },
        },
      })

      // Update listing stock and status
      const listingDetails = await getListingDetails(completedTransaction.listingId, completedTransaction.listingType)

      if (listingDetails) {
        // Deduct transaction amount (or 1 if amount not specified)
        const deductedAmount = transaction.amount || 1
        const newStock = Math.max(0, listingDetails.stock - deductedAmount)
        
        // Only mark as sold if stock is <= 0, otherwise keep available
        const newListingStatus = newStock <= 0 ? "sold" : "available"
        
        // Update listing with new stock
        if (completedTransaction.listingType === "ITEM") {
          await prisma.itemListing.update({
            where: { id: completedTransaction.listingId },
            data: { 
              stock: newStock,
              status: newListingStatus,
            },
          })
        } else if (completedTransaction.listingType === "CURRENCY") {
          await prisma.currencyListing.update({
            where: { id: completedTransaction.listingId },
            data: { 
              stock: newStock,
              status: newListingStatus,
            },
          })
        }
      }

      // Auto-decline all pending counteroffers for other conversations on this listing
      console.log("[toggleTransactionConfirmation] Auto-declining pending offers for listing:", completedTransaction.listingId)
      
      // Find all conversations for this listing (excluding the current one)
      const otherConversations = await prisma.conversation.findMany({
        where: {
          listingId: completedTransaction.listingId,
          NOT: {
            AND: [
              { buyerId: completedTransaction.buyerId },
              { sellerId: completedTransaction.sellerId },
            ],
          },
        },
      })

      // For each conversation, find and decline pending offers
      for (const conv of otherConversations) {
        const pendingOffers = await prisma.message.findMany({
          where: {
            conversationId: conv.id,
            offerAmount: { not: null },
            offerStatus: "pending",
          },
        })

        // Update all pending offers to declined
        for (const offer of pendingOffers) {
          await prisma.message.update({
            where: { id: offer.id },
            data: { offerStatus: "declined" },
          })
          console.log("[toggleTransactionConfirmation] Declined offer:", offer.id)
        }
      }

      // Manually fetch listing data for notifications and return
      const completedListingDetails = await getListingDetails(completedTransaction.listingId, completedTransaction.listingType)
      const completedListingTitle = completedListingDetails?.title || "this item"

      // Create notification to both parties about completion
      await createNotification(
        completedTransaction.buyerId,
        "ORDER_UPDATE",
        "Transaction completed!",
        `Your transaction for ${completedListingTitle} has been completed by both parties.`,
        `/my-transactions`
      ).catch((error) => {
        console.error("Failed to create completion notification for buyer:", error)
      })

      await createNotification(
        completedTransaction.sellerId,
        "ORDER_UPDATE",
        "Transaction completed!",
        `Your transaction for ${completedListingTitle} has been completed by both parties.`,
        `/my-transactions`
      ).catch((error) => {
        console.error("Failed to create completion notification for seller:", error)
      })

      // Fetch full listing data for return
      let completedListing = null
      if (completedTransaction.listingId && completedTransaction.listingType) {
        try {
          if (completedTransaction.listingType === "ITEM") {
            const itemListing = await prisma.itemListing.findUnique({
              where: { id: completedTransaction.listingId },
              select: { id: true, title: true, price: true, image: true },
            })
            completedListing = itemListing
          } else if (completedTransaction.listingType === "CURRENCY") {
            const currencyListing = await prisma.currencyListing.findUnique({
              where: { id: completedTransaction.listingId },
              select: { id: true, title: true, ratePerPeso: true, image: true },
            })
            if (currencyListing) {
              completedListing = {
                id: currencyListing.id,
                title: currencyListing.title,
                price: currencyListing.ratePerPeso,
                image: currencyListing.image,
              }
            }
          }
        } catch (error) {
          console.error(`Failed to fetch listing ${completedTransaction.listingId}:`, error)
        }
      }

      // Check if current user has vouched
      const userVouch = await prisma.vouch.findFirst({
        where: {
          transactionId,
          fromUserId: currentUser.id,
          // No status filter - users can only vouch once, even if invalidated
        },
      })

      return {
        success: true,
        transaction: {
          id: completedTransaction.id,
          buyerId: completedTransaction.buyerId,
          sellerId: completedTransaction.sellerId,
          buyer: completedTransaction.buyer,
          seller: completedTransaction.seller,
          listing: completedListing || { id: completedTransaction.listingId || "", title: completedListingTitle, price: completedTransaction.price, image: "" },
          price: completedTransaction.price,
          amount: completedTransaction.amount,
          status: completedTransaction.status,
          buyerConfirmed: completedTransaction.buyerConfirmed,
          sellerConfirmed: completedTransaction.sellerConfirmed,
          userVouched: !!userVouch,
          createdAt: completedTransaction.createdAt,
          updatedAt: completedTransaction.updatedAt,
        },
      }
    } else {
      // Create notification for the counterparty about the confirmation
      const counterpartyId = isBuyer ? updatedTransaction.sellerId : updatedTransaction.buyerId
      const confirmer = isBuyer ? "Buyer" : "Seller"

      // Fetch listing for notification
      const updatedListingDetails = await getListingDetails(updatedTransaction.listingId, updatedTransaction.listingType)
      const updatedListingTitle = updatedListingDetails?.title || "this item"

      await createNotification(
        counterpartyId,
        "ORDER_UPDATE",
        `${confirmer} confirmed the transaction`,
        `The ${confirmer.toLowerCase()} has confirmed the transaction for ${updatedListingTitle}.`,
        `/my-transactions`
      ).catch((error) => {
        console.error("Failed to create confirmation notification:", error)
      })

      // Fetch full listing data for return
      let updatedListing = null
      if (updatedTransaction.listingId && updatedTransaction.listingType) {
        try {
          if (updatedTransaction.listingType === "ITEM") {
            const itemListing = await prisma.itemListing.findUnique({
              where: { id: updatedTransaction.listingId },
              select: { id: true, title: true, price: true, image: true },
            })
            updatedListing = itemListing
          } else if (updatedTransaction.listingType === "CURRENCY") {
            const currencyListing = await prisma.currencyListing.findUnique({
              where: { id: updatedTransaction.listingId },
              select: { id: true, title: true, ratePerPeso: true, image: true },
            })
            if (currencyListing) {
              updatedListing = {
                id: currencyListing.id,
                title: currencyListing.title,
                price: currencyListing.ratePerPeso,
                image: currencyListing.image,
              }
            }
          }
        } catch (error) {
          console.error(`Failed to fetch listing ${updatedTransaction.listingId}:`, error)
        }
      }

      // Check if current user has vouched
      const userVouch = await prisma.vouch.findFirst({
        where: {
          transactionId,
          fromUserId: currentUser.id,
          // No status filter - users can only vouch once, even if invalidated
        },
      })

      return {
        success: true,
        transaction: {
          id: updatedTransaction.id,
          buyerId: updatedTransaction.buyerId,
          sellerId: updatedTransaction.sellerId,
          buyer: updatedTransaction.buyer,
          seller: updatedTransaction.seller,
          listing: updatedListing || { id: updatedTransaction.listingId || "", title: updatedListingTitle, price: updatedTransaction.price, image: "" },
          price: updatedTransaction.price,
          amount: updatedTransaction.amount,
          status: updatedTransaction.status,
          buyerConfirmed: updatedTransaction.buyerConfirmed,
          sellerConfirmed: updatedTransaction.sellerConfirmed,
          userVouched: !!userVouch,
          createdAt: updatedTransaction.createdAt,
          updatedAt: updatedTransaction.updatedAt,
        },
      }
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

    // Get the current authenticated user from session
    const session = await auth()
    
    if (!session?.user?.email) {
      return {
        success: false,
        error: "Unauthorized. Please log in to submit vouches.",
      }
    }

    const currentUser = await prisma.user.findUnique({
      where: { email: session.user.email },
    })

    if (!currentUser) {
      return {
        success: false,
        error: "User not found. Please contact support.",
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

    // Check if vouch already exists (check any vouch, even if invalidated)
    const existingVouch = await prisma.vouch.findFirst({
      where: {
        fromUserId: currentUser.id,
        toUserId: vouchToUserId,
        // No status filter - users can only vouch once per person, ever
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
        status: "VALID", // Set default status for new vouches
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
