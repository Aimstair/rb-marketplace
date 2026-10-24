import type { Metadata } from "next"
import HomePageClient, { type HomeInitialData } from "@/components/home-page-client"
import { getLandingStats, getPopularGames, getTopTraders, getTrendingListings } from "@/app/actions/trends"
import { getGiveawayHomeData } from "@/app/actions/giveaways"
import { Container, Section } from "@/components/site/container"
import { FaqSection } from "@/components/seo/faq-section"
import { HOME_FAQ } from "@/lib/seo-content"
import { SITE_DESCRIPTION, SITE_NAME } from "@/lib/seo"

const title = `Roblox Marketplace Philippines: Buy & Sell Items | ${SITE_NAME}`

export const metadata: Metadata = {
  // Absolute so the brand suffix from the root template isn't added twice
  title: { absolute: title },
  description: SITE_DESCRIPTION,
  alternates: { canonical: "/" },
  openGraph: { title, description: SITE_DESCRIPTION, url: "/", type: "website" },
  twitter: { card: "summary_large_image", title, description: SITE_DESCRIPTION },
}

// Loaded on the server in parallel (each helper is cached), so the page arrives with its data
// instead of firing server actions from the browser, which Next.js runs one at a time.
async function loadHomeData(): Promise<HomeInitialData> {
  const [stats, games, traders, trending, giveaway] = await Promise.all([
    getLandingStats(),
    getPopularGames(8),
    getTopTraders(4),
    getTrendingListings(6),
    getGiveawayHomeData(),
  ])
  return {
    stats: stats.data ?? { totalUsers: 0, totalListings: 0, totalVolume: 0, activeTraders: 0 },
    games: games.data ?? [],
    traders: traders.data ?? [],
    trending: trending.data ?? [],
    giveaway: giveaway.success ? giveaway.data : undefined,
  }
}

export default async function HomePage() {
  const initialData = await loadHomeData()
  return (
    <>
      <HomePageClient initialData={initialData} />
      <Section surface>
        <Container>
          <FaqSection entries={HOME_FAQ} title="Buying and selling on RbMarket" />
        </Container>
      </Section>
    </>
  )
}
