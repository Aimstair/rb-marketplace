import { PrismaClient } from "@prisma/client"
import bcrypt from "bcrypt"

const prisma = new PrismaClient()

async function main() {
  // Clear existing data
  await prisma.auditLog.deleteMany({})
  await prisma.announcement.deleteMany({})
  await prisma.supportTicket.deleteMany({})
  await prisma.dispute.deleteMany({})
  await prisma.vouch.deleteMany({})
  await prisma.listing.deleteMany({})
  await prisma.user.deleteMany({})

  // Hash admin password
  const hashedAdminPassword = await bcrypt.hash("admin123", 12)
  const hashedUserPassword = await bcrypt.hash("password123", 12)
  const hashedPassword = await bcrypt.hash("pass123", 12)

  // Create users
  const trustedTrader = await prisma.user.create({
    data: {
      id: "user-1",
      username: "TrustedTrader",
      email: "user@test.com",
      password: hashedUserPassword,
      role: "user",
      profilePicture: "/diverse-user-avatars.png",
      banner: "/profile-banner.png",
      bio: "Active Roblox trader with 2+ years experience. Specializing in limited items and currency. Fast and safe trades!",
      joinDate: new Date("2022-03-15"),
      robloxProfile: "TrustedTrader_123",
      discordTag: "TrustedTrader#1234",
    },
  })

  const adminModerator = await prisma.user.create({
    data: {
      id: "admin-1",
      username: "AdminModerator",
      email: "admin@test.com",
      password: hashedAdminPassword,
      role: "admin",
      profilePicture: "/admin-avatar.png",
      banner: "/admin-banner.jpg",
      bio: "RobloxTrade Admin & Moderator. Here to ensure safe and fair trading for all users.",
      joinDate: new Date("2021-01-01"),
      robloxProfile: "AdminMod_RobloxTrade",
    },
  })

  // Create additional sellers for the listings
  const pixelVault = await prisma.user.create({
    data: {
      username: "PixelVault",
      email: "pixel@test.com",
      password: hashedPassword,
      role: "user",
    },
  })

  const legitTrader = await prisma.user.create({
    data: {
      username: "LegitTrader",
      email: "legit@test.com",
      password: hashedPassword,
      role: "user",
    },
  })

  const ugcMaster = await prisma.user.create({
    data: {
      username: "UGCMaster",
      email: "ugc@test.com",
      password: hashedPassword,
      role: "user",
    },
  })

  const hatCollector = await prisma.user.create({
    data: {
      username: "HatCollector",
      email: "hat@test.com",
      password: hashedPassword,
      role: "user",
    },
  })

  const ninjaTrader = await prisma.user.create({
    data: {
      username: "NinjaTrader",
      email: "ninja@test.com",
      password: hashedPassword,
      role: "user",
    },
  })

  const safeTrader = await prisma.user.create({
    data: {
      username: "SafeTrader99",
      email: "safe@test.com",
      password: hashedPassword,
      role: "user",
    },
  })

  const casualPlayer = await prisma.user.create({
    data: {
      username: "CasualPlayer",
      email: "casual@test.com",
      password: hashedPassword,
      role: "user",
    },
  })

  const tradeMaster = await prisma.user.create({
    data: {
      username: "TradeMaster",
      email: "trade@test.com",
      password: hashedPassword,
      role: "user",
    },
  })

  const gamepassKing = await prisma.user.create({
    data: {
      username: "GamepassKing",
      email: "gamepass@test.com",
      password: hashedPassword,
      role: "user",
    },
  })

  const vipSeller = await prisma.user.create({
    data: {
      username: "VIPSeller",
      email: "vip@test.com",
      password: hashedPassword,
      role: "user",
    },
  })

  const boostPro = await prisma.user.create({
    data: {
      username: "BoostPro",
      email: "boost@test.com",
      password: hashedPassword,
      role: "user",
    },
  })

  const helpDesk = await prisma.user.create({
    data: {
      username: "HelpDesk",
      email: "help@test.com",
      password: hashedPassword,
      role: "user",
    },
  })

  const accountSeller = await prisma.user.create({
    data: {
      username: "AccountSeller",
      email: "accounts@test.com",
      password: hashedPassword,
      role: "user",
    },
  })

  const proAccounts = await prisma.user.create({
    data: {
      username: "ProAccounts",
      email: "pro@test.com",
      password: hashedPassword,
      role: "user",
    },
  })

  const premiumAccs = await prisma.user.create({
    data: {
      username: "PremiumAccs",
      email: "premium@test.com",
      password: hashedPassword,
      role: "user",
    },
  })

  const starterAccs = await prisma.user.create({
    data: {
      username: "StarterAccs",
      email: "starter@test.com",
      password: hashedPassword,
      role: "user",
    },
  })

  // Create listings
  const listings = await prisma.listing.createMany({
    data: [
      // Accessories (Roblox Catalog Items)
      {
        id: "listing-1",
        title: "Dominus Astrorum",
        game: "Roblox Catalog",
        price: 8999,
        image: "/dominus-astrorum-roblox-limited.jpg",
        sellerId: pixelVault.id,
        category: "Accessories",
        itemType: "Limited",
        condition: "Mint",
        status: "available",
        featured: true,
        vouchCount: 89,
        upvotes: 124,
        downvotes: 5,
      },
      {
        id: "listing-2",
        title: "Party Hat",
        game: "Roblox Catalog",
        price: 4200,
        image: "/roblox-party-hat-accessory.jpg",
        sellerId: legitTrader.id,
        category: "Accessories",
        itemType: "Limited",
        condition: "Mint",
        status: "available",
        featured: false,
        vouchCount: 134,
        upvotes: 98,
        downvotes: 4,
      },
      {
        id: "listing-3",
        title: "UGC Accessory Bundle",
        game: "Roblox Catalog",
        price: 890,
        image: "/roblox-ugc-accessories-bundle.jpg",
        sellerId: ugcMaster.id,
        category: "Accessories",
        itemType: "UGC",
        condition: "New",
        status: "available",
        featured: false,
        vouchCount: 201,
        upvotes: 145,
        downvotes: 7,
      },
      {
        id: "listing-4",
        title: "Sparkle Time Fedora",
        game: "Roblox Catalog",
        price: 3500,
        image: "/roblox-sparkle-fedora-hat.jpg",
        sellerId: hatCollector.id,
        category: "Accessories",
        itemType: "Limited",
        condition: "Mint",
        status: "available",
        featured: true,
        vouchCount: 67,
        upvotes: 76,
        downvotes: 2,
      },
      // Games - In-Game Items
      {
        id: "listing-5",
        title: "Golden Dragon Pet",
        game: "Adopt Me",
        price: 2500,
        image: "/golden-dragon-pet-roblox.jpg",
        sellerId: ninjaTrader.id,
        category: "Games",
        itemType: "In-Game Items",
        condition: "New",
        status: "available",
        featured: true,
        vouchCount: 42,
        upvotes: 67,
        downvotes: 3,
      },
      {
        id: "listing-6",
        title: "Royal Winged Dragon",
        game: "Adopt Me",
        price: 5500,
        image: "/adopt-me-royal-dragon-pet.jpg",
        sellerId: safeTrader.id,
        category: "Games",
        itemType: "In-Game Items",
        condition: "New",
        status: "available",
        featured: false,
        vouchCount: 78,
        upvotes: 56,
        downvotes: 2,
      },
      {
        id: "listing-7",
        title: "Pet Simulator X Huge Pets Bundle",
        game: "Pet Simulator X",
        price: 3800,
        image: "/pet-simulator-x-huge-pets-bundle.jpg",
        sellerId: casualPlayer.id,
        category: "Games",
        itemType: "In-Game Items",
        condition: "Used",
        status: "available",
        featured: false,
        vouchCount: 23,
        upvotes: 34,
        downvotes: 8,
      },
      // Games - Gamepasses
      {
        id: "listing-8",
        title: "Blox Fruits Zoan Tier 3",
        game: "Blox Fruits",
        price: 1200,
        image: "/blox-fruits-zoan-tier.jpg",
        sellerId: tradeMaster.id,
        category: "Games",
        itemType: "Gamepasses",
        condition: "New",
        status: "available",
        featured: false,
        vouchCount: 156,
        upvotes: 89,
        downvotes: 12,
      },
      {
        id: "listing-9",
        title: "2x EXP Gamepass",
        game: "Blox Fruits",
        price: 800,
        image: "/blox-fruits-gamepass-exp-boost.jpg",
        sellerId: gamepassKing.id,
        category: "Games",
        itemType: "Gamepasses",
        condition: "New",
        status: "available",
        featured: false,
        vouchCount: 45,
        upvotes: 62,
        downvotes: 4,
      },
      {
        id: "listing-10",
        title: "VIP Gamepass",
        game: "Pet Simulator X",
        price: 650,
        image: "/pet-simulator-vip-gamepass.jpg",
        sellerId: vipSeller.id,
        category: "Games",
        itemType: "Gamepasses",
        condition: "New",
        status: "available",
        featured: false,
        vouchCount: 89,
        upvotes: 78,
        downvotes: 3,
      },
      // Games - Services
      {
        id: "listing-11",
        title: "Level Boosting Service",
        game: "Blox Fruits",
        price: 500,
        image: "/blox-fruits-leveling-service.jpg",
        sellerId: boostPro.id,
        category: "Games",
        itemType: "Services",
        condition: "New",
        status: "available",
        featured: false,
        vouchCount: 234,
        upvotes: 156,
        downvotes: 8,
      },
      {
        id: "listing-12",
        title: "Account Recovery Help",
        game: "Adopt Me",
        price: 300,
        image: "/account-help-service.jpg",
        sellerId: helpDesk.id,
        category: "Games",
        itemType: "Services",
        condition: "New",
        status: "available",
        featured: false,
        vouchCount: 112,
        upvotes: 89,
        downvotes: 5,
      },
      // Accounts
      {
        id: "listing-13",
        title: "Starter Account - Pet Sim X",
        game: "Pet Simulator X",
        price: 2100,
        image: "/pet-simulator-x-account.jpg",
        sellerId: accountSeller.id,
        category: "Accounts",
        itemType: "Account",
        condition: "New",
        status: "available",
        featured: false,
        vouchCount: 45,
        upvotes: 23,
        downvotes: 6,
      },
      {
        id: "listing-14",
        title: "Max Level Account",
        game: "Blox Fruits",
        price: 4500,
        image: "/blox-fruits-max-level-account.jpg",
        sellerId: proAccounts.id,
        category: "Accounts",
        itemType: "Account",
        condition: "Used",
        status: "available",
        featured: true,
        vouchCount: 67,
        upvotes: 45,
        downvotes: 3,
      },
      {
        id: "listing-15",
        title: "Rich Adopt Me Account",
        game: "Adopt Me",
        price: 8000,
        image: "/adopt-me-rich-account-pets.jpg",
        sellerId: premiumAccs.id,
        category: "Accounts",
        itemType: "Account",
        condition: "Used",
        status: "available",
        featured: false,
        vouchCount: 156,
        upvotes: 112,
        downvotes: 7,
      },
      {
        id: "listing-16",
        title: "Beginner Blox Fruits Account",
        game: "Blox Fruits",
        price: 1200,
        image: "/blox-fruits-starter-account.jpg",
        sellerId: starterAccs.id,
        category: "Accounts",
        itemType: "Account",
        condition: "New",
        status: "available",
        featured: false,
        vouchCount: 34,
        upvotes: 28,
        downvotes: 2,
      },
    ],
  })

  // Create some transactions for dispute examples
  const transaction1 = await prisma.transaction.create({
    data: {
      buyerId: trustedTrader.id,
      sellerId: pixelVault.id,
      listingId: "listing-1",
      price: 5000,
      status: "COMPLETED",
      buyerConfirmed: true,
      sellerConfirmed: true,
    },
  })

  const transaction2 = await prisma.transaction.create({
    data: {
      buyerId: legitTrader.id,
      sellerId: ugcMaster.id,
      listingId: "listing-2",
      price: 2500,
      status: "PENDING",
      buyerConfirmed: false,
      sellerConfirmed: false,
    },
  })

  // Create sample disputes
  await prisma.dispute.createMany({
    data: [
      {
        transactionId: transaction1.id,
        reason: "Item Not Received",
        status: "OPEN",
      },
      {
        transactionId: transaction2.id,
        reason: "Item Different",
        status: "OPEN",
      },
    ],
  })

  // Create sample support tickets
  await prisma.supportTicket.createMany({
    data: [
      {
        userId: trustedTrader.id,
        subject: "Cannot withdraw my Robux",
        message: "I've been trying to withdraw my Robux for 3 days now but it keeps failing. Please help!",
        status: "OPEN",
      },
      {
        userId: legitTrader.id,
        subject: "Appeal for ban",
        message: "I was wrongfully banned. I never scammed anyone. Please review my case.",
        status: "OPEN",
      },
      {
        userId: ugcMaster.id,
        subject: "How do I verify my account?",
        message: "What steps do I need to take to get verified?",
        status: "CLOSED",
      },
    ],
  })

  // Create sample announcements
  await prisma.announcement.createMany({
    data: [
      {
        title: "System Maintenance Notice",
        content: "We will be performing scheduled maintenance on December 20th from 2-4 AM UTC. Trading will be temporarily disabled during this time.",
        type: "maintenance",
        isActive: true,
        expiresAt: new Date("2025-12-21"),
      },
      {
        title: "New Feature: Enhanced Vouch System",
        content: "We've upgraded our vouch system with better fraud detection. Check out the new features in your profile!",
        type: "update",
        isActive: true,
        expiresAt: new Date("2026-01-10"),
      },
      {
        title: "Holiday Trading Event",
        content: "Special holiday trading event with reduced fees! Valid from Dec 20 - Jan 5.",
        type: "event",
        isActive: false,
        expiresAt: new Date("2026-01-05"),
      },
      {
        title: "Warning: Scam Alert",
        content: "We've detected an increase in phishing attempts. Never share your password or 2FA codes with anyone.",
        type: "warning",
        isActive: true,
        expiresAt: new Date("2025-12-31"),
      },
    ],
  })

  // Create sample audit logs
  await prisma.auditLog.createMany({
    data: [
      {
        adminId: adminModerator.id,
        action: "USER_BANNED",
        targetId: "some-user-id",
        details: "User was banned for repeated scam attempts",
      },
      {
        adminId: adminModerator.id,
        action: "REPORT_RESOLVED",
        targetId: "report-1",
        details: "Report investigated and user was issued a warning",
      },
      {
        adminId: adminModerator.id,
        action: "ANNOUNCEMENT_CREATED",
        targetId: "announcement-1",
        details: "Created system maintenance announcement",
      },
      {
        adminId: adminModerator.id,
        action: "TICKET_CLOSED",
        targetId: "ticket-1",
        details: "Support ticket resolved with user assistance",
      },
    ],
  })

  console.log(`Seeding completed! Created ${listings.count} listings, disputes, support tickets, announcements, and audit logs`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
