/**
 * Migration script to restore report data after schema split
 * This script should be run if you had existing reports in the old table
 * 
 * Note: The old reports table had both listingId and reportedId as optional
 * If both were present, we prioritize creating a listing report
 */

const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  console.log('Checking if old reports table exists...')
  
  try {
    // Check if old reports table still exists
    const oldReports = await prisma.$queryRaw`
      SELECT * FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = 'reports'
    `
    
    if (oldReports.length === 0) {
      console.log('Old reports table has been dropped. No migration needed.')
      console.log('If you had existing report data, you may need to restore from a backup.')
      return
    }

    console.log('Old reports table found. Migrating data...')
    
    // Get all reports from old table
    const reports = await prisma.$queryRaw`SELECT * FROM reports`
    
    console.log(`Found ${reports.length} reports to migrate`)
    
    let listingReportCount = 0
    let userReportCount = 0
    let skippedCount = 0
    
    for (const report of reports) {
      try {
        if (report.listingId && report.listingType) {
          // Create listing report
          await prisma.reportListing.create({
            data: {
              id: report.id,
              reporterId: report.reporterId,
              listingId: report.listingId,
              listingType: report.listingType,
              reason: report.reason,
              details: report.details,
              status: report.status,
              createdAt: report.createdAt,
              updatedAt: report.updatedAt,
            }
          })
          listingReportCount++
          console.log(`✓ Migrated listing report: ${report.id}`)
        } else if (report.reportedId) {
          // Create user report
          await prisma.reportUser.create({
            data: {
              id: report.id,
              reporterId: report.reporterId,
              reportedId: report.reportedId,
              reason: report.reason,
              details: report.details,
              status: report.status,
              createdAt: report.createdAt,
              updatedAt: report.updatedAt,
            }
          })
          userReportCount++
          console.log(`✓ Migrated user report: ${report.id}`)
        } else {
          console.log(`⚠ Skipped invalid report: ${report.id} (no listingId or reportedId)`)
          skippedCount++
        }
      } catch (error) {
        console.error(`✗ Failed to migrate report ${report.id}:`, error.message)
        skippedCount++
      }
    }
    
    console.log('\n=== Migration Summary ===')
    console.log(`Listing reports migrated: ${listingReportCount}`)
    console.log(`User reports migrated: ${userReportCount}`)
    console.log(`Skipped: ${skippedCount}`)
    console.log(`Total processed: ${reports.length}`)
    
  } catch (error) {
    console.error('Migration failed:', error)
    throw error
  }
}

main()
  .catch((error) => {
    console.error('Fatal error:', error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
