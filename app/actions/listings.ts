"use server"

import { prisma } from "@/lib/prisma"
import { auth } from "@/auth"
import { z } from "zod"
import { headers } from "next/headers"
import { moderateContent, logModerationAction } from "@/lib/moderation"
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
    pricingMode?: string
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

    // Try ItemListing first
    let listing: any = await prisma.itemListing.findUnique({
      where: { id },
      select: {
        id: true,
        title: true,
        description: true,
        price: true,
        stock: true,
        image: true,
        condition: true,
        status: true,
        views: true,
        pricingMode: true,
        upvotes: true,
        downvotes: true,
        createdAt: true,
        game: {
          select: {
            name: true,
            displayName: true,
          },
        },
        gameItem: {
          select: {
            displayName: true,
            category: true,
            itemType: true,
          },
        },
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
              select: { itemListings: true },
            },
          },
        },
      },
    })

    let listingType: "ITEM" | "CURRENCY" = "ITEM"
    let minOrder: number | undefined
    let maxOrder: number | undefined

    // If not found, try CurrencyListing
    if (!listing) {
      listing = await prisma.currencyListing.findUnique({
        where: { id },
        select: {
          id: true,
          title: true,
          description: true,
          ratePerPeso: true,
          stock: true,
          image: true,
          status: true,
          views: true,
          pricingMode: true,
          upvotes: true,
          downvotes: true,
          minOrder: true,
          maxOrder: true,
          createdAt: true,
          game: {
            select: {
              name: true,
              displayName: true,
            },
          },
          gameCurrency: {
            select: {
              displayName: true,
            },
          },
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
                select: { currencyListings: true },
              },
            },
          },
        },
      })
      
      if (listing) {
        listingType = "CURRENCY"
        minOrder = listing.minOrder
        maxOrder = listing.maxOrder
      }
    }

    if (!listing) {
      return { success: false, error: "Listing not found" }
    }

    // Track unique view - only increment if this user/session hasn't viewed before
    try {
      const headersList = await headers()
      const ipAddress = headersList.get("x-forwarded-for") || headersList.get("x-real-ip") || "unknown"
      
      // Generate session identifier for anonymous users
      const sessionId = userId ? null : `${ipAddress}-${headersList.get("user-agent") || "unknown"}`
      
      // Check if this user/session has already viewed this listing
      const existingView = await prisma.listingView.findFirst({
        where: {
          listingId: id,
          OR: [
            userId ? { userId } : { userId: null },
            sessionId ? { sessionId } : { sessionId: null },
          ].filter(condition => Object.values(condition)[0] !== null)
        }
      })

      // Only increment view count if this is a new unique view
      if (!existingView) {
        // Create view record
        await prisma.listingView.create({
          data: {
            listingId: id,
            listingType,
            userId,
            sessionId,
            ipAddress,
          }
        }).catch((err: unknown) => console.error("Failed to create view record:", err))

        // Increment view counter
        if (listingType === "ITEM") {
          await prisma.itemListing.update({
            where: { id },
            data: { views: { increment: 1 } },
          }).catch((err) => console.error("Failed to increment views:", err))
        } else {
          await prisma.currencyListing.update({
            where: { id },
            data: { views: { increment: 1 } },
          }).catch((err) => console.error("Failed to increment views:", err))
        }
      }
    } catch (err) {
      console.error("Error tracking view:", err)
      // Continue even if view tracking fails
    }

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

    // Auto-update status to SOLD if insufficient stock
    let finalStatus = listing.status
    if (listing.status === "available") {
      if (listingType === "ITEM") {
        // For item listings, check based on pricing mode
        let isInsufficient = false
        if (listing.pricingMode === "per-peso") {
          // For per-peso mode: stock must be >= price (items per peso)
          // Example: 5 items per peso needs at least 5 items in stock
          isInsufficient = listing.stock < listing.price
        } else {
          // For per-item mode: just check if stock is less than 1
          isInsufficient = listing.stock < 1
        }
        
        if (isInsufficient) {
          finalStatus = "sold"
          await prisma.itemListing.update({
            where: { id: listing.id },
            data: { status: "sold" },
          })
        }
      } else if (listingType === "CURRENCY") {
        // For currency listings, check if stock is less than the rate per peso
        // (minimum purchase is 1 peso, which requires ratePerPeso amount of currency)
        if (listing.stock < listing.ratePerPeso) {
          finalStatus = "sold"
          await prisma.currencyListing.update({
            where: { id: listing.id },
            data: { status: "sold" },
          })
        }
      }
    }

    return {
      success: true,
      listing: {
        id: listing.id,
        title: listing.title,
        description: listing.description,
        price: listingType === "ITEM" ? listing.price : listing.ratePerPeso,
        stock: listing.stock || 1,
        image: listing.image,
        images: [listing.image], // Single image for now; extend if multi-image support added
        game: listing.game.displayName,
        category: listingType === "ITEM" ? listing.gameItem.category : "Currency",
        itemType: listingType === "ITEM" ? listing.gameItem.itemType : listing.gameCurrency.displayName,
        condition: listingType === "ITEM" ? listing.condition : "New",
        status: finalStatus,
        views: listing.views || 0,
        pricingMode: listing.pricingMode || "per-item",
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
    // Build where clause for ItemListing
    const where: any = {}

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
      where.gameItem = {
        category: mainCategory,
      }
    } else if (mainCategory === "Accessories") {
      where.gameItem = {
        category: "Accessories",
      }
    }

    // Game filter
    if (selectedGame !== "All Games") {
      where.game = {
        displayName: selectedGame,
      }
    }

    // Item type filter (only for Games category)
    if (mainCategory === "Games" && selectedItemType !== "All") {
      where.gameItem = {
        ...where.gameItem,
        itemType: selectedItemType,
      }
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
    const total = await prisma.itemListing.count({ where })

    // Get paginated listings
    const listings = await prisma.itemListing.findMany({
      where,
      include: {
        seller: {
          select: {
            id: true,
            username: true,
            vouchesReceived: {
              where: {
                status: "VALID",
              },
              select: {
                id: true,
              },
            },
          },
        },
        game: {
          select: {
            displayName: true,
          },
        },
        gameItem: {
          select: {
            category: true,
            itemType: true,
          },
        },
      },
      orderBy,
      skip: (page - 1) * itemsPerPage,
      take: itemsPerPage,
    })

    // Auto-update listings with insufficient stock to SOLD
    const updatePromises = listings
      .filter((listing: any) => {
        if (listing.status !== "available") return false
        // Check based on pricing mode
        if (listing.pricingMode === "per-peso") {
          return listing.stock < listing.price
        } else {
          return listing.stock < 1
        }
      })
      .map((listing: any) =>
        prisma.itemListing.update({
          where: { id: listing.id },
          data: { status: "sold" },
        })
      )

    if (updatePromises.length > 0) {
      await Promise.all(updatePromises)
    }

    // Transform to response format
    const transformedListings: ListingResponse[] = listings.map((listing: any) => {
      // Determine if should be marked as sold
      let displayStatus = listing.status
      if (listing.status === "available") {
        if (listing.pricingMode === "per-peso") {
          displayStatus = listing.stock < listing.price ? "sold" : listing.status
        } else {
          displayStatus = listing.stock < 1 ? "sold" : listing.status
        }
      }
      
      return {
        id: listing.id,
        title: listing.title,
        game: listing.game.displayName,
        price: listing.price,
        image: listing.image,
        seller: {
          id: listing.seller.id,
          username: listing.seller.username,
        },
        vouch: listing.seller.vouchesReceived?.length || 0,
        status: displayStatus,
        category: listing.gameItem.category,
        itemType: listing.gameItem.itemType,
        condition: listing.condition,
        upvotes: listing.upvotes,
        downvotes: listing.downvotes,
        featured: listing.featured,
      }
    })

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

/**
 * Get user's listings (both item and currency listings)
 */
export async function getUserListings(
  sellerId: string,
  page: number = 1,
  itemsPerPage: number = 10
): Promise<GetListingsResult> {
  try {
    // Fetch item listings
    const itemListings = await prisma.itemListing.findMany({
      where: { sellerId },
      include: {
        seller: {
          select: {
            id: true,
            username: true,
          },
        },
        game: {
          select: {
            displayName: true,
          },
        },
        gameItem: {
          select: {
            category: true,
            itemType: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    })

    // Fetch currency listings
    const currencyListings = await prisma.currencyListing.findMany({
      where: { sellerId },
      include: {
        seller: {
          select: {
            id: true,
            username: true,
          },
        },
        game: {
          select: {
            displayName: true,
          },
        },
        gameCurrency: {
          select: {
            displayName: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    })

    // Combine and transform
    const allListings: ListingResponse[] = await Promise.all([
      ...itemListings.map(async (listing: any) => {
        const inquiriesCount = await prisma.conversation.count({
          where: {
            listingId: listing.id,
            listingType: "ITEM",
          },
        })
        return {
          id: listing.id,
          title: listing.title,
          game: listing.game.displayName,
          price: listing.price,
          image: listing.image,
          seller: {
            id: listing.seller.id,
            username: listing.seller.username,
          },
          vouch: 0,
          status: listing.status,
          category: listing.gameItem.category,
          itemType: listing.gameItem.itemType,
          condition: listing.condition,
          upvotes: listing.upvotes,
          downvotes: listing.downvotes,
          featured: listing.featured,
          views: listing.views,
          inquiries: inquiriesCount,
        }
      }),
      ...currencyListings.map(async (listing: any) => {
        const inquiriesCount = await prisma.conversation.count({
          where: {
            listingId: listing.id,
            listingType: "CURRENCY",
          },
        })
        return {
          id: listing.id,
          title: listing.title,
          game: listing.game.displayName,
          price: listing.ratePerPeso,
          image: listing.image,
          seller: {
            id: listing.seller.id,
            username: listing.seller.username,
          },
          vouch: 0,
          status: listing.status,
          category: "Currency",
          itemType: listing.gameCurrency.displayName,
          condition: "New",
          upvotes: listing.upvotes,
          downvotes: listing.downvotes,
          featured: listing.featured,
          views: listing.views,
          inquiries: inquiriesCount,
        }
      }),
    ])

    // Apply pagination
    const total = allListings.length
    const totalPages = Math.ceil(total / itemsPerPage)
    const startIndex = (page - 1) * itemsPerPage
    const paginatedListings = allListings.slice(startIndex, startIndex + itemsPerPage)

    return {
      listings: paginatedListings,
      total,
      totalPages,
      currentPage: page,
    }
  } catch (error) {
    console.error("Error fetching user listings:", error)
    throw new Error("Failed to fetch user listings")
  }
}

export async function getAvailableGames(mainCategory: string = "All"): Promise<string[]> {
  try {
    if (mainCategory === "Accessories" || mainCategory === "Featured") {
      return []
    }

    const games = await prisma.game.findMany({
      where: {
        isActive: true,
      },
      select: {
        displayName: true,
      },
      orderBy: {
        order: "asc",
      },
    })

    const gameList = games.map((g: any) => g.displayName)

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
  sellerVouches: number
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
    const listings = await prisma.currencyListing.findMany({
      where: {
        status: "available",
      },
      include: {
        seller: {
          select: {
            id: true,
            username: true,
            vouchesReceived: {
              select: { id: true },
            },
          },
        },
        game: {
          select: {
            displayName: true,
          },
        },
        gameCurrency: {
          select: {
            displayName: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    })

    // Auto-update currency listings with insufficient stock to SOLD
    const updatePromises = listings
      .filter((listing: any) => listing.status === "available" && listing.stock < listing.ratePerPeso)
      .map((listing: any) =>
        prisma.currencyListing.update({
          where: { id: listing.id },
          data: { status: "sold" },
        })
      )

    if (updatePromises.length > 0) {
      await Promise.all(updatePromises)
    }

    return listings.map((listing: any) => ({
      id: listing.id,
      game: listing.game.displayName,
      description: listing.description,
      currencyType: listing.gameCurrency.displayName,
      ratePerPeso: listing.ratePerPeso,
      stock: listing.stock,
      sellerId: listing.sellerId,
      sellerUsername: listing.seller.username,
      sellerVouches: listing.seller.vouchesReceived?.length || 0,
      upvotes: listing.upvotes || 0,
      downvotes: listing.downvotes || 0,
      status: (listing.stock < listing.ratePerPeso ? "Sold" : listing.status === "available" ? "Available" : listing.status) as
        | "Available"
        | "Sold"
        | "Pending",
    }))
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
      where: { 
        email: session.user.email 
      },
      include: {
        subscription: true,
        itemListings: {
          where: {
            status: { not: "banned" }
          }
        }
      }
    })

    if (!seller) {
      return {
        success: false,
        error: "User account not found",
      }
    }

    // Check max listings based on subscription tier and system settings
    const [maxListingsFreeSetting, maxListingsProSetting, maxListingsEliteSetting] = await Promise.all([
      prisma.systemSettings.findUnique({ where: { key: "max_listings_free" } }),
      prisma.systemSettings.findUnique({ where: { key: "max_listings_pro" } }),
      prisma.systemSettings.findUnique({ where: { key: "max_listings_elite" } })
    ])

    const maxListingsFree = maxListingsFreeSetting ? parseInt(maxListingsFreeSetting.value) : 10
    const maxListingsPro = maxListingsProSetting ? parseInt(maxListingsProSetting.value) : 50
    const maxListingsElite = maxListingsEliteSetting ? parseInt(maxListingsEliteSetting.value) : 100

    const userTier = seller.subscription?.tier || "FREE"
    const currentListingsCount = seller.itemListings.length
    let maxAllowed = maxListingsFree

    if (userTier === "ELITE") {
      maxAllowed = maxListingsElite
    } else if (userTier === "PRO") {
      maxAllowed = maxListingsPro
    }

    if (currentListingsCount >= maxAllowed) {
      return {
        success: false,
        error: `You have reached the maximum of ${maxAllowed} listings for your ${userTier.toLowerCase()} plan. ${userTier === "FREE" ? "Upgrade to Pro for more listings!" : ""}`
      }
    }

    // Validate input
    const validatedData = createItemListingSchema.parse(input)

    // Check for prohibited content using comprehensive moderation
    const moderationCheck = await moderateContent(
      `${validatedData.title} ${validatedData.description}`,
      "listing"
    )

    if (!moderationCheck.isAllowed) {
      // Log the moderation action
      await logModerationAction(
        seller.id,
        "LISTING_BLOCKED",
        `Listing creation blocked: ${moderationCheck.reason}`
      )

      return {
        success: false,
        error: `Your listing contains prohibited content: ${moderationCheck.reason}. Please review our community guidelines.`
      }
    }

    // Find game by name
    const game = await prisma.game.findFirst({
      where: {
        OR: [
          { name: validatedData.game },
          { displayName: validatedData.game },
        ],
      },
    })

    if (!game) {
      return {
        success: false,
        error: "Game not found",
      }
    }

    // Find game item by category AND itemType
    const gameItem = await prisma.gameItem.findFirst({
      where: {
        gameId: game.id,
        category: validatedData.category,
        itemType: validatedData.itemType,
      },
    })

    if (!gameItem) {
      // Log for debugging
      console.log("GameItem lookup failed:", {
        gameId: game.id,
        gameName: game.name,
        category: validatedData.category,
        itemType: validatedData.itemType,
      })
      return {
        success: false,
        error: `Game item type not found for ${validatedData.category}/${validatedData.itemType} in ${game.displayName}`,
      }
    }

    // Check if stock is sufficient based on pricing mode
    let initialStatus: string
    if (validatedData.pricingMode === "per-peso") {
      // For per-peso: stock must be >= price (items per peso)
      initialStatus = validatedData.stock < validatedData.price ? "sold" : "available"
    } else {
      // For per-item: stock must be >= 1
      initialStatus = validatedData.stock < 1 ? "sold" : "available"
    }

    // Create the item listing
    const listing = await prisma.itemListing.create({
      data: {
        title: validatedData.title,
        description: validatedData.description,
        gameId: game.id,
        gameItemId: gameItem.id,
        price: validatedData.price,
        image: validatedData.image,
        condition: validatedData.condition,
        stock: validatedData.stock,
        pricingMode: validatedData.pricingMode || "per-item",
        sellerId: seller.id,
        status: initialStatus,
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
  type: "up" | "down",
  listingType: "ITEM" | "CURRENCY" = "ITEM"
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

    // Verify listing exists in the correct table
    let listing: { id: string; upvotes: number | null; downvotes: number | null } | null = null
    if (listingType === "ITEM") {
      listing = await prisma.itemListing.findUnique({
        where: { id: listingId },
        select: { id: true, upvotes: true, downvotes: true },
      })
    } else {
      listing = await prisma.currencyListing.findUnique({
        where: { id: listingId },
        select: { id: true, upvotes: true, downvotes: true },
      })
    }

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
        let updatedListing: { upvotes: number | null; downvotes: number | null }
        if (listingType === "ITEM") {
          updatedListing = await prisma.itemListing.update({
            where: { id: listingId },
            data: {
              upvotes: type === "up" ? { decrement: 1 } : undefined,
              downvotes: type === "down" ? { decrement: 1 } : undefined,
            },
            select: { upvotes: true, downvotes: true },
          })
        } else {
          updatedListing = await prisma.currencyListing.update({
            where: { id: listingId },
            data: {
              upvotes: type === "up" ? { decrement: 1 } : undefined,
              downvotes: type === "down" ? { decrement: 1 } : undefined,
            },
            select: { upvotes: true, downvotes: true },
          })
        }

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
        let updatedListing: { upvotes: number | null; downvotes: number | null }
        if (listingType === "ITEM") {
          updatedListing = await prisma.itemListing.update({
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
        } else {
          updatedListing = await prisma.currencyListing.update({
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
        }

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
          listingType,
          type: voteType,
        },
      })

      // Increment the vote count
      let updatedListing: { upvotes: number | null; downvotes: number | null }
      if (listingType === "ITEM") {
        updatedListing = await prisma.itemListing.update({
          where: { id: listingId },
          data: {
            upvotes: type === "up" ? { increment: 1 } : undefined,
            downvotes: type === "down" ? { increment: 1 } : undefined,
          },
          select: { upvotes: true, downvotes: true },
        })
      } else {
        updatedListing = await prisma.currencyListing.update({
          where: { id: listingId },
          data: {
            upvotes: type === "up" ? { increment: 1 } : undefined,
            downvotes: type === "down" ? { increment: 1 } : undefined,
          },
          select: { upvotes: true, downvotes: true },
        })
      }

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
  details?: string,
  listingType: "ITEM" | "CURRENCY" = "ITEM"
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

    // Verify listing exists in the correct table
    let listing: { id: string; sellerId: string } | null = null
    if (listingType === "ITEM") {
      listing = await prisma.itemListing.findUnique({
        where: { id: listingId },
        select: { id: true, sellerId: true },
      })
    } else {
      listing = await prisma.currencyListing.findUnique({
        where: { id: listingId },
        select: { id: true, sellerId: true },
      })
    }

    if (!listing) {
      return { success: false, error: "Listing not found" }
    }

    // Create report in the ReportListing table
    const report = await prisma.reportListing.create({
      data: {
        listingId,
        listingType,
        reporterId: reporter.id,
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
  // Redirect to new createNewCurrencyListing function
  return createNewCurrencyListing(input)
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
    if (type === "CATEGORY") {
      // Get unique categories from GameItem table
      const categories = await prisma.gameItem.findMany({
        where: { isActive: true },
        select: { category: true },
        distinct: ['category'],
      })
      
      return categories
        .map((cat, index) => ({
          id: `cat-${index}`,
          label: cat.category,
          value: cat.category,
        }))
        .sort((a, b) => a.label.localeCompare(b.label))
    } else if (type === "GAME") {
      // Get games from Game table
      const games = await prisma.game.findMany({
        where: { isActive: true },
        orderBy: { order: 'asc' },
        select: {
          id: true,
          name: true,
          displayName: true,
        },
      })
      
      return games
        .filter(game => game.name !== "General") // Exclude General from filters
        .map(game => ({
          id: game.id,
          label: game.displayName,
          value: game.name,
        }))
        .sort((a, b) => a.label.localeCompare(b.label))
    } else if (type === "ITEM_TYPE") {
      // Get unique item types from GameItem table
      const itemTypes = await prisma.gameItem.findMany({
        where: { 
          isActive: true,
          category: "Games", // Only get item types from Games category
        },
        select: { itemType: true },
        distinct: ['itemType'],
      })
      
      return itemTypes
        .map((type, index) => ({
          id: `type-${index}`,
          label: type.itemType,
          value: type.itemType,
        }))
        .sort((a, b) => a.label.localeCompare(b.label))
    }
    
    return []
  } catch (error) {
    console.error("Error fetching filter options:", error)
    return []
  }
}

/**
 * Get all currency listings from the new CurrencyListing model
 */
export async function getNewCurrencyListings(): Promise<{
  id: string
  gameName: string
  currencyName: string
  ratePerPeso: number
  stock: number
  sellerId: string
  sellerUsername: string
  sellerVouches: number
  upvotes: number
  downvotes: number
  status: string
}[]> {
  try {
    const listings = await prisma.currencyListing.findMany({
      where: {
        status: "available",
      },
      include: {
        seller: {
          select: {
            id: true,
            username: true,
            vouchesReceived: {
              select: { id: true },
            },
          },
        },
        game: {
          select: {
            displayName: true,
          },
        },
        gameCurrency: {
          select: {
            displayName: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    })

    // Auto-update currency listings with insufficient stock to SOLD
    const updatePromises = listings
      .filter((listing: any) => listing.status === "available" && listing.stock < listing.ratePerPeso)
      .map((listing: any) =>
        prisma.currencyListing.update({
          where: { id: listing.id },
          data: { status: "sold" },
        })
      )

    if (updatePromises.length > 0) {
      await Promise.all(updatePromises)
    }

    return listings.map((listing) => ({
      id: listing.id,
      gameName: listing.game.displayName,
      currencyName: listing.gameCurrency.displayName,
      ratePerPeso: listing.ratePerPeso,
      stock: listing.stock,
      sellerId: listing.sellerId,
      sellerUsername: listing.seller.username,
      sellerVouches: listing.seller.vouchesReceived?.length || 0,
      upvotes: listing.upvotes,
      downvotes: listing.downvotes,
      status: listing.stock < listing.ratePerPeso ? "sold" : listing.status,
    }))
  } catch (error) {
    console.error("Error fetching new currency listings:", error)
    return []
  }
}

/**
 * Create a new currency listing using the new CurrencyListing model
 */
export async function createNewCurrencyListing(input: CreateCurrencyListingInput): Promise<CreateListingResult> {
  try {
    const session = await auth()
    if (!session?.user?.email) {
      return {
        success: false,
        error: "You must be logged in to create a listing",
      }
    }

    const seller = await prisma.user.findUnique({
      where: { email: session.user.email },
    })

    if (!seller) {
      return {
        success: false,
        error: "User account not found",
      }
    }

    const validatedData = createCurrencyListingSchema.parse(input)

    // Find game by name
    const game = await prisma.game.findFirst({
      where: {
        OR: [
          { name: validatedData.game },
          { displayName: validatedData.game },
        ],
      },
    })

    if (!game) {
      return {
        success: false,
        error: "Game not found",
      }
    }

    // Find game currency by name
    const gameCurrency = await prisma.gameCurrency.findFirst({
      where: {
        gameId: game.id,
        OR: [
          { name: validatedData.currencyType },
          { displayName: validatedData.currencyType },
        ],
      },
    })

    if (!gameCurrency) {
      return {
        success: false,
        error: "Currency type not found for this game",
      }
    }

    // Check if stock is sufficient for the minimum sellable unit (ratePerPeso)
    const initialStatus = validatedData.stock < validatedData.ratePerPeso ? "sold" : "available"

    const listing = await prisma.currencyListing.create({
      data: {
        title: `${game.displayName} - ${gameCurrency.displayName}`,
        description: validatedData.description || null,
        gameId: game.id,
        gameCurrencyId: gameCurrency.id,
        ratePerPeso: validatedData.ratePerPeso,
        pricingMode: validatedData.pricingMode || "per-peso",
        stock: validatedData.stock,
        minOrder: validatedData.minOrder,
        maxOrder: validatedData.maxOrder,
        image: validatedData.image,
        sellerId: seller.id,
        status: initialStatus,
      },
    })

    return {
      success: true,
      listingId: listing.id,
    }
  } catch (error) {
    console.error("Error creating new currency listing:", error)
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
 * Get list of users who viewed a listing (for Elite subscription owners only)
 */
export async function getListingViewers(
  listingId: string,
  listingType: "ITEM" | "CURRENCY"
): Promise<{
  success: boolean
  viewers?: Array<{
    id: string
    username: string
    profilePicture: string | null
    viewedAt: Date
  }>
  error?: string
  requiresUpgrade?: boolean
}> {
  try {
    const session = await auth()
    if (!session?.user?.email) {
      return {
        success: false,
        error: "You must be logged in to view this data",
      }
    }

    const currentUser = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { 
        id: true, 
        subscriptionTier: true 
      },
    })

    if (!currentUser) {
      return {
        success: false,
        error: "User account not found",
      }
    }

    // Check if user owns the listing
    let isOwner = false
    if (listingType === "ITEM") {
      const listing = await prisma.itemListing.findUnique({
        where: { id: listingId },
        select: { sellerId: true },
      })
      isOwner = listing?.sellerId === currentUser.id
    } else if (listingType === "CURRENCY") {
      const listing = await prisma.currencyListing.findUnique({
        where: { id: listingId },
        select: { sellerId: true },
      })
      isOwner = listing?.sellerId === currentUser.id
    }

    if (!isOwner) {
      return {
        success: false,
        error: "You can only view viewers for your own listings",
      }
    }

    // Check if user has Elite subscription
    if (currentUser.subscriptionTier !== "ELITE") {
      return {
        success: true,
        requiresUpgrade: true,
        viewers: [],
      }
    }

    // Fetch viewers with user details (exclude owner)
    const views = await prisma.listingView.findMany({
      where: {
        listingId,
        listingType,
        AND: [
          { userId: { not: null } }, // Only logged-in users
          { userId: { not: currentUser.id } }, // Exclude owner
        ],
      },
      orderBy: {
        viewedAt: "desc",
      },
      take: 50, // Limit to last 50 viewers
    })

    // Get unique user IDs
    const userIds = [...new Set(views.map(v => v.userId).filter(Boolean))] as string[]

    // Fetch user details
    const users = await prisma.user.findMany({
      where: {
        id: { in: userIds },
      },
      select: {
        id: true,
        username: true,
        profilePicture: true,
      },
    })

    // Create a map for quick lookup
    const userMap = new Map(users.map(u => [u.id, u]))

    // Get the most recent view for each user
    const uniqueViewers = new Map<string, { user: typeof users[0], viewedAt: Date }>()
    
    for (const view of views) {
      if (view.userId && !uniqueViewers.has(view.userId)) {
        const user = userMap.get(view.userId)
        if (user) {
          uniqueViewers.set(view.userId, {
            user,
            viewedAt: view.viewedAt,
          })
        }
      }
    }

    // Get the last nudge time for each viewer (within the last hour)
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000)
    const notificationLink = `/${listingType.toLowerCase()}/${listingId}`
    
    const recentNudges = await prisma.notification.findMany({
      where: {
        userId: { in: userIds },
        type: "LISTING_NUDGE",
        link: notificationLink,
        createdAt: { gte: oneHourAgo },
      },
      select: {
        userId: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    })

    // Create a map of userId to last nudge time
    const nudgeMap = new Map<string, Date>()
    for (const nudge of recentNudges) {
      if (!nudgeMap.has(nudge.userId)) {
        nudgeMap.set(nudge.userId, nudge.createdAt)
      }
    }

    const viewers = Array.from(uniqueViewers.values()).map(({ user, viewedAt }) => ({
      id: user.id,
      username: user.username,
      profilePicture: user.profilePicture,
      viewedAt,
      lastNudgedAt: nudgeMap.get(user.id) || null,
    }))

    return {
      success: true,
      viewers,
    }
  } catch (error) {
    console.error("Error fetching listing viewers:", error)
    return {
      success: false,
      error: "Failed to fetch viewers",
    }
  }
}

/**
 * Nudge a listing viewer to encourage them to purchase
 * Can only be used once per hour per viewer
 */
export async function nudgeViewer(
  viewerId: string,
  listingId: string,
  listingType: "ITEM" | "CURRENCY",
  listingTitle: string
): Promise<{
  success: boolean
  error?: string
  canNudgeAgainAt?: Date
}> {
  try {
    const session = await auth()
    if (!session?.user?.email) {
      return {
        success: false,
        error: "You must be logged in to nudge viewers",
      }
    }

    const currentUser = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true },
    })

    if (!currentUser) {
      return {
        success: false,
        error: "User account not found",
      }
    }

    // Check if user owns the listing
    let isOwner = false
    if (listingType === "ITEM") {
      const listing = await prisma.itemListing.findUnique({
        where: { id: listingId },
        select: { sellerId: true },
      })
      isOwner = listing?.sellerId === currentUser.id
    } else if (listingType === "CURRENCY") {
      const listing = await prisma.currencyListing.findUnique({
        where: { id: listingId },
        select: { sellerId: true },
      })
      isOwner = listing?.sellerId === currentUser.id
    }

    if (!isOwner) {
      return {
        success: false,
        error: "You can only nudge viewers for your own listings",
      }
    }

    // Check for existing nudge in the last hour
    // We'll check by looking at the notification link which contains the listing ID
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000)
    const notificationLink = `/${listingType.toLowerCase()}/${listingId}`
    
    const recentNudge = await prisma.notification.findFirst({
      where: {
        userId: viewerId,
        type: "LISTING_NUDGE",
        link: notificationLink,
        createdAt: {
          gte: oneHourAgo,
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    })

    if (recentNudge) {
      const canNudgeAgainAt = new Date(recentNudge.createdAt.getTime() + 60 * 60 * 1000)
      return {
        success: false,
        error: "You can only nudge this viewer once per hour",
        canNudgeAgainAt,
      }
    }

    // Create notification for the viewer
    await prisma.notification.create({
      data: {
        userId: viewerId,
        type: "LISTING_NUDGE",
        title: "Someone noticed you viewed their listing! 👀",
        message: `The seller wants to remind you about: ${listingTitle}`,
        link: notificationLink,
      },
    })

    return {
      success: true,
    }
  } catch (error) {
    console.error("Error nudging viewer:", error)
    return {
      success: false,
      error: "Failed to send nudge",
    }
  }
}
