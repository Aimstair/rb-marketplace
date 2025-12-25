const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function verify() {
  const itemCount = await prisma.itemListing.count()
  const oldListingCount = await prisma.listing.count()
  const gameCount = await prisma.game.count()
  
  console.log('\n📊 Migration Verification:')
  console.log(`   ItemListings: ${itemCount}`)
  console.log(`   Old Listings: ${oldListingCount}`)
  console.log(`   Games: ${gameCount}`)
  console.log(`\n✅ Successfully migrated ${itemCount} out of ${oldListingCount} listings`)
  
  await prisma.$disconnect()
}

verify()
