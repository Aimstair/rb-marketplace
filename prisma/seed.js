const { PrismaClient } = require("@prisma/client")
const { hash } = require("bcryptjs")

const prisma = new PrismaClient({
  errorFormat: "minimal",
})

async function main() {
  console.log("Starting seed...")

  // Clear existing data (in correct order to respect foreign keys)
  await prisma.session.deleteMany({})
  await prisma.account.deleteMany({})
  await prisma.verificationToken.deleteMany({})
  await prisma.vouch.deleteMany({})
  await prisma.listing.deleteMany({})
  await prisma.user.deleteMany({})
  console.log("Cleared existing data")

  // Hash password for all dummy users (password123)
  const hashedPassword = await hash("password123", 12)

  // Create main users
  const trustedTrader = await prisma.user.create({
    data: {
      id: "user-1",
      username: "TrustedTrader",
      email: "user@test.com",
      password: hashedPassword,
      role: "user",
      profilePicture: "/diverse-user-avatars.png",
      banner: "/profile-banner.png",
      bio: "Active Roblox trader with 2+ years experience. Specializing in limited items and currency. Fast and safe trades!",
      joinDate: new Date("2022-03-15"),
      robloxProfile: "TrustedTrader_123",
      discordTag: "TrustedTrader#1234",
    },
  })
  console.log("Created user:", trustedTrader.username)

  const adminModerator = await prisma.user.create({
    data: {
      id: "admin-1",
      username: "AdminModerator",
      email: "admin@test.com",
      password: hashedPassword,
      role: "admin",
      profilePicture: "/admin-avatar.png",
      banner: "/admin-banner.jpg",
      bio: "RobloxTrade Admin & Moderator. Here to ensure safe and fair trading for all users.",
      joinDate: new Date("2021-01-01"),
      robloxProfile: "AdminMod_RobloxTrade",
    },
  })
  console.log("Created admin:", adminModerator.username)

  // Create additional sellers
  const pixelVault = await prisma.user.create({
    data: {
      username: "PixelVault",
      email: "pixelvault@test.com",
      password: hashedPassword,
      role: "user",
      profilePicture: "/profile-2.jpg",
      bio: "Roblox asset collector. Premium limited items only!",
    },
  })

  const luxeTrading = await prisma.user.create({
    data: {
      username: "LuxeTrading",
      email: "luxetrading@test.com",
      password: hashedPassword,
      role: "user",
      profilePicture: "/profile-3.jpg",
      bio: "Verified seller with 1000+ successful trades",
    },
  })

  const skywardGames = await prisma.user.create({
    data: {
      username: "SkywardGames",
      email: "skywardgames@test.com",
      password: hashedPassword,
      role: "user",
      profilePicture: "/profile-4.jpg",
      bio: "Game pass specialist. Fast delivery guaranteed!",
    },
  })

  const vaultMaster = await prisma.user.create({
    data: {
      username: "VaultMaster",
      email: "vaultmaster@test.com",
      password: hashedPassword,
      role: "user",
      profilePicture: "/profile-5.jpg",
      bio: "High-end item trading. Authentication guaranteed.",
    },
  })

  const cosmicGems = await prisma.user.create({
    data: {
      username: "CosmicGems",
      email: "cosmicgems@test.com",
      password: hashedPassword,
      role: "user",
      profilePicture: "/profile-6.jpg",
      bio: "Rarity expert. All items authenticated.",
    },
  })

  const shadowTrader = await prisma.user.create({
    data: {
      username: "ShadowTrader",
      email: "shadowtrader@test.com",
      password: hashedPassword,
      role: "user",
      profilePicture: "/profile-7.jpg",
      bio: "Quick and reliable. Safe trading environment.",
    },
  })

  const etherealPlus = await prisma.user.create({
    data: {
      username: "EtherealPlus",
      email: "etherealplus@test.com",
      password: hashedPassword,
      role: "user",
      profilePicture: "/profile-8.jpg",
      bio: "Premium currency exchange. Best rates!",
    },
  })

  const nexusTraders = await prisma.user.create({
    data: {
      username: "NexusTraders",
      email: "nexustraders@test.com",
      password: hashedPassword,
      role: "user",
      profilePicture: "/profile-9.jpg",
      bio: "Multi-game specialist. Trusted by thousands.",
    },
  })

  const primeVaults = await prisma.user.create({
    data: {
      username: "PrimeVaults",
      email: "primevaults@test.com",
      password: hashedPassword,
      role: "user",
      profilePicture: "/profile-10.jpg",
      bio: "Exclusive items only. VIP service available.",
    },
  })

  console.log("Created 18 users total")

  // Create listings
  const listings = [
    {
      title: "Golden Dragon Pet - Mint Condition",
      description: "Rare golden dragon pet from Adopt Me. Never been used, still has original packaging vibes. Mint condition, authentic and verified.",
      game: "Adopt Me",
      price: 45000,
      image: "/adopt-me-dragon.jpg",
      category: "Accessories",
      itemType: "Limited",
      condition: "Mint",
      sellerId: trustedTrader.id,
    },
    {
      title: "Shadow Dragon - Adopt Me",
      description: "Shadow Dragon from Adopt Me. Legendary pet, perfect for collectors. Fast and safe trade guaranteed!",
      game: "Adopt Me",
      price: 35000,
      image: "/shadow-dragon.jpg",
      category: "Accessories",
      itemType: "Limited",
      condition: "New",
      sellerId: pixelVault.id,
    },
    {
      title: "Frost Dragon Bundle",
      description: "Complete frost dragon with rare accessories. Bundle includes pet and exclusive items.",
      game: "Adopt Me",
      price: 50000,
      image: "/frost-dragon.jpg",
      category: "Accessories",
      itemType: "Limited",
      condition: "New",
      sellerId: luxeTrading.id,
    },
    {
      title: "Mega Neon Queen Bee",
      description: "Mega Neon Queen Bee from Adopt Me. Freshly made, perfect light glow. Ready to trade!",
      game: "Adopt Me",
      price: 28000,
      image: "/mega-neon-queen.jpg",
      category: "Accessories",
      itemType: "In-Game Items",
      condition: "New",
      sellerId: skywardGames.id,
    },
    {
      title: "Blox Fruits Gamepass - Double Fruits",
      description: "Permanent Double Fruits gamepass for Blox Fruits. Instant delivery after payment!",
      game: "Blox Fruits",
      price: 15000,
      image: "/blox-fruits-gamepass.jpg",
      category: "Games",
      itemType: "Gamepasses",
      condition: "New",
      sellerId: vaultMaster.id,
    },
    {
      title: "Blox Fruits - Level 2400 Account",
      description: "High level account with endgame weapons. Account includes rare devil fruits and full setup.",
      game: "Blox Fruits",
      price: 75000,
      image: "/blox-fruits-account.jpg",
      category: "Accounts",
      itemType: "Account",
      condition: "Used",
      sellerId: cosmicGems.id,
    },
    {
      title: "Pet Simulator X - Rainbow Pet",
      description: "Rainbow pet from Pet Simulator X. Ultra rare drop, only 50 exist. Certified authentic!",
      game: "Pet Simulator X",
      price: 120000,
      image: "/pet-sim-rainbow.jpg",
      category: "Accessories",
      itemType: "Limited",
      condition: "Mint",
      sellerId: shadowTrader.id,
    },
    {
      title: "Brookhaven RP - Mansion Furniture Pack",
      description: "Complete premium mansion furniture set. Everything you need for a luxury home in Brookhaven!",
      game: "Brookhaven RP",
      price: 25000,
      image: "/brookhaven-furniture.jpg",
      category: "Accessories",
      itemType: "In-Game Items",
      condition: "New",
      sellerId: etherealPlus.id,
    },
    {
      title: "Roblox Limited - Dominus",
      description: "Classic Roblox limited item - Dominus. High demand, rare availability. Perfect investment!",
      game: "Roblox Limited",
      price: 250000,
      image: "/dominus.jpg",
      category: "Accessories",
      itemType: "Limited",
      condition: "Mint",
      sellerId: nexusTraders.id,
    },
    {
      title: "Jailbreak - Helicopter Vehicle",
      description: "Exclusive Jailbreak helicopter gamepass. Unlock premium vehicle for ultimate gameplay!",
      game: "Jailbreak",
      price: 12000,
      image: "/jailbreak-heli.jpg",
      category: "Games",
      itemType: "Gamepasses",
      condition: "New",
      sellerId: primeVaults.id,
    },
    {
      title: "Adopt Me - Parrot Pet",
      description: "Legendary parrot from Adopt Me. Discontinued from pet shop, now trade-only. Authentic!",
      game: "Adopt Me",
      price: 55000,
      image: "/parrot.jpg",
      category: "Accessories",
      itemType: "Limited",
      condition: "New",
      sellerId: trustedTrader.id,
    },
    {
      title: "Trading Services - Robux Exchange",
      description: "Professional robux exchange service. Best rates guaranteed! Fast and secure transactions.",
      game: "Currency Exchange",
      price: 100,
      image: "/robux-exchange.svg",
      category: "Games",
      itemType: "Services",
      condition: "New",
      sellerId: luxeTrading.id,
    },
    {
      title: "Pet Simulator X - Huge Cat",
      description: "Huge Cat from Pet Simulator X. Powerful pet for late-game content. Verified authentic!",
      game: "Pet Simulator X",
      price: 85000,
      image: "/huge-cat.jpg",
      category: "Accessories",
      itemType: "In-Game Items",
      condition: "New",
      sellerId: skywardGames.id,
    },
    {
      title: "Brookhaven RP - Luxury Car",
      description: "Top-tier luxury car for Brookhaven RP. Turns heads and shows off style!",
      game: "Brookhaven RP",
      price: 35000,
      image: "/luxury-car.jpg",
      category: "Accessories",
      itemType: "In-Game Items",
      condition: "New",
      sellerId: vaultMaster.id,
    },
    {
      title: "Adopt Me - Crow Pet",
      description: "Legendary Crow from Adopt Me. Discontinued pet, now extremely rare. Mint condition!",
      game: "Adopt Me",
      price: 48000,
      image: "/crow.jpg",
      category: "Accessories",
      itemType: "Limited",
      condition: "Mint",
      sellerId: cosmicGems.id,
    },
    {
      title: "Account Leveling Service",
      description: "Professional account leveling for multiple games. Fast, safe, and guaranteed results!",
      game: "Multiple Games",
      price: 5000,
      image: "/leveling-service.svg",
      category: "Games",
      itemType: "Services",
      condition: "New",
      sellerId: shadowTrader.id,
    },
  ]

  console.log("Creating listings...")
  for (const listing of listings) {
    await prisma.listing.create({
      data: {
        ...listing,
        status: "available",
      },
    })
  }
  console.log(`Created ${listings.length} listings`)

  // Create some vouches
  await prisma.vouch.create({
    data: {
      fromUserId: pixelVault.id,
      toUserId: trustedTrader.id,
      type: "seller",
      message: "Great seller! Very reliable and quick trades.",
    },
  })

  await prisma.vouch.create({
    data: {
      fromUserId: luxeTrading.id,
      toUserId: trustedTrader.id,
      type: "seller",
      message: "Authentic items, excellent communication!",
    },
  })

  console.log("Seed completed successfully!")
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })
