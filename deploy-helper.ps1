#!/usr/bin/env pwsh

# DigitalOcean Deployment Helper Script

Write-Host "=== RB Marketplace - DigitalOcean Deployment Helper ===" -ForegroundColor Cyan
Write-Host ""

# Function to generate NEXTAUTH_SECRET
function Generate-Secret {
    Write-Host "Generating NEXTAUTH_SECRET..." -ForegroundColor Yellow
    $secret = node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
    Write-Host "Your NEXTAUTH_SECRET:" -ForegroundColor Green
    Write-Host $secret -ForegroundColor White
    Write-Host ""
    Write-Host "Save this value - you'll need it for DigitalOcean environment variables!" -ForegroundColor Yellow
    Write-Host ""
}

# Function to check if code is ready for deployment
function Test-Deployment {
    Write-Host "Checking deployment readiness..." -ForegroundColor Yellow
    Write-Host ""
    
    $errors = @()
    
    # Check if .git exists
    if (-not (Test-Path ".git")) {
        $errors += "Git repository not initialized"
    }
    
    # Check if package.json exists
    if (-not (Test-Path "package.json")) {
        $errors += "package.json not found"
    }
    
    # Check if prisma schema exists
    if (-not (Test-Path "prisma/schema.prisma")) {
        $errors += "Prisma schema not found"
    }
    
    # Check if .env.production.example exists
    if (-not (Test-Path ".env.production.example")) {
        $errors += ".env.production.example not found"
    }
    
    if ($errors.Count -eq 0) {
        Write-Host "✓ All checks passed! Ready for deployment" -ForegroundColor Green
        Write-Host ""
        Write-Host "Next steps:" -ForegroundColor Cyan
        Write-Host "1. Push your code to GitHub" -ForegroundColor White
        Write-Host "2. Create DigitalOcean Managed PostgreSQL database" -ForegroundColor White
        Write-Host "3. Create App Platform application" -ForegroundColor White
        Write-Host "4. Add environment variables" -ForegroundColor White
        Write-Host "5. Deploy!" -ForegroundColor White
        Write-Host ""
        Write-Host "See DEPLOYMENT_GUIDE.md for detailed instructions" -ForegroundColor Yellow
    } else {
        Write-Host "✗ Deployment check failed:" -ForegroundColor Red
        foreach ($error in $errors) {
            Write-Host "  - $error" -ForegroundColor Red
        }
    }
    Write-Host ""
}

# Function to prepare git for deployment
function Initialize-Git {
    Write-Host "Preparing Git repository..." -ForegroundColor Yellow
    
    if (-not (Test-Path ".git")) {
        git init
        Write-Host "✓ Git repository initialized" -ForegroundColor Green
    }
    
    # Create .gitignore if it doesn't exist
    if (-not (Test-Path ".gitignore")) {
        @"
# dependencies
/node_modules
/.pnp
.pnp.js

# testing
/coverage

# next.js
/.next/
/out/

# production
/build

# misc
.DS_Store
*.pem

# debug
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# local env files
.env
.env*.local
.env.production

# vercel
.vercel

# typescript
*.tsbuildinfo
next-env.d.ts

# prisma
prisma/migrations/**/migration.sql
"@ | Out-File -FilePath ".gitignore" -Encoding UTF8
        Write-Host "✓ .gitignore created" -ForegroundColor Green
    }
    
    Write-Host ""
    Write-Host "Ready to commit and push!" -ForegroundColor Green
    Write-Host "Commands:" -ForegroundColor Cyan
    Write-Host "  git add ." -ForegroundColor White
    Write-Host "  git commit -m 'Ready for deployment'" -ForegroundColor White
    Write-Host "  git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git" -ForegroundColor White
    Write-Host "  git push -u origin main" -ForegroundColor White
    Write-Host ""
}

# Function to show environment variables template
function Show-EnvTemplate {
    Write-Host "Environment Variables Template" -ForegroundColor Cyan
    Write-Host "================================" -ForegroundColor Cyan
    Write-Host ""
    Get-Content ".env.production.example" | Write-Host
    Write-Host ""
}

# Main menu
Write-Host "What would you like to do?" -ForegroundColor Yellow
Write-Host "1. Generate NEXTAUTH_SECRET" -ForegroundColor White
Write-Host "2. Check deployment readiness" -ForegroundColor White
Write-Host "3. Initialize Git repository" -ForegroundColor White
Write-Host "4. Show environment variables template" -ForegroundColor White
Write-Host "5. Open deployment guide" -ForegroundColor White
Write-Host "0. Exit" -ForegroundColor White
Write-Host ""

$choice = Read-Host "Enter your choice (0-5)"

switch ($choice) {
    "1" { Generate-Secret }
    "2" { Test-Deployment }
    "3" { Initialize-Git }
    "4" { Show-EnvTemplate }
    "5" { 
        if (Test-Path "DEPLOYMENT_GUIDE.md") {
            Start-Process "DEPLOYMENT_GUIDE.md"
        } else {
            Write-Host "DEPLOYMENT_GUIDE.md not found!" -ForegroundColor Red
        }
    }
    "0" { Write-Host "Goodbye!" -ForegroundColor Green; exit }
    default { Write-Host "Invalid choice!" -ForegroundColor Red }
}

Write-Host ""
Write-Host "Press any key to exit..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
