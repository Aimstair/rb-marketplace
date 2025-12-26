import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

async function main() {
  console.log("🌱 Starting minimal seed (Games, Currencies, Items, Settings)...\n")

  // Clear existing data (optional - comment out if you want to keep existing data)
  console.log("🗑️  Clearing existing data...")
  await prisma.gameItem.deleteMany()
  await prisma.gameCurrency.deleteMany()
  await prisma.game.deleteMany()
  await prisma.systemSettings.deleteMany()
  console.log("✅ Cleared\n")

  // 1. Create System Settings
  console.log("⚙️  Creating system settings...")
  await prisma.systemSettings.create({
    data: {
      key: "maintenance_mode",
      value: "false",
      category: "system",
    },
  })
  console.log("✅ System settings created\n")

  // 2. Create Games with Currencies and Items
  const gamesData = [
    {
      name: "Roblox",
      displayName: "Roblox",
      description: "Popular online gaming platform",
      image: "/games/roblox.png",
      order: 0,
      currencies: [
        { name: "Robux", displayName: "Robux", description: "Official Roblox currency", order: 0 },
      ],
      items: [
        { name: "Accessories", displayName: "Accessories", category: "Games", itemType: "In-game Item", order: 0 },
        { name: "Account", displayName: "Account", category: "Accounts", itemType: "Account", order: 1 },
      ],
    },
    {
      name: "Grow a Garden",
      displayName: "Grow a Garden",
      description: "Grow your own virtual garden",
      image: "/games/grow-a-garden.png",
      order: 1,
      currencies: [
        { name: "Sheckles", displayName: "Sheckles", description: "In-game currency", order: 0 },
        { name: "Tokens", displayName: "Tokens", description: "In-game currency", order: 1 },
      ],
      items: [
        { name: "Pet", displayName: "Pet", category: "Games", itemType: "Pet", order: 0 },
        { name: "In-game Item", displayName: "In-game Item", category: "Games", itemType: "In-game Item", order: 1 },
        { name: "Gamepass", displayName: "Gamepass", category: "Games", itemType: "Gamepass", order: 2 },
        { name: "Account", displayName: "Account", category: "Accounts", itemType: "Account", order: 3 },
      ],
    },
    {
      name: "Steal a Brainrot",
      displayName: "Steal a Brainrot",
      description: "Brainrot themed game",
      image: "/games/steal-brainrot.png",
      order: 2,
      currencies: [],
      items: [
        { name: "Pet", displayName: "Pet", category: "Games", itemType: "Pet", order: 0 },
        { name: "In-game Item", displayName: "In-game Item", category: "Games", itemType: "In-game Item", order: 1 },
        { name: "Gamepass", displayName: "Gamepass", category: "Games", itemType: "Gamepass", order: 2 },
        { name: "Account", displayName: "Account", category: "Accounts", itemType: "Account", order: 3 },
      ],
    },
    {
      name: "Plants vs Brainrot",
      displayName: "Plants vs Brainrot",
      description: "Tower defense brainrot game",
      image: "/games/plants-vs-brainrot.png",
      order: 3,
      currencies: [],
      items: [
        { name: "Pet", displayName: "Pet", category: "Games", itemType: "Pet", order: 0 },
        { name: "In-game Item", displayName: "In-game Item", category: "Games", itemType: "In-game Item", order: 1 },
        { name: "Gamepass", displayName: "Gamepass", category: "Games", itemType: "Gamepass", order: 2 },
        { name: "Account", displayName: "Account", category: "Accounts", itemType: "Account", order: 3 },
      ],
    },
    {
      name: "Fisch",
      displayName: "Fisch",
      description: "Fishing adventure game",
      image: "/games/fisch.png",
      order: 4,
      currencies: [
        { name: "Coins", displayName: "Coins", description: "In-game currency", order: 0 },
      ],
      items: [
        { name: "Fish", displayName: "Fish", category: "Games", itemType: "In-game Item", order: 0 },
        { name: "In-game Item", displayName: "In-game Item", category: "Games", itemType: "In-game Item", order: 1 },
        { name: "Gamepass", displayName: "Gamepass", category: "Games", itemType: "Gamepass", order: 2 },
        { name: "Account", displayName: "Account", category: "Accounts", itemType: "Account", order: 3 },
      ],
    },
    {
      name: "Fish It",
      displayName: "Fish It",
      description: "Fishing simulation game",
      image: "/games/fish-it.png",
      order: 5,
      currencies: [
        { name: "Coins", displayName: "Coins", description: "In-game currency", order: 0 },
      ],
      items: [
        { name: "Fish", displayName: "Fish", category: "Games", itemType: "In-game Item", order: 0 },
        { name: "In-game Item", displayName: "In-game Item", category: "Games", itemType: "In-game Item", order: 1 },
        { name: "Gamepass", displayName: "Gamepass", category: "Games", itemType: "Gamepass", order: 2 },
        { name: "Account", displayName: "Account", category: "Accounts", itemType: "Account", order: 3 },
      ],
    },
    {
      name: "Anime Last Stand",
      displayName: "Anime Last Stand",
      description: "Anime tower defense game",
      image: "/games/anime-last-stand.png",
      order: 6,
      currencies: [],
      items: [
        { name: "Unit", displayName: "Unit", category: "Games", itemType: "Unit", order: 0 },
        { name: "In-game Item", displayName: "In-game Item", category: "Games", itemType: "In-game Item", order: 1 },
        { name: "Gamepass", displayName: "Gamepass", category: "Games", itemType: "Gamepass", order: 2 },
        { name: "Account", displayName: "Account", category: "Accounts", itemType: "Account", order: 3 },
      ],
    },
    {
      name: "Anime Vanguards",
      displayName: "Anime Vanguards",
      description: "Anime battle game",
      image: "/games/anime-vanguards.png",
      order: 7,
      currencies: [
        { name: "Gems", displayName: "Gems", description: "In-game currency", order: 0 },
      ],
      items: [
        { name: "Unit", displayName: "Unit", category: "Games", itemType: "Unit", order: 0 },
        { name: "In-game Item", displayName: "In-game Item", category: "Games", itemType: "In-game Item", order: 1 },
        { name: "Gamepass", displayName: "Gamepass", category: "Games", itemType: "Gamepass", order: 2 },
        { name: "Account", displayName: "Account", category: "Accounts", itemType: "Account", order: 3 },
      ],
    },
    {
      name: "Adopt Me",
      displayName: "Adopt Me",
      description: "Pet adoption and trading game",
      image: "/games/adopt-me.png",
      order: 8,
      currencies: [
        { name: "Bucks", displayName: "Bucks", description: "In-game currency", order: 0 },
      ],
      items: [
        { name: "Pet", displayName: "Pet", category: "Games", itemType: "Pet", order: 0 },
        { name: "In-game Item", displayName: "In-game Item", category: "Games", itemType: "In-game Item", order: 1 },
        { name: "Gamepass", displayName: "Gamepass", category: "Games", itemType: "Gamepass", order: 2 },
        { name: "Account", displayName: "Account", category: "Accounts", itemType: "Account", order: 3 },
      ],
    },
    {
      name: "Blox Fruits",
      displayName: "Blox Fruits",
      description: "One Piece inspired adventure game",
      image: "/games/blox-fruits.png",
      order: 9,
      currencies: [
        { name: "Bounty", displayName: "Bounty", description: "Player bounty", order: 0 },
      ],
      items: [
        { name: "Fruit", displayName: "Fruit", category: "Games", itemType: "Fruit", order: 0 },
        { name: "In-game Item", displayName: "In-game Item", category: "Games", itemType: "In-game Item", order: 1 },
        { name: "Gamepass", displayName: "Gamepass", category: "Games", itemType: "Gamepass", order: 2 },
        { name: "Account", displayName: "Account", category: "Accounts", itemType: "Account", order: 3 },
      ],
    },
    {
      name: "Pet Simulator X",
      displayName: "Pet Simulator X",
      description: "Pet collection and trading game",
      image: "/games/pet-simulator-x.png",
      order: 10,
      currencies: [
        { name: "Gems", displayName: "Gems", description: "In-game currency", order: 0 },
      ],
      items: [
        { name: "Pet", displayName: "Pet", category: "Games", itemType: "Pet", order: 0 },
        { name: "In-game Item", displayName: "In-game Item", category: "Games", itemType: "In-game Item", order: 1 },
        { name: "Gamepass", displayName: "Gamepass", category: "Games", itemType: "Gamepass", order: 2 },
        { name: "Account", displayName: "Account", category: "Accounts", itemType: "Account", order: 3 },
      ],
    },
    {
      name: "Pet Simulator 99",
      displayName: "Pet Simulator 99",
      description: "Latest pet collection game",
      image: "/games/pet-simulator-99.png",
      order: 11,
      currencies: [
        { name: "Gems", displayName: "Gems", description: "In-game currency", order: 0 },
      ],
      items: [
        { name: "Pet", displayName: "Pet", category: "Games", itemType: "Pet", order: 0 },
        { name: "In-game Item", displayName: "In-game Item", category: "Games", itemType: "In-game Item", order: 1 },
        { name: "Gamepass", displayName: "Gamepass", category: "Games", itemType: "Gamepass", order: 2 },
        { name: "Account", displayName: "Account", category: "Accounts", itemType: "Account", order: 3 },
      ],
    },
    {
      name: "Murder Mystery 2",
      displayName: "Murder Mystery 2",
      description: "Mystery and role-playing game",
      image: "/games/murder-mystery-2.png",
      order: 12,
      currencies: [],
      items: [
        { name: "In-game Item", displayName: "In-game Item", category: "Games", itemType: "In-game Item", order: 0 },
        { name: "Gamepass", displayName: "Gamepass", category: "Games", itemType: "Gamepass", order: 1 },
        { name: "Account", displayName: "Account", category: "Accounts", itemType: "Account", order: 2 },
      ],
    },
    {
      name: "Anime Fighting Simulator",
      displayName: "Anime Fighting Simulator",
      description: "Anime combat simulation",
      image: "/games/anime-fighting-simulator.png",
      order: 13,
      currencies: [],
      items: [
        { name: "In-game Item", displayName: "In-game Item", category: "Games", itemType: "In-game Item", order: 0 },
        { name: "Gamepass", displayName: "Gamepass", category: "Games", itemType: "Gamepass", order: 1 },
        { name: "Account", displayName: "Account", category: "Accounts", itemType: "Account", order: 2 },
      ],
    },
    {
      name: "Dragon Adventures",
      displayName: "Dragon Adventures",
      description: "Raise and train dragons",
      image: "/games/dragon-adventures.png",
      order: 14,
      currencies: [
        { name: "Coins", displayName: "Coins", description: "In-game currency", order: 0 },
      ],
      items: [
        { name: "Dragon", displayName: "Dragon", category: "Games", itemType: "Dragon", order: 0 },
        { name: "In-game Item", displayName: "In-game Item", category: "Games", itemType: "In-game Item", order: 1 },
        { name: "Gamepass", displayName: "Gamepass", category: "Games", itemType: "Gamepass", order: 2 },
        { name: "Account", displayName: "Account", category: "Accounts", itemType: "Account", order: 3 },
      ],
    },
    {
      name: "Bubble Gum Simulator",
      displayName: "Bubble Gum Simulator",
      description: "Bubble gum collection game",
      image: "/games/bubble-gum-simulator.png",
      order: 15,
      currencies: [
        { name: "Token", displayName: "Token", description: "In-game currency", order: 0 },
      ],
      items: [
        { name: "Pet", displayName: "Pet", category: "Games", itemType: "Pet", order: 0 },
        { name: "In-game Item", displayName: "In-game Item", category: "Games", itemType: "In-game Item", order: 1 },
        { name: "Gamepass", displayName: "Gamepass", category: "Games", itemType: "Gamepass", order: 2 },
        { name: "Account", displayName: "Account", category: "Accounts", itemType: "Account", order: 3 },
      ],
    },
    {
      name: "Grand Piece Online",
      displayName: "Grand Piece Online",
      description: "One Piece inspired MMORPG",
      image: "/games/grand-piece-online.png",
      order: 16,
      currencies: [
        { name: "Bounty", displayName: "Bounty", description: "Premium currency", order: 0 },
      ],
      items: [
        { name: "Fruit", displayName: "Fruit", category: "Games", itemType: "Fruit", order: 0 },
        { name: "In-game Item", displayName: "In-game Item", category: "Games", itemType: "In-game Item", order: 1 },
        { name: "Gamepass", displayName: "Gamepass", category: "Games", itemType: "Gamepass", order: 2 },
        { name: "Account", displayName: "Account", category: "Accounts", itemType: "Account", order: 3 },
      ],
    },
  ]

  console.log("🎮 Creating games with currencies and items...\n")

  for (const gameData of gamesData) {
    const game = await prisma.game.create({
      data: {
        name: gameData.name,
        displayName: gameData.displayName,
        description: gameData.description,
        image: gameData.image,
        order: gameData.order,
        isActive: true,
      },
    })

    console.log(`✅ Created game: ${game.displayName}`)

    // Create currencies for this game
    for (const currencyData of gameData.currencies) {
      await prisma.gameCurrency.create({
        data: {
          gameId: game.id,
          name: currencyData.name,
          displayName: currencyData.displayName,
          description: currencyData.description,
          order: currencyData.order,
          isActive: true,
        },
      })
      console.log(`  💎 Created currency: ${currencyData.displayName}`)
    }

    // Create items for this game
    for (const itemData of gameData.items) {
      await prisma.gameItem.create({
        data: {
          gameId: game.id,
          name: itemData.name,
          displayName: itemData.displayName,
          category: itemData.category,
          itemType: itemData.itemType,
          order: itemData.order,
          isActive: true,
        },
      })
      console.log(`  📦 Created item: ${itemData.displayName}`)
    }

    console.log("")
  }

  console.log("✨ Minimal seeding complete!")
  console.log(`📊 Created: ${gamesData.length} games with their currencies and items`)
}

main()
  .catch((e) => {
    console.error("❌ Error during seeding:", e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
