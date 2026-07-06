"use server"

import { prisma } from "@/lib/prisma"
import { unstable_cache } from "next/cache"

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
  return unstable_cache(
    async () => {
      try {
        const games = await prisma.game.findMany({
          where: { isActive: true },
          orderBy: { displayName: "asc" },
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
    },
    ["games-active-list"],
    { revalidate: 3600 }
  )()
}

/**
 * Get only games that have item types (for item listing)
 */
export async function getGamesWithItemTypes(): Promise<GameOption[]> {
  return unstable_cache(
    async () => {
      try {
        const games = await prisma.game.findMany({
          where: { 
            isActive: true,
            items: {
              some: {
                isActive: true,
              },
            },
          },
          orderBy: { displayName: "asc" },
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
        console.error("Error fetching games with item types:", error)
        return []
      }
    },
    ["games-with-item-types"],
    { revalidate: 3600 }
  )()
}

/**
 * Get only games that have currencies (for currency listing)
 */
export async function getGamesWithCurrencies(): Promise<GameOption[]> {
  return unstable_cache(
    async () => {
      try {
        const games = await prisma.game.findMany({
          where: { 
            isActive: true,
            currencies: {
              some: {
                isActive: true,
              },
            },
          },
          orderBy: { displayName: "asc" },
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
        console.error("Error fetching games with currencies:", error)
        return []
      }
    },
    ["games-with-currencies"],
    { revalidate: 3600 }
  )()
}

/**
 * Get all currencies for a specific game (by ID)
 */
export async function getGameCurrencies(gameId: string): Promise<CurrencyOption[]> {
  if (!gameId) return []

  return unstable_cache(
    async () => {
      try {
        const currencies = await prisma.gameCurrency.findMany({
          where: { 
            gameId,
            isActive: true 
          },
          orderBy: { displayName: "asc" },
          select: {
            id: true,
            name: true,
            displayName: true,
            description: true,
          },
        })

        return currencies.map(c => ({
          ...c,
          description: c.description || undefined,
        }))
      } catch (error) {
        console.error("Error fetching game currencies:", error)
        return []
      }
    },
    [`game-currencies-${gameId}`],
    { revalidate: 3600 }
  )()
}

/**
 * Get all currencies for a specific game (by game name)
 */
export async function getCurrenciesForGame(gameName: string): Promise<CurrencyOption[]> {
  if (!gameName) return []

  return unstable_cache(
    async () => {
      try {
        const game = await prisma.game.findUnique({
          where: { name: gameName },
          include: {
            currencies: {
              where: { isActive: true },
              orderBy: { displayName: "asc" },
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
    },
    [`currencies-for-game-${gameName}`],
    { revalidate: 3600 }
  )()
}

/**
 * Get all active currencies across all games
 */
export async function getAllCurrencies(): Promise<(CurrencyOption & { gameName: string })[]> {
  return unstable_cache(
    async () => {
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
    },
    ["all-currencies"],
    { revalidate: 3600 }
  )()
}

/**
 * Get unique categories from game items
 */
export async function getCategories(): Promise<string[]> {
  return unstable_cache(
    async () => {
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
    },
    ["game-categories"],
    { revalidate: 3600 }
  )()
}

/**
 * Get item types for a specific game and category
 */
export async function getItemTypesForGameAndCategory(
  gameName: string,
  category: string
): Promise<GameItemOption[]> {
  return unstable_cache(
    async () => {
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
          orderBy: { displayName: 'asc' },
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
    },
    [`item-types-${gameName}-${category}`],
    { revalidate: 3600 }
  )()
}

/**
 * Get all item types for a specific game
 */
export async function getGameItemTypes(gameId: string): Promise<GameItemOption[]> {
  if (!gameId) return []

  return unstable_cache(
    async () => {
      try {
        const items = await prisma.gameItem.findMany({
          where: { 
            gameId,
            isActive: true 
          },
          orderBy: [
            { category: "asc" },
            { displayName: "asc" },
          ],
          select: {
            id: true,
            name: true,
            displayName: true,
            category: true,
            itemType: true,
          },
        })

        return items
      } catch (error) {
        console.error("Error fetching game item types:", error)
        return []
      }
    },
    [`game-items-${gameId}`],
    { revalidate: 3600 }
  )()
}
