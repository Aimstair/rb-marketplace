const CHAT_PREFIXES = ["chat-", "private-chat-", "presence-chat-"]
const NOTIFICATION_PREFIXES = [
  "notifications-",
  "private-notifications-",
  "private-user-notifications-",
]
const MESSAGING_PREFIXES = ["messages-", "private-messages-"]

function extractIdFromPrefixes(channelName: string, prefixes: string[]): string | null {
  for (const prefix of prefixes) {
    if (!channelName.startsWith(prefix)) {
      continue
    }

    const value = channelName.slice(prefix.length).trim()
    return value.length > 0 ? value : null
  }

  return null
}

export function getConversationIdFromChatChannel(channelName: string): string | null {
  return extractIdFromPrefixes(channelName, CHAT_PREFIXES)
}

export function getUserIdFromNotificationsChannel(channelName: string): string | null {
  return extractIdFromPrefixes(channelName, NOTIFICATION_PREFIXES)
}

export function getUserIdFromMessagingChannel(channelName: string): string | null {
  return extractIdFromPrefixes(channelName, MESSAGING_PREFIXES)
}

export function buildChatChannel(conversationId: string): string {
  return `chat-${conversationId}`
}

export function buildPrivateChatChannel(conversationId: string): string {
  return `private-chat-${conversationId}`
}

export function buildNotificationsChannel(userId: string): string {
  return `notifications-${userId}`
}

export function buildPrivateNotificationsChannel(userId: string): string {
  return `private-notifications-${userId}`
}

export function buildMessagingChannel(userId: string): string {
  return `private-messages-${userId}`
}
