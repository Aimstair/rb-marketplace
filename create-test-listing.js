const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function createTestListing() {
  try {
    // Get a user to be the seller
    const user = await prisma.user.findFirst()
    
    if (!user) {
      console.log('No users found. Please create a user first.')
      return
    }
    
    console.log(`Creating test listing for user: ${user.username}`)
    
    // Create a test currency listing
    const listing = await prisma.currencyListing.create({
      data: {
        title: 'Blox Fruits - Fragments',
        description: 'Fast delivery! Trusted seller with 50+ vouches',
        gameName: 'Blox Fruits',
        currencyName: 'Fragments',
        ratePerPeso: 1000, // 1000 fragments per PHP 1
        stock: 5000000, // 5 million fragments available
        minOrder: 100000, // Min 100k fragments
        maxOrder: 1000000, // Max 1M fragments
        image: 'https://via.placeholder.com/400x300?text=Blox+Fruits+Fragments',
        sellerId: user.id,
        status: 'available',
        featured: false,
        views: 0,
        upvotes: 0,
        downvotes: 0,
      }
    })
    
    console.log('✅ Test listing created!')
    console.log(`   ID: ${listing.id}`)
    console.log(`   Title: ${listing.title}`)
    console.log(`   Rate: ${listing.ratePerPeso} per ₱1`)
    console.log(`   Stock: ${listing.stock.toLocaleString()}`)
    
    // Create another test listing
    const listing2 = await prisma.currencyListing.create({
      data: {
        title: 'Pet Simulator X - Gems',
        description: 'Cheap gems! Active 24/7',
        gameName: 'Pet Simulator X',
        currencyName: 'Gems',
        ratePerPeso: 5000000, // 5M gems per PHP 1
        stock: 2000000000, // 2B gems (within Int range)
        minOrder: 100000000, // Min 100M gems
        maxOrder: 500000000, // Max 500M gems
        image: 'https://via.placeholder.com/400x300?text=PSX+Gems',
        sellerId: user.id,
        status: 'available',
        featured: true,
        views: 45,
        upvotes: 12,
        downvotes: 1,
      }
    })
    
    console.log('✅ Second test listing created!')
    console.log(`   ID: ${listing2.id}`)
    console.log(`   Title: ${listing2.title}`)
    console.log(`   Featured: Yes`)
    
    const count = await prisma.currencyListing.count()
    console.log(`\n📊 Total CurrencyListings: ${count}`)
    
  } catch (error) {
    console.error('❌ Error:', error.message)
  } finally {
    await prisma.$disconnect()
  }
}

createTestListing()
