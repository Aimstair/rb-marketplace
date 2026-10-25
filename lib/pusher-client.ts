"use client"

import Pusher from "pusher-js"

let pusherClient: Pusher | null = null

export function getPusherClient(): Pusher | null {
  const key = process.env.NEXT_PUBLIC_PUSHER_KEY
  const cluster = process.env.NEXT_PUBLIC_PUSHER_CLUSTER

  if (!key || !cluster) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("Pusher client is not configured. Realtime messaging is disabled.")
    }
    return null
  }

  if (!pusherClient) {
    pusherClient = new Pusher(key, {
      cluster,
      authEndpoint: "/api/pusher/auth",
      authTransport: "ajax",
    })
  }

  return pusherClient
}

type EventHandler = (data: any) => void

// How many components currently use each channel. pusher-js keeps one Channel object per name,
// and unsubscribing destroys it along with every handler bound to it, so a channel shared by the
// header and the messages page may only be unsubscribed when its last user leaves.
const channelUsers = new Map<string, number>()

/**
 * Subscribes to a channel and binds the given handlers. The returned cleanup unbinds only these
 * handlers and unsubscribes once no other component is using the channel.
 */
export function subscribeToChannel(channelName: string, handlers: Record<string, EventHandler>): () => void {
  const pusher = getPusherClient()
  if (!pusher) return () => {}

  channelUsers.set(channelName, (channelUsers.get(channelName) ?? 0) + 1)
  const channel = pusher.subscribe(channelName)
  for (const [event, handler] of Object.entries(handlers)) {
    channel.bind(event, handler)
  }

  let released = false
  return () => {
    if (released) return
    released = true

    for (const [event, handler] of Object.entries(handlers)) {
      channel.unbind(event, handler)
    }

    const remaining = (channelUsers.get(channelName) ?? 1) - 1
    if (remaining > 0) {
      channelUsers.set(channelName, remaining)
    } else {
      channelUsers.delete(channelName)
      pusher.unsubscribe(channelName)
    }
  }
}

/**
 * Calls `onResync` whenever realtime events may have been missed: the socket reconnecting after a
 * drop, or the tab becoming visible again (phones suspend background sockets). `onConnectedChange`
 * reports whether the socket is live so callers can poll while it is not.
 */
export function watchRealtimeHealth({
  onResync,
  onConnectedChange,
}: {
  onResync: () => void
  onConnectedChange?: (connected: boolean) => void
}): () => void {
  const pusher = getPusherClient()
  let wasConnected = pusher?.connection.state === "connected"
  onConnectedChange?.(wasConnected)

  const onStateChange = ({ current }: { previous: string; current: string }) => {
    const connected = current === "connected"
    if (connected && !wasConnected) onResync()
    if (connected !== wasConnected) onConnectedChange?.(connected)
    wasConnected = connected
  }

  const onVisibility = () => {
    if (document.visibilityState === "visible") onResync()
  }

  pusher?.connection.bind("state_change", onStateChange)
  document.addEventListener("visibilitychange", onVisibility)

  return () => {
    pusher?.connection.unbind("state_change", onStateChange)
    document.removeEventListener("visibilitychange", onVisibility)
  }
}
