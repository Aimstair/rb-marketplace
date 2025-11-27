"use server"

import { prisma } from "@/lib/prisma"
import { z } from "zod"

export interface ListingFilters {
  search?: string
  mainCategory?: string
  selectedGame?: string
  selectedItemType?: string
  sortBy?: string
  priceRange?: {
    min: number
    max: number
  }
  page?: number
  itemsPerPage?: number
}

export interface ListingResponse {
  id: string
  title: string
  game: string
  price: number
  image: string
  seller: {
    id: string
    username: string
  }
  vouch: number
  status: string
  category: string
  itemType: string
  condition: string
  upvotes: number
  downvotes: number
  featured: boolean
}

export interface GetListingsResult {
  listings: ListingResponse[]
  total: number
  totalPages: number
  currentPage: number
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
  } = filters

  try {
    // Build where clause
    const where: any = {
      status: "available",
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

// Validation schemas
export const createItemListingSchema = z.object({
  title: z.string().min(5, "Title must be at least 5 characters").max(100, "Title must be at most 100 characters"),
  description: z.string().min(10, "Description must be at least 10 characters").max(2000, "Description must be at most 2000 characters"),
  category: z.enum(["Accessories", "Games", "Accounts"]),
  game: z.string().min(1, "Please select a game"),
  itemType: z.string().min(1, "Please select an item type"),
  price: z.number().min(1, "Price must be at least 1").max(1000000, "Price must be at most 1,000,000"),
  image: z.string().url("Please provide a valid image URL"),
  condition: z.enum(["Mint", "New", "Used"]),
  paymentMethods: z.array(z.string()).min(1, "Select at least one payment method"),
})

export const createCurrencyListingSchema = z.object({
  currencyType: z.string().min(1, "Please select a currency type"),
  ratePerPeso: z.number().min(0.01, "Rate must be at least 0.01"),
  stock: z.number().min(1, "Stock must be at least 1"),
  minOrder: z.number().min(1, "Minimum order must be at least 1"),
  maxOrder: z.number().min(1, "Maximum order must be at least 1"),
  description: z.string().max(500, "Description must be at most 500 characters").optional(),
  paymentMethods: z.array(z.string()).min(1, "Select at least one payment method"),
})

export type CreateItemListingInput = z.infer<typeof createItemListingSchema>
export type CreateCurrencyListingInput = z.infer<typeof createCurrencyListingSchema>

export interface CreateListingResult {
  success: boolean
  listingId?: string
  error?: string
}

export async function createListing(input: CreateItemListingInput): Promise<CreateListingResult> {
  try {
    // Validate input
    const validatedData = createItemListingSchema.parse(input)

    // Get the first user from the database (for now, since real auth isn't fully active)
    const seller = await prisma.user.findFirst({
      where: { role: "user" },
    })

    if (!seller) {
      return {
        success: false,
        error: "No seller account found. Please contact support.",
      }
    }

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
    // Validate input
    const validatedData = createCurrencyListingSchema.parse(input)

    // Get the first user from the database (for now, since real auth isn't fully active)
    const seller = await prisma.user.findFirst({
      where: { role: "user" },
    })

    if (!seller) {
      return {
        success: false,
        error: "No seller account found. Please contact support.",
      }
    }

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
