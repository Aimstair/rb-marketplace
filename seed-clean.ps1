# Clean Database Seed Script
# This will delete all data and seed only essential tables

Write-Host "🗑️  Starting clean database seed..." -ForegroundColor Yellow
Write-Host ""

# Run the clean seed
npx tsx prisma/seed-clean.ts

Write-Host ""
Write-Host "✅ Clean seed completed!" -ForegroundColor Green
Write-Host ""
Write-Host "📝 Next steps:" -ForegroundColor Cyan
Write-Host "   1. Sign up for a new account at /auth/signup" -ForegroundColor White
Write-Host "   2. Create your first listing at /sell" -ForegroundColor White
Write-Host "   3. Browse the marketplace at /marketplace" -ForegroundColor White
