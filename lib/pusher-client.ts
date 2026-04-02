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
