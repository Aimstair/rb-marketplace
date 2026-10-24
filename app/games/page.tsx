import type { Metadata } from "next"
import Link from "next/link"
import { Container, Section } from "@/components/site/container"
import { formatPeso } from "@/components/listing/listing-card"
import { ItemListJsonLd, WebPageJsonLd } from "@/components/json-ld"
import { getSeoGames } from "@/lib/games"
import { SITE_NAME, gamePath } from "@/lib/seo"

const title = "Roblox Games to Buy & Sell Items For"
const description =
  "Every Roblox game you can buy and sell items for on RbMarket: Grow a Garden, Steal a Brainrot, MM2, Blox Fruits, Adopt Me, Pet Simulator 99 and more. Prices in pesos."

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "/games" },
  openGraph: { title, description, url: "/games", type: "website" },
  twitter: { card: "summary_large_image", title, description },
}

// Quiet, distinct hues for the game initial dots (same set as the home page chips)
const DOT_HUES = ["#ff453a", "#ff9f0a", "#2997ff", "#30d158", "#bf5af2", "#64d2ff", "#ffd60a", "#ff375f"]

export default async function GamesPage() {
  const games = await getSeoGames()
  // Games with live listings first, keeping the admin-defined order within each group
  const sorted = [...games].sort(
    (a, b) => Number(b.itemCount + b.currencyCount > 0) - Number(a.itemCount + a.currencyCount > 0),
  )

  return (
    <main className="min-h-screen bg-background">
      <WebPageJsonLd type="CollectionPage" name={title} description={description} path="/games" crumbs={[{ name: "Games", path: "/games" }]} />
      <ItemListJsonLd
        name="Roblox games on RbMarket"
        path="/games"
        items={sorted.map((g) => ({ name: `${g.displayName} items`, path: gamePath(g.displayName) }))}
      />

      <Section>
        <Container>
          <h1 className="text-title">Roblox games</h1>
          <p className="mt-4 max-w-[60ch] text-[17px] leading-relaxed text-muted-foreground">
            Pick a game to see live listings, prices in pesos and currency offers on {SITE_NAME}. Sellers are paid
            directly with GCash or PayPal.
          </p>

          <ul className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {sorted.map((game, i) => {
              const live = game.itemCount + game.currencyCount
              return (
                <li key={game.slug}>
                  <Link
                    href={gamePath(game.displayName)}
                    className="lift flex h-full items-start gap-4 rounded-[20px] bg-card p-5 hover:bg-[#232325]"
                  >
                    <span
                      className="grid size-11 shrink-0 place-items-center rounded-full text-[15px] font-semibold text-black"
                      style={{ background: DOT_HUES[i % DOT_HUES.length] }}
                      aria-hidden
                    >
                      {game.displayName.charAt(0)}
                    </span>
                    <span className="min-w-0">
                      <h2 className="text-[17px] font-semibold leading-snug">{game.displayName}</h2>
                      <span className="mt-1 block text-[13px] text-muted-foreground">
                        {live > 0
                          ? `${live} live${game.lowestPrice ? ` · from ${formatPeso(game.lowestPrice)}` : ""}`
                          : "No listings yet"}
                      </span>
                      {game.currencies.length > 0 && (
                        <span className="mt-0.5 block truncate text-[13px] text-muted-foreground">
                          {game.currencies.join(", ")}
                        </span>
                      )}
                    </span>
                  </Link>
                </li>
              )
            })}
          </ul>
        </Container>
      </Section>
    </main>
  )
}
