import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { getToken } from "next-auth/jwt"

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // 1. Skip middleware for static assets and specific system routes
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") || // Skip ALL API routes to prevent infinite loops
    pathname.startsWith("/auth") ||
    pathname.startsWith("/maintenance") || // Crucial: don't redirect if already here
    pathname.match(/\.(ico|png|jpg|jpeg|svg|gif|webp|css|js)$/)
  ) {
    return NextResponse.next()
  }

  // 2. Check maintenance mode
  try {
    // Force absolute URL using the incoming request's host
    const baseUrl = request.nextUrl.origin
    
    const response = await fetch(`${baseUrl}/api/settings/maintenance`, {
      method: "GET",
      // Set a short timeout/cache policy so the site doesn't hang if the DB is slow
      next: { revalidate: 60 } 
    })

    if (response.ok) {
      const data = await response.json()
      
      if (data.maintenanceMode === true) {
        // Get user token to check role
        const token = await getToken({ 
          req: request, 
          secret: process.env.NEXTAUTH_SECRET 
        })
        
        // ALLOW admins to bypass maintenance
        if (token?.role === "admin") {
          return NextResponse.next()
        }

        // REDIRECT everyone else
        return NextResponse.redirect(new URL("/maintenance", request.url))
      }
    }
  } catch (error) {
    // If the fetch fails (e.g. during build or DB downtime), 
    // we log it but allow the request to proceed so the site doesn't go 500
    console.error("Middleware fetch failed:", error)
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    // Match all paths except those starting with api, _next/static, _next/image, or favicon.ico
    "/((?!api|_next/static|_next/image|favicon.ico).*)",
  ],
}