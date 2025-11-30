import { createUploadthing, type FileRouter } from "uploadthing/next"
import { UploadThingError } from "uploadthing/server"
import { auth } from "@/auth"

const f = createUploadthing()

// Debug helper
function debugLog(endpoint: string, message: string, data?: any) {
  const timestamp = new Date().toISOString()
  console.log(`[UploadThing ${endpoint} ${timestamp}] ${message}`, data || "")
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

        // DEBUG: If no session, return debug user instead of throwing
        if (!session?.user?.id) {
          debugLog("listingImage", "⚠️ WARNING: No session found, using debug-user")
          return { userId: "debug-user" }
        }

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
          debugLog("userAvatar", "⚠️ WARNING: No session found, using debug-user")
          return { userId: "debug-user" }
        }

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
          debugLog("chatAttachment", "⚠️ WARNING: No session found, using debug-user")
          return { userId: "debug-user" }
        }

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
} satisfies FileRouter

export type OurFileRouter = typeof ourFileRouter
