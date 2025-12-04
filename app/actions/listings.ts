"use server"

import { prisma } from "@/lib/prisma"
import { auth } from "@/auth"
import { z } from "zod"
import {
  createItemListingSchema,
  createCurrencyListingSchema,
  type CreateItemListingInput,
  type CreateCurrencyListingInput,
  type ListingFilters,
  type ListingResponse,
  type GetListingsResult,
  type CreateListingResult,
} from "@/lib/schemas"

export async function getListing(id: string, currentUserId?: string): Promise<{
  success: boolean
  listing?: {
    id: string
    title: string
    description: string | null
    price: number
    stock: number
    image: string
    images?: string[]
    game: string
    category: string
    itemType: string
    condition: string
    status: string
    views: number
    minOrder?: number
    maxOrder?: number
    seller: {
      id: string
      username: string
      profilePicture: string | null
      role: string
      isVerified: boolean
      joinDate: Date
      lastActive: Date
      vouchCount: number
    }
    upvotes: number
    downvotes: number
    userVote?: "UP" | "DOWN" | null
    createdAt: Date
  }
  error?: string
}> {
  try {
    if (!id) {
      return { success: false, error: "Listing ID is required" }
    }

    // If no currentUserId provided, try to get from session
    let userId = currentUserId
    if (!userId) {
      const session = await auth()
      if (session?.user?.email) {
        const user = await prisma.user.findUnique({
          where: { email: session.user.email },
          select: { id: true },
        })
        userId = user?.id
      }
    }

    const listing = await prisma.listing.findUnique({
      where: { id },
      select: {
        id: true,
        title: true,
        description: true,
        price: true,
        stock: true,
        image: true,
        game: true,
        category: true,
        itemType: true,
        condition: true,
        status: true,
        views: true,
        upvotes: true,
        downvotes: true,
        type: true,
        createdAt: true,
        seller: {
          select: {
            id: true,
            username: true,
            profilePicture: true,
            role: true,
            isVerified: true,
            joinDate: true,
            lastActive: true,
            vouchesReceived: {
              select: { id: true },
            },
            _count: {
              select: { listings: true },
            },
          },
        },
      },
    })

    if (!listing) {
      return { success: false, error: "Listing not found" }
    }

    // Increment view count
    await prisma.listing.update({
      where: { id },
      data: { views: { increment: 1 } },
    }).catch((err) => console.error("Failed to increment views:", err))

    // Get user's vote if they're logged in
    let userVote: "UP" | "DOWN" | null = null
    if (userId) {
      const vote = await prisma.listingVote.findUnique({
        where: {
          userId_listingId: {
            userId,
            listingId: id,
          },
        },
        select: { type: true },
      })
      userVote = (vote?.type as "UP" | "DOWN") || null
    }

    // Parse minOrder and maxOrder from description if it's a currency listing
    let minOrder: number | undefined
    let maxOrder: number | undefined
    if (listing.type === "CURRENCY" && listing.description) {
      const minOrderMatch = listing.description.match(/Min Order:\s*(\d+)/i)
      const maxOrderMatch = listing.description.match(/Max Order:\s*(\d+)/i)
      minOrder = minOrderMatch ? parseInt(minOrderMatch[1], 10) : undefined
      maxOrder = maxOrderMatch ? parseInt(maxOrderMatch[1], 10) : undefined
    }

    return {
      success: true,
      listing: {
        id: listing.id,
        title: listing.title,
        description: listing.description,
        price: listing.price,
        stock: listing.stock || 1,
        image: listing.image,
        images: [listing.image], // Single image for now; extend if multi-image support added
        game: listing.game,
        category: listing.category,
        itemType: listing.itemType,
        condition: listing.condition,
        status: listing.status,
        views: (listing.views || 0) + 1,
        minOrder,
        maxOrder,
        seller: {
          id: listing.seller.id,
          username: listing.seller.username,
          profilePicture: listing.seller.profilePicture,
          role: listing.seller.role,
          isVerified: listing.seller.isVerified,
          joinDate: listing.seller.joinDate,
          lastActive: listing.seller.lastActive,
          vouchCount: listing.seller.vouchesReceived.length,
        },
        upvotes: listing.upvotes || 0,
        downvotes: listing.downvotes || 0,
        userVote,
        createdAt: listing.createdAt,
      },
    }
  } catch (error) {
    console.error("Error fetching listing:", error)
    return { success: false, error: "Failed to fetch listing" }
  }
}

export async function getListings(
  filters: ListingFilters = {}
): Promise<GetListingsResult> {
  const {
    search = "",
    mainCategory = "All",
    selectedGame = "All Games",
    selectedItemType = "All",
    sortBy = "newest",
    priceRange = { min: 0, max: 1000000 },
    page = 1,
    itemsPerPage = 9,
    sellerId = undefined,
    status = undefined,
    includeSold = false,
  } = filters

  try {
    // Build where clause - filter to ITEM listings only
    const where: any = {
      type: "ITEM",
    }

    // Status filter: if sellerId is provided (profile view), allow sold listings by default
    // Otherwise, default to "available" only
    if (includeSold || sellerId) {
      // Include both available and sold when viewing a profile or when includeSold is true
      if (status) {
        where.status = status
      }
      // else: don't filter by status, show both
    } else {
      // Default to available only for marketplace view
      where.status = status || "available"
    }

    // Filter by seller if provided
    if (sellerId) {
      where.sellerId = sellerId
    }

    // Search filter
    if (search) {
      where.OR = [
        {
          title: {
            contains: search,
            mode: "insensitive",
          },
        },
        {
          seller: {
            username: {
              contains: search,
              mode: "insensitive",
            },
          },
        },
      ]
    }

    // Category filter
    if (mainCategory === "Featured") {
      where.featured = true
    } else if (mainCategory !== "All" && mainCategory !== "Accessories") {
      where.category = mainCategory
    } else if (mainCategory === "Accessories") {
      where.category = "Accessories"
    }

    // Game filter
    if (selectedGame !== "All Games") {
      where.game = selectedGame
    }

    // Item type filter (only for Games category)
    if (mainCategory === "Games" && selectedItemType !== "All") {
      where.itemType = selectedItemType
    }

    // Price range filter
    where.price = {
      gte: priceRange.min,
      lte: priceRange.max,
    }

    // Build order by
    let orderBy: any = { createdAt: "desc" }

    switch (sortBy) {
      case "price-asc":
        orderBy = { price: "asc" }
        break
      case "price-desc":
        orderBy = { price: "desc" }
        break
      case "vouch":
        orderBy = { vouchCount: "desc" }
        break
      case "upvotes":
        orderBy = { upvotes: "desc" }
        break
      case "trending":
        // For trending, we'll use a combination of upvotes and recent creation
        orderBy = [{ upvotes: "desc" }, { createdAt: "desc" }]
        break
      default:
        orderBy = { createdAt: "desc" }
    }

    // Get total count
    const total = await prisma.listing.count({ where })

    // Get paginated listings
    const listings = await prisma.listing.findMany({
      where,
      include: {
        seller: {
          select: {
            id: true,
            username: true,
          },
        },
      },
      orderBy,
      skip: (page - 1) * itemsPerPage,
      take: itemsPerPage,
    })

    // Transform to response format
    const transformedListings: ListingResponse[] = listings.map((listing: any) => ({
      id: listing.id,
      title: listing.title,
      game: listing.game,
      price: listing.price,
      image: listing.image,
      seller: {
        id: listing.seller.id,
        username: listing.seller.username,
      },
      vouch: listing.vouchCount,
      status: listing.status,
      category: listing.category,
      itemType: listing.itemType,
      condition: listing.condition,
      upvotes: listing.upvotes,
      downvotes: listing.downvotes,
      featured: listing.featured,
    }))

    const totalPages = Math.ceil(total / itemsPerPage)

    return {
      listings: transformedListings,
      total,
      totalPages,
      currentPage: page,
    }
  } catch (error) {
    console.error("Error fetching listings:", error)
    throw new Error("Failed to fetch listings")
  }
}

export async function getAvailableGames(mainCategory: string = "All"): Promise<string[]> {
  try {
    if (mainCategory === "Accessories" || mainCategory === "Featured") {
      return []
    }

    const games = await prisma.listing.findMany({
      where: {
        status: "available",
        ...(mainCategory !== "All" && { category: mainCategory }),
      },
      select: {
        game: true,
      },
      distinct: ["game"],
    })

    const gameList = games
      .map((g: any) => g.game)
      .filter((game: string) => game !== "Roblox Catalog")
      .sort()

    return ["All Games", ...gameList]
  } catch (error) {
    console.error("Error fetching available games:", error)
    return ["All Games"]
  }
}

export interface CurrencyListing {
  id: string
  game: string
  description: string | null
  currencyType: string
  ratePerPeso: number
  stock: number
  sellerId: string
  sellerUsername: string
  upvotes: number
  downvotes: number
  status: "Available" | "Sold" | "Pending"
}

// Helper function to parse currency details from description
function parseCurrencyDescription(description: string): {
  currencyType: string
  ratePerPeso: number
  stock: number
  minOrder: number
  maxOrder: number
  notes?: string
} {
  const lines = description.split("\n")
  const result: any = {}

  for (const line of lines) {
    if (line.startsWith("Currency:")) {
      result.currencyType = line.replace("Currency:", "").trim()
    } else if (line.startsWith("Rate:")) {
      const match = line.match(/₱([\d.]+)/)
      result.ratePerPeso = match ? parseFloat(match[1]) : 0
    } else if (line.startsWith("Stock:")) {
      result.stock = parseInt(line.replace("Stock:", "").trim()) || 0
    } else if (line.startsWith("Min Order:")) {
      result.minOrder = parseInt(line.replace("Min Order:", "").trim()) || 0
    } else if (line.startsWith("Max Order:")) {
      result.maxOrder = parseInt(line.replace("Max Order:", "").trim()) || 0
    } else if (line.startsWith("Notes:")) {
      result.notes = line.replace("Notes:", "").trim()
    }
  }

  return result
}

export async function getCurrencyListings(): Promise<CurrencyListing[]> {
  try {
    const listings = await prisma.listing.findMany({
      where: {
        status: "available",
        type: "CURRENCY", // Filter by type instead of game
      },
      include: {
        seller: {
          select: {
            id: true,
            username: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    })

    return listings.map((listing: any) => {
      const description = listing.description || ""
      
      // Parse currency details from description with safety checks
      const currencyMatch = description.match(/Currency: (.+?)(?:\n|$)/)
      const rateMatch = description.match(/Rate: ₱([\d.]+)/)
      const stockMatch = description.match(/Stock: (\d+)/)

      const currencyType = currencyMatch ? currencyMatch[1].trim() : "Unknown"
      const ratePerPeso = rateMatch ? parseFloat(rateMatch[1]) : 0
      // Use DB stock if available, otherwise fall back to parsed stock
      const stock = listing.stock ?? (stockMatch ? parseInt(stockMatch[1], 10) : 0)

      return {
        id: listing.id,
        game: listing.game,
        description: listing.description,
        currencyType,
        ratePerPeso,
        stock,
        sellerId: listing.sellerId,
        sellerUsername: listing.seller.username,
        upvotes: listing.upvotes || 0,
        downvotes: listing.downvotes || 0,
        status: (listing.status === "available" ? "Available" : listing.status) as
          | "Available"
          | "Sold"
          | "Pending",
      }
    })
  } catch (error) {
    console.error("Error fetching currency listings:", error)
    return []
  }
}

export async function createListing(input: CreateItemListingInput): Promise<CreateListingResult> {
  try {
    // Get current authenticated user
    const session = await auth()
    if (!session?.user?.email) {
      return {
        success: false,
        error: "You must be logged in to create a listing",
      }
    }

    // Find the seller by email from session
    const seller = await prisma.user.findUnique({
      where: { email: session.user.email },
    })

    if (!seller) {
      return {
        success: false,
        error: "User account not found",
      }
    }

    // Validate input
    const validatedData = createItemListingSchema.parse(input)

    // Create the listing with type "ITEM"
    const listing = await prisma.listing.create({
      data: {
        title: validatedData.title,
        description: validatedData.description,
        game: validatedData.game,
        price: validatedData.price,
        image: validatedData.image,
        category: validatedData.category,
        itemType: validatedData.itemType,
        condition: validatedData.condition,
        stock: validatedData.stock,
        sellerId: seller.id,
        status: "available",
        type: "ITEM",
      },
    })

    return {
      success: true,
      listingId: listing.id,
    }
  } catch (error) {
    console.error("Error creating listing:", error)
    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: error.errors[0]?.message || "Validation error",
      }
    }
    return {
      success: false,
      error: "Failed to create listing. Please try again.",
    }
  }
}

/**
 * Toggle upvote/downvote on a listing
 */
export async function toggleListingVote(
  listingId: string,
  type: "up" | "down"
): Promise<{ success: boolean; upvotes?: number; downvotes?: number; error?: string }> {
  try {
    // Get current authenticated user
    const session = await auth()
    if (!session?.user?.email) {
      return { success: false, error: "You must be logged in to vote" }
    }

    const currentUser = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true },
    })

    if (!currentUser) {
      return { success: false, error: "User not found" }
    }

    // Verify listing exists
    const listing = await prisma.listing.findUnique({
      where: { id: listingId },
      select: { id: true, upvotes: true, downvotes: true },
    })

    if (!listing) {
      return { success: false, error: "Listing not found" }
    }

    // Check if user already voted
    const existingVote = await prisma.listingVote.findUnique({
      where: {
        userId_listingId: {
          userId: currentUser.id,
          listingId,
        },
      },
    })

    const voteType = type.toUpperCase() as "UP" | "DOWN"

    if (existingVote) {
      if (existingVote.type === voteType) {
        // Same vote type - delete (toggle off)
        await prisma.listingVote.delete({
          where: {
            userId_listingId: {
              userId: currentUser.id,
              listingId,
            },
          },
        })

        // Decrement the vote count
        const updatedListing = await prisma.listing.update({
          where: { id: listingId },
          data: {
            upvotes: type === "up" ? { decrement: 1 } : undefined,
            downvotes: type === "down" ? { decrement: 1 } : undefined,
          },
          select: { upvotes: true, downvotes: true },
        })

        return {
          success: true,
          upvotes: updatedListing.upvotes || 0,
          downvotes: updatedListing.downvotes || 0,
        }
      } else {
        // Different vote type - update
        await prisma.listingVote.update({
          where: {
            userId_listingId: {
              userId: currentUser.id,
              listingId,
            },
          },
          data: { type: voteType },
        })

        // Update vote counts (decrement old, increment new)
        const oldType = existingVote.type
        const updatedListing = await prisma.listing.update({
          where: { id: listingId },
          data: {
            upvotes:
              type === "up"
                ? { increment: 1 }
                : oldType === "UP"
                  ? { decrement: 1 }
                  : undefined,
            downvotes:
              type === "down"
                ? { increment: 1 }
                : oldType === "DOWN"
                  ? { decrement: 1 }
                  : undefined,
          },
          select: { upvotes: true, downvotes: true },
        })

        return {
          success: true,
          upvotes: updatedListing.upvotes || 0,
          downvotes: updatedListing.downvotes || 0,
        }
      }
    } else {
      // No existing vote - create new one
      await prisma.listingVote.create({
        data: {
          userId: currentUser.id,
          listingId,
          type: voteType,
        },
      })

      // Increment the vote count
      const updatedListing = await prisma.listing.update({
        where: { id: listingId },
        data: {
          upvotes: type === "up" ? { increment: 1 } : undefined,
          downvotes: type === "down" ? { increment: 1 } : undefined,
        },
        select: { upvotes: true, downvotes: true },
      })

      return {
        success: true,
        upvotes: updatedListing.upvotes || 0,
        downvotes: updatedListing.downvotes || 0,
      }
    }
  } catch (error) {
    console.error("Error toggling listing vote:", error)
    return { success: false, error: "Failed to toggle vote" }
  }
}

/**
 * Report a listing for violations
 */
export async function reportListing(
  listingId: string,
  reason: string,
  details?: string
): Promise<{ success: boolean; reportId?: string; error?: string }> {
  try {
    // Get current authenticated user
    const session = await auth()
    if (!session?.user?.email) {
      return { success: false, error: "You must be logged in to report" }
    }

    const reporter = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true },
    })

    if (!reporter) {
      return { success: false, error: "User not found" }
    }

    // Verify listing exists
    const listing = await prisma.listing.findUnique({
      where: { id: listingId },
      select: { id: true },
    })

    if (!listing) {
      return { success: false, error: "Listing not found" }
    }

    // Create report
    const report = await prisma.report.create({
      data: {
        listingId,
        reporterId: reporter.id,
        reportedId: reporter.id,
        reason,
        details: details || null,
        status: "PENDING",
      },
      select: { id: true },
    })

    return {
      success: true,
      reportId: report.id,
    }
  } catch (error) {
    console.error("Error reporting listing:", error)
    return { success: false, error: "Failed to submit report" }
  }
}

export async function createCurrencyListing(input: CreateCurrencyListingInput): Promise<CreateListingResult> {
  try {
    // Get current authenticated user
    const session = await auth()
    if (!session?.user?.email) {
      return {
        success: false,
        error: "You must be logged in to create a listing",
      }
    }

    // Find the seller by email from session
    const seller = await prisma.user.findUnique({
      where: { email: session.user.email },
    })

    if (!seller) {
      return {
        success: false,
        error: "User account not found",
      }
    }

    // Validate input
    const validatedData = createCurrencyListingSchema.parse(input)

    // Create the listing with currency-specific fields in description
    const currencyDescription = `Currency: ${validatedData.currencyType}
Rate: ₱${validatedData.ratePerPeso} per unit
Stock: ${validatedData.stock}
Min Order: ${validatedData.minOrder}
Max Order: ${validatedData.maxOrder}
${validatedData.description ? `Notes: ${validatedData.description}` : ""}`

    const listing = await prisma.listing.create({
      data: {
        title: `${validatedData.currencyType} - ₱${validatedData.ratePerPeso}/unit`,
        description: currencyDescription,
        game: "Currency Exchange",
        price: Math.round(validatedData.ratePerPeso * 100),
        stock: validatedData.stock,
        image: validatedData.image,
        category: "Games",
        itemType: "Services",
        condition: "New",
        sellerId: seller.id,
        status: "available",
        type: "CURRENCY",
      },
    })

    return {
      success: true,
      listingId: listing.id,
    }
  } catch (error) {
    console.error("Error creating currency listing:", error)
    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: error.errors[0]?.message || "Validation error",
      }
    }
    return {
      success: false,
      error: "Failed to create currency listing. Please try again.",
    }
  }
}

/**
 * Get filter options from database
 * @param type - Optional filter type (CATEGORY, GAME, ITEM_TYPE, CONDITION)
 * @returns Array of filter options
 */
export async function getFilterOptions(type?: string): Promise<{
  id: string
  label: string
  value: string
}[]> {
  try {
    const where = type ? { type, isActive: true } : { isActive: true }
    
    const options = await prisma.filterOption.findMany({
      where,
      orderBy: { order: "asc" },
      select: {
        id: true,
        label: true,
        value: true,
      },
    })

    return options
  } catch (error) {
    console.error("Error fetching filter options:", error)
    return []
  }
}
