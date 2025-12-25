import { NextRequest, NextResponse } from "next/server"
import { checkRateLimit, getClientIp } from "@/lib/rate-limit"
import { prisma } from "@/lib/prisma"

export async function withRateLimit(
  request: NextRequest,
  handler: () => Promise<NextResponse>
): Promise<NextResponse> {
  try {
    // Get IP rate limit setting
    const setting = await prisma.systemSettings.findUnique({
      where: { key: "ip_rate_limit" },
    })
    const maxRequests = setting ? parseInt(setting.value) : 60

    // Get client IP
    const ip = getClientIp(request.headers)

    // Check rate limit
    const { allowed, remaining, resetTime } = await checkRateLimit(
      ip,
      maxRequests,
      60 * 1000 // 1 minute window
    )

    // If not allowed, return 429
    if (!allowed) {
      const resetDate = new Date(resetTime)
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        {
          status: 429,
          headers: {
            "X-RateLimit-Limit": maxRequests.toString(),
            "X-RateLimit-Remaining": "0",
            "X-RateLimit-Reset": resetDate.toISOString(),
            "Retry-After": Math.ceil((resetTime - Date.now()) / 1000).toString(),
          },
        }
      )
    }

    // Execute the handler
    const response = await handler()

    // Add rate limit headers to response
    response.headers.set("X-RateLimit-Limit", maxRequests.toString())
    response.headers.set("X-RateLimit-Remaining", remaining.toString())
    response.headers.set("X-RateLimit-Reset", new Date(resetTime).toISOString())

    return response
  } catch (error) {
    console.error("Rate limit error:", error)
    // On error, allow the request to proceed
    return handler()
  }
}
