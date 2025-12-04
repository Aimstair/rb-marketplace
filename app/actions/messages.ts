"use server"

import { prisma } from "@/lib/prisma"
import { auth } from "@/auth"
import { createNotification } from "./notifications"

export interface ConversationWithLatestMessage {
  id: string
  buyerId: string
  sellerId: string
  listingId: string | null
  createdAt: Date
  updatedAt: Date
  otherUser: {
    id: string
    username: string
    profilePicture: string | null
  }
  listing: {
    id: string
    title: string
    price: number
    image: string
  } | null
  latestMessage: {
    id: string
    content: string
    senderId: string
    createdAt: Date
    isRead: boolean
  } | null
  unreadCount: number
  status: "ongoing" | "completed" | "sold"
}

export interface MessageData {
  id: string
  content: string
  senderId: string
  senderUsername: string
  senderAvatar: string | null
  createdAt: Date
  isRead: boolean
  attachmentUrl: string | null
  offerAmount?: number | null
  offerStatus?: string | null
}

export interface GetConversationsResult {
  success: boolean
  conversations?: ConversationWithLatestMessage[]
  error?: string
}

export interface GetMessagesResult {
  success: boolean
  messages?: MessageData[]
  error?: string
}

export interface SendMessageResult {
  success: boolean
  messageId?: string
  conversationId?: string
  transactionCreated?: boolean
  amount?: number
  error?: string
}

/**
 * Get all conversations for the current user
 * Uses the first user from the database as placeholder until full auth is implemented
 */
export async function getConversations(): Promise<GetConversationsResult> {
  try {
    // Get the current authenticated user
    const session = await auth()
    if (!session?.user?.email) {
      return {
        success: false,
        error: "You must be logged in to view conversations",
      }
    }

    // Find the current user by email from session
    const currentUser = await prisma.user.findUnique({
      where: { email: session.user.email },
    })

    if (!currentUser) {
      return {
        success: false,
        error: "User account not found",
      }
    }

    // Fetch conversations where user is either buyer or seller
    const conversations = await prisma.conversation.findMany({
      where: {
        OR: [{ buyerId: currentUser.id }, { sellerId: currentUser.id }],
      },
      include: {
        buyer: {
          select: { id: true, username: true, profilePicture: true },
        },
        seller: {
          select: { id: true, username: true, profilePicture: true },
        },
        listing: {
          select: { id: true, title: true, price: true, image: true, status: true },
        },
        messages: {
          orderBy: { createdAt: "desc" },
          take: 1,
          select: {
            id: true,
            content: true,
            senderId: true,
            createdAt: true,
            isRead: true,
          },
        },
        transactions: {
          orderBy: { createdAt: "desc" },
          take: 1,
          select: {
            id: true,
            price: true,
            amount: true,
            status: true,
            buyerConfirmed: true,
            sellerConfirmed: true,
          },
        },
      },
      orderBy: { updatedAt: "desc" },
    }) as any[]

    // Transform conversations to response format
    const transformedConversations: ConversationWithLatestMessage[] = await Promise.all(
      conversations.map(async (conv) => {
        const otherUser = currentUser.id === conv.buyerId ? conv.seller : conv.buyer
        const unreadMessages = conv.messages.filter(
          (msg: any) => !msg.isRead && msg.senderId !== currentUser.id
        )

        // Calculate transaction status
        let status: "ongoing" | "completed" | "sold" = "ongoing"

        if (conv.listingId) {
          // Check if transaction is completed
          const completedTransaction = await (prisma.transaction as any).findFirst({
            where: {
              listingId: conv.listingId,
              status: "COMPLETED",
              OR: [
                {
                  buyerId: conv.buyerId,
                  sellerId: conv.sellerId,
                },
                {
                  buyerId: conv.sellerId,
                  sellerId: conv.buyerId,
                },
              ],
            },
          })

          if (completedTransaction) {
            status = "completed"
          } else if (conv.listing?.status === "sold") {
            // If listing is sold (but not to these parties), mark as sold
            status = "sold"
          }
        }

        return {
          id: conv.id,
          buyerId: conv.buyerId,
          sellerId: conv.sellerId,
          listingId: conv.listingId,
          createdAt: conv.createdAt,
          updatedAt: conv.updatedAt,
          otherUser: {
            id: otherUser.id,
            username: otherUser.username,
            profilePicture: otherUser.profilePicture,
          },
          listing: conv.listing,
          latestMessage: conv.messages[0] || null,
          unreadCount: unreadMessages.length,
          status,
          transaction: conv.transactions && conv.transactions.length > 0 ? conv.transactions[0] : null,
        }
      })
    )

    return {
      success: true,
      conversations: transformedConversations,
    }
  } catch (error) {
    console.error("Error fetching conversations:", error)
    return {
      success: false,
      error: "Failed to fetch conversations",
    }
  }
}

/**
 * Get all messages in a conversation
 */
export async function getMessages(conversationId: string): Promise<GetMessagesResult> {
  try {
    if (!conversationId) {
      return {
        success: false,
        error: "Conversation ID is required",
      }
    }

    const messages = await prisma.message.findMany({
      where: { conversationId },
      include: {
        sender: {
          select: { id: true, username: true, profilePicture: true },
        },
      },
      orderBy: { createdAt: "asc" },
    }) as any[]

    // Transform messages to response format
    const transformedMessages: MessageData[] = messages.map((msg) => ({
      id: msg.id,
      content: msg.content,
      senderId: msg.senderId,
      senderUsername: msg.sender.username,
      senderAvatar: msg.sender.profilePicture,
      createdAt: msg.createdAt,
      isRead: msg.isRead,
      attachmentUrl: msg.attachmentUrl,
      offerAmount: msg.offerAmount,
      offerStatus: msg.offerStatus,
    }))

    return {
      success: true,
      messages: transformedMessages,
    }
  } catch (error) {
    console.error("Error fetching messages:", error)
    return {
      success: false,
      error: "Failed to fetch messages",
    }
  }
}

/**
 * Send a message to a conversation
 * If conversationId is not provided, attempts to find or create one based on otherUserId and optional listingId
 */
export async function sendMessage(
  content: string,
  options: {
    conversationId?: string
    otherUserId?: string
    listingId?: string
    attachmentUrl?: string
    offerAmount?: number
    amount?: number
  } = {}
): Promise<SendMessageResult> {
  try {
    if (!content || content.trim().length === 0) {
      return {
        success: false,
        error: "Message content cannot be empty",
      }
    }

    // Get the current authenticated user
    const session = await auth()
    if (!session?.user?.email) {
      return {
        success: false,
        error: "You must be logged in to send messages",
      }
    }

    // Find the current user by email from session
    const currentUser = await prisma.user.findUnique({
      where: { email: session.user.email },
    })

    if (!currentUser) {
      return {
        success: false,
        error: "User account not found",
      }
    }

    let conversationId = options.conversationId

    // If no conversationId, try to find or create one
    if (!conversationId) {
      if (!options.otherUserId) {
        return {
          success: false,
          error: "Either conversationId or otherUserId is required",
        }
      }

      // Verify the other user exists
      const otherUser = await prisma.user.findUnique({
        where: { id: options.otherUserId },
      })

      if (!otherUser) {
        return {
          success: false,
          error: "Other user not found",
        }
      }

      // Determine buyer and seller (assume currentUser is buyer if starting new chat)
      const buyerId = currentUser.id
      const sellerId = options.otherUserId

      // Try to find existing conversation using findFirst (since unique constraint is removed)
      let conversation = await prisma.conversation.findFirst({
        where: {
          buyerId,
          sellerId,
          listingId: options.listingId || null,
        },
      })

      // If not found, create new conversation
      if (!conversation) {
        conversation = await prisma.conversation.create({
          data: {
            buyerId,
            sellerId,
            listingId: options.listingId || undefined,
          },
        })
      }

      conversationId = conversation.id
    }

    // Verify conversation exists and user has access
    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
    })

    if (!conversation) {
      return {
        success: false,
        error: "Conversation not found",
      }
    }

    if (
      conversation.buyerId !== currentUser.id &&
      conversation.sellerId !== currentUser.id
    ) {
      return {
        success: false,
        error: "You don't have access to this conversation",
      }
    }

    // Validate amount for currency listings
    let amount = options.amount
    if (amount !== undefined) {
      if (conversation.listingId) {
        const listing = await prisma.listing.findUnique({
          where: { id: conversation.listingId },
          select: { description: true, game: true },
        })

        if (listing && listing.game === "Currency Exchange" && listing.description) {
          // Parse Stock, Min Order, and Max Order from description
          const stockMatch = listing.description.match(/Stock:\s*(\d+)/i)
          const minOrderMatch = listing.description.match(/Min Order:\s*(\d+)/i)
          const maxOrderMatch = listing.description.match(/Max Order:\s*(\d+)/i)

          const stock = stockMatch ? parseInt(stockMatch[1], 10) : 0
          const minOrder = minOrderMatch ? parseInt(minOrderMatch[1], 10) : 1
          const maxOrder = maxOrderMatch ? parseInt(maxOrderMatch[1], 10) : stock

          // Validate amount
          if (amount > stock) {
            return {
              success: false,
              error: `Amount exceeds available stock (${stock} available)`,
            }
          }

          if (amount < minOrder) {
            return {
              success: false,
              error: `Amount is below minimum order (${minOrder} required)`,
            }
          }

          if (amount > maxOrder) {
            return {
              success: false,
              error: `Amount exceeds maximum order (${maxOrder} maximum)`,
            }
          }
        }
      }
    }

    // Create the message
    const message = await prisma.message.create({
      data: {
        content: content.trim(),
        conversationId,
        senderId: currentUser.id,
        attachmentUrl: options.attachmentUrl,
        offerAmount: options.offerAmount,
        amount: options.amount,
      },
    })

    let transactionCreated = false

    // Auto-create transaction if listing exists but transaction doesn't
    if (conversation.listingId) {
      const existingTransaction = await (prisma.transaction as any).findFirst({
        where: {
          listingId: conversation.listingId,
          OR: [
            { buyerId: conversation.buyerId, sellerId: conversation.sellerId },
            { buyerId: conversation.sellerId, sellerId: conversation.buyerId },
          ],
        },
      })

      if (!existingTransaction) {
        try {
          // Fetch the listing to identify the TRUE seller
          const listing = await prisma.listing.findUnique({
            where: { id: conversation.listingId },
            select: { sellerId: true, price: true },
          })

          if (listing) {
            // TRUE buyer = participant who is NOT the seller
            // TRUE seller = listing.sellerId
            const trueSellerId = listing.sellerId
            const trueBuyerId = conversation.buyerId === trueSellerId ? conversation.sellerId : conversation.buyerId

            // Create transaction with correct roles and amount
            await (prisma.transaction as any).create({
              data: {
                buyerId: trueBuyerId,
                sellerId: trueSellerId,
                listingId: conversation.listingId,
                price: listing.price || 0,
                status: "PENDING",
                amount: options.amount,
              },
            })

            transactionCreated = true
            console.log(
              `✅ Transaction auto-created: buyer=${trueBuyerId}, seller=${trueSellerId}, listing=${conversation.listingId}, amount=${options.amount}`
            )
          }
        } catch (error) {
          console.error("Failed to auto-create transaction:", error)
          // Don't fail the message send if transaction creation fails
        }
      }
    }

    // Update conversation's updatedAt timestamp
    await prisma.conversation.update({
      where: { id: conversationId },
      data: { updatedAt: new Date() },
    })

    // Create notification for the recipient
    const recipientId = conversation.buyerId === currentUser.id ? conversation.sellerId : conversation.buyerId
    await createNotification(
      recipientId,
      "MESSAGE",
      `New message from ${currentUser.id}`,
      content.substring(0, 100), // Preview first 100 chars
      `/messages?id=${conversationId}`
    ).catch((error) => {
      console.error("Failed to create message notification:", error)
      // Don't fail the message send if notification fails
    })

    return {
      success: true,
      messageId: message.id,
      conversationId,
      transactionCreated,
      amount: options.amount,
    }
  } catch (error) {
    console.error("Error sending message:", error)
    return {
      success: false,
      error: "Failed to send message",
    }
  }
}

/**
 * Mark messages as read in a conversation
 */
export async function markMessagesAsRead(conversationId: string): Promise<{ success: boolean; error?: string }> {
  try {
    // Get the current authenticated user
    const session = await auth()
    if (!session?.user?.email) {
      return {
        success: false,
        error: "You must be logged in",
      }
    }

    // Find the current user by email from session
    const currentUser = await prisma.user.findUnique({
      where: { email: session.user.email },
    })

    if (!currentUser) {
      return {
        success: false,
        error: "User account not found",
      }
    }

    // Mark all unread messages from other users as read
    await prisma.message.updateMany({
      where: {
        conversationId,
        isRead: false,
        NOT: { senderId: currentUser.id },
      },
      data: { isRead: true },
    })

    return { success: true }
  } catch (error) {
    console.error("Error marking messages as read:", error)
    return {
      success: false,
      error: "Failed to mark messages as read",
    }
  }
}

/**
 * Create or find a conversation with a specific user
 * Useful for auto-opening conversations when navigating from message search
 * Also creates a Transaction if a listing is provided and none exists
 */
export async function getOrCreateConversation(
  sellerId: string,
  listingId?: string,
  transactionDetails?: { price: number; amount: number }
): Promise<{ success: boolean; conversationId?: string; error?: string }> {
  try {
    // Get the current authenticated user
    const session = await auth()
    if (!session?.user?.email) {
      return {
        success: false,
        error: "You must be logged in",
      }
    }

    // Find the current user by email from session
    const currentUser = await prisma.user.findUnique({
      where: { email: session.user.email },
    })

    if (!currentUser) {
      return {
        success: false,
        error: "User account not found",
      }
    }

    // Verify seller user exists
    const sellerUser = await prisma.user.findUnique({
      where: { id: sellerId },
    })

    if (!sellerUser) {
      return {
        success: false,
        error: "Seller not found",
      }
    }

    if (sellerId === currentUser.id) {
      return {
        success: false,
        error: "Cannot message yourself",
      }
    }

    // Try to find existing conversation
    const whereClause: any = {
      buyerId: currentUser.id,
      sellerId: sellerId,
      listingId: listingId || null,
    }

    // Fetch all conversations for this buyer/seller/listing combo
    const existingConversations = await prisma.conversation.findMany({
      where: whereClause,
      include: {
        transactions: true,
      },
    })

    let conversation = null

    // Look for a conversation with a PENDING transaction
    if (existingConversations.length > 0) {
      const pendingConversation = existingConversations.find(
        (conv) => conv.transactions && conv.transactions.some((tx: any) => tx.status === "PENDING")
      )
      if (pendingConversation) {
        // Reuse existing conversation with PENDING transaction
        conversation = pendingConversation
        
        // Update the PENDING transaction with new details if transaction details provided
        if (listingId && transactionDetails) {
          const pendingTx = pendingConversation.transactions.find((tx: any) => tx.status === "PENDING")
          if (pendingTx) {
            await prisma.transaction.update({
              where: { id: pendingTx.id },
              data: {
                price: transactionDetails.price,
                amount: transactionDetails.amount,
              },
            }).catch((err) => {
              console.error("Failed to update pending transaction:", err)
            })
          }
        }
      } else {
        // All previous transactions are COMPLETED/CANCELLED - create new conversation
        conversation = null
      }
    }

    // If not found or all transactions completed, create new conversation
    if (!conversation) {
      conversation = await prisma.conversation.create({
        data: {
          buyerId: currentUser.id,
          sellerId: sellerId,
          listingId: listingId || undefined,
        },
      })

      // If a listingId is provided, create or update a transaction
      if (listingId) {
        // Check if listing exists
        const listing = await prisma.listing.findUnique({
          where: { id: listingId },
          select: { id: true, price: true },
        })

        if (listing) {
          // Use transactionDetails if provided; otherwise fall back to listing price
          const txPrice = transactionDetails?.price ?? listing.price
          const txAmount = transactionDetails?.amount

          // Create new transaction for this new conversation
          // (No need to check for existing - this conversation was just created)
          await prisma.transaction.create({
            data: {
              buyerId: currentUser.id,
              sellerId: sellerId,
              listingId: listingId,
              conversationId: conversation.id,
              price: txPrice,
              amount: txAmount,
              status: "PENDING",
            },
          }).catch((err) => {
            console.error("Failed to create transaction:", err)
            // Don't fail conversation creation if transaction fails
          })
        }
      }
    }

    return {
      success: true,
      conversationId: conversation.id,
    }
  } catch (error) {
    console.error("Error creating conversation:", error)
    return {
      success: false,
      error: "Failed to create or find conversation",
    }
  }
}

/**
 * Create or find a conversation for a specific listing
 * Useful for the "Message Seller" button on listing pages
 */
export async function getOrCreateListingConversation(
  listingId: string
): Promise<{ success: boolean; conversationId?: string; error?: string }> {
  try {
    // Get the current authenticated user
    const session = await auth()
    if (!session?.user?.email) {
      return {
        success: false,
        error: "You must be logged in",
      }
    }

    // Find the current user by email from session
    const currentUser = await prisma.user.findUnique({
      where: { email: session.user.email },
    })

    if (!currentUser) {
      return {
        success: false,
        error: "User account not found",
      }
    }

    // Find the listing and its seller
    const listing = await prisma.listing.findUnique({
      where: { id: listingId },
      select: { sellerId: true },
    })

    if (!listing) {
      return {
        success: false,
        error: "Listing not found",
      }
    }

    if (listing.sellerId === currentUser.id) {
      return {
        success: false,
        error: "Cannot message yourself",
      }
    }

    // Find or create conversation using findFirst (unique constraint removed)
    let conversation = await prisma.conversation.findFirst({
      where: {
        buyerId: currentUser.id,
        sellerId: listing.sellerId,
        listingId,
      },
    })

    if (!conversation) {
      conversation = await prisma.conversation.create({
        data: {
          buyerId: currentUser.id,
          sellerId: listing.sellerId,
          listingId,
        },
      })
    }

    return {
      success: true,
      conversationId: conversation.id,
    }
  } catch (error) {
    console.error("Error creating listing conversation:", error)
    return {
      success: false,
      error: "Failed to create or find conversation",
    }
  }
}

export interface AcceptCounterOfferResult {
  success: boolean
  message?: string
  error?: string
}

/**
 * Accept a counteroffer by updating the transaction price
 */
export async function acceptCounterOffer(messageId: string): Promise<AcceptCounterOfferResult> {
  try {
    console.log("[acceptCounterOffer] Starting - messageId:", messageId)

    const session = await auth()
    if (!session?.user?.email) {
      console.log("[acceptCounterOffer] No session found")
      return {
        success: false,
        error: "You must be logged in to accept a counteroffer",
      }
    }

    const currentUser = await prisma.user.findUnique({
      where: { email: session.user.email },
    })

    if (!currentUser) {
      console.log("[acceptCounterOffer] Current user not found")
      return {
        success: false,
        error: "User account not found",
      }
    }

    console.log("[acceptCounterOffer] Current user found:", currentUser.id)

    // Get the message with offer
    const message = await prisma.message.findUnique({
      where: { id: messageId },
      include: {
        conversation: true,
      },
    })

    if (!message) {
      console.log("[acceptCounterOffer] Message not found:", messageId)
      return {
        success: false,
        error: "Message not found",
      }
    }

    console.log("[acceptCounterOffer] Message found, offerAmount:", message.offerAmount)

    if (!message.offerAmount) {
      console.log("[acceptCounterOffer] No offer amount in message")
      return {
        success: false,
        error: "This message does not contain a counteroffer",
      }
    }

    const conversation = message.conversation

    if (!conversation) {
      console.log("[acceptCounterOffer] Conversation not found for message")
      return {
        success: false,
        error: "Conversation not found",
      }
    }

    if (!conversation.listingId) {
      console.log("[acceptCounterOffer] No listing ID in conversation")
      return {
        success: false,
        error: "This conversation is not associated with a listing",
      }
    }

    console.log("[acceptCounterOffer] Conversation details - buyerId:", conversation.buyerId, "sellerId:", conversation.sellerId, "listingId:", conversation.listingId)

    // Update the message offerStatus to "accepted"
    console.log("[acceptCounterOffer] Updating message offerStatus to accepted")
    await prisma.message.update({
      where: { id: messageId },
      data: { offerStatus: "accepted" },
    })

    // Find the transaction for this conversation's listing and users
    let transaction = await (prisma.transaction as any).findFirst({
      where: {
        listingId: conversation.listingId,
        status: "PENDING",
        OR: [
          {
            buyerId: conversation.buyerId,
            sellerId: conversation.sellerId,
          },
          {
            buyerId: conversation.sellerId,
            sellerId: conversation.buyerId,
          },
        ],
      },
    })

    console.log("[acceptCounterOffer] Existing PENDING transaction found:", transaction?.id)

    // If no transaction found, create one with the offer price and amount
    if (!transaction) {
      console.log("[acceptCounterOffer] Creating new transaction with offer price:", message.offerAmount)
      transaction = await (prisma.transaction as any).create({
        data: {
          buyerId: conversation.buyerId,
          sellerId: conversation.sellerId,
          listingId: conversation.listingId,
          price: message.offerAmount,
          status: "PENDING",
          amount: message.amount,
        },
      })
      console.log("[acceptCounterOffer] New transaction created:", transaction.id)
    } else {
      // Update existing transaction price and amount
      console.log("[acceptCounterOffer] Updating existing transaction price:", transaction.id, "new price:", message.offerAmount)
      transaction = await (prisma.transaction as any).update({
        where: { id: transaction.id },
        data: { 
          price: message.offerAmount,
          amount: message.amount,
        },
      })
      console.log("[acceptCounterOffer] Transaction updated successfully")
    }

    // Update the listing price to the new offer amount
    console.log("[acceptCounterOffer] Updating listing price to:", message.offerAmount)
    await prisma.listing.update({
      where: { id: conversation.listingId },
      data: { price: message.offerAmount },
    })

    // Create system message
    await prisma.message.create({
      data: {
        conversationId: message.conversationId,
        senderId: currentUser.id,
        content: `Counteroffer accepted. Price updated to ${message.offerAmount}`,
        isSystemMessage: true,
      },
    })

    console.log("[acceptCounterOffer] Success - Counteroffer accepted")
    return {
      success: true,
      message: "Counteroffer accepted successfully",
    }
  } catch (error) {
    console.error("[acceptCounterOffer] Error accepting counteroffer:", error)
    return {
      success: false,
      error: "Failed to accept counteroffer",
    }
  }
}

/**
 * Decline a counteroffer
 */
export async function declineCounterOffer(messageId: string): Promise<AcceptCounterOfferResult> {
  try {
    console.log("[declineCounterOffer] Starting - messageId:", messageId)

    const session = await auth()
    if (!session?.user?.email) {
      console.log("[declineCounterOffer] No session found")
      return {
        success: false,
        error: "You must be logged in to decline a counteroffer",
      }
    }

    const currentUser = await prisma.user.findUnique({
      where: { email: session.user.email },
    })

    if (!currentUser) {
      console.log("[declineCounterOffer] Current user not found")
      return {
        success: false,
        error: "User account not found",
      }
    }

    console.log("[declineCounterOffer] Current user found:", currentUser.id)

    // Get the message with offer
    const message = await prisma.message.findUnique({
      where: { id: messageId },
      include: {
        conversation: true,
      },
    })

    if (!message) {
      console.log("[declineCounterOffer] Message not found:", messageId)
      return {
        success: false,
        error: "Message not found",
      }
    }

    console.log("[declineCounterOffer] Message found, offerAmount:", message.offerAmount)

    if (!message.offerAmount) {
      console.log("[declineCounterOffer] No offer amount in message")
      return {
        success: false,
        error: "This message does not contain a counteroffer",
      }
    }

    // Update the message offerStatus to "declined"
    console.log("[declineCounterOffer] Updating message offerStatus to declined")
    await prisma.message.update({
      where: { id: messageId },
      data: { offerStatus: "declined" },
    })

    // Create system message
    await prisma.message.create({
      data: {
        conversationId: message.conversationId,
        senderId: currentUser.id,
        content: "Counteroffer declined.",
        isSystemMessage: true,
      },
    })

    console.log("[declineCounterOffer] Success - Counteroffer declined")
    return {
      success: true,
      message: "Counteroffer declined",
    }
  } catch (error) {
    console.error("[declineCounterOffer] Error declining counteroffer:", error)
    return {
      success: false,
      error: "Failed to decline counteroffer",
    }
  }
}
