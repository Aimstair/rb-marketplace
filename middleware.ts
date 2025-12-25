import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { getToken } from "next-auth/jwt"

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Skip middleware for static files, API routes, and auth routes
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname.startsWith("/auth") ||
    pathname.match(/\.(ico|png|jpg|jpeg|svg|gif|webp|css|js)$/)
  ) {
    return NextResponse.next()
  }

  // Check maintenance mode by fetching from API
  try {
    const baseUrl = request.nextUrl.origin
    const response = await fetch(`${baseUrl}/api/settings/maintenance`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    })

    if (response.ok) {
      const data = await response.json()
      
      if (data.maintenanceMode === true) {
        // Get user token
        const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET })
        
        // Allow admins to access during maintenance
        if (token?.role !== "admin") {
          // Redirect to maintenance page (except if already on it)
          if (pathname !== "/maintenance") {
            return NextResponse.redirect(new URL("/maintenance", request.url))
          }
        }
      }
    }
  } catch (error) {
    console.error("Middleware error checking maintenance mode:", error)
    // If there's an error, allow the request to continue
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!api|_next/static|_next/image|favicon.ico).*)",
  ],
}
