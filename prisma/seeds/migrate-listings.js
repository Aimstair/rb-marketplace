const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function migrateListings() {
  try {
    console.log('🚀 Starting migration of old Listing table to ItemListing/CurrencyListing...\n')

    // Get all old listings
    const oldListings = await prisma.listing.findMany({
      include: {
        seller: true
      }
    })

    console.log(`📊 Found ${oldListings.length} old listings to migrate\n`)

    if (oldListings.length === 0) {
      console.log('✅ No listings to migrate!')
      return
    }

    let itemCount = 0
    let currencyCount = 0
    let skippedCount = 0

    for (const listing of oldListings) {
      console.log(`\n📦 Processing: ${listing.title}`)
      console.log(`   Type: ${listing.type}`)
      console.log(`   Game: ${listing.game}`)

      if (listing.type === 'CURRENCY') {
        // Migrate to CurrencyListing
        console.log('   → Migrating to CurrencyListing...')

        // Map game names (Currency Exchange should belong to the actual game)
        const gameNameMap = {
          'Currency Exchange': 'Roblox' // Default mapping
        }
        
        const mappedGameName = gameNameMap[listing.game] || listing.game

        // Need to find matching Game and GameCurrency
        const game = await prisma.game.findFirst({
          where: {
            OR: [
              { name: mappedGameName },
              { displayName: mappedGameName }
            ]
          }
        })

        if (!game) {
          console.log(`   ⚠️  Game not found: ${listing.game} (mapped to ${mappedGameName}) - Skipping`)
          skippedCount++
          continue
        }

        // Try to extract currency name from title or description
        // This is a best-guess approach since old schema didn't have structured currency data
        let currencyName = 'Currency' // Default fallback
        
        // Try to match common currency names
        const commonCurrencies = ['Robux', 'Fragments', 'Gems', 'Beli', 'Bucks', 'Cash', 'Coins', 'Yen', 'Chikara Shards']
        for (const currency of commonCurrencies) {
          if (listing.title.includes(currency) || listing.description?.includes(currency)) {
            currencyName = currency
            break
          }
        }

        const gameCurrency = await prisma.gameCurrency.findFirst({
          where: {
            gameId: game.id,
            name: currencyName
          }
        })

        if (!gameCurrency) {
          console.log(`   ⚠️  Currency not found: ${currencyName} for ${game.displayName} - Skipping`)
          skippedCount++
          continue
        }

        try {
          await prisma.currencyListing.create({
            data: {
              title: listing.title,
              description: listing.description,
              gameId: game.id,
              gameCurrencyId: gameCurrency.id,
              ratePerPeso: 100, // Default rate, adjust as needed
              stock: listing.stock,
              minOrder: 1,
              maxOrder: listing.stock,
              image: listing.image,
              sellerId: listing.sellerId,
              status: listing.status,
              featured: listing.featured,
              views: listing.views,
              upvotes: listing.upvotes,
              downvotes: listing.downvotes,
              createdAt: listing.createdAt,
              updatedAt: listing.updatedAt,
            }
          })
          console.log('   ✅ Migrated to CurrencyListing')
          currencyCount++
        } catch (error) {
          console.log(`   ❌ Error: ${error.message}`)
          skippedCount++
        }

      } else {
        // Migrate to ItemListing
        console.log('   → Migrating to ItemListing...')

        // Find matching Game with game name mapping
        const gameNameMap = {
          'MM2': 'Murder Mystery 2',
          'Arsenal': 'Arsenal', // Not in DB yet, skip for now
          'Currency Exchange': 'Roblox' // Currency Exchange should map to the game
        }
        
        const mappedGameName = gameNameMap[listing.game] || listing.game
        
        const game = await prisma.game.findFirst({
          where: {
            OR: [
              { name: mappedGameName },
              { displayName: mappedGameName }
            ]
          }
        })

        if (!game) {
          console.log(`   ⚠️  Game not found: ${listing.game} (mapped to ${mappedGameName}) - Skipping`)
          skippedCount++
          continue
        }

        // Smart GameItem matching with category/itemType mapping
        let gameItem = null
        
        // Map old category/itemType to new GameItem entries
        const categoryMap = {
          'Accessories': 'Accessories',
          'Accounts': 'Account',
          'Games': null // Need to check itemType more carefully
        }
        
        const itemTypeMap = {
          'Limited': 'Limited Items',
          'Account': 'Account',
          'In-Game Items': null, // Too generic, need game-specific logic
          'Gamepasses': 'Gamepasses',
          'Services': null // Not a standard GameItem type
        }
        
        // Try multiple strategies to find GameItem
        if (listing.category === 'Accessories' && listing.itemType === 'Limited') {
          // Roblox Limited Items
          gameItem = await prisma.gameItem.findFirst({
            where: {
              gameId: game.id,
              name: 'Limited Items'
            }
          })
        } else if (listing.category === 'Accounts') {
          // Account type
          gameItem = await prisma.gameItem.findFirst({
            where: {
              gameId: game.id,
              name: 'Account'
            }
          })
        } else if (listing.category === 'Games') {
          // In-game items - try to infer from game and itemType
          if (listing.itemType === 'In-Game Items') {
            // For Adopt Me pets
            if (game.name === 'Adopt Me') {
              gameItem = await prisma.gameItem.findFirst({
                where: {
                  gameId: game.id,
                  name: 'Pets'
                }
              })
            }
            // For PSX items
            else if (game.name === 'Pet Simulator X') {
              gameItem = await prisma.gameItem.findFirst({
                where: {
                  gameId: game.id,
                  name: 'Gems'
                }
              })
            }
            // For Jailbreak
            else if (game.name === 'Jailbreak') {
              if (listing.title.toLowerCase().includes('vehicle')) {
                gameItem = await prisma.gameItem.findFirst({
                  where: {
                    gameId: game.id,
                    name: 'Vehicles'
                  }
                })
              } else {
                gameItem = await prisma.gameItem.findFirst({
                  where: {
                    gameId: game.id,
                    name: 'Cash'
                  }
                })
              }
            }
          } else if (listing.itemType === 'Gamepasses') {
            gameItem = await prisma.gameItem.findFirst({
              where: {
                gameId: game.id,
                name: 'Gamepasses'
              }
            })
          }
        }
        
        // Fallback: try any GameItem for the game
        if (!gameItem) {
          gameItem = await prisma.gameItem.findFirst({
            where: {
              gameId: game.id
            }
          })
          if (gameItem) {
            console.log(`   ℹ️  Using fallback GameItem: ${gameItem.displayName}`)
          }
        }

        if (!gameItem) {
          console.log(`   ⚠️  GameItem not found for category: ${listing.category} / itemType: ${listing.itemType} - Skipping`)
          skippedCount++
          continue
        }

        try {
          await prisma.itemListing.create({
            data: {
              title: listing.title,
              description: listing.description,
              gameId: game.id,
              gameItemId: gameItem.id,
              price: listing.price,
              stock: listing.stock,
              image: listing.image,
              condition: listing.condition,
              sellerId: listing.sellerId,
              status: listing.status,
              featured: listing.featured,
              views: listing.views,
              upvotes: listing.upvotes,
              downvotes: listing.downvotes,
              createdAt: listing.createdAt,
              updatedAt: listing.updatedAt,
            }
          })
          console.log('   ✅ Migrated to ItemListing')
          itemCount++
        } catch (error) {
          console.log(`   ❌ Error: ${error.message}`)
          skippedCount++
        }
      }
    }

    console.log('\n' + '='.repeat(60))
    console.log('📈 Migration Summary:')
    console.log(`   ✅ ItemListings created: ${itemCount}`)
    console.log(`   ✅ CurrencyListings created: ${currencyCount}`)
    console.log(`   ⚠️  Skipped: ${skippedCount}`)
    console.log(`   📊 Total processed: ${oldListings.length}`)
    console.log('='.repeat(60))

    if (itemCount + currencyCount > 0) {
      console.log('\n✨ Migration completed successfully!')
      console.log('\n⚠️  NOTE: Old Listing table data is preserved.')
      console.log('   You can verify the migration and then remove the old table.')
    }

  } catch (error) {
    console.error('\n❌ Migration failed:', error)
    console.error(error.stack)
  } finally {
    await prisma.$disconnect()
  }
}

migrateListings()
