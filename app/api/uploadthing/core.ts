import { createUploadthing, type FileRouter } from "uploadthing/next"
import { UploadThingError } from "uploadthing/server"

const f = createUploadthing()

// Mock authentication - in production, verify from session/cookies
const auth = async () => {
  // This would normally verify the user from NextAuth session or similar
  // For now, we'll return a mock userId
  return { userId: "user-123" }
}

export const ourFileRouter = {
  listingImage: f({ image: { maxFileSize: "4MB", maxFileCount: 1 } })
    .middleware(async () => {
      const user = await auth()
      if (!user) throw new UploadThingError("Unauthorized")
      return { userId: user.userId }
    })
    .onUploadComplete(async ({ metadata, file }) => {
      console.log("Listing image uploaded:", file.url)
      return { uploadedBy: metadata.userId, url: file.url }
    }),

  userAvatar: f({ image: { maxFileSize: "2MB", maxFileCount: 1 } })
    .middleware(async () => {
      const user = await auth()
      if (!user) throw new UploadThingError("Unauthorized")
      return { userId: user.userId }
    })
    .onUploadComplete(async ({ metadata, file }) => {
      console.log("Avatar uploaded:", file.url)
      return { uploadedBy: metadata.userId, url: file.url }
    }),

  chatAttachment: f({ image: { maxFileSize: "4MB", maxFileCount: 1 } })
    .middleware(async () => {
      const user = await auth()
      if (!user) throw new UploadThingError("Unauthorized")
      return { userId: user.userId }
    })
    .onUploadComplete(async ({ metadata, file }) => {
      console.log("Chat attachment uploaded:", file.url)
      return { uploadedBy: metadata.userId, url: file.url }
    }),
} satisfies FileRouter

export type OurFileRouter = typeof ourFileRouter
