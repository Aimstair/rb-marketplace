"use server"

import { prisma } from "@/lib/prisma"
import { auth } from "@/auth"

/**
 * Toggle listing status between available and hidden
 */
export async function toggleListingStatus(
  listingId: string,
  newStatus: "available" | "hidden",
  listingType: "Item" | "Currency",
): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await auth()
    if (!session?.user?.email) {
      return {
        success: false,
        error: "You must be logged in to update listings",
      }
    }

    // Get the listing with seller info based on listing type
    const listing = listingType === "Item"
      ? await prisma.itemListing.findUnique({
          where: { id: listingId },
          include: {
            seller: {
              select: {
                email: true,
                subscriptionTier: true,
                itemListings: {
                  where: {
                    status: "available",
                  },
                  select: { id: true },
                },
                currencyListings: {
                  where: {
                    status: "available",
                  },
                  select: { id: true },
                },
              },
            },
          },
        })
      : await prisma.currencyListing.findUnique({
          where: { id: listingId },
          include: {
            seller: {
              select: {
                email: true,
                subscriptionTier: true,
                itemListings: {
                  where: {
                    status: "available",
                  },
                  select: { id: true },
                },
                currencyListings: {
                  where: {
                    status: "available",
                  },
                  select: { id: true },
                },
              },
            },
          },
        })

    if (!listing) {
      return {
        success: false,
        error: "Listing not found",
      }
    }

    // Check for active transactions and conversations separately (polymorphic relations)
    const [activeTransactions, activeConversations] = await Promise.all([
      prisma.transaction.findMany({
        where: {
          listingId: listingId,
          listingType: listingType,
          status: "PENDING", // Only PENDING transactions are active
        },
      }),
      prisma.conversation.findMany({
        where: {
          listingId: listingId,
          listingType: listingType,
        },
      }),
    ])

    // Check ownership
    if (listing.seller.email !== session.user.email) {
      return {
        success: false,
        error: "You can only update your own listings",
      }
    }

    // Check if trying to hide a listing with active transactions or conversations
    if (newStatus === "hidden") {
      if (activeTransactions.length > 0) {
        return {
          success: false,
          error: "Cannot hide listing with active transactions. Please complete or cancel all transactions first.",
        }
      }

      if (activeConversations.length > 0) {
        return {
          success: false,
          error: "Cannot hide listing with active conversations. Please resolve all conversations first.",
        }
      }
    }

    // Check listing limit when making available
    if (newStatus === "available" && listing.status === "hidden") {
      // Get subscription limits from system settings
      const [freeLimit, proLimit, eliteLimit] = await Promise.all([
        prisma.systemSettings.findUnique({ where: { key: "max_listings_free" } }),
        prisma.systemSettings.findUnique({ where: { key: "max_listings_pro" } }),
        prisma.systemSettings.findUnique({ where: { key: "max_listings_elite" } }),
      ])

      const limits = {
        FREE: freeLimit ? parseInt(freeLimit.value) : 10,
        PRO: proLimit ? parseInt(proLimit.value) : 50,
        ELITE: eliteLimit ? parseInt(eliteLimit.value) : 100,
      }

      const userTier = listing.seller.subscriptionTier as "FREE" | "PRO" | "ELITE"
      const maxListings = limits[userTier] || limits.FREE
      const currentActiveCount = listing.seller.itemListings.length + listing.seller.currencyListings.length

      if (currentActiveCount >= maxListings) {
        return {
          success: false,
          error: `You have reached your listing limit of ${maxListings} active listings for the ${userTier} plan. Upgrade your plan to list more items.`,
        }
      }
    }

    // Update listing status based on type
    if (listingType === "Item") {
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

    return {
      success: true,
    }
  } catch (error) {
    console.error("Error toggling listing status:", error)
    return {
      success: false,
      error: "Failed to update listing status. Please try again.",
    }
  }
}

/**
 * Soft delete a listing (mark as deleted, cancel conversations and transactions)
 */
export async function deleteListingSoft(
  listingId: string,
  listingType: "ITEM" | "CURRENCY" = "ITEM"
): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await auth()
    if (!session?.user?.email) {
      return {
        success: false,
        error: "You must be logged in to delete listings",
      }
    }

    // Get the listing with seller info based on type
    const listing = listingType === "ITEM"
      ? await prisma.itemListing.findUnique({
          where: { id: listingId },
          include: {
            seller: {
              select: {
                id: true,
                email: true,
                username: true,
              },
            },
          },
        })
      : await prisma.currencyListing.findUnique({
          where: { id: listingId },
          include: {
            seller: {
              select: {
                id: true,
                email: true,
                username: true,
              },
            },
          },
        })

    if (!listing) {
      return {
        success: false,
        error: "Listing not found",
      }
    }

    // Check ownership
    if (listing.seller.email !== session.user.email) {
      return {
        success: false,
        error: "You can only delete your own listings",
      }
    }

    // Check if listing is already sold or deleted
    if (listing.status === "sold") {
      return {
        success: false,
        error: "Cannot delete a sold listing",
      }
    }

    if (listing.status === "deleted") {
      return {
        success: false,
        error: "This listing has already been deleted",
      }
    }

    // Get related conversations and transactions (polymorphic relations)
    const [conversations, transactions] = await Promise.all([
      prisma.conversation.findMany({
        where: {
          listingId: listingId,
          listingType: listingType,
        },
        include: {
          buyer: {
            select: {
              id: true,
              username: true,
            },
          },
        },
      }),
      prisma.transaction.findMany({
        where: {
          listingId: listingId,
          listingType: listingType,
          status: {
            notIn: ["COMPLETED", "CANCELLED"],
          },
        },
        include: {
          buyer: {
            select: {
              id: true,
              username: true,
            },
          },
        },
      }),
    ])

    // Start transaction to update listing and related data
    await prisma.$transaction(async (tx) => {
      // Mark listing as deleted based on type
      if (listingType === "ITEM") {
        await tx.itemListing.update({
          where: { id: listingId },
          data: {
            status: "deleted",
          },
        })
      } else {
        await tx.currencyListing.update({
          where: { id: listingId },
          data: {
            status: "deleted",
          },
        })
      }

      // Send deletion messages to all conversations
      for (const conversation of conversations) {
        // Send system message about deletion
        await tx.message.create({
          data: {
            conversationId: conversation.id,
            senderId: listing.seller.id,
            content: `This listing has been deleted by the seller. The conversation has been automatically closed.`,
            isSystemMessage: true,
          },
        })

        // Create notification for buyer
        await tx.notification.create({
          data: {
            userId: conversation.buyerId,
            type: "CONVERSATION_CANCELLED",
            title: "Listing Deleted",
            message: `The listing "${listing.title}" has been deleted by the seller. Your conversation has been closed.`,
            link: `/messages`,
          },
        })
      }

      // Cancel all pending transactions
      for (const transaction of transactions) {
        await tx.transaction.update({
          where: { id: transaction.id },
          data: {
            status: "CANCELLED",
          },
        })

        // Create notification for buyer
        await tx.notification.create({
          data: {
            userId: transaction.buyerId,
            type: "TRANSACTION_CANCELLED",
            title: "Transaction Cancelled",
            message: `Your transaction for "${listing.title}" has been cancelled because the seller deleted the listing.`,
            link: `/my-transactions`,
          },
        })
      }
    })

    return {
      success: true,
    }
  } catch (error) {
    console.error("Error deleting listing:", error)
    return {
      success: false,
      error: "Failed to delete listing. Please try again.",
    }
  }
}
