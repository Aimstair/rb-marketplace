import { createRouteHandler } from "uploadthing/next"
import { ourFileRouter } from "./core"

const handlers = createRouteHandler({
  router: ourFileRouter,
})

export const GET = handlers.GET

export const POST = async (req: Request) => {
  try {
    return await handlers.POST(req)
  } catch (error) {
    console.error("❌ UploadThing POST handler error:", error)
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Upload failed",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    )
  }
}
