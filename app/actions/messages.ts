"use server"

import { prisma } from "@/lib/prisma"
import { auth } from "@/auth"
import { createNotification } from "./notifications"
import { unstable_noStore } from "next/cache"
import { headers } from "next/headers"
import { checkRateLimit, getRateLimitIdentifier } from "@/lib/rate-limit"
import { sendMessageInteractionEmail } from "@/lib/engagement-email"
import { isRealtimeMessagingFeatureEnabled } from "@/lib/feature-flags"
import {
  buildMessagingChannel,
  buildPrivateChatChannel,
} from "@/lib/pusher-channels"

const MESSAGE_SEND_LIMIT = {
  maxRequests: 30,
  windowMs: 60 * 1000,
}

function buildConversationTransactionKey(listingId: string, buyerId: string, sellerId: string): string {
  const [left, right] = [buyerId, sellerId].sort()
  return `${listingId}:${left}:${right}`
}

function buildMessagePreview(content: string, attachmentUrl?: string | null): string {
  if (attachmentUrl) {
    return "Sent a photo."
  }

  const trimmed = content.trim()
  return trimmed.length > 120 ? `${trimmed.slice(0, 117)}...` : trimmed
}

async function getUnreadConversationCount(userId: string): Promise<number> {
  return prisma.conversation.count({
    where: {
      OR: [{ buyerId: userId }, { sellerId: userId }],
      messages: {
        some: {
          isRead: false,
          senderId: { not: userId },
        },
      },
    },
  })
}

async function getUnreadInConversationCount(conversationId: string, userId: string): Promise<number> {
  return prisma.message.count({
    where: {
      conversationId,
      isRead: false,
      senderId: { not: userId },
    },
  })
}

// Helper function to get listing details based on type
async function getListingDetails(listingId: string, listingType: string) {
  if (listingType === "ITEM") {
    return await prisma.itemListing.findUnique({
      where: { id: listingId },
      select: {
        id: true,
        title: true,
        price: true,
        image: true,
        stock: true,
        status: true,
        sellerId: true,
        game: { select: { displayName: true } },
      },
    })
  } else if (listingType === "CURRENCY") {
    return await prisma.currencyListing.findUnique({
      where: { id: listingId },
      select: {
        id: true,
        title: true,
        ratePerPeso: true,
        image: true,
        stock: true,
        status: true,
        minOrder: true,
        maxOrder: true,
        sellerId: true,
        game: { select: { displayName: true } },
      },
    })
  }
  return null
}

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
    attachmentUrl?: string | null
  } | null
  unreadCount: number
  status: "ongoing" | "completed" | "sold" | "cancelled"
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
    unstable_noStore()

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
          select: { id: true, username: true, profilePicture: true, subscriptionTier: true },
        },
        seller: {
          select: { id: true, username: true, profilePicture: true, subscriptionTier: true },
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
            attachmentUrl: true,
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

    const itemListingIds = new Set<string>()
    const currencyListingIds = new Set<string>()
    const transactionFilters: any[] = []

    for (const conv of conversations) {
      if (!conv.listingId || !conv.listingType) {
        continue
      }

      if (conv.listingType === "ITEM") {
        itemListingIds.add(conv.listingId)
      } else if (conv.listingType === "CURRENCY") {
        currencyListingIds.add(conv.listingId)
      }

      transactionFilters.push({
        listingId: conv.listingId,
        status: "COMPLETED",
        OR: [
          { buyerId: conv.buyerId, sellerId: conv.sellerId },
          { buyerId: conv.sellerId, sellerId: conv.buyerId },
        ],
      })
    }

    const [itemListings, currencyListings, completedTransactions] = await Promise.all([
      itemListingIds.size > 0
        ? prisma.itemListing.findMany({
            where: { id: { in: Array.from(itemListingIds) } },
            select: {
              id: true,
              title: true,
              price: true,
              image: true,
              status: true,
            },
          })
        : Promise.resolve([]),
      currencyListingIds.size > 0
        ? prisma.currencyListing.findMany({
            where: { id: { in: Array.from(currencyListingIds) } },
            select: {
              id: true,
              title: true,
              ratePerPeso: true,
              image: true,
              status: true,
            },
          })
        : Promise.resolve([]),
      transactionFilters.length > 0
        ? prisma.transaction.findMany({
            where: {
              OR: transactionFilters,
            },
            select: {
              listingId: true,
              buyerId: true,
              sellerId: true,
            },
          })
        : Promise.resolve([]),
    ])

    const listingMap = new Map<string, any>()
    for (const listing of itemListings) {
      listingMap.set(`ITEM:${listing.id}`, listing)
    }
    for (const listing of currencyListings) {
      listingMap.set(`CURRENCY:${listing.id}`, {
        id: listing.id,
        title: listing.title,
        price: listing.ratePerPeso,
        image: listing.image,
        status: listing.status,
      })
    }

    const completedTransactionKeys = new Set(
      completedTransactions.map((transaction) =>
        buildConversationTransactionKey(transaction.listingId, transaction.buyerId, transaction.sellerId)
      )
    )

    const transformedConversations: ConversationWithLatestMessage[] = conversations.map((conv) => {
      const otherUser = currentUser.id === conv.buyerId ? conv.seller : conv.buyer
      const unreadMessages = conv.messages.filter(
        (msg: any) => !msg.isRead && msg.senderId !== currentUser.id
      )

      const listing =
        conv.listingId && conv.listingType
          ? listingMap.get(`${conv.listingType}:${conv.listingId}`) || null
          : null

      let status: "ongoing" | "completed" | "sold" | "cancelled" = "ongoing"
      if (conv.listingId) {
        const transactionKey = buildConversationTransactionKey(
          conv.listingId,
          conv.buyerId,
          conv.sellerId
        )
        if (completedTransactionKeys.has(transactionKey)) {
          status = "completed"
        } else if (listing?.status === "sold") {
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
        listing: listing,
        latestMessage: conv.messages[0] || null,
        unreadCount: unreadMessages.length,
        status,
        transaction: conv.transactions && conv.transactions.length > 0 ? conv.transactions[0] : null,
      }
    })

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
    unstable_noStore()

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
      select: {
        id: true,
        username: true,
        isBanned: true,
        isMuted: true,
        mutedUntil: true,
        mutedReason: true,
      },
    })

    if (!currentUser) {
      return {
        success: false,
        error: "User account not found",
      }
    }

    const requestHeaders = await headers()
    const sendMessageRate = await checkRateLimit(
      getRateLimitIdentifier({
        headers: requestHeaders,
        userId: currentUser.id,
        email: session.user.email,
      }),
      MESSAGE_SEND_LIMIT.maxRequests,
      MESSAGE_SEND_LIMIT.windowMs,
      { namespace: "messages-send" }
    )

    if (!sendMessageRate.allowed) {
      return {
        success: false,
        error: `You are sending messages too quickly. Please wait ${sendMessageRate.retryAfterSeconds} seconds and try again.`,
      }
    }

    // Check for prohibited content after low-cost auth/rate-limit gates.
    const { moderateContent } = await import("@/lib/moderation")
    const moderationCheck = await moderateContent(content, "message")

    if (!moderationCheck.isAllowed) {
      return {
        success: false,
        error: `Your message contains prohibited content: ${moderationCheck.reason}`,
      }
    }

    // Check if user is banned
    if (currentUser.isBanned) {
      return {
        success: false,
        error: "Your account is banned and cannot send messages",
      }
    }

    // Check if user is muted
    if (currentUser.isMuted) {
      // Check if temporary mute has expired
      if (currentUser.mutedUntil && new Date() > currentUser.mutedUntil) {
        // Auto-unmute user
        await prisma.user.update({
          where: { id: currentUser.id },
          data: { isMuted: false, mutedUntil: null, mutedReason: null },
        })
      } else {
        const muteMsg = currentUser.mutedUntil
          ? `You are muted until ${currentUser.mutedUntil.toLocaleString()}. Reason: ${currentUser.mutedReason || "Policy violation"}`
          : `You are permanently muted. Reason: ${currentUser.mutedReason || "Policy violation"}`
        return {
          success: false,
          error: muteMsg,
        }
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

      if (options.otherUserId === currentUser.id) {
        return {
          success: false,
          error: "You cannot message yourself",
        }
      }

      // Verify the other user exists
      const otherUser = await prisma.user.findUnique({
        where: { id: options.otherUserId },
        select: {
          id: true,
          preferences: {
            select: {
              allowMessageRequests: true,
            },
          },
        },
      })

      if (!otherUser) {
        return {
          success: false,
          error: "Other user not found",
        }
      }

      if (otherUser.preferences && !otherUser.preferences.allowMessageRequests) {
        return {
          success: false,
          error: "This user is not accepting new message requests right now",
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

    let listingDetailsForMessage: Awaited<ReturnType<typeof getListingDetails>> | null = null
    if (conversation.listingId && conversation.listingType) {
      listingDetailsForMessage = await getListingDetails(conversation.listingId, conversation.listingType)

      if (!listingDetailsForMessage) {
        return {
          success: false,
          error: "Listing not found",
        }
      }

      if (listingDetailsForMessage.status !== "available") {
        return {
          success: false,
          error: "This listing is no longer available for new messages",
        }
      }
    }

    // Validate amount for currency listings.
    let normalizedAmount = options.amount
    if (conversation.listingId && conversation.listingType === "CURRENCY") {
      const listing = await prisma.currencyListing.findUnique({
        where: { id: conversation.listingId },
        select: { stock: true, minOrder: true, maxOrder: true },
      })

      if (!listing) {
        return {
          success: false,
          error: "Currency listing not found",
        }
      }

      const effectiveAmount = options.amount ?? 1

      if (effectiveAmount > listing.stock) {
        return {
          success: false,
          error: `Amount exceeds available stock (${listing.stock} available)`,
        }
      }

      if (effectiveAmount < listing.minOrder) {
        return {
          success: false,
          error: `Amount is below minimum order (${listing.minOrder} required)`,
        }
      }

      if (effectiveAmount > listing.maxOrder) {
        return {
          success: false,
          error: `Amount exceeds maximum order (${listing.maxOrder} allowed)`,
        }
      }

      normalizedAmount = effectiveAmount
    }

    // Create the message
    const message = await prisma.message.create({
      data: {
        content: content.trim(),
        conversationId,
        senderId: currentUser.id,
        attachmentUrl: options.attachmentUrl,
        offerAmount: options.offerAmount,
        amount: normalizedAmount,
      },
      include: {
        sender: {
          select: {
            id: true,
            username: true,
            profilePicture: true,
          }
        }
      }
    })

    try {
      const { pusherServer } = await import("@/lib/pusher")
      const realtimeEnabled = isRealtimeMessagingFeatureEnabled()
      const messagePayload = {
        id: message.id,
        conversationId,
        content: message.content,
        senderId: message.senderId,
        createdAt: message.createdAt,
        attachmentUrl: message.attachmentUrl || null,
        offerAmount: message.offerAmount ?? null,
        offerStatus: message.offerStatus ?? null,
      }

      if (realtimeEnabled) {
        await pusherServer.trigger(
          buildPrivateChatChannel(conversationId),
          "new-message",
          messagePayload,
        )

        const participantUserIds = [conversation.buyerId, conversation.sellerId]
        for (const participantUserId of participantUserIds) {
          const [conversationUnreadCount, unreadMessageCount] = await Promise.all([
            getUnreadInConversationCount(conversationId, participantUserId),
            getUnreadConversationCount(participantUserId),
          ])

          const summaryPayload = {
            conversationId,
            senderId: message.senderId,
            createdAt: message.createdAt,
            lastMessagePreview: buildMessagePreview(message.content, message.attachmentUrl),
            conversationUnreadCount,
            unreadMessageCount,
          }

          await pusherServer.trigger(
            buildMessagingChannel(participantUserId),
            "conversation-updated",
            summaryPayload,
          )

          await pusherServer.trigger(
            buildMessagingChannel(participantUserId),
            "unread-message-count-updated",
            {
              unreadMessageCount,
            },
          )
        }
      } else {
        await pusherServer.trigger(
          `chat-${conversationId}`,
          "new-message",
          messagePayload,
        )
      }
    } catch (pusherError) {
      console.error("Pusher trigger failed:", pusherError)
      // Keep message send successful even if realtime delivery fails.
    }

    let transactionCreated = false

    // Auto-create transaction if listing exists but transaction doesn't
    if (conversation.listingId) {
      try {
        const listing = listingDetailsForMessage
        if (listing && conversation.listingType) {
          // TRUE buyer = participant who is NOT the seller
          // TRUE seller = listing.sellerId
          const trueSellerId = listing.sellerId
          const trueBuyerId = conversation.buyerId === trueSellerId ? conversation.sellerId : conversation.buyerId

          const transactionAmount =
            conversation.listingType === "CURRENCY" ? (normalizedAmount ?? 1) : normalizedAmount
          const price = "price" in listing ? listing.price : listing.ratePerPeso * (transactionAmount || 1)

          transactionCreated = await prisma.$transaction(
            async (tx) => {
              // Serialize per-conversation transaction auto-creation to prevent duplicates.
              await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${conversation.id}))`

              const existingTransaction = await (tx.transaction as any).findFirst({
                where: {
                  conversationId: conversation.id,
                  listingId: conversation.listingId,
                  status: { in: ["PENDING", "COMPLETED"] },
                },
                select: { id: true },
              })

              if (existingTransaction) {
                return false
              }

              await (tx.transaction as any).create({
                data: {
                  buyerId: trueBuyerId,
                  sellerId: trueSellerId,
                  listingId: conversation.listingId,
                  listingType: conversation.listingType,
                  conversationId: conversation.id,
                  price,
                  status: "PENDING",
                  amount: transactionAmount,
                },
              })

              return true
            },
            { isolationLevel: "Serializable" }
          )

          if (transactionCreated) {
            console.log(
              `✅ Transaction auto-created: buyer=${trueBuyerId}, seller=${trueSellerId}, listing=${conversation.listingId}, amount=${transactionAmount}`
            )
          }
        }
      } catch (error) {
        console.error("Failed to auto-create transaction:", error)
        // Don't fail the message send if transaction creation fails
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
      `New message from ${currentUser.username}`,
      content.substring(0, 100), // Preview first 100 chars
      `/messages?id=${conversationId}`
    ).catch((error) => {
      console.error("Failed to create message notification:", error)
      // Don't fail the message send if notification fails
    })

    await sendMessageInteractionEmail({
      recipientUserId: recipientId,
      senderUsername: currentUser.username,
      messagePreview: content.substring(0, 180),
      conversationId,
    }).catch((error) => {
      console.error("Failed to send message interaction email:", error)
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

    if (isRealtimeMessagingFeatureEnabled()) {
      try {
        const { pusherServer } = await import("@/lib/pusher")
        const [conversationUnreadCount, unreadMessageCount] = await Promise.all([
          getUnreadInConversationCount(conversationId, currentUser.id),
          getUnreadConversationCount(currentUser.id),
        ])

        await pusherServer.trigger(
          buildMessagingChannel(currentUser.id),
          "conversation-updated",
          {
            conversationId,
            conversationUnreadCount,
            unreadMessageCount,
          },
        )

        await pusherServer.trigger(
          buildMessagingChannel(currentUser.id),
          "unread-message-count-updated",
          {
            unreadMessageCount,
          },
        )
      } catch (pusherError) {
        console.error("Failed to emit message read realtime update:", pusherError)
      }
    }

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
  transactionDetails?: { price: number; amount: number },
  listingType: string = "ITEM"
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
          listingType: listingId ? listingType : undefined,
        },
      })

      // If a listingId is provided, create or update a transaction
      if (listingId) {
        // Check if listing exists
        const listingDetails = await getListingDetails(listingId, listingType)

        if (listingDetails) {
          // Use transactionDetails if provided; otherwise fall back to listing price
          const listingPrice = 'price' in listingDetails ? listingDetails.price : listingDetails.ratePerPeso
          const txPrice = transactionDetails?.price ?? listingPrice
          const txAmount = transactionDetails?.amount

          // Create new transaction for this new conversation
          // (No need to check for existing - this conversation was just created)
          await prisma.transaction.create({
            data: {
              buyerId: currentUser.id,
              sellerId: sellerId,
              listingId: listingId,
              listingType: listingType,
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
  listingId: string,
  listingType: string = "ITEM"
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
    const listingDetails = await getListingDetails(listingId, listingType)

    if (!listingDetails) {
      return {
        success: false,
        error: "Listing not found",
      }
    }

    if (listingDetails.sellerId === currentUser.id) {
      return {
        success: false,
        error: "Cannot message yourself",
      }
    }

    // Find or create conversation using findFirst (unique constraint removed)
    let conversation = await prisma.conversation.findFirst({
      where: {
        buyerId: currentUser.id,
        sellerId: listingDetails.sellerId,
        listingId,
      },
    })

    if (!conversation) {
      conversation = await prisma.conversation.create({
        data: {
          buyerId: currentUser.id,
          sellerId: listingDetails.sellerId,
          listingId,
          listingType,
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
      // Update existing transaction price, keep amount if not specified in counteroffer
      console.log("[acceptCounterOffer] Updating existing transaction price:", transaction.id, "new price:", message.offerAmount)
      const updateData: any = { 
        price: message.offerAmount,
      }
      // Only update amount if it's specified in the message (not null/undefined)
      if (message.amount !== null && message.amount !== undefined) {
        updateData.amount = message.amount
      }
      transaction = await (prisma.transaction as any).update({
        where: { id: transaction.id },
        data: updateData,
      })
      console.log("[acceptCounterOffer] Transaction updated successfully")
    }

    // Note: We don't update the listing price - only the transaction price is changed
    // This allows sellers to negotiate different prices with different buyers

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

export interface GetUnreadMessageCountResult {
  success: boolean
  count?: number
  error?: string
}

/**
 * Get the count of conversations with unread messages for the current user
 */
export async function getUnreadMessageCount(): Promise<GetUnreadMessageCountResult> {
  try {
    unstable_noStore()

    const session = await auth()
    if (!session?.user?.email) {
      return {
        success: false,
        error: "You must be logged in",
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

    // Count conversations that have unread messages sent by other users
    const conversationsWithUnread = await prisma.conversation.findMany({
      where: {
        OR: [{ buyerId: currentUser.id }, { sellerId: currentUser.id }],
        messages: {
          some: {
            isRead: false,
            senderId: { not: currentUser.id }, // Only count messages from other users
          },
        },
      },
      select: {
        id: true,
      },
    })

    return {
      success: true,
      count: conversationsWithUnread.length,
    }
  } catch (error) {
    console.error("[getUnreadMessageCount] Error:", error)
    return {
      success: false,
      error: "Failed to get unread message count",
    }
  }
}
