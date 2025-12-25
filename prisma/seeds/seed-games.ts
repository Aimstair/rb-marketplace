import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

async function main() {
  console.log("🌱 Seeding games and currencies...")

  // Define game and currency data
  const gamesData = [
    {
      name: "Roblox",
      displayName: "Roblox",
      description: "Popular online gaming platform",
      currencies: [
        { name: "Robux", displayName: "Robux", description: "Official Roblox currency" },
      ],
    },
    {
      name: "Grow a Garden",
      displayName: "Grow a Garden",
      description: "Grow your own virtual garden",
      currencies: [
        { name: "Sheckles", displayName: "Sheckles", description: "In-game currency" },
        { name: "Tokens", displayName: "Tokens", description: "In-game currency" },
      ],
    },
    {
      name: "Dragon Adventures",
      displayName: "Dragon Adventures",
      description: "Raise and train dragons",
      currencies: [
        { name: "Coins", displayName: "Coins", description: "In-game currency" },
      ],
    },
    {
      name: "Adopt Me",
      displayName: "Adopt Me",
      description: "Pet adoption and trading game",
      currencies: [
        { name: "Gems", displayName: "Gems", description: "In-game currency" },
      ],
    },
    {
      name: "Blox Fruits",
      displayName: "Blox Fruits",
      description: "One Piece inspired adventure game",
      currencies: [
        { name: "Fragments", displayName: "Fragments", description: "Used for special purchases" },
        { name: "Bounty", displayName: "Bounty", description: "Player bounty" },
      ],
    },
    {
      name: "Pet Simulator X",
      displayName: "Pet Simulator X",
      description: "Pet collection and trading game",
      currencies: [
        { name: "Gems", displayName: "Gems", description: "In-game currency" },
      ],
    },
    {
      name: "Pet Simulator 99",
      displayName: "Pet Simulator 99",
      description: "Latest pet collection game",
      currencies: [
        { name: "Gems", displayName: "Gems", description: "In-game currency" },
      ],
    },
  ]

  // Seed each game with its currencies
  for (let i = 0; i < gamesData.length; i++) {
    const gameData = gamesData[i]
    
    const game = await prisma.game.upsert({
      where: { name: gameData.name },
      update: {
        displayName: gameData.displayName,
        description: gameData.description,
        order: i,
      },
      create: {
        name: gameData.name,
        displayName: gameData.displayName,
        description: gameData.description,
        order: i,
      },
    })

    console.log(`✅ Created/Updated game: ${game.displayName}`)

    // Create currencies for this game
    for (let j = 0; j < gameData.currencies.length; j++) {
      const currencyData = gameData.currencies[j]
      
      const currency = await prisma.gameCurrency.upsert({
        where: {
          gameId_name: {
            gameId: game.id,
            name: currencyData.name,
          },
        },
        update: {
          displayName: currencyData.displayName,
          description: currencyData.description,
          order: j,
        },
        create: {
          gameId: game.id,
          name: currencyData.name,
          displayName: currencyData.displayName,
          description: currencyData.description,
          order: j,
        },
      })

      console.log(`  💎 Created/Updated currency: ${currency.displayName}`)
    }
  }

  console.log("✨ Seeding complete!")
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
