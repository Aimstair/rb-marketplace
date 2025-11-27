"use server"

import { prisma } from "@/lib/prisma"

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
