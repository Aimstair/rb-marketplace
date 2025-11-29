const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient({
  errorFormat: "minimal",
});

async function main() {
  console.log("Starting seed...");
  
  // Clear existing data
  await prisma.vouch.deleteMany({});
  await prisma.listing.deleteMany({});
  await prisma.user.deleteMany({});
  console.log("Cleared existing data");

  // Create users
  const trustedTrader = await prisma.user.create({
    data: {
      id: "user-1",
      username: "TrustedTrader",
      email: "user@test.com",
      password: "password123",
      role: "user",
      profilePicture: "/diverse-user-avatars.png",
      banner: "/profile-banner.png",
      bio: "Active Roblox trader with 2+ years experience. Specializing in limited items and currency. Fast and safe trades!",
      joinDate: new Date("2022-03-15"),
      robloxProfile: "TrustedTrader_123",
      discordTag: "TrustedTrader#1234",
    },
  });
  console.log("Created user:", trustedTrader.username);

  const adminModerator = await prisma.user.create({
    data: {
      id: "admin-1",
      username: "AdminModerator",
      email: "admin@test.com",
      password: "admin123",
      role: "admin",
      profilePicture: "/admin-avatar.png",
      banner: "/admin-banner.jpg",
      bio: "RobloxTrade Admin & Moderator. Here to ensure safe and fair trading for all users.",
      joinDate: new Date("2021-01-01"),
      robloxProfile: "AdminMod_RobloxTrade",
    },
  });
  console.log("Created admin:", adminModerator.username);

  // Create additional sellers for the listings
  const pixelVault = await prisma.user.create({
    data: {
      username: "PixelVault",
      email: "pixel@test.com",
      password: "pass123",
      role: "user",
    },
  });

  const legitTrader = await prisma.user.create({
    data: {
      username: "LegitTrader",
      email: "legit@test.com",
      password: "pass123",
      role: "user",
    },
  });

  const ugcMaster = await prisma.user.create({
    data: {
      username: "UGCMaster",
      email: "ugc@test.com",
      password: "pass123",
      role: "user",
    },
  });

  const hatCollector = await prisma.user.create({
    data: {
      username: "HatCollector",
      email: "hat@test.com",
      password: "pass123",
      role: "user",
    },
  });

  const ninjaTrader = await prisma.user.create({
    data: {
      username: "NinjaTrader",
      email: "ninja@test.com",
      password: "pass123",
      role: "user",
    },
  });

  const safeTrader = await prisma.user.create({
    data: {
      username: "SafeTrader99",
      email: "safe@test.com",
      password: "pass123",
      role: "user",
    },
  });

  const casualPlayer = await prisma.user.create({
    data: {
      username: "CasualPlayer",
      email: "casual@test.com",
      password: "pass123",
      role: "user",
    },
  });

  const tradeMaster = await prisma.user.create({
    data: {
      username: "TradeMaster",
      email: "trade@test.com",
      password: "pass123",
      role: "user",
    },
  });

  const gamepassKing = await prisma.user.create({
    data: {
      username: "GamepassKing",
      email: "gamepass@test.com",
      password: "pass123",
      role: "user",
    },
  });

  const vipSeller = await prisma.user.create({
    data: {
      username: "VIPSeller",
      email: "vip@test.com",
      password: "pass123",
      role: "user",
    },
  });

  const boostPro = await prisma.user.create({
    data: {
      username: "BoostPro",
      email: "boost@test.com",
      password: "pass123",
      role: "user",
    },
  });

  const helpDesk = await prisma.user.create({
    data: {
      username: "HelpDesk",
      email: "help@test.com",
      password: "pass123",
      role: "user",
    },
  });

  const accountSeller = await prisma.user.create({
    data: {
      username: "AccountSeller",
      email: "accounts@test.com",
      password: "pass123",
      role: "user",
    },
  });

  const proAccounts = await prisma.user.create({
    data: {
      username: "ProAccounts",
      email: "pro@test.com",
      password: "pass123",
      role: "user",
    },
  });

  const premiumAccs = await prisma.user.create({
    data: {
      username: "PremiumAccs",
      email: "premium@test.com",
      password: "pass123",
      role: "user",
    },
  });

  const starterAccs = await prisma.user.create({
    data: {
      username: "StarterAccs",
      email: "starter@test.com",
      password: "pass123",
      role: "user",
    },
  });

  console.log("Created 18 users");

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
  });

  console.log(`Seeding completed! Created ${listings.count} listings`);
}

main()
  .catch((e) => {
    console.error("Seed error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });


async function main() {
  // Clear existing data
  await prisma.vouch.deleteMany({});
  await prisma.listing.deleteMany({});
  await prisma.user.deleteMany({});

  // Create users
  const trustedTrader = await prisma.user.create({
    data: {
      id: "user-1",
      username: "TrustedTrader",
      email: "user@test.com",
      password: "password123",
      role: "user",
      profilePicture: "/diverse-user-avatars.png",
      banner: "/profile-banner.png",
      bio: "Active Roblox trader with 2+ years experience. Specializing in limited items and currency. Fast and safe trades!",
      joinDate: new Date("2022-03-15"),
      robloxProfile: "TrustedTrader_123",
      discordTag: "TrustedTrader#1234",
    },
  });

  const adminModerator = await prisma.user.create({
    data: {
      id: "admin-1",
      username: "AdminModerator",
      email: "admin@test.com",
      password: "admin123",
      role: "admin",
      profilePicture: "/admin-avatar.png",
      banner: "/admin-banner.jpg",
      bio: "RobloxTrade Admin & Moderator. Here to ensure safe and fair trading for all users.",
      joinDate: new Date("2021-01-01"),
      robloxProfile: "AdminMod_RobloxTrade",
    },
  });

  // Create additional sellers for the listings
  const pixelVault = await prisma.user.create({
    data: {
      username: "PixelVault",
      email: "pixel@test.com",
      password: "pass123",
      role: "user",
    },
  });

  const legitTrader = await prisma.user.create({
    data: {
      username: "LegitTrader",
      email: "legit@test.com",
      password: "pass123",
      role: "user",
    },
  });

  const ugcMaster = await prisma.user.create({
    data: {
      username: "UGCMaster",
      email: "ugc@test.com",
      password: "pass123",
      role: "user",
    },
  });

  const hatCollector = await prisma.user.create({
    data: {
      username: "HatCollector",
      email: "hat@test.com",
      password: "pass123",
      role: "user",
    },
  });

  const ninjaTrader = await prisma.user.create({
    data: {
      username: "NinjaTrader",
      email: "ninja@test.com",
      password: "pass123",
      role: "user",
    },
  });

  const safeTrader = await prisma.user.create({
    data: {
      username: "SafeTrader99",
      email: "safe@test.com",
      password: "pass123",
      role: "user",
    },
  });

  const casualPlayer = await prisma.user.create({
    data: {
      username: "CasualPlayer",
      email: "casual@test.com",
      password: "pass123",
      role: "user",
    },
  });

  const tradeMaster = await prisma.user.create({
    data: {
      username: "TradeMaster",
      email: "trade@test.com",
      password: "pass123",
      role: "user",
    },
  });

  const gamepassKing = await prisma.user.create({
    data: {
      username: "GamepassKing",
      email: "gamepass@test.com",
      password: "pass123",
      role: "user",
    },
  });

  const vipSeller = await prisma.user.create({
    data: {
      username: "VIPSeller",
      email: "vip@test.com",
      password: "pass123",
      role: "user",
    },
  });

  const boostPro = await prisma.user.create({
    data: {
      username: "BoostPro",
      email: "boost@test.com",
      password: "pass123",
      role: "user",
    },
  });

  const helpDesk = await prisma.user.create({
    data: {
      username: "HelpDesk",
      email: "help@test.com",
      password: "pass123",
      role: "user",
    },
  });

  const accountSeller = await prisma.user.create({
    data: {
      username: "AccountSeller",
      email: "accounts@test.com",
      password: "pass123",
      role: "user",
    },
  });

  const proAccounts = await prisma.user.create({
    data: {
      username: "ProAccounts",
      email: "pro@test.com",
      password: "pass123",
      role: "user",
    },
  });

  const premiumAccs = await prisma.user.create({
    data: {
      username: "PremiumAccs",
      email: "premium@test.com",
      password: "pass123",
      role: "user",
    },
  });

  const starterAccs = await prisma.user.create({
    data: {
      username: "StarterAccs",
      email: "starter@test.com",
      password: "pass123",
      role: "user",
    },
  });

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
  });

  console.log(
    `Seeding completed! Created ${listings.count} listings and 18 users`
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
