"use server"

import { prisma } from "@/lib/prisma"
import { auth } from "@/auth"
import bcrypt from "bcrypt"

export interface UserProfileData {
  id: string
  username: string
  avatar?: string
  banner?: string
  bio?: string
  socialLinks?: Record<string, any>
  isVerified: boolean
  isBanned: boolean
  joinDate: Date
  vouchCount: number
  averageRating: number
  ratingBreakdown: { [key: number]: number }
  responseRate: number
  followers: number
  following: number
  listings: any[]
  vouches: any[]
  reports: any[]
  transactions: any[]
  soldItems: number
  isFollowing: boolean
  isOwnProfile: boolean
  robloxProfile?: string
  discordTag?: string
  lastActive: Date
  subscriptionTier: string
  subscriptionStatus: string
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
        itemListings: {
          where: { status: "available" },
          include: {
            game: {
              select: { displayName: true }
            }
          },
          take: 20,
          orderBy: { createdAt: "desc" }
        },
        currencyListings: {
          where: { status: "available" },
          include: {
            game: {
              select: { displayName: true }
            }
          },
          take: 20,
          orderBy: { createdAt: "desc" }
        },
        vouchesReceived: {
          where: {
            status: "VALID", // Only include valid vouches
          },
          include: {
            fromUser: {
              select: { id: true, username: true, profilePicture: true },
            },
          },
          orderBy: { createdAt: "desc" },
          take: 10,
        },
        userReportsReceived: {
          include: {
            reporter: {
              select: { id: true, username: true, profilePicture: true },
            },
          },
          orderBy: { createdAt: "desc" },
        },
      } as any,
    }) as any

    if (!user) {
      return { success: false, error: "User not found" }
    }

    // Combine item and currency listings into a unified array
    const itemListings = (user.itemListings || []).map((listing: any) => ({
      id: listing.id,
      title: listing.title,
      description: listing.description,
      price: listing.price,
      image: listing.image,
      status: listing.status,
      game: listing.game?.displayName || "Unknown Game",
      createdAt: listing.createdAt,
      views: listing.views || 0,
      listingType: "ITEM" as const
    }))

    const currencyListings = (user.currencyListings || []).map((listing: any) => ({
      id: listing.id,
      title: listing.title,
      description: listing.description,
      price: listing.ratePerPeso,
      image: listing.image,
      status: listing.status,
      game: listing.game?.displayName || "Unknown Game",
      createdAt: listing.createdAt,
      views: listing.views || 0,
      listingType: "CURRENCY" as const
    }))

    // Combine and sort by creation date
    const allListings = [...itemListings, ...currencyListings].sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )

    // Parse social links from JSON
    let socialLinks: Record<string, any> | undefined = undefined
    if (user.socialLinks) {
      try {
        socialLinks = typeof user.socialLinks === "string" ? JSON.parse(user.socialLinks) : user.socialLinks as Record<string, any>
      } catch {
        socialLinks = undefined
      }
    }

    // Calculate average rating and rating breakdown
    const vouches = user.vouchesReceived || []
    let averageRating = 0
    const ratingBreakdown: { [key: number]: number } = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
    
    if (vouches.length > 0) {
      const totalRating = vouches.reduce((sum: number, v: any) => sum + (v.rating || 5), 0)
      averageRating = totalRating / vouches.length
      
      // Count ratings for breakdown
      vouches.forEach((v: any) => {
        const rating = v.rating || 5
        if (rating >= 1 && rating <= 5) {
          ratingBreakdown[rating]++
        }
      })
    }

    // Calculate successful transactions (COMPLETED status)
    const successfulTransactions = await prisma.transaction.count({
      where: {
        OR: [
          { buyerId: user.id },
          { sellerId: user.id },
        ],
        status: "COMPLETED",
      },
    })

    // Fetch completed transactions with details
    let transactions: any[] = []
    try {
      const rawTransactions = await prisma.transaction.findMany({
        where: {
          OR: [
            { buyerId: user.id },
            { sellerId: user.id },
          ],
          status: "COMPLETED",
        },
        include: {
          buyer: {
            select: { id: true, username: true, profilePicture: true },
          },
          seller: {
            select: { id: true, username: true, profilePicture: true },
          },
        },
        orderBy: { updatedAt: "desc" },
        take: 50,
      })

      // Manually fetch listing details based on listingType
      transactions = await Promise.all(
        rawTransactions.map(async (t: any) => {
          let listing = null
          let game = null

          try {
            if (t.listingType === "ITEM") {
              listing = await prisma.itemListing.findUnique({
                where: { id: t.listingId },
                select: {
                  id: true,
                  title: true,
                  image: true,
                  game: {
                    select: { displayName: true }
                  }
                },
              })
              game = listing?.game?.displayName
            } else if (t.listingType === "CURRENCY") {
              listing = await prisma.currencyListing.findUnique({
                where: { id: t.listingId },
                select: {
                  id: true,
                  title: true,
                  image: true,
                  game: {
                    select: { displayName: true }
                  }
                },
              })
              game = listing?.game?.displayName
            } else if (t.listingType === "OLD") {
              // Handle old listings table
              listing = await prisma.listing.findUnique({
                where: { id: t.listingId },
                select: {
                  id: true,
                  title: true,
                  image: true,
                  game: true,
                },
              })
              game = listing?.game
            }
          } catch (err) {
            console.error("Error fetching listing for transaction:", t.id, err)
          }

          return {
            ...t,
            listing,
            game,
          }
        })
      )
    } catch (err) {
      console.error("Error fetching transactions:", err)
      transactions = []
    }

    // Calculate response rate from conversations
    const conversations = await prisma.conversation.findMany({
      where: {
        OR: [
          { buyerId: user.id },
          { sellerId: user.id },
        ],
      },
      include: {
        messages: {
          orderBy: { createdAt: "asc" },
          take: 2, // First message and first response
        },
      },
    })

    let responseRate = 100 // Default to 100% if no data
    if (conversations.length > 0) {
      const conversationsWithResponses = conversations.filter((conv) => {
        if (conv.messages.length < 2) return false
        const firstMessage = conv.messages[0]
        const secondMessage = conv.messages[1]
        // Check if user responded to the first message
        return firstMessage.senderId !== user.id && secondMessage.senderId === user.id
      })
      responseRate = Math.round((conversationsWithResponses.length / conversations.length) * 100)
    }

    // Check if current user is viewing their own profile
    const session = await auth()
    let isOwnProfile = false
    if (session?.user?.email) {
      const currentUser = await prisma.user.findUnique({
        where: { email: session.user.email },
        select: { id: true },
      })
      isOwnProfile = currentUser?.id === user.id
    }

    const profileData: UserProfileData = {
      id: user.id,
      username: user.username,
      avatar: user.profilePicture || undefined,
      banner: user.banner || undefined,
      bio: user.bio || undefined,
      socialLinks,
      isVerified: user.isVerified || false,
      isBanned: user.isBanned || false,
      joinDate: user.joinDate,
      vouchCount: vouches.length,
      averageRating,
      ratingBreakdown,
      responseRate,
      followers: 0, // TODO: Query UserFollow model when available
      following: 0, // TODO: Query UserFollow model when available
      listings: allListings,
      vouches: vouches.map((v: any) => ({
        id: v.id,
        rating: v.rating,
        comment: v.message,
        fromUser: v.fromUser,
        createdAt: v.createdAt,
      })),
      reports: (user.userReportsReceived || []).map((report: any) => ({
        id: report.id,
        reason: report.reason,
        details: report.details,
        status: report.status,
        createdAt: report.createdAt,
        reporter: report.reporter,
      })),
      transactions: transactions.map((t: any) => ({
        id: t.id,
        buyerId: t.buyerId,
        sellerId: t.sellerId,
        buyerUsername: t.buyer?.username || "Unknown",
        sellerUsername: t.seller?.username || "Unknown",
        listingId: t.listingId,
        listingTitle: t.listing?.title || "Unknown Item",
        listingImage: t.listing?.image || "/placeholder.svg",
        game: t.game || "Roblox",
        amount: t.totalPrice || t.price,
        status: t.status,
        createdAt: t.createdAt,
        completedAt: t.updatedAt,
      })),
      soldItems: successfulTransactions,
      isFollowing: false, // TODO: Check current user follow status when auth is implemented
      isOwnProfile,
      robloxProfile: user.robloxProfile || undefined,
      discordTag: user.discordTag || undefined,
      lastActive: user.lastActive || new Date(),
      subscriptionTier: user.subscriptionTier,
      subscriptionStatus: user.subscriptionStatus,
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
    // Get current authenticated user
    const session = await auth()
    if (!session?.user?.email) {
      return {
        success: false,
        error: "You must be logged in to update your profile",
      }
    }

    // Find the current user by email from session
    const currentUser = await prisma.user.findUnique({
      where: { email: session.user.email },
    })

    if (!currentUser) {
      return {
        success: false,
        error: "User account not found",
      }
    }

    // Check bio for prohibited content
    if (data.bio) {
      const { moderateContent } = await import("@/lib/moderation")
      const moderationCheck = await moderateContent(data.bio, "profile")

      if (!moderationCheck.isAllowed) {
        return {
          success: false,
          error: `Your bio contains prohibited content: ${moderationCheck.reason}`,
        }
      }
    }

    const updateData: any = {}

    if (data.bio !== undefined) updateData.bio = data.bio
    // Only update banner if it has a value (not empty string)
    if (data.banner !== undefined && data.banner !== "") updateData.banner = data.banner
    // Only update profilePicture if it has a value (not empty string)
    if (data.avatar !== undefined && data.avatar !== "") updateData.profilePicture = data.avatar
    if (data.robloxProfile !== undefined) updateData.robloxProfile = data.robloxProfile
    if (data.discordTag !== undefined) updateData.discordTag = data.discordTag

    if (data.socialLinks) {
      updateData.socialLinks = data.socialLinks
    }

    console.log("Updating profile with data:", updateData)

    const updatedUser = await prisma.user.update({
      where: { id: currentUser.id },
      data: updateData,
    })

    const result: Partial<UserProfileData> = {
      bio: updatedUser.bio || undefined,
      banner: updatedUser.banner || undefined,
      avatar: updatedUser.profilePicture || undefined,
      socialLinks: updatedUser.socialLinks as Record<string, any> || undefined,
    }

    return { success: true, data: result }
  } catch (err) {
    console.error("Failed to update profile:", err)
    return { success: false, error: err instanceof Error ? err.message : "Failed to update profile" }
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
        vouchesReceived: { where: { status: "VALID" }, select: { id: true } }, // Only count valid vouches
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

/**
 * Change user password
 */
export async function changePassword(data: {
  currentPassword: string
  newPassword: string
}): Promise<{ success: boolean; error?: string }> {
  try {
    // Get current authenticated user
    const session = await auth()
    if (!session?.user?.email) {
      return {
        success: false,
        error: "You must be logged in to change your password",
      }
    }

    // Validate passwords
    if (!data.currentPassword || !data.newPassword) {
      return {
        success: false,
        error: "Current password and new password are required",
      }
    }

    if (data.newPassword.length < 8) {
      return {
        success: false,
        error: "New password must be at least 8 characters long",
      }
    }

    // Find the current user by email from session
    const currentUser = await prisma.user.findUnique({
      where: { email: session.user.email },
    })

    if (!currentUser || !currentUser.password) {
      return {
        success: false,
        error: "User account not found",
      }
    }

    // Verify current password
    const passwordMatch = await bcrypt.compare(
      data.currentPassword,
      currentUser.password
    )

    if (!passwordMatch) {
      return {
        success: false,
        error: "Current password is incorrect",
      }
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(data.newPassword, 10)

    // Update password
    await prisma.user.update({
      where: { id: currentUser.id },
      data: { password: hashedPassword },
    })

    return { success: true }
  } catch (err) {
    console.error("Failed to change password:", err)
    return {
      success: false,
      error: "Failed to change password. Please try again.",
    }
  }
}

/**
 * Get user preferences
 */
export async function getUserPreferences(): Promise<{
  success: boolean
  preferences?: any
  error?: string
}> {
  try {
    const session = await auth()
    if (!session?.user?.email) {
      return { success: false, error: "Not authenticated" }
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: { preferences: true },
    })

    if (!user) {
      return { success: false, error: "User not found" }
    }

    // Return preferences or defaults if not set
    const preferences = user.preferences || {
      profileVisibility: true,
      showEmail: false,
      showRobloxProfile: true,
      showActivityStatus: true,
      allowMessageRequests: true,
      notifyNewMessages: true,
      notifyListingViews: true,
      notifyPriceAlerts: false,
      notifyVouches: true,
      notifyTradeUpdates: true,
      notifyMarketingEmails: false,
    }

    return { success: true, preferences }
  } catch (err) {
    console.error("Failed to get user preferences:", err)
    return { success: false, error: "Failed to load preferences" }
  }
}

/**
 * Update user preferences (privacy and notifications)
 */
export async function updateUserPreferences(preferences: {
  profileVisibility?: boolean
  showEmail?: boolean
  showRobloxProfile?: boolean
  showActivityStatus?: boolean
  allowMessageRequests?: boolean
  notifyNewMessages?: boolean
  notifyListingViews?: boolean
  notifyPriceAlerts?: boolean
  notifyVouches?: boolean
  notifyTradeUpdates?: boolean
  notifyMarketingEmails?: boolean
}): Promise<{
  success: boolean
  error?: string
}> {
  try {
    const session = await auth()
    if (!session?.user?.email) {
      return { success: false, error: "Not authenticated" }
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true },
    })

    if (!user) {
      return { success: false, error: "User not found" }
    }

    // Upsert preferences
    await prisma.userPreferences.upsert({
      where: { userId: user.id },
      update: preferences,
      create: {
        userId: user.id,
        ...preferences,
      },
    })

    return { success: true }
  } catch (err) {
    console.error("Failed to update user preferences:", err)
    return { success: false, error: "Failed to update preferences" }
  }
}
