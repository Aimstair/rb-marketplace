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
      'Roblox': [
        { name: 'Robux', displayName: 'Robux', category: 'Currency', itemType: 'Currency', order: 1 },
        { name: 'Limited Items', displayName: 'Limited Items', category: 'Items', itemType: 'In-game Items', order: 2 },
        { name: 'Accessories', displayName: 'Accessories', category: 'Accessories', itemType: 'In-game Items', order: 3 },
        { name: 'Account', displayName: 'Account', category: 'Accounts', itemType: 'Accounts', order: 4 },
      ],
      'Adopt Me': [
        { name: 'Pets', displayName: 'Pets', category: 'Items', itemType: 'Pet', order: 1 },
        { name: 'Bucks', displayName: 'Bucks', category: 'Currency', itemType: 'Currency', order: 2 },
        { name: 'Eggs', displayName: 'Eggs', category: 'Items', itemType: 'In-game Items', order: 3 },
        { name: 'Toys', displayName: 'Toys', category: 'Items', itemType: 'In-game Items', order: 4 },
        { name: 'Vehicles', displayName: 'Vehicles', category: 'Items', itemType: 'In-game Items', order: 5 },
      ],
      'Blox Fruits': [
        { name: 'Fragments', displayName: 'Fragments', category: 'Currency', itemType: 'Currency', order: 1 },
        { name: 'Gems', displayName: 'Gems', category: 'Currency', itemType: 'Currency', order: 2 },
        { name: 'Beli', displayName: 'Beli', category: 'Currency', itemType: 'Currency', order: 3 },
        { name: 'Fruits', displayName: 'Fruits', category: 'Items', itemType: 'In-game Items', order: 4 },
        { name: 'Gamepasses', displayName: 'Gamepasses', category: 'Games', itemType: 'Gamepass', order: 5 },
      ],
      'Pet Simulator X': [
        { name: 'Gems', displayName: 'Gems', category: 'Currency', itemType: 'Currency', order: 1 },
        { name: 'Huge Pets', displayName: 'Huge Pets', category: 'Items', itemType: 'Pet', order: 2 },
        { name: 'Titanic Pets', displayName: 'Titanic Pets', category: 'Items', itemType: 'Pet', order: 3 },
        { name: 'Exclusive Pets', displayName: 'Exclusive Pets', category: 'Items', itemType: 'Pet', order: 4 },
      ],
      'Pet Simulator 99': [
        { name: 'Gems', displayName: 'Gems', category: 'Currency', itemType: 'Currency', order: 1 },
        { name: 'Huge Pets', displayName: 'Huge Pets', category: 'Items', itemType: 'Pet', order: 2 },
        { name: 'Titanic Pets', displayName: 'Titanic Pets', category: 'Items', itemType: 'Pet', order: 3 },
      ],
      'Murder Mystery 2': [
        { name: 'Coins', displayName: 'Coins', category: 'Currency', itemType: 'Currency', order: 1 },
        { name: 'Knives', displayName: 'Knives', category: 'Items', itemType: 'Weapon', order: 2 },
        { name: 'Guns', displayName: 'Guns', category: 'Items', itemType: 'Weapon', order: 3 },
        { name: 'Pets', displayName: 'Pets', category: 'Items', itemType: 'Pet', order: 4 },
      ],
      'Jailbreak': [
        { name: 'Cash', displayName: 'Cash', category: 'Currency', itemType: 'Currency', order: 1 },
        { name: 'Vehicles', displayName: 'Vehicles', category: 'Items', itemType: 'In-game Items', order: 2 },
        { name: 'Weapons', displayName: 'Weapons', category: 'Items', itemType: 'Weapon', order: 3 },
      ],
      'Tower of Hell': [
        { name: 'Coins', displayName: 'Coins', category: 'Currency', itemType: 'Currency', order: 1 },
        { name: 'Skins', displayName: 'Skins', category: 'Items', itemType: 'In-game Items', order: 2 },
      ],
      'Brookhaven': [
        { name: 'Cash', displayName: 'Cash', category: 'Currency', itemType: 'Currency', order: 1 },
        { name: 'Items', displayName: 'Items', category: 'Items', itemType: 'In-game Items', order: 2 },
      ],
      'Anime Fighting Simulator': [
        { name: 'Yen', displayName: 'Yen', category: 'Currency', itemType: 'Currency', order: 1 },
        { name: 'Chikara Shards', displayName: 'Chikara Shards', category: 'Currency', itemType: 'Currency', order: 2 },
        { name: 'Powers', displayName: 'Powers', category: 'Items', itemType: 'In-game Items', order: 3 },
      ],
      'Da Hood': [
        { name: 'Cash', displayName: 'Cash', category: 'Currency', itemType: 'Currency', order: 1 },
        { name: 'Weapons', displayName: 'Weapons', category: 'Items', itemType: 'Weapon', order: 2 },
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
        const item = await prisma.gameItem.create({
          data: {
            gameId: game.id,
            name: itemData.name,
            displayName: itemData.displayName,
            category: itemData.category,
            itemType: itemData.itemType,
            order: itemData.order,
            isActive: true,
          }
        })
        console.log(`  ✅ Created: ${item.displayName} (${item.category})`)
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
