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
  } = filters

  try {
    // Build where clause
    const where: any = {
      status: "available",
      game: { not: "Currency Exchange" }, // EXCLUDE currency items
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
        game: "Currency Exchange", // ONLY currency
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
      const stock = stockMatch ? parseInt(stockMatch[1], 10) : 0

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

    // Create the listing
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
        sellerId: seller.id,
        status: "available",
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
        image: "/currency-placeholder.svg",
        category: "Games",
        itemType: "Services",
        condition: "New",
        sellerId: seller.id,
        status: "available",
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
