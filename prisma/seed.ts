import { PrismaClient } from "@prisma/client"
import bcrypt from "bcrypt"

const prisma = new PrismaClient()

async function main() {
  console.log("Starting database seeding...")

  // Clear existing data in correct order to avoid FK constraints
  await prisma.auditLog.deleteMany({})
  await prisma.announcement.deleteMany({})
  await prisma.supportTicket.deleteMany({})
  await prisma.vouch.deleteMany({})
  await prisma.dispute.deleteMany({})
  await prisma.transaction.deleteMany({})
  await prisma.message.deleteMany({})
  await prisma.conversation.deleteMany({})
  await prisma.listingVote.deleteMany({})
  await prisma.notification.deleteMany({})
  await prisma.listing.deleteMany({})
  await prisma.userFollow.deleteMany({})
  await prisma.user.deleteMany({})

  // Seed FilterOptions if table is empty
  const filterCount = await prisma.filterOption.count()
  if (filterCount === 0) {
    console.log("Seeding FilterOptions...")
    
    // CATEGORY filters
    await prisma.filterOption.createMany({
      data: [
        { type: "CATEGORY", label: "Accessories", value: "Accessories", order: 1 },
        { type: "CATEGORY", label: "Games", value: "Games", order: 2 },
        { type: "CATEGORY", label: "Accounts", value: "Accounts", order: 3 },
      ],
    })

    // GAME filters
    await prisma.filterOption.createMany({
      data: [
        { type: "GAME", label: "Roblox", value: "Roblox", order: 1 },
        { type: "GAME", label: "Adopt Me", value: "Adopt Me", order: 2 },
        { type: "GAME", label: "Blox Fruits", value: "Blox Fruits", order: 3 },
        { type: "GAME", label: "Pet Simulator X", value: "Pet Simulator X", order: 4 },
        { type: "GAME", label: "MM2", value: "MM2", order: 5 },
        { type: "GAME", label: "Jailbreak", value: "Jailbreak", order: 6 },
        { type: "GAME", label: "Arsenal", value: "Arsenal", order: 7 },
        { type: "GAME", label: "Currency Exchange", value: "Currency Exchange", order: 8 },
      ],
    })

    // ITEM_TYPE filters
    await prisma.filterOption.createMany({
      data: [
        { type: "ITEM_TYPE", label: "Limited", value: "Limited", order: 1 },
        { type: "ITEM_TYPE", label: "UGC", value: "UGC", order: 2 },
        { type: "ITEM_TYPE", label: "In-Game Items", value: "In-Game Items", order: 3 },
        { type: "ITEM_TYPE", label: "Gamepasses", value: "Gamepasses", order: 4 },
        { type: "ITEM_TYPE", label: "Services", value: "Services", order: 5 },
        { type: "ITEM_TYPE", label: "Account", value: "Account", order: 6 },
      ],
    })

    // CONDITION filters
    await prisma.filterOption.createMany({
      data: [
        { type: "CONDITION", label: "Mint", value: "Mint", order: 1 },
        { type: "CONDITION", label: "New", value: "New", order: 2 },
        { type: "CONDITION", label: "Used", value: "Used", order: 3 },
      ],
    })

    console.log("✓ FilterOptions seeded successfully!")
  }

  // Hash passwords
  const hashedAdminPassword = await bcrypt.hash("admin123", 12)
  const hashedUserPassword = await bcrypt.hash("password123", 12)
  const hashedPassword = await bcrypt.hash("pass123", 12)

  console.log("Creating users...")

  console.log("Creating users...")

  // Create Admin User
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
      isVerified: true,
    },
  })

  // Create Top Vouched Power Sellers (for TopVouchedSellers component)
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
      isVerified: true,
    },
  })

  const eliteTrader = await prisma.user.create({
    data: {
      username: "EliteTrader",
      email: "elite@test.com",
      password: hashedPassword,
      role: "user",
      profilePicture: "/diverse-user-avatars.png",
      bio: "Elite trader with 500+ successful trades. Specializing in rare limiteds and high-value accounts.",
      joinDate: new Date("2021-06-10"),
      robloxProfile: "EliteTrader_Pro",
      discordTag: "EliteTrader#9999",
      isVerified: true,
    },
  })

  const legendaryDealer = await prisma.user.create({
    data: {
      username: "LegendaryDealer",
      email: "legendary@test.com",
      password: hashedPassword,
      role: "user",
      profilePicture: "/diverse-user-avatars.png",
      bio: "Legendary status trader. 1000+ vouches. Fast responses and secure trades guaranteed!",
      joinDate: new Date("2020-12-01"),
      robloxProfile: "Legendary_Dealer",
      discordTag: "Legendary#0001",
      isVerified: true,
    },
  })

  const proTraderX = await prisma.user.create({
    data: {
      username: "ProTraderX",
      email: "protrader@test.com",
      password: hashedPassword,
      role: "user",
      profilePicture: "/diverse-user-avatars.png",
      bio: "Professional trader since 2021. Specializing in Blox Fruits and Adopt Me. Always online!",
      joinDate: new Date("2021-08-20"),
      robloxProfile: "ProTrader_X",
      discordTag: "ProTraderX#7777",
      isVerified: true,
    },
  })

  // Create Regular Sellers (various games and categories)
  const pixelVault = await prisma.user.create({
    data: {
      username: "PixelVault",
      email: "pixel@test.com",
      password: hashedPassword,
      role: "user",
      profilePicture: "/diverse-user-avatars.png",
      bio: "Collecting and trading Roblox limiteds since 2022.",
      joinDate: new Date("2022-05-10"),
    },
  })

  const legitTrader = await prisma.user.create({
    data: {
      username: "LegitTrader",
      email: "legit@test.com",
      password: hashedPassword,
      role: "user",
      bio: "Honest trader, no scams!",
      joinDate: new Date("2023-01-15"),
    },
  })

  const ugcMaster = await prisma.user.create({
    data: {
      username: "UGCMaster",
      email: "ugc@test.com",
      password: hashedPassword,
      role: "user",
      bio: "UGC creator and trader. Quality items only!",
      joinDate: new Date("2023-03-20"),
    },
  })

  const hatCollector = await prisma.user.create({
    data: {
      username: "HatCollector",
      email: "hat@test.com",
      password: hashedPassword,
      role: "user",
      bio: "Passionate about collecting rare hats and accessories.",
      joinDate: new Date("2022-11-05"),
    },
  })

  const ninjaTrader = await prisma.user.create({
    data: {
      username: "NinjaTrader",
      email: "ninja@test.com",
      password: hashedPassword,
      role: "user",
      bio: "Fast trades like a ninja! Adopt Me specialist.",
      joinDate: new Date("2023-02-14"),
    },
  })

  const safeTrader = await prisma.user.create({
    data: {
      username: "SafeTrader99",
      email: "safe@test.com",
      password: hashedPassword,
      role: "user",
      bio: "Your safety is my priority. Always use middleman!",
      joinDate: new Date("2022-09-30"),
    },
  })

  const casualPlayer = await prisma.user.create({
    data: {
      username: "CasualPlayer",
      email: "casual@test.com",
      password: hashedPassword,
      role: "user",
      bio: "Just a casual player selling extra items.",
      joinDate: new Date("2023-07-12"),
    },
  })

  const tradeMaster = await prisma.user.create({
    data: {
      username: "TradeMaster",
      email: "trade@test.com",
      password: hashedPassword,
      role: "user",
      bio: "Master of trades. Blox Fruits expert!",
      joinDate: new Date("2022-04-18"),
      isVerified: true,
    },
  })

  const gamepassKing = await prisma.user.create({
    data: {
      username: "GamepassKing",
      email: "gamepass@test.com",
      password: hashedPassword,
      role: "user",
      bio: "Selling gamepasses for all popular games!",
      joinDate: new Date("2023-05-25"),
    },
  })

  const vipSeller = await prisma.user.create({
    data: {
      username: "VIPSeller",
      email: "vip@test.com",
      password: hashedPassword,
      role: "user",
      bio: "VIP passes and premium items available.",
      joinDate: new Date("2023-04-08"),
    },
  })

  const boostPro = await prisma.user.create({
    data: {
      username: "BoostPro",
      email: "boost@test.com",
      password: hashedPassword,
      role: "user",
      bio: "Professional leveling and boosting services. Fast and reliable!",
      joinDate: new Date("2022-07-22"),
      isVerified: true,
    },
  })

  const helpDesk = await prisma.user.create({
    data: {
      username: "HelpDesk",
      email: "help@test.com",
      password: hashedPassword,
      role: "user",
      bio: "Offering account recovery and support services.",
      joinDate: new Date("2022-10-15"),
    },
  })

  const accountSeller = await prisma.user.create({
    data: {
      username: "AccountSeller",
      email: "accounts@test.com",
      password: hashedPassword,
      role: "user",
      bio: "Selling premium Roblox accounts. All legit!",
      joinDate: new Date("2023-06-01"),
    },
  })

  const proAccounts = await prisma.user.create({
    data: {
      username: "ProAccounts",
      email: "pro@test.com",
      password: hashedPassword,
      role: "user",
      bio: "High-level accounts for serious players.",
      joinDate: new Date("2022-08-12"),
      isVerified: true,
    },
  })

  const premiumAccs = await prisma.user.create({
    data: {
      username: "PremiumAccs",
      email: "premium@test.com",
      password: hashedPassword,
      role: "user",
      bio: "Premium accounts with rare items and pets.",
      joinDate: new Date("2023-01-30"),
    },
  })

  const starterAccs = await prisma.user.create({
    data: {
      username: "StarterAccs",
      email: "starter@test.com",
      password: hashedPassword,
      role: "user",
      bio: "Affordable starter accounts for beginners.",
      joinDate: new Date("2023-08-05"),
    },
  })

  const mm2Trader = await prisma.user.create({
    data: {
      username: "MM2Trader",
      email: "mm2@test.com",
      password: hashedPassword,
      role: "user",
      bio: "Murder Mystery 2 weapons and knives specialist.",
      joinDate: new Date("2023-03-11"),
    },
  })

  const jailbreakPro = await prisma.user.create({
    data: {
      username: "JailbreakPro",
      email: "jailbreak@test.com",
      password: hashedPassword,
      role: "user",
      bio: "Jailbreak items and cash. Fast delivery!",
      joinDate: new Date("2023-02-28"),
    },
  })

  const arsenalDealer = await prisma.user.create({
    data: {
      username: "ArsenalDealer",
      email: "arsenal@test.com",
      password: hashedPassword,
      role: "user",
      bio: "Arsenal skins and accounts available.",
      joinDate: new Date("2023-09-14"),
    },
  })

  const petSimGuru = await prisma.user.create({
    data: {
      username: "PetSimGuru",
      email: "petsim@test.com",
      password: hashedPassword,
      role: "user",
      bio: "Pet Simulator X expert. Huge pets and rare items!",
      joinDate: new Date("2022-12-20"),
      isVerified: true,
    },
  })

  console.log("✓ Users created successfully!")
  console.log("Creating listings...")

  // Create comprehensive listings covering all categories, games, and item types
  const listings = await prisma.listing.createMany({
    data: [
      // ========================================
      // ACCESSORIES CATEGORY - Limited Items
      // ========================================
      // ========================================
      // ACCESSORIES CATEGORY - Limited Items
      // ========================================
      {
        id: "listing-1",
        title: "Dominus Astrorum - Rare Limited",
        game: "Roblox",
        price: 8999,
        stock: 1,
        image: "/dominus-astrorum-roblox-limited.jpg",
        sellerId: pixelVault.id,
        category: "Accessories",
        itemType: "Limited",
        condition: "Mint",
        status: "available",
        featured: true,
        views: 2450,
        vouchCount: 89,
        upvotes: 124,
        downvotes: 5,
        createdAt: new Date("2024-11-15"),
      },
      {
        id: "listing-2",
        title: "Sparkle Time Fedora",
        game: "Roblox",
        price: 3500,
        stock: 1,
        image: "/roblox-sparkle-fedora-hat.jpg",
        sellerId: hatCollector.id,
        category: "Accessories",
        itemType: "Limited",
        condition: "Mint",
        status: "available",
        featured: true,
        views: 1820,
        vouchCount: 67,
        upvotes: 76,
        downvotes: 2,
        createdAt: new Date("2024-11-18"),
      },
      {
        id: "listing-3",
        title: "Clockwork Headphones",
        game: "Roblox",
        price: 5200,
        stock: 1,
        image: "/clockwork-headphones.jpg",
        sellerId: eliteTrader.id,
        category: "Accessories",
        itemType: "Limited",
        condition: "Mint",
        status: "available",
        featured: false,
        views: 980,
        vouchCount: 145,
        upvotes: 98,
        downvotes: 4,
        createdAt: new Date("2024-11-20"),
      },
      {
        id: "listing-4",
        title: "Valkyrie Helm",
        game: "Roblox",
        price: 6800,
        stock: 1,
        image: "/valkyrie-helm.jpg",
        sellerId: legendaryDealer.id,
        category: "Accessories",
        itemType: "Limited",
        condition: "New",
        status: "available",
        featured: true,
        views: 3100,
        vouchCount: 201,
        upvotes: 189,
        downvotes: 3,
        createdAt: new Date("2024-11-10"),
      },

      // ========================================
      // ACCESSORIES CATEGORY - UGC Items
      // ========================================
      {
        id: "listing-5",
        title: "UGC Accessory Bundle - 5 Items",
        game: "Roblox",
        price: 890,
        stock: 10,
        image: "/roblox-ugc-accessories-bundle.jpg",
        sellerId: ugcMaster.id,
        category: "Accessories",
        itemType: "UGC",
        condition: "New",
        status: "available",
        featured: false,
        views: 670,
        vouchCount: 34,
        upvotes: 45,
        downvotes: 7,
        createdAt: new Date("2024-11-25"),
      },
      {
        id: "listing-6",
        title: "Custom Wings UGC Set",
        game: "Roblox",
        price: 1200,
        stock: 5,
        image: "/custom-wings-ugc.jpg",
        sellerId: ugcMaster.id,
        category: "Accessories",
        itemType: "UGC",
        condition: "New",
        status: "available",
        featured: false,
        views: 430,
        vouchCount: 28,
        upvotes: 52,
        downvotes: 3,
        createdAt: new Date("2024-11-28"),
      },

      // ========================================
      // GAMES CATEGORY - Blox Fruits - In-Game Items
      // ========================================
      {
        id: "listing-7",
        title: "Blox Fruits - Dragon Fruit",
        game: "Blox Fruits",
        price: 2800,
        stock: 3,
        image: "/blox-fruits-dragon-fruit.jpg",
        sellerId: tradeMaster.id,
        category: "Games",
        itemType: "In-Game Items",
        condition: "New",
        status: "available",
        featured: true,
        views: 4200,
        vouchCount: 156,
        upvotes: 234,
        downvotes: 12,
        createdAt: new Date("2024-11-12"),
      },
      {
        id: "listing-8",
        title: "Blox Fruits - Dough Fruit",
        game: "Blox Fruits",
        price: 2200,
        stock: 2,
        image: "/blox-fruits-dough-fruit.jpg",
        sellerId: tradeMaster.id,
        category: "Games",
        itemType: "In-Game Items",
        condition: "New",
        status: "available",
        featured: false,
        views: 3800,
        vouchCount: 142,
        upvotes: 198,
        downvotes: 8,
        createdAt: new Date("2024-11-14"),
      },
      {
        id: "listing-9",
        title: "Blox Fruits - Buddha Fruit",
        game: "Blox Fruits",
        price: 1800,
        stock: 5,
        image: "/blox-fruits-buddha-fruit.jpg",
        sellerId: proTraderX.id,
        category: "Games",
        itemType: "In-Game Items",
        condition: "New",
        status: "available",
        featured: false,
        views: 2900,
        vouchCount: 98,
        upvotes: 156,
        downvotes: 6,
        createdAt: new Date("2024-11-19"),
      },
      {
        id: "listing-10",
        title: "Blox Fruits - Leopard Fruit",
        game: "Blox Fruits",
        price: 3500,
        stock: 1,
        image: "/blox-fruits-leopard-fruit.jpg",
        sellerId: eliteTrader.id,
        category: "Games",
        itemType: "In-Game Items",
        condition: "New",
        status: "available",
        featured: true,
        views: 5100,
        vouchCount: 187,
        upvotes: 289,
        downvotes: 9,
        createdAt: new Date("2024-11-08"),
      },

      // ========================================
      // GAMES CATEGORY - Blox Fruits - Gamepasses
      // ========================================
      {
        id: "listing-11",
        title: "Blox Fruits - 2x EXP Gamepass",
        game: "Blox Fruits",
        price: 800,
        stock: 20,
        image: "/blox-fruits-gamepass-exp-boost.jpg",
        sellerId: gamepassKing.id,
        category: "Games",
        itemType: "Gamepasses",
        condition: "New",
        status: "available",
        featured: false,
        views: 1650,
        vouchCount: 45,
        upvotes: 62,
        downvotes: 4,
        createdAt: new Date("2024-11-22"),
      },
      {
        id: "listing-12",
        title: "Blox Fruits - Fast Boats Gamepass",
        game: "Blox Fruits",
        price: 600,
        stock: 15,
        image: "/blox-fruits-fast-boats.jpg",
        sellerId: gamepassKing.id,
        category: "Games",
        itemType: "Gamepasses",
        condition: "New",
        status: "available",
        featured: false,
        views: 890,
        vouchCount: 38,
        upvotes: 48,
        downvotes: 2,
        createdAt: new Date("2024-11-26"),
      },

      // ========================================
      // GAMES CATEGORY - Blox Fruits - Services
      // ========================================
      {
        id: "listing-13",
        title: "Blox Fruits - Level Boosting (1-2450)",
        game: "Blox Fruits",
        price: 500,
        stock: 50,
        image: "/blox-fruits-leveling-service.jpg",
        sellerId: boostPro.id,
        category: "Games",
        itemType: "Services",
        condition: "New",
        status: "available",
        featured: false,
        views: 2340,
        vouchCount: 234,
        upvotes: 312,
        downvotes: 8,
        createdAt: new Date("2024-11-05"),
      },
      {
        id: "listing-14",
        title: "Blox Fruits - Fruit Farming Service",
        game: "Blox Fruits",
        price: 350,
        stock: 30,
        image: "/blox-fruits-fruit-farming.jpg",
        sellerId: boostPro.id,
        category: "Games",
        itemType: "Services",
        condition: "New",
        status: "available",
        featured: false,
        views: 1560,
        vouchCount: 178,
        upvotes: 201,
        downvotes: 5,
        createdAt: new Date("2024-11-16"),
      },

      // ========================================
      // GAMES CATEGORY - Adopt Me - In-Game Items
      // ========================================
      {
        id: "listing-15",
        title: "Adopt Me - Golden Dragon Pet",
        game: "Adopt Me",
        price: 2500,
        stock: 2,
        image: "/golden-dragon-pet-roblox.jpg",
        sellerId: ninjaTrader.id,
        category: "Games",
        itemType: "In-Game Items",
        condition: "New",
        status: "available",
        featured: true,
        views: 3450,
        vouchCount: 42,
        upvotes: 67,
        downvotes: 3,
        createdAt: new Date("2024-11-11"),
      },
      {
        id: "listing-16",
        title: "Adopt Me - Frost Dragon",
        game: "Adopt Me",
        price: 4200,
        stock: 1,
        image: "/adopt-me-frost-dragon.jpg",
        sellerId: ninjaTrader.id,
        category: "Games",
        itemType: "In-Game Items",
        condition: "New",
        status: "available",
        featured: true,
        views: 5600,
        vouchCount: 89,
        upvotes: 145,
        downvotes: 4,
        createdAt: new Date("2024-11-07"),
      },
      {
        id: "listing-17",
        title: "Adopt Me - Neon Unicorn",
        game: "Adopt Me",
        price: 1800,
        stock: 3,
        image: "/adopt-me-neon-unicorn.jpg",
        sellerId: safeTrader.id,
        category: "Games",
        itemType: "In-Game Items",
        condition: "New",
        status: "available",
        featured: false,
        views: 2100,
        vouchCount: 56,
        upvotes: 78,
        downvotes: 2,
        createdAt: new Date("2024-11-21"),
      },
      {
        id: "listing-18",
        title: "Adopt Me - Shadow Dragon",
        game: "Adopt Me",
        price: 6500,
        stock: 1,
        image: "/adopt-me-shadow-dragon.jpg",
        sellerId: proTraderX.id,
        category: "Games",
        itemType: "In-Game Items",
        condition: "Mint",
        status: "available",
        featured: true,
        views: 7800,
        vouchCount: 167,
        upvotes: 289,
        downvotes: 6,
        createdAt: new Date("2024-11-01"),
      },

      // ========================================
      // GAMES CATEGORY - Adopt Me - Gamepasses
      // ========================================
      {
        id: "listing-19",
        title: "Adopt Me - VIP Gamepass",
        game: "Adopt Me",
        price: 450,
        stock: 25,
        image: "/adopt-me-vip-gamepass.jpg",
        sellerId: gamepassKing.id,
        category: "Games",
        itemType: "Gamepasses",
        condition: "New",
        status: "available",
        featured: false,
        views: 980,
        vouchCount: 34,
        upvotes: 45,
        downvotes: 1,
        createdAt: new Date("2024-11-24"),
      },

      // ========================================
      // GAMES CATEGORY - Adopt Me - Services
      // ========================================
      {
        id: "listing-20",
        title: "Adopt Me - Pet Aging Service",
        game: "Adopt Me",
        price: 300,
        stock: 40,
        image: "/adopt-me-aging-service.jpg",
        sellerId: helpDesk.id,
        category: "Games",
        itemType: "Services",
        condition: "New",
        status: "available",
        featured: false,
        views: 1230,
        vouchCount: 112,
        upvotes: 89,
        downvotes: 5,
        createdAt: new Date("2024-11-17"),
      },

      // ========================================
      // GAMES CATEGORY - Pet Simulator X - In-Game Items
      // ========================================
      {
        id: "listing-21",
        title: "Pet Simulator X - Huge Pets Bundle (5)",
        game: "Pet Simulator X",
        price: 3800,
        stock: 4,
        image: "/pet-simulator-x-huge-pets-bundle.jpg",
        sellerId: petSimGuru.id,
        category: "Games",
        itemType: "In-Game Items",
        condition: "New",
        status: "available",
        featured: true,
        views: 4100,
        vouchCount: 123,
        upvotes: 178,
        downvotes: 8,
        createdAt: new Date("2024-11-09"),
      },
      {
        id: "listing-22",
        title: "Pet Simulator X - Rainbow Huge Cat",
        game: "Pet Simulator X",
        price: 2400,
        stock: 2,
        image: "/psx-rainbow-huge-cat.jpg",
        sellerId: petSimGuru.id,
        category: "Games",
        itemType: "In-Game Items",
        condition: "New",
        status: "available",
        featured: false,
        views: 2890,
        vouchCount: 98,
        upvotes: 134,
        downvotes: 4,
        createdAt: new Date("2024-11-13"),
      },
      {
        id: "listing-23",
        title: "Pet Simulator X - Gems (100B)",
        game: "Pet Simulator X",
        price: 1500,
        stock: 10,
        image: "/psx-gems.jpg",
        sellerId: casualPlayer.id,
        category: "Games",
        itemType: "In-Game Items",
        condition: "Used",
        status: "available",
        featured: false,
        views: 1670,
        vouchCount: 23,
        upvotes: 34,
        downvotes: 8,
        createdAt: new Date("2024-11-27"),
      },

      // ========================================
      // GAMES CATEGORY - Pet Simulator X - Gamepasses
      // ========================================
      {
        id: "listing-24",
        title: "Pet Simulator X - VIP Gamepass",
        game: "Pet Simulator X",
        price: 650,
        stock: 15,
        image: "/pet-simulator-vip-gamepass.jpg",
        sellerId: vipSeller.id,
        category: "Games",
        itemType: "Gamepasses",
        condition: "New",
        status: "available",
        featured: false,
        views: 1120,
        vouchCount: 89,
        upvotes: 78,
        downvotes: 3,
        createdAt: new Date("2024-11-23"),
      },

      // ========================================
      // GAMES CATEGORY - Pet Simulator X - Services
      // ========================================
      {
        id: "listing-25",
        title: "Pet Simulator X - Gem Farming Service",
        game: "Pet Simulator X",
        price: 400,
        stock: 20,
        image: "/psx-farming-service.jpg",
        sellerId: boostPro.id,
        category: "Games",
        itemType: "Services",
        condition: "New",
        status: "available",
        featured: false,
        views: 890,
        vouchCount: 67,
        upvotes: 56,
        downvotes: 2,
        createdAt: new Date("2024-11-29"),
      },

      // ========================================
      // GAMES CATEGORY - MM2 - In-Game Items
      // ========================================
      {
        id: "listing-26",
        title: "MM2 - Godly Knives Bundle",
        game: "MM2",
        price: 1800,
        stock: 5,
        image: "/mm2-godly-knives.jpg",
        sellerId: mm2Trader.id,
        category: "Games",
        itemType: "In-Game Items",
        condition: "New",
        status: "available",
        featured: false,
        views: 2340,
        vouchCount: 78,
        upvotes: 98,
        downvotes: 5,
        createdAt: new Date("2024-11-15"),
      },
      {
        id: "listing-27",
        title: "MM2 - Icebreaker Knife",
        game: "MM2",
        price: 890,
        stock: 3,
        image: "/mm2-icebreaker.jpg",
        sellerId: mm2Trader.id,
        category: "Games",
        itemType: "In-Game Items",
        condition: "New",
        status: "available",
        featured: false,
        views: 1230,
        vouchCount: 45,
        upvotes: 62,
        downvotes: 3,
        createdAt: new Date("2024-11-20"),
      },

      // ========================================
      // GAMES CATEGORY - MM2 - Services
      // ========================================
      {
        id: "listing-28",
        title: "MM2 - Weapon Collection Service",
        game: "MM2",
        price: 550,
        stock: 15,
        image: "/mm2-collection-service.jpg",
        sellerId: boostPro.id,
        category: "Games",
        itemType: "Services",
        condition: "New",
        status: "available",
        featured: false,
        views: 670,
        vouchCount: 34,
        upvotes: 41,
        downvotes: 2,
        createdAt: new Date("2024-11-28"),
      },

      // ========================================
      // GAMES CATEGORY - Jailbreak - In-Game Items
      // ========================================
      {
        id: "listing-29",
        title: "Jailbreak - 10M Cash",
        game: "Jailbreak",
        price: 2100,
        stock: 8,
        image: "/jailbreak-cash.jpg",
        sellerId: jailbreakPro.id,
        category: "Games",
        itemType: "In-Game Items",
        condition: "New",
        status: "available",
        featured: false,
        views: 1890,
        vouchCount: 56,
        upvotes: 73,
        downvotes: 4,
        createdAt: new Date("2024-11-16"),
      },
      {
        id: "listing-30",
        title: "Jailbreak - Torpedo Vehicle",
        game: "Jailbreak",
        price: 1600,
        stock: 3,
        image: "/jailbreak-torpedo.jpg",
        sellerId: jailbreakPro.id,
        category: "Games",
        itemType: "In-Game Items",
        condition: "New",
        status: "available",
        featured: false,
        views: 1340,
        vouchCount: 42,
        upvotes: 58,
        downvotes: 2,
        createdAt: new Date("2024-11-22"),
      },

      // ========================================
      // GAMES CATEGORY - Jailbreak - Gamepasses
      // ========================================
      {
        id: "listing-31",
        title: "Jailbreak - VIP Gamepass",
        game: "Jailbreak",
        price: 700,
        stock: 12,
        image: "/jailbreak-vip.jpg",
        sellerId: gamepassKing.id,
        category: "Games",
        itemType: "Gamepasses",
        condition: "New",
        status: "available",
        featured: false,
        views: 890,
        vouchCount: 38,
        upvotes: 49,
        downvotes: 1,
        createdAt: new Date("2024-11-25"),
      },

      // ========================================
      // GAMES CATEGORY - Arsenal - In-Game Items
      // ========================================
      {
        id: "listing-32",
        title: "Arsenal - Legendary Skin Bundle",
        game: "Arsenal",
        price: 1200,
        stock: 6,
        image: "/arsenal-skin-bundle.jpg",
        sellerId: arsenalDealer.id,
        category: "Games",
        itemType: "In-Game Items",
        condition: "New",
        status: "available",
        featured: false,
        views: 1120,
        vouchCount: 34,
        upvotes: 56,
        downvotes: 3,
        createdAt: new Date("2024-11-18"),
      },

      // ========================================
      // ACCOUNTS CATEGORY - Blox Fruits
      // ========================================
      {
        id: "listing-33",
        title: "Blox Fruits - Max Level Account (2450)",
        game: "Blox Fruits",
        price: 4500,
        stock: 1,
        image: "/blox-fruits-max-level-account.jpg",
        sellerId: proAccounts.id,
        category: "Accounts",
        itemType: "Account",
        condition: "Used",
        status: "available",
        featured: true,
        views: 6700,
        vouchCount: 167,
        upvotes: 245,
        downvotes: 8,
        createdAt: new Date("2024-11-06"),
      },
      {
        id: "listing-34",
        title: "Blox Fruits - Starter Account (Lvl 500)",
        game: "Blox Fruits",
        price: 1200,
        stock: 5,
        image: "/blox-fruits-starter-account.jpg",
        sellerId: starterAccs.id,
        category: "Accounts",
        itemType: "Account",
        condition: "New",
        status: "available",
        featured: false,
        views: 2340,
        vouchCount: 34,
        upvotes: 48,
        downvotes: 2,
        createdAt: new Date("2024-11-24"),
      },
      {
        id: "listing-35",
        title: "Blox Fruits - Mid-Tier Account (Lvl 1500)",
        game: "Blox Fruits",
        price: 2800,
        stock: 2,
        image: "/blox-fruits-mid-account.jpg",
        sellerId: accountSeller.id,
        category: "Accounts",
        itemType: "Account",
        condition: "Used",
        status: "available",
        featured: false,
        views: 3450,
        vouchCount: 78,
        upvotes: 112,
        downvotes: 4,
        createdAt: new Date("2024-11-12"),
      },

      // ========================================
      // ACCOUNTS CATEGORY - Adopt Me
      // ========================================
      {
        id: "listing-36",
        title: "Adopt Me - Rich Account (Multiple Legendaries)",
        game: "Adopt Me",
        price: 8000,
        stock: 1,
        image: "/adopt-me-rich-account-pets.jpg",
        sellerId: premiumAccs.id,
        category: "Accounts",
        itemType: "Account",
        condition: "Used",
        status: "available",
        featured: true,
        views: 8900,
        vouchCount: 198,
        upvotes: 312,
        downvotes: 7,
        createdAt: new Date("2024-11-03"),
      },
      {
        id: "listing-37",
        title: "Adopt Me - Starter Account",
        game: "Adopt Me",
        price: 950,
        stock: 8,
        image: "/adopt-me-starter-account.jpg",
        sellerId: starterAccs.id,
        category: "Accounts",
        itemType: "Account",
        condition: "New",
        status: "available",
        featured: false,
        views: 1560,
        vouchCount: 23,
        upvotes: 34,
        downvotes: 1,
        createdAt: new Date("2024-11-26"),
      },

      // ========================================
      // ACCOUNTS CATEGORY - Pet Simulator X
      // ========================================
      {
        id: "listing-38",
        title: "Pet Simulator X - Premium Account (50+ Huge Pets)",
        game: "Pet Simulator X",
        price: 5500,
        stock: 1,
        image: "/pet-simulator-x-premium-account.jpg",
        sellerId: premiumAccs.id,
        category: "Accounts",
        itemType: "Account",
        condition: "Used",
        status: "available",
        featured: true,
        views: 5670,
        vouchCount: 145,
        upvotes: 201,
        downvotes: 5,
        createdAt: new Date("2024-11-08"),
      },
      {
        id: "listing-39",
        title: "Pet Simulator X - Starter Account",
        game: "Pet Simulator X",
        price: 2100,
        stock: 4,
        image: "/pet-simulator-x-account.jpg",
        sellerId: accountSeller.id,
        category: "Accounts",
        itemType: "Account",
        condition: "New",
        status: "available",
        featured: false,
        views: 2890,
        vouchCount: 45,
        upvotes: 67,
        downvotes: 3,
        createdAt: new Date("2024-11-19"),
      },

      // ========================================
      // ACCOUNTS CATEGORY - MM2
      // ========================================
      {
        id: "listing-40",
        title: "MM2 - Godly Collection Account",
        game: "MM2",
        price: 3200,
        stock: 2,
        image: "/mm2-godly-account.jpg",
        sellerId: proAccounts.id,
        category: "Accounts",
        itemType: "Account",
        condition: "Used",
        status: "available",
        featured: false,
        views: 3890,
        vouchCount: 89,
        upvotes: 134,
        downvotes: 6,
        createdAt: new Date("2024-11-14"),
      },

      // ========================================
      // ACCOUNTS CATEGORY - Jailbreak
      // ========================================
      {
        id: "listing-41",
        title: "Jailbreak - Rich Account (All Vehicles)",
        game: "Jailbreak",
        price: 4200,
        stock: 1,
        image: "/jailbreak-rich-account.jpg",
        sellerId: premiumAccs.id,
        category: "Accounts",
        itemType: "Account",
        condition: "Used",
        status: "available",
        featured: false,
        views: 4560,
        vouchCount: 112,
        upvotes: 167,
        downvotes: 4,
        createdAt: new Date("2024-11-10"),
      },

      // ========================================
      // ACCOUNTS CATEGORY - Arsenal
      // ========================================
      {
        id: "listing-42",
        title: "Arsenal - Skin Collection Account",
        game: "Arsenal",
        price: 2600,
        stock: 3,
        image: "/arsenal-account.jpg",
        sellerId: accountSeller.id,
        category: "Accounts",
        itemType: "Account",
        condition: "Used",
        status: "available",
        featured: false,
        views: 2340,
        vouchCount: 67,
        upvotes: 89,
        downvotes: 3,
        createdAt: new Date("2024-11-17"),
      },
    ],
  })

  console.log(`✓ Created ${listings.count} listings successfully!`)
  console.log("Creating vouches...")

  // Create vouches for top sellers (required for TopVouchedSellers component)
  // Note: Vouch model has unique constraint on (fromUserId, toUserId), so we can only create one vouch per user pair
  // We'll create vouches from different users to the top sellers
  
  const allBuyers = [
    trustedTrader, eliteTrader, legendaryDealer, proTraderX, pixelVault, legitTrader,
    ugcMaster, hatCollector, ninjaTrader, safeTrader, casualPlayer, tradeMaster,
    gamepassKing, vipSeller, boostPro, helpDesk, accountSeller, proAccounts,
    premiumAccs, starterAccs, mm2Trader, jailbreakPro, arsenalDealer
  ]

  // Vouches for LegendaryDealer (201 vouches - top seller)
  const legendaryVouches = allBuyers
    .filter(buyer => buyer.id !== legendaryDealer.id)
    .slice(0, 20)
    .map((buyer, i) => ({
      fromUserId: buyer.id,
      toUserId: legendaryDealer.id,
      type: "seller",
      message: "Outstanding trader! Fast and reliable.",
      rating: 5,
      createdAt: new Date(2024, 10, (i % 30) + 1),
    }))

  await prisma.vouch.createMany({ data: legendaryVouches })

  // Vouches for BoostPro (234 vouches - service provider)
  const boostVouches = allBuyers
    .filter(buyer => buyer.id !== boostPro.id)
    .slice(0, 20)
    .map((buyer, i) => ({
      fromUserId: buyer.id,
      toUserId: boostPro.id,
      type: "seller",
      message: "Professional boosting service!",
      rating: 5,
      createdAt: new Date(2024, 9, (i % 30) + 1),
    }))

  await prisma.vouch.createMany({ data: boostVouches })

  // Vouches for ProTraderX (167 vouches)
  const proTraderVouches = allBuyers
    .filter(buyer => buyer.id !== proTraderX.id)
    .slice(0, 18)
    .map((buyer, i) => ({
      fromUserId: buyer.id,
      toUserId: proTraderX.id,
      type: "seller",
      message: "Excellent trader, always online!",
      rating: 5,
      createdAt: new Date(2024, 9, (i % 30) + 1),
    }))

  await prisma.vouch.createMany({ data: proTraderVouches })

  // Vouches for EliteTrader (145 vouches)
  const eliteVouches = allBuyers
    .filter(buyer => buyer.id !== eliteTrader.id)
    .slice(0, 16)
    .map((buyer, i) => ({
      fromUserId: buyer.id,
      toUserId: eliteTrader.id,
      type: "seller",
      message: "Elite service as the name suggests!",
      rating: 5,
      createdAt: new Date(2024, 8, (i % 30) + 1),
    }))

  await prisma.vouch.createMany({ data: eliteVouches })

  // Vouches for TrustedTrader (89 vouches)
  const trustedVouches = allBuyers
    .filter(buyer => buyer.id !== trustedTrader.id)
    .slice(0, 14)
    .map((buyer, i) => ({
      fromUserId: buyer.id,
      toUserId: trustedTrader.id,
      type: "seller",
      message: "Great experience! Highly recommended.",
      rating: 5,
      createdAt: new Date(2024, 8, (i % 30) + 1),
    }))

  await prisma.vouch.createMany({ data: trustedVouches })

  // Vouches for PetSimGuru (123 vouches)
  const petSimVouches = allBuyers
    .filter(buyer => buyer.id !== petSimGuru.id)
    .slice(0, 15)
    .map((buyer, i) => ({
      fromUserId: buyer.id,
      toUserId: petSimGuru.id,
      type: "seller",
      message: "Best Pet Sim trader around!",
      rating: 5,
      createdAt: new Date(2024, 9, (i % 30) + 1),
    }))

  await prisma.vouch.createMany({ data: petSimVouches })

  // Vouches for TradeMaster (156 vouches)
  const tradeMasterVouches = allBuyers
    .filter(buyer => buyer.id !== tradeMaster.id)
    .slice(0, 17)
    .map((buyer, i) => ({
      fromUserId: buyer.id,
      toUserId: tradeMaster.id,
      type: "seller",
      message: "Blox Fruits expert! Fast trades.",
      rating: 5,
      createdAt: new Date(2024, 9, (i % 30) + 1),
    }))

  await prisma.vouch.createMany({ data: tradeMasterVouches })

  console.log("✓ Vouches created successfully!")
  console.log("Creating transactions with all status types...")

  // Create transactions covering all statuses: PENDING, COMPLETED, CANCELLED
  const transaction1 = await prisma.transaction.create({
    data: {
      buyerId: trustedTrader.id,
      sellerId: pixelVault.id,
      listingId: "listing-1",
      price: 8999,
      amount: 1,
      status: "COMPLETED",
      buyerConfirmed: true,
      sellerConfirmed: true,
      createdAt: new Date("2024-11-15"),
    },
  })

  const transaction2 = await prisma.transaction.create({
    data: {
      buyerId: legitTrader.id,
      sellerId: tradeMaster.id,
      listingId: "listing-7",
      price: 2800,
      amount: 1,
      status: "PENDING",
      buyerConfirmed: false,
      sellerConfirmed: true,
      createdAt: new Date("2024-12-01"),
    },
  })

  const transaction3 = await prisma.transaction.create({
    data: {
      buyerId: ugcMaster.id,
      sellerId: ninjaTrader.id,
      listingId: "listing-15",
      price: 2500,
      amount: 1,
      status: "PENDING",
      buyerConfirmed: true,
      sellerConfirmed: false,
      createdAt: new Date("2024-12-02"),
    },
  })

  const transaction4 = await prisma.transaction.create({
    data: {
      buyerId: hatCollector.id,
      sellerId: eliteTrader.id,
      listingId: "listing-3",
      price: 5200,
      amount: 1,
      status: "CANCELLED",
      buyerConfirmed: false,
      sellerConfirmed: false,
      createdAt: new Date("2024-11-25"),
    },
  })

  const transaction5 = await prisma.transaction.create({
    data: {
      buyerId: casualPlayer.id,
      sellerId: proTraderX.id,
      listingId: "listing-18",
      price: 6500,
      amount: 1,
      status: "COMPLETED",
      buyerConfirmed: true,
      sellerConfirmed: true,
      createdAt: new Date("2024-11-20"),
    },
  })

  const transaction6 = await prisma.transaction.create({
    data: {
      buyerId: safeTrader.id,
      sellerId: petSimGuru.id,
      listingId: "listing-21",
      price: 3800,
      amount: 1,
      status: "COMPLETED",
      buyerConfirmed: true,
      sellerConfirmed: true,
      createdAt: new Date("2024-11-18"),
    },
  })

  const transaction7 = await prisma.transaction.create({
    data: {
      buyerId: ninjaTrader.id,
      sellerId: boostPro.id,
      listingId: "listing-13",
      price: 500,
      amount: 1,
      status: "PENDING",
      buyerConfirmed: false,
      sellerConfirmed: false,
      createdAt: new Date("2024-12-03"),
    },
  })

  const transaction8 = await prisma.transaction.create({
    data: {
      buyerId: tradeMaster.id,
      sellerId: premiumAccs.id,
      listingId: "listing-36",
      price: 8000,
      amount: 1,
      status: "CANCELLED",
      buyerConfirmed: true,
      sellerConfirmed: false,
      createdAt: new Date("2024-11-28"),
    },
  })

  const transaction9 = await prisma.transaction.create({
    data: {
      buyerId: gamepassKing.id,
      sellerId: legendaryDealer.id,
      listingId: "listing-4",
      price: 6800,
      amount: 1,
      status: "COMPLETED",
      buyerConfirmed: true,
      sellerConfirmed: true,
      createdAt: new Date("2024-11-12"),
    },
  })

  console.log("✓ Transactions created successfully!")
  console.log("Creating disputes...")

  // Create disputes covering statuses: OPEN, RESOLVED
  await prisma.dispute.createMany({
    data: [
      {
        transactionId: transaction2.id,
        reason: "Item Not Received",
        status: "OPEN",
        createdAt: new Date("2024-12-02"),
      },
      {
        transactionId: transaction4.id,
        reason: "Wrong Item Delivered",
        status: "OPEN",
        createdAt: new Date("2024-11-26"),
      },
      {
        transactionId: transaction8.id,
        reason: "Seller Not Responding",
        status: "RESOLVED",
        resolution: "Refund issued to buyer. Seller received warning.",
        createdAt: new Date("2024-11-29"),
      },
    ],
  })

  console.log("✓ Disputes created successfully!")
  console.log("Creating support tickets, announcements, and audit logs...")

  // Create support tickets covering all statuses: OPEN, IN_PROGRESS, CLOSED
  console.log("✓ Disputes created successfully!")
  console.log("Creating support tickets, announcements, and audit logs...")

  // Create support tickets covering statuses: OPEN, CLOSED
  await prisma.supportTicket.createMany({
    data: [
      {
        userId: trustedTrader.id,
        subject: "Cannot withdraw my Robux",
        message: "I've been trying to withdraw my Robux for 3 days now but it keeps failing. Please help!",
        status: "OPEN",
        createdAt: new Date("2024-12-01"),
      },
      {
        userId: legitTrader.id,
        subject: "Appeal for ban",
        message: "I was wrongfully banned. I never scammed anyone. Please review my case.",
        status: "OPEN",
        createdAt: new Date("2024-11-28"),
      },
      {
        userId: ugcMaster.id,
        subject: "How do I verify my account?",
        message: "What steps do I need to take to get verified?",
        status: "CLOSED",
        createdAt: new Date("2024-11-24"),
        updatedAt: new Date("2024-11-25"),
      },
      {
        userId: ninjaTrader.id,
        subject: "Transaction stuck in pending",
        message: "My transaction has been pending for 48 hours. Can you check what's wrong?",
        status: "OPEN",
        createdAt: new Date("2024-11-30"),
      },
      {
        userId: casualPlayer.id,
        subject: "Feature request: Dark mode",
        message: "Can you add a dark mode option? The bright theme hurts my eyes.",
        status: "OPEN",
        createdAt: new Date("2024-12-03"),
      },
    ],
  })

  // Create announcements covering all types: maintenance, update, event, warning
  await prisma.announcement.createMany({
    data: [
      {
        title: "System Maintenance Notice",
        content: "We will be performing scheduled maintenance on December 20th from 2-4 AM UTC. Trading will be temporarily disabled during this time.",
        type: "maintenance",
        isActive: true,
        expiresAt: new Date("2025-12-21"),
        createdAt: new Date("2024-12-01"),
      },
      {
        title: "New Feature: Enhanced Vouch System",
        content: "We've upgraded our vouch system with better fraud detection. Check out the new features in your profile!",
        type: "update",
        isActive: true,
        expiresAt: new Date("2026-01-10"),
        createdAt: new Date("2024-11-28"),
      },
      {
        title: "Holiday Trading Event",
        content: "Special holiday trading event with reduced fees! Valid from Dec 20 - Jan 5.",
        type: "event",
        isActive: true,
        expiresAt: new Date("2026-01-05"),
        createdAt: new Date("2024-11-25"),
      },
      {
        title: "Warning: Scam Alert",
        content: "We've detected an increase in phishing attempts. Never share your password or 2FA codes with anyone.",
        type: "warning",
        isActive: true,
        expiresAt: new Date("2025-12-31"),
        createdAt: new Date("2024-11-20"),
      },
      {
        title: "Black Friday Sale - ENDED",
        content: "Special Black Friday discounts on all premium features. 50% off Pro subscriptions!",
        type: "event",
        isActive: false,
        expiresAt: new Date("2024-11-30"),
        createdAt: new Date("2024-11-24"),
      },
    ],
  })

  // Create audit logs with various actions
  await prisma.auditLog.createMany({
    data: [
      {
        adminId: adminModerator.id,
        action: "USER_BANNED",
        targetId: "scammer-user-123",
        details: "User was banned for repeated scam attempts and fraudulent listings",
        createdAt: new Date("2024-11-15"),
      },
      {
        adminId: adminModerator.id,
        action: "REPORT_RESOLVED",
        targetId: "report-001",
        details: "Report investigated and user was issued a warning for inappropriate content",
        createdAt: new Date("2024-11-18"),
      },
      {
        adminId: adminModerator.id,
        action: "ANNOUNCEMENT_CREATED",
        targetId: "announcement-maintenance",
        details: "Created system maintenance announcement for December 20th",
        createdAt: new Date("2024-12-01"),
      },
      {
        adminId: adminModerator.id,
        action: "TICKET_CLOSED",
        targetId: ugcMaster.id,
        details: "Support ticket resolved with user assistance on account verification",
        createdAt: new Date("2024-11-25"),
      },
      {
        adminId: adminModerator.id,
        action: "LISTING_REMOVED",
        targetId: "listing-spam-123",
        details: "Listing removed for violating terms of service - suspected duplicate account spam",
        createdAt: new Date("2024-11-22"),
      },
      {
        adminId: adminModerator.id,
        action: "USER_VERIFIED",
        targetId: eliteTrader.id,
        details: "User verified after identity check and trading history review",
        createdAt: new Date("2024-11-10"),
      },
      {
        adminId: adminModerator.id,
        action: "DISPUTE_RESOLVED",
        targetId: transaction8.id,
        details: "Dispute resolved in favor of buyer - refund issued",
        createdAt: new Date("2024-11-30"),
      },
    ],
  })

  console.log("✓ Support tickets, announcements, and audit logs created successfully!")
  console.log("")
  console.log("==================================================")
  console.log("✅ DATABASE SEEDING COMPLETED SUCCESSFULLY!")
  console.log("==================================================")
  console.log("")
  console.log("Summary:")
  console.log(`- ${listings.count} listings created (covering all categories, games, and item types)`)
  console.log("- 20+ users created (including 4 top-vouched sellers)")
  console.log("- 100+ vouches created for top sellers")
  console.log("- 9 transactions created (PENDING, COMPLETED, CANCELLED)")
  console.log("- 3 disputes created (OPEN, RESOLVED)")
  console.log("- 5 support tickets created (OPEN, CLOSED)")
  console.log("- 5 announcements created (all types)")
  console.log("- 7 audit logs created")
  console.log("")
  console.log("Categories covered:")
  console.log("  ✓ Accessories (Limited, UGC)")
  console.log("  ✓ Games (In-Game Items, Gamepasses, Services)")
  console.log("  ✓ Accounts (all major games)")
  console.log("")
  console.log("Games covered:")
  console.log("  ✓ Roblox, Blox Fruits, Adopt Me, Pet Simulator X")
  console.log("  ✓ MM2, Jailbreak, Arsenal")
  console.log("")
  console.log("Top Sellers with high vouch counts:")
  console.log("  ✓ LegendaryDealer (201 vouches)")
  console.log("  ✓ BoostPro (234 vouches)")
  console.log("  ✓ ProTraderX (167 vouches)")
  console.log("  ✓ EliteTrader (145 vouches)")
  console.log("")
}

main()
  .catch((e) => {
    console.error("❌ Error during seeding:")
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
