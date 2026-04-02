import { createUploadthing, type FileRouter } from "uploadthing/next"
import { UploadThingError } from "uploadthing/server"
import { auth } from "@/auth"
import { checkRateLimit, getRateLimitIdentifier } from "@/lib/rate-limit"

const f = createUploadthing()
const ONE_HOUR_MS = 60 * 60 * 1000

const UPLOAD_RATE_LIMITS = {
  listingImage: { maxRequests: 20, windowMs: ONE_HOUR_MS },
  userAvatar: { maxRequests: 10, windowMs: ONE_HOUR_MS },
  chatAttachment: { maxRequests: 60, windowMs: ONE_HOUR_MS },
  hallOfShameEvidence: { maxRequests: 30, windowMs: ONE_HOUR_MS },
  giveawayImage: { maxRequests: 20, windowMs: ONE_HOUR_MS },
} as const

// Debug helper
function debugLog(endpoint: string, message: string, data?: any) {
  const timestamp = new Date().toISOString()
  console.log(`[UploadThing ${endpoint} ${timestamp}] ${message}`, data || "")
}

async function enforceUploadRateLimit(
  req: Request,
  userId: string,
  namespace: keyof typeof UPLOAD_RATE_LIMITS
) {
  const config = UPLOAD_RATE_LIMITS[namespace]
  const rate = await checkRateLimit(
    getRateLimitIdentifier({ headers: req.headers, userId }),
    config.maxRequests,
    config.windowMs,
    { namespace: `upload-${namespace}` }
  )

  if (!rate.allowed) {
    throw new UploadThingError(
      `Too many upload attempts. Try again in ${rate.retryAfterSeconds} seconds.`
    )
  }
}

export const ourFileRouter = {
  listingImage: f({ image: { maxFileSize: "4MB", maxFileCount: 1 } })
    .middleware(async ({ req }) => {
      try {
        debugLog("listingImage", "Middleware started")
        
        // Check if secret is present
        const secretStatus = process.env.UPLOADTHING_SECRET ? "Secret Present" : "Secret Missing"
        debugLog("listingImage", secretStatus)
        
        // Try to get auth session
        debugLog("listingImage", "Calling auth()...")
        const session = await auth()
        debugLog("listingImage", "Auth returned", {
          hasSession: !!session,
          hasUser: !!session?.user,
          userId: session?.user?.id,
        })

        if (!session?.user?.id) {
          debugLog("listingImage", "❌ Unauthorized: no active session")
          throw new UploadThingError("Unauthorized")
        }

        await enforceUploadRateLimit(req, session.user.id, "listingImage")

        debugLog("listingImage", "✅ Auth successful", { userId: session.user.id })
        return { userId: session.user.id }
      } catch (error) {
        debugLog("listingImage", "❌ Middleware error", {
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
        })
        throw error
      }
    })
    .onUploadComplete(async ({ metadata, file }) => {
      try {
        debugLog("listingImage", "🚀 onUploadComplete START")
        debugLog("listingImage", "✅ Upload complete", {
          userId: metadata.userId,
          fileUrl: file.url,
          fileName: file.name,
        })
        return { uploadedBy: metadata.userId }
      } catch (error) {
        debugLog("listingImage", "❌ onUploadComplete caught error", {
          error: error instanceof Error ? error.message : String(error),
        })
        // Return success anyway - don't break the upload
        return { uploadedBy: metadata.userId }
      }
    }),

  userAvatar: f({ image: { maxFileSize: "2MB", maxFileCount: 1 } })
    .middleware(async ({ req }) => {
      try {
        debugLog("userAvatar", "Middleware started")
        
        const secretStatus = process.env.UPLOADTHING_SECRET ? "Secret Present" : "Secret Missing"
        debugLog("userAvatar", secretStatus)
        
        debugLog("userAvatar", "Calling auth()...")
        const session = await auth()
        debugLog("userAvatar", "Auth returned", {
          hasSession: !!session,
          hasUser: !!session?.user,
          userId: session?.user?.id,
        })

        if (!session?.user?.id) {
          debugLog("userAvatar", "❌ Unauthorized: no active session")
          throw new UploadThingError("Unauthorized")
        }

        await enforceUploadRateLimit(req, session.user.id, "userAvatar")

        debugLog("userAvatar", "✅ Auth successful", { userId: session.user.id })
        return { userId: session.user.id }
      } catch (error) {
        debugLog("userAvatar", "❌ Middleware error", {
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
        })
        throw error
      }
    })
    .onUploadComplete(async ({ metadata, file }) => {
      try {
        debugLog("userAvatar", "🚀 onUploadComplete START")
        debugLog("userAvatar", "✅ Upload complete", {
          userId: metadata.userId,
          fileUrl: file.url,
          fileName: file.name,
        })
        return { uploadedBy: metadata.userId }
      } catch (error) {
        debugLog("userAvatar", "❌ onUploadComplete caught error", {
          error: error instanceof Error ? error.message : String(error),
        })
        // Return success anyway - don't break the upload
        return { uploadedBy: metadata.userId }
      }
    }),

  chatAttachment: f({ image: { maxFileSize: "4MB", maxFileCount: 1 } })
    .middleware(async ({ req }) => {
      try {
        debugLog("chatAttachment", "Middleware started")
        
        const secretStatus = process.env.UPLOADTHING_SECRET ? "Secret Present" : "Secret Missing"
        debugLog("chatAttachment", secretStatus)
        
        debugLog("chatAttachment", "Calling auth()...")
        const session = await auth()
        debugLog("chatAttachment", "Auth returned", {
          hasSession: !!session,
          hasUser: !!session?.user,
          userId: session?.user?.id,
        })

        if (!session?.user?.id) {
          debugLog("chatAttachment", "❌ Unauthorized: no active session")
          throw new UploadThingError("Unauthorized")
        }

        await enforceUploadRateLimit(req, session.user.id, "chatAttachment")

        debugLog("chatAttachment", "✅ Auth successful", { userId: session.user.id })
        return { userId: session.user.id }
      } catch (error) {
        debugLog("chatAttachment", "❌ Middleware error", {
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
        })
        throw error
      }
    })
    .onUploadComplete(async ({ metadata, file }) => {
      try {
        debugLog("chatAttachment", "🚀 onUploadComplete START")
        debugLog("chatAttachment", "✅ Upload complete", {
          userId: metadata.userId,
          fileUrl: file.url,
          fileName: file.name,
        })
        return { uploadedBy: metadata.userId }
      } catch (error) {
        debugLog("chatAttachment", "❌ onUploadComplete caught error", {
          error: error instanceof Error ? error.message : String(error),
        })
        // Return success anyway - don't break the upload
        return { uploadedBy: metadata.userId }
      }
    }),

  hallOfShameEvidence: f({ image: { maxFileSize: "8MB", maxFileCount: 8 } })
    .middleware(async ({ req }) => {
      try {
        debugLog("hallOfShameEvidence", "Middleware started")

        const secretStatus = process.env.UPLOADTHING_SECRET ? "Secret Present" : "Secret Missing"
        debugLog("hallOfShameEvidence", secretStatus)

        debugLog("hallOfShameEvidence", "Calling auth()...")
        const session = await auth()
        debugLog("hallOfShameEvidence", "Auth returned", {
          hasSession: !!session,
          hasUser: !!session?.user,
          userId: session?.user?.id,
        })

        if (!session?.user?.id) {
          debugLog("hallOfShameEvidence", "❌ Unauthorized: no active session")
          throw new UploadThingError("Unauthorized")
        }

        await enforceUploadRateLimit(req, session.user.id, "hallOfShameEvidence")

        debugLog("hallOfShameEvidence", "✅ Auth successful", { userId: session.user.id })
        return { userId: session.user.id }
      } catch (error) {
        debugLog("hallOfShameEvidence", "❌ Middleware error", {
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
        })
        throw error
      }
    })
    .onUploadComplete(async ({ metadata, file }) => {
      try {
        debugLog("hallOfShameEvidence", "🚀 onUploadComplete START")
        debugLog("hallOfShameEvidence", "✅ Upload complete", {
          userId: metadata.userId,
          fileUrl: file.url,
          fileName: file.name,
        })
        return { uploadedBy: metadata.userId }
      } catch (error) {
        debugLog("hallOfShameEvidence", "❌ onUploadComplete caught error", {
          error: error instanceof Error ? error.message : String(error),
        })
        return { uploadedBy: metadata.userId }
      }
    }),

  giveawayImage: f({ image: { maxFileSize: "4MB", maxFileCount: 1 } })
    .middleware(async ({ req }) => {
      try {
        debugLog("giveawayImage", "Middleware started")

        const secretStatus = process.env.UPLOADTHING_SECRET ? "Secret Present" : "Secret Missing"
        debugLog("giveawayImage", secretStatus)

        debugLog("giveawayImage", "Calling auth()...")
        const session = await auth()
        debugLog("giveawayImage", "Auth returned", {
          hasSession: !!session,
          hasUser: !!session?.user,
          userId: session?.user?.id,
        })

        if (!session?.user?.id) {
          debugLog("giveawayImage", "❌ Unauthorized: no active session")
          throw new UploadThingError("Unauthorized")
        }

        await enforceUploadRateLimit(req, session.user.id, "giveawayImage")

        debugLog("giveawayImage", "✅ Auth successful", { userId: session.user.id })
        return { userId: session.user.id }
      } catch (error) {
        debugLog("giveawayImage", "❌ Middleware error", {
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
        })
        throw error
      }
    })
    .onUploadComplete(async ({ metadata, file }) => {
      try {
        debugLog("giveawayImage", "🚀 onUploadComplete START")
        debugLog("giveawayImage", "✅ Upload complete", {
          userId: metadata.userId,
          fileUrl: file.url,
          fileName: file.name,
        })
        return { uploadedBy: metadata.userId }
      } catch (error) {
        debugLog("giveawayImage", "❌ onUploadComplete caught error", {
          error: error instanceof Error ? error.message : String(error),
        })
        return { uploadedBy: metadata.userId }
      }
    }),

} satisfies FileRouter

export type OurFileRouter = typeof ourFileRouter
