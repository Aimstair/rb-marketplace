const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function checkData() {
  try {
    console.log('✅ Game Items:')
    const items = await prisma.gameItem.findMany({
      include: {
        game: { select: { displayName: true } }
      },
      orderBy: [
        { gameId: 'asc' },
        { order: 'asc' }
      ],
      take: 10
    })
    items.forEach(item => {
      console.log(`  ${item.game.displayName} - ${item.displayName} (${item.category} / ${item.itemType})`)
    })
    
    const totalItems = await prisma.gameItem.count()
    const totalCurrencies = await prisma.gameCurrency.count()
    console.log(`\n📊 Total: ${totalItems} items, ${totalCurrencies} currencies`)
  } catch (error) {
    console.error('Error:', error.message)
  } finally {
    await prisma.$disconnect()
  }
}

checkData()
