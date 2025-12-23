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
        { name: "Limited Items", displayName: "Limited Items", description: "Rare collectible items" },
      ],
    },
    {
      name: "Adopt Me",
      displayName: "Adopt Me",
      description: "Pet adoption and trading game",
      currencies: [
        { name: "Bucks", displayName: "Bucks", description: "In-game currency" },
        { name: "Pets", displayName: "Pets", description: "Adoptable pets" },
      ],
    },
    {
      name: "Blox Fruits",
      displayName: "Blox Fruits",
      description: "One Piece inspired adventure game",
      currencies: [
        { name: "Fragments", displayName: "Fragments", description: "Used for special purchases" },
        { name: "Gems", displayName: "Gems", description: "Premium currency" },
        { name: "Beli", displayName: "Beli", description: "Main currency" },
      ],
    },
    {
      name: "Pet Simulator X",
      displayName: "Pet Simulator X",
      description: "Pet collection and trading game",
      currencies: [
        { name: "Gems", displayName: "Gems", description: "In-game currency" },
        { name: "Huge Pets", displayName: "Huge Pets", description: "Rare huge pets" },
        { name: "Titanic Pets", displayName: "Titanic Pets", description: "Ultra rare pets" },
      ],
    },
    {
      name: "Pet Simulator 99",
      displayName: "Pet Simulator 99",
      description: "Latest pet collection game",
      currencies: [
        { name: "Gems", displayName: "Gems", description: "In-game currency" },
        { name: "Huge Pets", displayName: "Huge Pets", description: "Rare huge pets" },
        { name: "Titanic Pets", displayName: "Titanic Pets", description: "Ultra rare pets" },
      ],
    },
    {
      name: "Murder Mystery 2",
      displayName: "Murder Mystery 2",
      description: "Mystery and survival game",
      currencies: [
        { name: "Coins", displayName: "Coins", description: "In-game currency" },
        { name: "Knives", displayName: "Knives", description: "Collectible weapons" },
        { name: "Guns", displayName: "Guns", description: "Collectible weapons" },
      ],
    },
    {
      name: "Jailbreak",
      displayName: "Jailbreak",
      description: "Cops and robbers game",
      currencies: [
        { name: "Cash", displayName: "Cash", description: "In-game currency" },
        { name: "Vehicles", displayName: "Vehicles", description: "Cars and vehicles" },
      ],
    },
    {
      name: "Tower of Hell",
      displayName: "Tower of Hell",
      description: "Parkour obstacle course",
      currencies: [
        { name: "Coins", displayName: "Coins", description: "In-game currency" },
      ],
    },
    {
      name: "Brookhaven",
      displayName: "Brookhaven",
      description: "Roleplay and life simulation",
      currencies: [
        { name: "Cash", displayName: "Cash", description: "In-game currency" },
      ],
    },
    {
      name: "Anime Fighting Simulator",
      displayName: "Anime Fighting Simulator",
      description: "Anime-themed combat game",
      currencies: [
        { name: "Yen", displayName: "Yen", description: "In-game currency" },
        { name: "Chikara Shards", displayName: "Chikara Shards", description: "Premium currency" },
      ],
    },
    {
      name: "Da Hood",
      displayName: "Da Hood",
      description: "Hood life roleplay game",
      currencies: [
        { name: "Cash", displayName: "Cash", description: "In-game currency" },
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
