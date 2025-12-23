const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function clear() {
  await prisma.itemListing.deleteMany()
  console.log('✅ Cleared ItemListing table')
  await prisma.$disconnect()
}

clear()
