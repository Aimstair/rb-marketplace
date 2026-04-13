import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

function getProfileId(pathname: string): string | null {
  const profileMatch = pathname.match(/^\/profile\/([^/]+)$/)
  return profileMatch ? decodeURIComponent(profileMatch[1]) : null
}

function isCuid(value: string): boolean {
  return /^c[a-z0-9]{24}$/.test(value)
}

export default auth(async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  const forwardedProto = (request.headers.get("x-forwarded-proto") || "").split(",")[0]?.trim().toLowerCase()
  const requestProtocol = request.nextUrl.protocol.replace(":", "").toLowerCase()
  const hostname = request.nextUrl.hostname.toLowerCase()
  const isProduction = process.env.NODE_ENV === "production"
  const isPrimaryHost = hostname === "rbmarket.app" || hostname.endsWith(".rbmarket.app")

  if (isProduction && isPrimaryHost && (forwardedProto === "http" || (!forwardedProto && requestProtocol === "http"))) {
    const httpsUrl = request.nextUrl.clone()
    httpsUrl.protocol = "https"
    return NextResponse.redirect(httpsUrl, 301)
  }

  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api/auth") ||
    pathname.match(/\.(ico|png|jpg|jpeg|svg|gif|webp|css|js)$/)
  ) {
    return NextResponse.next()
  }

  const profileId = getProfileId(pathname)
  const isProfilePageRequest = profileId !== null && (request.method === "GET" || request.method === "HEAD")

  if (isProfilePageRequest) {
    if (!isCuid(profileId)) {
      return new NextResponse("Not Found", {
        status: 404,
        headers: {
          "content-type": "text/plain; charset=utf-8",
          "x-robots-tag": "noindex, nofollow",
        },
      })
    }

    try {
      const user = await prisma.user.findUnique({
        where: { id: profileId },
        select: { id: true },
      })

      if (!user) {
        return new NextResponse("Not Found", {
          status: 404,
          headers: {
            "content-type": "text/plain; charset=utf-8",
            "x-robots-tag": "noindex, nofollow",
          },
        })
      }
    } catch (error) {
      console.error("Profile existence middleware DB check failed:", error)
    }
  }

  const requestHeaders = new Headers(request.headers)
  requestHeaders.set("x-url", request.url)

  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  })

  const search = request.nextUrl.searchParams.get("search")
  if (search === "{search_term_string}") {
    response.headers.set("x-robots-tag", "noindex, nofollow")
  }

  if (pathname.endsWith("/opengraph-image")) {
    response.headers.set("x-robots-tag", "noindex, noimageindex")
  }

  return response
})

export const config = {
  matcher: ["/((?!api/auth|_next/static|_next/image|favicon.ico).*)"],
}