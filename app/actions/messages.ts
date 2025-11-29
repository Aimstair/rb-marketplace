"use server"

import { prisma } from "@/lib/prisma"
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
  error?: string
}

/**
 * Get all conversations for the current user
 * Uses the first user from the database as placeholder until full auth is implemented
 */
export async function getConversations(): Promise<GetConversationsResult> {
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
          select: { id: true, title: true, price: true, image: true },
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
      },
      orderBy: { updatedAt: "desc" },
    }) as any[]

    // Transform conversations to response format
    const transformedConversations: ConversationWithLatestMessage[] = conversations.map((conv) => {
      const otherUser = currentUser.id === conv.buyerId ? conv.seller : conv.buyer
      const unreadMessages = conv.messages.filter(
        (msg: any) => !msg.isRead && msg.senderId !== currentUser.id
      )

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
  } = {}
): Promise<SendMessageResult> {
  try {
    if (!content || content.trim().length === 0) {
      return {
        success: false,
        error: "Message content cannot be empty",
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

      // Try to find existing conversation
      let conversation = await prisma.conversation.findUnique({
        where: {
          buyerId_sellerId_listingId: {
            buyerId,
            sellerId,
            listingId: options.listingId || null,
          },
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

    // Create the message
    const message = await prisma.message.create({
      data: {
        content: content.trim(),
        conversationId,
        senderId: currentUser.id,
        attachmentUrl: options.attachmentUrl,
      },
    })

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
 * Create or find a conversation for a specific listing
 * Useful for the "Message Seller" button on listing pages
 */
export async function getOrCreateListingConversation(
  listingId: string
): Promise<{ success: boolean; conversationId?: string; error?: string }> {
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

    // Find or create conversation
    let conversation = await prisma.conversation.findUnique({
      where: {
        buyerId_sellerId_listingId: {
          buyerId: currentUser.id,
          sellerId: listing.sellerId,
          listingId,
        },
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
