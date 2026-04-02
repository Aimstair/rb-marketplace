import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { isPusherServerConfigured, pusherServer } from "@/lib/pusher"
import { checkRateLimit, getRateLimitIdentifier } from "@/lib/rate-limit"
import { isRealtimeMessagingFeatureEnabled } from "@/lib/feature-flags"
import {
  getConversationIdFromChatChannel,
  getUserIdFromMessagingChannel,
  getUserIdFromNotificationsChannel,
} from "../../../../lib/pusher-channels"

function rateLimitHeaders(remaining: number, resetTime: number): Record<string, string> {
  return {
    "X-RateLimit-Remaining": String(remaining),
    "X-RateLimit-Reset": String(resetTime),
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth()
    const userId = session?.user?.id

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (!isRealtimeMessagingFeatureEnabled()) {
      return NextResponse.json({ error: "Realtime messaging is disabled" }, { status: 503 })
    }

    if (!isPusherServerConfigured()) {
      return NextResponse.json({ error: "Realtime messaging is unavailable" }, { status: 503 })
    }

    const rate = await checkRateLimit(
      getRateLimitIdentifier({
        headers: request.headers,
        userId,
      }),
      120,
      60 * 1000,
      { namespace: "pusher-auth" }
    )

    if (!rate.allowed) {
      return NextResponse.json(
        { error: "Too many channel auth requests" },
        {
          status: 429,
          headers: rateLimitHeaders(rate.remaining, rate.resetTime),
        },
      )
    }

    const formData = await request.formData()
    const socketId = formData.get("socket_id")
    const channelName = formData.get("channel_name")

    if (typeof socketId !== "string" || typeof channelName !== "string") {
      return NextResponse.json(
        { error: "Missing socket_id or channel_name" },
        {
          status: 400,
          headers: rateLimitHeaders(rate.remaining, rate.resetTime),
        },
      )
    }

    const notificationUserId = getUserIdFromNotificationsChannel(channelName)
    if (notificationUserId) {
      if (notificationUserId !== userId) {
        return NextResponse.json(
          { error: "Forbidden" },
          {
            status: 403,
            headers: rateLimitHeaders(rate.remaining, rate.resetTime),
          },
        )
      }

      const channelAuth = pusherServer.authorizeChannel(socketId, channelName)
      return NextResponse.json(channelAuth, {
        headers: rateLimitHeaders(rate.remaining, rate.resetTime),
      })
    }

    const conversationId = getConversationIdFromChatChannel(channelName)
    if (conversationId) {
      const conversation = await prisma.conversation.findFirst({
        where: {
          id: conversationId,
          OR: [{ buyerId: userId }, { sellerId: userId }],
        },
        select: { id: true },
      })

      if (!conversation) {
        return NextResponse.json(
          { error: "Forbidden" },
          {
            status: 403,
            headers: rateLimitHeaders(rate.remaining, rate.resetTime),
          },
        )
      }

      const channelAuth = pusherServer.authorizeChannel(socketId, channelName)
      return NextResponse.json(channelAuth, {
        headers: rateLimitHeaders(rate.remaining, rate.resetTime),
      })
    }

    const messagingUserId = getUserIdFromMessagingChannel(channelName)
    if (messagingUserId) {
      if (messagingUserId !== userId) {
        return NextResponse.json(
          { error: "Forbidden" },
          {
            status: 403,
            headers: rateLimitHeaders(rate.remaining, rate.resetTime),
          },
        )
      }

      const channelAuth = pusherServer.authorizeChannel(socketId, channelName)
      return NextResponse.json(channelAuth, {
        headers: rateLimitHeaders(rate.remaining, rate.resetTime),
      })
    }

    return NextResponse.json(
      { error: "Unsupported channel" },
      {
        status: 403,
        headers: rateLimitHeaders(rate.remaining, rate.resetTime),
      },
    )
  } catch (error) {
    console.error("Pusher channel auth failed:", error)
    return NextResponse.json({ error: "Channel auth failed" }, { status: 500 })
  }
}
