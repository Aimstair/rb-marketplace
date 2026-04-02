import { checkRateLimit, getRateLimitIdentifier } from "@/lib/rate-limit"

export async function GET(request: Request) {
  try {
    const rate = await checkRateLimit(
      getRateLimitIdentifier({ headers: request.headers, fallback: "api-health" }),
      600,
      60 * 1000,
      { namespace: "api-health" }
    )

    if (!rate.allowed) {
      return Response.json(
        {
          status: "rate_limited",
          retryAfterSeconds: rate.retryAfterSeconds,
        },
        { status: 429 }
      )
    }

    // Check if the application is running
    return Response.json({ 
      status: 'ok',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV 
    })
  } catch (error) {
    return Response.json({ 
      status: 'error',
      message: 'Health check failed' 
    }, { status: 500 })
  }
}
