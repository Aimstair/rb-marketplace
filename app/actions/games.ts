"use server"

import { prisma } from "@/lib/prisma"

export interface GameOption {
  id: string
  name: string
  displayName: string
  description?: string
}

export interface CurrencyOption {
  id: string
  name: string
  displayName: string
  description?: string
}

export interface GameItemOption {
  id: string
  name: string
  displayName: string
  category: string
  itemType: string
}

/**
 * Get all active games
 */
export async function getGames(): Promise<GameOption[]> {
  try {
    const games = await prisma.game.findMany({
      where: { isActive: true },
      orderBy: { order: "asc" },
      select: {
        id: true,
        name: true,
        displayName: true,
        description: true,
      },
    })

    return games.map(g => ({
      ...g,
      description: g.description || undefined,
    }))
  } catch (error) {
    console.error("Error fetching games:", error)
    return []
  }
}

/**
 * Get all currencies for a specific game
 */
export async function getCurrenciesForGame(gameName: string): Promise<CurrencyOption[]> {
  try {
    const game = await prisma.game.findUnique({
      where: { name: gameName },
      include: {
        currencies: {
          where: { isActive: true },
          orderBy: { order: "asc" },
          select: {
            id: true,
            name: true,
            displayName: true,
            description: true,
          },
        },
      },
    })

    return game?.currencies.map(c => ({
      ...c,
      description: c.description || undefined,
    })) || []
  } catch (error) {
    console.error("Error fetching currencies for game:", error)
    return []
  }
}

/**
 * Get all active currencies across all games
 */
export async function getAllCurrencies(): Promise<(CurrencyOption & { gameName: string })[]> {
  try {
    const currencies = await prisma.gameCurrency.findMany({
      where: { isActive: true },
      include: {
        game: {
          select: {
            name: true,
            displayName: true,
          },
        },
      },
      orderBy: [
        { game: { order: "asc" } },
        { order: "asc" },
      ],
    })

    return currencies.map((currency) => ({
      id: currency.id,
      name: currency.name,
      displayName: currency.displayName,
      description: currency.description || undefined,
      gameName: currency.game.name,
    }))
  } catch (error) {
    console.error("Error fetching all currencies:", error)
    return []
  }
}

/**
 * Get unique categories from game items
 */
export async function getCategories(): Promise<string[]> {
  try {
    const gameItems = await prisma.gameItem.findMany({
      where: { isActive: true },
      select: { category: true },
      distinct: ['category'],
      orderBy: { category: 'asc' },
    })

    return gameItems.map(item => item.category)
  } catch (error) {
    console.error("Error fetching categories:", error)
    return []
  }
}

/**
 * Get item types for a specific game and category
 */
export async function getItemTypesForGameAndCategory(
  gameName: string,
  category: string
): Promise<GameItemOption[]> {
  try {
    const game = await prisma.game.findUnique({
      where: { name: gameName },
    })

    if (!game) return []

    const gameItems = await prisma.gameItem.findMany({
      where: {
        gameId: game.id,
        category: category,
        isActive: true,
      },
      orderBy: { order: 'asc' },
      select: {
        id: true,
        name: true,
        displayName: true,
        category: true,
        itemType: true,
      },
    })

    return gameItems
  } catch (error) {
    console.error("Error fetching item types:", error)
    return []
  }
}
