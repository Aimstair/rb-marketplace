import { cache } from "react"
import { auth } from "@/auth"

export interface SessionUser {
  id: string
  email: string | null
  role: string
}

/**
 * The logged-in user, read from the JWT session (no database query) and memoized for the
 * rest of the request. Use this instead of looking the user up by email: the session
 * already carries the id and role, and identity must never come from client arguments.
 */
export const getSessionUser = cache(async (): Promise<SessionUser | null> => {
  const session = await auth()
  const id = session?.user?.id
  if (!id) return null
  return { id, email: session.user?.email ?? null, role: session.user?.role || "user" }
})
