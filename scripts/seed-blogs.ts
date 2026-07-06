import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  // Find any user to be the author
  const user = await prisma.user.findFirst({
    where: { role: 'ADMIN' }
  }) || await prisma.user.findFirst()

  if (!user) {
    console.error('No users found in the database. Please create a user first.')
    return
  }

  const blogs = [
    {
      title: 'How to Safely Sell Roblox Pets for Real Cash in 2026',
      slug: 'how-to-safely-sell-roblox-pets',
      excerpt: 'Learn the best practices and safety measures when trading your high-value Adopt Me and Pet Simulator 99 pets for real world money.',
      content: `
        <h2 class="text-2xl font-bold mt-6 mb-4">The Rise of the Roblox Pet Economy</h2>
        <p class="mb-4 text-muted-foreground">Trading Roblox pets for cash has become increasingly popular, especially with games like Adopt Me! and Pet Simulator 99. However, this popularity brings risks.</p>
        
        <h3 class="text-xl font-semibold mt-6 mb-3">1. Always Use a Trusted Marketplace</h3>
        <p class="mb-4 text-muted-foreground">Never do direct trades on Discord or Twitter without a middleman. Platforms like RBMarketplace offer a secure environment, transaction tracking, and a vouch system to ensure you're trading with reputable buyers.</p>
        
        <h3 class="text-xl font-semibold mt-6 mb-3">2. Document Everything</h3>
        <p class="mb-4 text-muted-foreground">Before initiating any trade, start screen recording. Capture the chat logs, the trade window, and the final confirmation. If a dispute occurs, this is your only defense.</p>
        
        <h3 class="text-xl font-semibold mt-6 mb-3">3. Check the Hall of Shame</h3>
        <p class="mb-4 text-muted-foreground">Before trading with someone, always search their Discord or Roblox username in our Hall of Shame to ensure they don't have a history of scamming.</p>
      `,
      image: 'https://images.unsplash.com/photo-1612287230202-1ff1d85d1bdf?q=80&w=1280&auto=format&fit=crop',
      published: true,
      authorId: user.id
    },
    {
      title: 'The Ultimate Guide to Cross-Trading in Roblox',
      slug: 'ultimate-guide-cross-trading-roblox',
      excerpt: 'Cross-trading between different Roblox games is risky but rewarding. Here is how you do it without getting scammed.',
      content: `
        <h2 class="text-2xl font-bold mt-6 mb-4">What is Cross-Trading?</h2>
        <p class="mb-4 text-muted-foreground">Cross-trading is when you trade an item in one game (e.g., Blox Fruits) for an item in a completely different game (e.g., Murder Mystery 2) or for Robux/Cash.</p>
        
        <h3 class="text-xl font-semibold mt-6 mb-3">The Dangers of Going First</h3>
        <p class="mb-4 text-muted-foreground">In every cross-trade, someone has to go first. This is where 99% of scams happen. The best way to avoid this is by using a trusted Middleman (MM). A middleman holds both items, verifying them before delivering to each party.</p>
        
        <h3 class="text-xl font-semibold mt-6 mb-3">How to Price Cross-Game Items</h3>
        <p class="mb-4 text-muted-foreground">Values fluctuate wildly between games. The best metric is to convert the value of both items into a standard currency, like USD or Robux, using recent sold listings on RBMarketplace.</p>
      `,
      image: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?q=80&w=1280&auto=format&fit=crop',
      published: true,
      authorId: user.id
    },
    {
      title: 'Top 5 Most Valuable Roblox Items This Month',
      slug: 'top-5-valuable-roblox-items-this-month',
      excerpt: 'A market analysis of the highest selling limiteds, pets, and fruits in the current Roblox economy.',
      content: `
        <h2 class="text-2xl font-bold mt-6 mb-4">Market Trends Overview</h2>
        <p class="mb-4 text-muted-foreground">The Roblox economy is constantly shifting based on game updates and limited releases. Here's what's currently dominating the market.</p>
        
        <h3 class="text-xl font-semibold mt-6 mb-3">1. Limited Faces</h3>
        <p class="mb-4 text-muted-foreground">Classic limited faces like Super Super Happy Face (SSHF) continue to hold incredible value due to their high demand and low supply. They are the blue-chip stocks of Roblox.</p>
        
        <h3 class="text-xl font-semibold mt-6 mb-3">2. Titanic Pets in PS99</h3>
        <p class="mb-4 text-muted-foreground">With the recent updates to Pet Simulator 99, Titanic pets are seeing trades upwards of $100-$300 USD on secondary markets.</p>
        
        <h3 class="text-xl font-semibold mt-6 mb-3">3. Permanent Blox Fruits</h3>
        <p class="mb-4 text-muted-foreground">Permanent fruits like Kitsune and Leopard are highly sought after by players who don't want to spend Robux, making them excellent liquid assets for cash trades.</p>
      `,
      image: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=1280&auto=format&fit=crop',
      published: true,
      authorId: user.id
    }
  ]

  for (const blog of blogs) {
    await prisma.blogPost.upsert({
      where: { slug: blog.slug },
      update: {},
      create: blog
    })
  }

  console.log('Successfully seeded 3 blog posts!')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
