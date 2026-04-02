declare module "@/lib/pusher-channels" {
  export function getConversationIdFromChatChannel(channelName: string): string | null
  export function getUserIdFromNotificationsChannel(channelName: string): string | null
  export function getUserIdFromMessagingChannel(channelName: string): string | null
  export function buildChatChannel(conversationId: string): string
  export function buildPrivateChatChannel(conversationId: string): string
  export function buildNotificationsChannel(userId: string): string
  export function buildPrivateNotificationsChannel(userId: string): string
  export function buildMessagingChannel(userId: string): string
}
