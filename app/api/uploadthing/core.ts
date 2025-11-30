import { createUploadthing, type FileRouter } from "uploadthing/next"
import { UploadThingError } from "uploadthing/server"
import { auth } from "@/auth"

const f = createUploadthing()

// Verbose logging helper
function logMiddleware(message: string, data?: any) {
  const timestamp = new Date().toISOString()
  console.log(`[UploadThing ${timestamp}] ${message}`, data || "")
}

export const ourFileRouter = {
  listingImage: f({ image: { maxFileSize: "4MB", maxFileCount: 1 } })
    .middleware(async ({ req }) => {
      logMiddleware("[listingImage] Middleware started")
      
      if (!process.env.UPLOADTHING_SECRET) {
        logMiddleware("[listingImage] ERROR: Missing UPLOADTHING_SECRET")
        throw new Error("Missing UPLOADTHING_SECRET")
      }
      logMiddleware("[listingImage] UPLOADTHING_SECRET is set")
      
      try {
        logMiddleware("[listingImage] Calling auth()...")
        const session = await auth()
        logMiddleware("[listingImage] Auth returned:", { 
          hasSession: !!session,
          hasUser: !!session?.user,
          userId: session?.user?.id,
          userEmail: session?.user?.email
        })
        
        if (!session?.user?.id) {
          logMiddleware("[listingImage] ERROR: No session or user ID")
          throw new UploadThingError("Unauthorized")
        }
        
        logMiddleware("[listingImage] Success: Returning userId", { userId: session.user.id })
        return { userId: session.user.id }
      } catch (e) {
        logMiddleware("[listingImage] CATCH BLOCK - Auth error:", { 
          error: e instanceof Error ? e.message : String(e),
          stack: e instanceof Error ? e.stack : undefined
        })
        throw new UploadThingError("Authentication Failed")
      }
    })
    .onUploadComplete(async ({ metadata, file }) => {
      try {
        console.log("✅ Upload complete for user:", metadata.userId)
        console.log("📂 File URL:", file.url)
        return { uploadedBy: metadata.userId }
      } catch (error) {
        console.error("❌ Error in onUploadComplete:", error)
        throw error
      }
    }),

  userAvatar: f({ image: { maxFileSize: "2MB", maxFileCount: 1 } })
    .middleware(async ({ req }) => {
      logMiddleware("[userAvatar] Middleware started")
      
      if (!process.env.UPLOADTHING_SECRET) {
        logMiddleware("[userAvatar] ERROR: Missing UPLOADTHING_SECRET")
        throw new Error("Missing UPLOADTHING_SECRET")
      }
      logMiddleware("[userAvatar] UPLOADTHING_SECRET is set")
      
      try {
        logMiddleware("[userAvatar] Calling auth()...")
        const session = await auth()
        logMiddleware("[userAvatar] Auth returned:", { 
          hasSession: !!session,
          hasUser: !!session?.user,
          userId: session?.user?.id,
          userEmail: session?.user?.email
        })
        
        if (!session?.user?.id) {
          logMiddleware("[userAvatar] ERROR: No session or user ID")
          throw new UploadThingError("Unauthorized")
        }
        
        logMiddleware("[userAvatar] Success: Returning userId", { userId: session.user.id })
        return { userId: session.user.id }
      } catch (e) {
        logMiddleware("[userAvatar] CATCH BLOCK - Auth error:", { 
          error: e instanceof Error ? e.message : String(e),
          stack: e instanceof Error ? e.stack : undefined
        })
        throw new UploadThingError("Authentication Failed")
      }
    })
    .onUploadComplete(async ({ metadata, file }) => {
      try {
        console.log("✅ Upload complete for user:", metadata.userId)
        console.log("📂 File URL:", file.url)
        return { uploadedBy: metadata.userId }
      } catch (error) {
        console.error("❌ Error in onUploadComplete:", error)
        throw error
      }
    }),

  chatAttachment: f({ image: { maxFileSize: "4MB", maxFileCount: 1 } })
    .middleware(async ({ req }) => {
      logMiddleware("[chatAttachment] Middleware started")
      
      if (!process.env.UPLOADTHING_SECRET) {
        logMiddleware("[chatAttachment] ERROR: Missing UPLOADTHING_SECRET")
        throw new Error("Missing UPLOADTHING_SECRET")
      }
      logMiddleware("[chatAttachment] UPLOADTHING_SECRET is set")
      
      try {
        logMiddleware("[chatAttachment] Calling auth()...")
        const session = await auth()
        logMiddleware("[chatAttachment] Auth returned:", { 
          hasSession: !!session,
          hasUser: !!session?.user,
          userId: session?.user?.id,
          userEmail: session?.user?.email
        })
        
        if (!session?.user?.id) {
          logMiddleware("[chatAttachment] ERROR: No session or user ID")
          throw new UploadThingError("Unauthorized")
        }
        
        logMiddleware("[chatAttachment] Success: Returning userId", { userId: session.user.id })
        return { userId: session.user.id }
      } catch (e) {
        logMiddleware("[chatAttachment] CATCH BLOCK - Auth error:", { 
          error: e instanceof Error ? e.message : String(e),
          stack: e instanceof Error ? e.stack : undefined
        })
        throw new UploadThingError("Authentication Failed")
      }
    })
    .onUploadComplete(async ({ metadata, file }) => {
      try {
        console.log("✅ Upload complete for user:", metadata.userId)
        console.log("📂 File URL:", file.url)
        return { uploadedBy: metadata.userId }
      } catch (error) {
        console.error("❌ Error in onUploadComplete:", error)
        throw error
      }
    }),
} satisfies FileRouter

export type OurFileRouter = typeof ourFileRouter
