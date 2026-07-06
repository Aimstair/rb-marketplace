"use server"

import { prisma } from "@/lib/prisma"
import { unstable_cache } from "next/cache"

export async function getPublishedPosts() {
  return unstable_cache(
    async () => {
      try {
        const posts = await prisma.blogPost.findMany({
          where: { published: true },
          orderBy: { createdAt: "desc" },
          include: {
            author: {
              select: {
                username: true,
                profilePicture: true,
              }
            }
          }
        })
        return posts
      } catch (error) {
        console.error("Failed to fetch blog posts:", error)
        return []
      }
    },
    ["published-blog-posts"],
    { revalidate: 3600 } // Cache for 1 hour
  )()
}

export async function getPostBySlug(slug: string) {
  return unstable_cache(
    async () => {
      try {
        const post = await prisma.blogPost.findUnique({
          where: { slug },
          include: {
            author: {
              select: {
                username: true,
                profilePicture: true,
              }
            }
          }
        })
        return post
      } catch (error) {
        console.error(`Failed to fetch blog post ${slug}:`, error)
        return null
      }
    },
    [`blog-post-${slug}`],
    { revalidate: 3600 }
  )()
}
