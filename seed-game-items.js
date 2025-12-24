const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function seedGameItems() {
  try {
    console.log('🌱 Seeding game items...\n')

    // Get all games
    const games = await prisma.game.findMany({
      orderBy: { order: 'asc' }
    })

    const gameItems = {
      'General': [
        { name: 'Accessory', displayName: 'Accessory', category: 'Accessories', itemType: 'Accessory', order: 1 },
      ],
      'Roblox': [
        { name: 'Account', displayName: 'Account', category: 'Accounts', itemType: 'Account', order: 1 },
      ],
      'Grow a Garden': [
        { name: 'In-game Item', displayName: 'In-game Item', category: 'Games', itemType: 'In-game Item', order: 1 },
        { name: 'Gamepass', displayName: 'Gamepass', category: 'Games', itemType: 'Gamepass', order: 2 },
        { name: 'Account', displayName: 'Account', category: 'Accounts', itemType: 'Account', order: 3 },
      ],
      'Steal a Brainrot': [
        { name: 'Pet', displayName: 'Pet', category: 'Games', itemType: 'Pet', order: 1 },
        { name: 'In-game Item', displayName: 'In-game Item', category: 'Games', itemType: 'In-game Item', order: 2 },
        { name: 'Gamepass', displayName: 'Gamepass', category: 'Games', itemType: 'Gamepass', order: 3 },
        { name: 'Account', displayName: 'Account', category: 'Accounts', itemType: 'Account', order: 4 },
      ],
      'Plants vs Brainrot': [
        { name: 'Pet', displayName: 'Pet', category: 'Games', itemType: 'Pet', order: 1 },
        { name: 'In-game Item', displayName: 'In-game Item', category: 'Games', itemType: 'In-game Item', order: 2 },
        { name: 'Gamepass', displayName: 'Gamepass', category: 'Games', itemType: 'Gamepass', order: 3 },
        { name: 'Account', displayName: 'Account', category: 'Accounts', itemType: 'Account', order: 4 },
      ],
      'Fisch': [
        { name: 'In-game Item', displayName: 'In-game Item', category: 'Games', itemType: 'In-game Item', order: 1 },
        { name: 'Gamepass', displayName: 'Gamepass', category: 'Games', itemType: 'Gamepass', order: 2 },
        { name: 'Account', displayName: 'Account', category: 'Accounts', itemType: 'Account', order: 3 },
      ],
      'Fish It': [
        { name: 'In-game Item', displayName: 'In-game Item', category: 'Games', itemType: 'In-game Item', order: 1 },
        { name: 'Gamepass', displayName: 'Gamepass', category: 'Games', itemType: 'Gamepass', order: 2 },
        { name: 'Account', displayName: 'Account', category: 'Accounts', itemType: 'Account', order: 3 },
      ],
      'Anime Last Stand': [
        { name: 'Unit', displayName: 'Unit', category: 'Games', itemType: 'Unit', order: 1 },
        { name: 'In-game Item', displayName: 'In-game Item', category: 'Games', itemType: 'In-game Item', order: 2 },
        { name: 'Gamepass', displayName: 'Gamepass', category: 'Games', itemType: 'Gamepass', order: 3 },
        { name: 'Account', displayName: 'Account', category: 'Accounts', itemType: 'Account', order: 4 },
      ],
      'Anime Vanguards': [
        { name: 'Unit', displayName: 'Unit', category: 'Games', itemType: 'Unit', order: 1 },
        { name: 'In-game Item', displayName: 'In-game Item', category: 'Games', itemType: 'In-game Item', order: 2 },
        { name: 'Gamepass', displayName: 'Gamepass', category: 'Games', itemType: 'Gamepass', order: 3 },
        { name: 'Account', displayName: 'Account', category: 'Accounts', itemType: 'Account', order: 4 },
      ],
      'Adopt Me': [
        { name: 'Pet', displayName: 'Pet', category: 'Games', itemType: 'Pet', order: 1 },
        { name: 'In-game Item', displayName: 'In-game Item', category: 'Games', itemType: 'In-game Item', order: 2 },
        { name: 'Gamepass', displayName: 'Gamepass', category: 'Games', itemType: 'Gamepass', order: 3 },
        { name: 'Account', displayName: 'Account', category: 'Accounts', itemType: 'Account', order: 4 },
      ],
      'Blox Fruits': [
        { name: 'Fruit', displayName: 'Fruit', category: 'Games', itemType: 'Fruit', order: 1 },
        { name: 'In-game Item', displayName: 'In-game Item', category: 'Games', itemType: 'In-game Item', order: 2 },
        { name: 'Gamepass', displayName: 'Gamepass', category: 'Games', itemType: 'Gamepass', order: 3 },
        { name: 'Account', displayName: 'Account', category: 'Accounts', itemType: 'Account', order: 4 },
      ],
      'Pet Simulator X': [
        { name: 'Pet', displayName: 'Pet', category: 'Games', itemType: 'Pet', order: 1 },
        { name: 'In-game Item', displayName: 'In-game Item', category: 'Games', itemType: 'In-game Item', order: 2 },
        { name: 'Gamepass', displayName: 'Gamepass', category: 'Games', itemType: 'Gamepass', order: 3 },
        { name: 'Account', displayName: 'Account', category: 'Accounts', itemType: 'Account', order: 4 },
      ],
      'Pet Simulator 99': [
        { name: 'Pet', displayName: 'Pet', category: 'Games', itemType: 'Pet', order: 1 },
        { name: 'In-game Item', displayName: 'In-game Item', category: 'Games', itemType: 'In-game Item', order: 2 },
        { name: 'Gamepass', displayName: 'Gamepass', category: 'Games', itemType: 'Gamepass', order: 3 },
        { name: 'Account', displayName: 'Account', category: 'Accounts', itemType: 'Account', order: 4 },
      ],
      'Murder Mystery 2': [
        { name: 'In-game Item', displayName: 'In-game Item', category: 'Games', itemType: 'In-game Item', order: 1 },
        { name: 'Gamepass', displayName: 'Gamepass', category: 'Games', itemType: 'Gamepass', order: 2 },
        { name: 'Account', displayName: 'Account', category: 'Accounts', itemType: 'Account', order: 3 },
      ],
      'Anime Fighting Simulator': [
        { name: 'In-game Item', displayName: 'In-game Item', category: 'Games', itemType: 'In-game Item', order: 1 },
        { name: 'Gamepass', displayName: 'Gamepass', category: 'Games', itemType: 'Gamepass', order: 2 },
        { name: 'Account', displayName: 'Account', category: 'Accounts', itemType: 'Account', order: 3 },
      ],
      'Dragon Adventures': [
        { name: 'Dragon', displayName: 'Dragon', category: 'Games', itemType: 'Dragon', order: 1 },
        { name: 'In-game Item', displayName: 'In-game Item', category: 'Games', itemType: 'In-game Item', order: 2 },
        { name: 'Gamepass', displayName: 'Gamepass', category: 'Games', itemType: 'Gamepass', order: 3 },
        { name: 'Account', displayName: 'Account', category: 'Accounts', itemType: 'Account', order: 4 },
      ],
      'Bubble Gum Simulator': [
        { name: 'In-game Item', displayName: 'In-game Item', category: 'Games', itemType: 'In-game Item', order: 1 },
        { name: 'Gamepass', displayName: 'Gamepass', category: 'Games', itemType: 'Gamepass', order: 2 },
        { name: 'Account', displayName: 'Account', category: 'Accounts', itemType: 'Account', order: 3 },
      ],
      'Grand Piece Online': [
        { name: 'Fruit', displayName: 'Fruit', category: 'Games', itemType: 'Fruit', order: 1 },
        { name: 'In-game Item', displayName: 'In-game Item', category: 'Games', itemType: 'In-game Item', order: 2 },
        { name: 'Gamepass', displayName: 'Gamepass', category: 'Games', itemType: 'Gamepass', order: 3 },
        { name: 'Account', displayName: 'Account', category: 'Accounts', itemType: 'Account', order: 4 },
      ],
    }

    let totalCreated = 0

    for (const game of games) {
      const items = gameItems[game.name]
      if (!items) {
        console.log(`⚠️  No items defined for ${game.displayName}`)
        continue
      }

      console.log(`📦 Creating items for ${game.displayName}...`)
      
      for (const itemData of items) {
        const item = await prisma.gameItem.upsert({
          where: {
            gameId_name: {
              gameId: game.id,
              name: itemData.name,
            },
          },
          update: {
            displayName: itemData.displayName,
            category: itemData.category,
            itemType: itemData.itemType,
            order: itemData.order,
            isActive: true,
          },
          create: {
            gameId: game.id,
            name: itemData.name,
            displayName: itemData.displayName,
            category: itemData.category,
            itemType: itemData.itemType,
            order: itemData.order,
            isActive: true,
          }
        })
        console.log(`  ✅ Created/Updated: ${item.displayName} (${item.category})`)
        totalCreated++
      }
    }

    console.log(`\n✨ Seeding complete! Created ${totalCreated} game items.`)
  } catch (error) {
    console.error('❌ Error seeding game items:', error)
  } finally {
    await prisma.$disconnect()
  }
}

seedGameItems()
