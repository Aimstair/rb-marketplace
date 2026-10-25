import { unstable_cache } from "next/cache"
import { prisma } from "@/lib/prisma"
import { gameSlug } from "@/lib/seo"

export interface SeoGame {
  slug: string
  name: string
  displayName: string
  description: string | null
  image: string | null
  currencies: string[]
  itemCount: number
  currencyCount: number
  lowestPrice: number | null
}

/**
 * Active games with live listing counts, for the game hub, sitemap, footer and llms.txt.
 * Cached for 5 minutes: it is read on many pages and changes only when listings do.
 */
export const getSeoGames = unstable_cache(
  async (): Promise<SeoGame[]> => {
    const [games, lowest] = await Promise.all([
      prisma.game.findMany({
        where: { isActive: true },
        orderBy: { order: "asc" },
        select: {
          id: true,
          name: true,
          displayName: true,
          description: true,
          image: true,
          currencies: { where: { isActive: true }, orderBy: { order: "asc" }, select: { displayName: true } },
          _count: {
            select: {
              itemListings: { where: { status: "available" } },
              currencyListings: { where: { status: "available" } },
            },
          },
        },
      }),
      prisma.itemListing.groupBy({
        by: ["gameId"],
        where: { status: "available" },
        _min: { price: true },
      }),
    ])

    const lowestByGame = new Map(lowest.map((row) => [row.gameId, row._min.price]))

    return games.map((game) => ({
      slug: gameSlug(game.displayName),
      name: game.name,
      displayName: game.displayName,
      description: game.description,
      image: game.image,
      currencies: game.currencies.map((c) => c.displayName),
      itemCount: game._count.itemListings,
      currencyCount: game._count.currencyListings,
      lowestPrice: lowestByGame.get(game.id) ?? null,
    }))
  },
  ["seo-games-v1"],
  { revalidate: 300, tags: ["games"] },
)

export async function getSeoGameBySlug(slug: string): Promise<SeoGame | null> {
  const games = await getSeoGames()
  return games.find((game) => game.slug === slug) ?? null
}

export interface GameListing {
  id: string
  title: string
  price: number
  image: string
  condition: string
  featured: boolean
  itemName: string
  sellerName: string
  vouches: number
}

export interface GameCurrencyOffer {
  id: string
  title: string
  currency: string
  ratePerPeso: number
  stock: number
  minOrder: number
  sellerName: string
  vouches: number
}

/** Live item listings and currency offers for one game page, cached for a minute. */
export const getGameListings = unstable_cache(
  async (gameName: string): Promise<{ items: GameListing[]; currency: GameCurrencyOffer[] }> => {
    const sellerSelect = {
      select: {
        username: true,
        _count: { select: { vouchesReceived: { where: { status: "VALID" } } } },
      },
    } as const

    const [items, currency] = await Promise.all([
      prisma.itemListing.findMany({
        where: { status: "available", game: { name: gameName } },
        orderBy: [{ featured: "desc" }, { createdAt: "desc" }],
        take: 30,
        select: {
          id: true,
          title: true,
          price: true,
          image: true,
          condition: true,
          featured: true,
          gameItem: { select: { displayName: true } },
          seller: sellerSelect,
        },
      }),
      prisma.currencyListing.findMany({
        where: { status: "available", game: { name: gameName } },
        orderBy: { ratePerPeso: "desc" },
        take: 10,
        select: {
          id: true,
          title: true,
          ratePerPeso: true,
          stock: true,
          minOrder: true,
          gameCurrency: { select: { displayName: true } },
          seller: sellerSelect,
        },
      }),
    ])

    return {
      items: items.map((l) => ({
        id: l.id,
        title: l.title,
        price: l.price,
        image: l.image,
        condition: l.condition,
        featured: l.featured,
        itemName: l.gameItem.displayName,
        sellerName: l.seller.username,
        vouches: l.seller._count.vouchesReceived,
      })),
      currency: currency.map((l) => ({
        id: l.id,
        title: l.title,
        currency: l.gameCurrency.displayName,
        ratePerPeso: l.ratePerPeso,
        stock: l.stock,
        minOrder: l.minOrder,
        sellerName: l.seller.username,
        vouches: l.seller._count.vouchesReceived,
      })),
    }
  },
  ["seo-game-listings-v1"],
  { revalidate: 60, tags: ["games"] },
)

export interface SellGameOption {
  name: string
  displayName: string
  /** Sellable item types; category "Accounts" marks the account option */
  itemTypes: { name: string; displayName: string; category: string }[]
  currencies: { name: string; displayName: string }[]
}

/**
 * Games with their item types and currencies for the sell form, loaded in one query on the
 * server. Errors are not caught, so a failed query is never cached as an empty list.
 */
export const getSellOptions = unstable_cache(
  async (): Promise<SellGameOption[]> => {
    const games = await prisma.game.findMany({
      where: { isActive: true },
      orderBy: { order: "asc" },
      select: {
        name: true,
        displayName: true,
        items: {
          where: { isActive: true },
          orderBy: [{ order: "asc" }, { displayName: "asc" }],
          select: { name: true, displayName: true, category: true },
        },
        currencies: {
          where: { isActive: true },
          orderBy: { order: "asc" },
          select: { name: true, displayName: true },
        },
      },
    })
    return games
      .map((g) => ({ name: g.name, displayName: g.displayName, itemTypes: g.items, currencies: g.currencies }))
      .filter((g) => g.itemTypes.length > 0 || g.currencies.length > 0)
  },
  ["sell-options-v1"],
  { revalidate: 300, tags: ["games"] },
)
