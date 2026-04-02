import Pusher from "pusher"

type PusherServerLike = Pick<Pusher, "trigger" | "authorizeChannel">

function hasPusherServerConfig(): boolean {
  return Boolean(
    process.env.PUSHER_APP_ID &&
      process.env.PUSHER_KEY &&
      process.env.PUSHER_SECRET &&
      process.env.PUSHER_CLUSTER,
  )
}

const noopPusherServer: PusherServerLike = {
  async trigger() {
    return {} as any
  },
  authorizeChannel() {
    throw new Error("Pusher server is not configured")
  },
}

export const pusherServer: PusherServerLike = hasPusherServerConfig()
  ? new Pusher({
      appId: process.env.PUSHER_APP_ID as string,
      key: process.env.PUSHER_KEY as string,
      secret: process.env.PUSHER_SECRET as string,
      cluster: process.env.PUSHER_CLUSTER as string,
      useTLS: true,
    })
  : noopPusherServer

export function isPusherServerConfigured(): boolean {
  return hasPusherServerConfig()
}