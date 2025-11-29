"use server"

import { prisma } from "@/lib/prisma"

export interface UserProfileData {
  id: string
  username: string
  avatar?: string
  banner?: string
  bio?: string
  socialLinks?: Record<string, any>
  isVerified: boolean
  joinDate: Date
  vouchCount: number
  responseRate: number
  followers: number
  following: number
  listings: any[]
  vouches: any[]
  soldItems: number
  isFollowing: boolean
  robloxProfile?: string
  discordTag?: string
  lastActive: Date
}

export interface GetProfileResult {
  success: boolean
  data?: UserProfileData
  error?: string
}

export interface UpdateProfileResult {
  success: boolean
  data?: Partial<UserProfileData>
  error?: string
}

export interface ToggleFollowResult {
  success: boolean
  isFollowing?: boolean
  error?: string
}

/**
 * Fetch a user's public profile with all related data
 */
export async function getProfile(usernameOrId: string): Promise<GetProfileResult> {
  try {
    const user = await prisma.user.findFirst({
      where: {
        OR: [{ id: usernameOrId }, { username: usernameOrId }],
      },
      include: {
        listings: {
          where: { status: "available" },
          take: 20,
        },
        vouchesReceived: {
          include: {
            fromUser: {
              select: { id: true, username: true, profilePicture: true },
            },
          },
          orderBy: { createdAt: "desc" },
          take: 10,
        },
      } as any,
    }) as any

    if (!user) {
      return { success: false, error: "User not found" }
    }

    // Parse social links from JSON
    let socialLinks: Record<string, any> | undefined = undefined
    if (user.socialLinks) {
      try {
        socialLinks = typeof user.socialLinks === "string" ? JSON.parse(user.socialLinks) : user.socialLinks as Record<string, any>
      } catch {
        socialLinks = undefined
      }
    }

    const profileData: UserProfileData = {
      id: user.id,
      username: user.username,
      avatar: user.profilePicture || undefined,
      banner: user.banner || undefined,
      bio: user.bio || undefined,
      socialLinks,
      isVerified: user.isVerified || false,
      joinDate: user.joinDate,
      vouchCount: user.vouchesReceived?.length || 0,
      responseRate: 95, // TODO: Calculate from actual message response times
      followers: 0, // TODO: Query UserFollow model when available
      following: 0, // TODO: Query UserFollow model when available
      listings: user.listings || [],
      vouches: (user.vouchesReceived || []).map((v: any) => ({
        id: v.id,
        rating: v.rating,
        comment: v.message,
        fromUser: v.fromUser,
        createdAt: v.createdAt,
      })),
      soldItems: 0, // TODO: Query sellerTransactions when available
      isFollowing: false, // TODO: Check current user follow status when auth is implemented
      robloxProfile: user.robloxProfile || undefined,
      discordTag: user.discordTag || undefined,
      lastActive: user.lastActive || new Date(),
    }

    return { success: true, data: profileData }
  } catch (err) {
    console.error("Failed to get profile:", err)
    return { success: false, error: "Failed to load profile" }
  }
}

/**
 * Update current user's profile
 */
export async function updateProfile(data: Partial<UserProfileData>): Promise<UpdateProfileResult> {
  try {
    // TODO: Get current user from auth context
    const currentUserId = "placeholder-user-id"

    const updateData: any = {}

    if (data.bio !== undefined) updateData.bio = data.bio
    if (data.banner !== undefined) updateData.banner = data.banner
    if (data.avatar !== undefined) updateData.profilePicture = data.avatar
    if (data.robloxProfile !== undefined) updateData.robloxProfile = data.robloxProfile
    if (data.discordTag !== undefined) updateData.discordTag = data.discordTag

    if (data.socialLinks) {
      updateData.socialLinks = data.socialLinks
    }

    const updatedUser = await prisma.user.update({
      where: { id: currentUserId },
      data: updateData,
      include: {
        listings: { where: { status: "available" } },
        vouchesReceived: {
          include: { fromUser: { select: { id: true, username: true, image: true } } },
        },
      } as any,
    }) as any

    let socialLinks: Record<string, any> | undefined = undefined
    if (updatedUser.socialLinks) {
      try {
        socialLinks = typeof updatedUser.socialLinks === "string" ? JSON.parse(updatedUser.socialLinks) : updatedUser.socialLinks as Record<string, any>
      } catch {
        socialLinks = undefined
      }
    }

    const result: Partial<UserProfileData> = {
      bio: updatedUser.bio || undefined,
      banner: updatedUser.banner || undefined,
      avatar: updatedUser.profilePicture || undefined,
      socialLinks,
    }

    return { success: true, data: result }
  } catch (err) {
    console.error("Failed to update profile:", err)
    return { success: false, error: "Failed to update profile" }
  }
}

/**
 * Toggle follow status between two users
 */
export async function toggleFollow(targetUserId: string): Promise<ToggleFollowResult> {
  try {
    // TODO: Get current user from auth context
    const currentUserId = "placeholder-user-id"

    // Prevent self-follow
    if (currentUserId === targetUserId) {
      return { success: false, error: "Cannot follow yourself" }
    }

    // Use raw query to work with UserFollow model during transition
    try {
      const existingFollow = await (prisma as any).$queryRaw`
        SELECT id FROM "user_follows" 
        WHERE "followerId" = ${currentUserId}::text 
        AND "followingId" = ${targetUserId}::text
      `

      if ((existingFollow as any[]).length > 0) {
        // Unfollow
        await (prisma as any).$executeRaw`
          DELETE FROM "user_follows" 
          WHERE "followerId" = ${currentUserId}::text 
          AND "followingId" = ${targetUserId}::text
        `
        return { success: true, isFollowing: false }
      } else {
        // Follow
        await (prisma as any).$executeRaw`
          INSERT INTO "user_follows" (id, "followerId", "followingId", "createdAt")
          VALUES (
            gen_random_uuid(),
            ${currentUserId}::text,
            ${targetUserId}::text,
            NOW()
          )
        `
        return { success: true, isFollowing: true }
      }
    } catch {
      // Fallback: UserFollow model may not be available yet
      return { success: false, error: "Follow feature not yet available" }
    }
  } catch (err) {
    console.error("Failed to toggle follow:", err)
    return { success: false, error: "Failed to toggle follow status" }
  }
}

/**
 * Get quick profile statistics
 */
export async function getProfileStats(userId: string) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        listings: { where: { status: "available" }, select: { id: true } },
        vouchesReceived: { select: { id: true } },
      } as any,
    }) as any

    if (!user) {
      return { success: false, error: "User not found" }
    }

    // Get follower/following counts from raw query
    try {
      const followersCount = await (prisma as any).$queryRaw`
        SELECT COUNT(*) as count FROM "user_follows" 
        WHERE "followingId" = ${userId}::text
      `
      const followingCount = await (prisma as any).$queryRaw`
        SELECT COUNT(*) as count FROM "user_follows" 
        WHERE "followerId" = ${userId}::text
      `

      return {
        success: true,
        data: {
          followers: (followersCount as any)[0]?.count || 0,
          following: (followingCount as any)[0]?.count || 0,
          activeListings: user.listings?.length || 0,
          soldItems: 0, // TODO: Query when sellerTransactions available
          vouch: user.vouchesReceived?.length || 0,
        },
      }
    } catch {
      // Fallback if follow queries fail
      return {
        success: true,
        data: {
          followers: 0,
          following: 0,
          activeListings: user.listings?.length || 0,
          soldItems: 0,
          vouch: user.vouchesReceived?.length || 0,
        },
      }
    }
  } catch (err) {
    console.error("Failed to get profile stats:", err)
    return { success: false, error: "Failed to load statistics" }
  }
}
