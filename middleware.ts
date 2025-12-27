// middleware.ts
import { auth } from "@/auth"
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export default auth(async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // 1. Skip system routes and static files immediately
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api/auth") || 
    pathname.match(/\.(ico|png|jpg|jpeg|svg|gif|webp|css|js)$/)
  ) {
    return NextResponse.next()
  }

  // 2. Pass the URL to the Layout so it knows where the user is
  const requestHeaders = new Headers(request.headers)
  requestHeaders.set("x-url", request.url)

  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  })
})

export const config = {
  matcher: ["/((?!api/auth|_next/static|_next/image|favicon.ico).*)"],
}