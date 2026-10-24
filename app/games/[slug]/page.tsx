import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { Check } from "lucide-react"
import { Container, Section, SectionHeader } from "@/components/site/container"
import { ListingCard, ListingGrid, formatPeso } from "@/components/listing/listing-card"
import { FaqSection } from "@/components/seo/faq-section"
import { ItemListJsonLd, WebPageJsonLd } from "@/components/json-ld"
import { Button } from "@/components/ui/button"
import { getGameListings, getSeoGameBySlug, getSeoGames } from "@/lib/games"
import { gameFaq } from "@/lib/seo-content"
import { SITE_NAME, gamePath } from "@/lib/seo"

type Params = Promise<{ slug: string }>

const plural = (n: number, word: string) => `${n.toLocaleString("en-PH")} ${word}${n === 1 ? "" : "s"}`

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params
  const game = await getSeoGameBySlug(slug)
  if (!game) return { title: "Game not found", robots: { index: false, follow: false } }

  const live = game.itemCount + game.currencyCount
  const name = game.displayName
  const currencies = game.currencies.length > 0 ? `, ${game.currencies.join(" and ")}` : ""
  const title = `Buy & Sell ${name} Items in the Philippines`
  const description =
    live > 0
      ? `Buy and sell ${name} items${currencies} for pesos. ${plural(live, "live listing")}${game.lowestPrice ? ` from ${formatPeso(game.lowestPrice)}` : ""}, vouched sellers, GCash and PayPal. Free to list.`
      : `Buy and sell ${name} items${currencies} for pesos on ${SITE_NAME}. Vouched sellers, GCash and PayPal, and a public scammer list. Free to list.`

  return {
    title,
    description,
    alternates: { canonical: gamePath(name) },
    keywords: [
      `${name} buy and sell`,
      `${name} items for sale`,
      `sell ${name} items`,
      `buy ${name} items Philippines`,
      `${name} GCash`,
      `${name} marketplace`,
      ...game.currencies.map((c) => `buy ${name} ${c}`),
    ],
    // Empty game pages stay out of the index until they have listings, but links are still followed
    robots: { index: live > 0, follow: true },
    openGraph: { title, description, url: gamePath(name), type: "website" },
    twitter: { card: "summary_large_image", title, description },
  }
}

export default async function GamePage({ params }: { params: Params }) {
  const { slug } = await params
  const [game, allGames] = await Promise.all([getSeoGameBySlug(slug), getSeoGames()])
  if (!game) notFound()

  const { items, currency } = await getGameListings(game.name)
  const name = game.displayName
  const path = gamePath(name)
  const faq = gameFaq({ displayName: name, currencies: game.currencies })
  const otherGames = allGames.filter((g) => g.slug !== game.slug)
  const live = game.itemCount + game.currencyCount

  return (
    <main className="min-h-screen bg-background">
      <WebPageJsonLd
        type="CollectionPage"
        name={`Buy & Sell ${name} Items`}
        description={`Live ${name} item and currency listings on ${SITE_NAME}, priced in Philippine pesos.`}
        path={path}
        crumbs={[
          { name: "Games", path: "/games" },
          { name, path },
        ]}
      />
      {items.length > 0 && (
        <ItemListJsonLd
          name={`${name} items for sale`}
          path={path}
          items={items.map((l) => ({ name: l.title, path: `/listing/${l.id}`, image: l.image }))}
        />
      )}

      <Section className="pb-8 md:pb-10">
        <Container>
          <nav aria-label="Breadcrumb" className="mb-6 flex flex-wrap items-center gap-1.5 text-[13px] text-muted-foreground">
            <Link href="/marketplace" className="text-link hover:underline">Marketplace</Link>
            <span aria-hidden>›</span>
            <Link href="/games" className="text-link hover:underline">Games</Link>
            <span aria-hidden>›</span>
            <span className="text-foreground">{name}</span>
          </nav>

          <h1 className="text-title max-w-[22ch]">Buy &amp; sell {name} items</h1>
          <p className="mt-4 max-w-[62ch] text-[17px] leading-relaxed text-muted-foreground">
            {live > 0 ? (
              <>
                {plural(live, `${name} listing`)} live on {SITE_NAME}
                {game.lowestPrice ? `, starting at ${formatPeso(game.lowestPrice)}` : ""}. Prices are in pesos and you pay
                sellers directly with GCash or PayPal. Every seller shows their vouches, so you can see who has delivered
                before.
              </>
            ) : (
              <>
                No {name} items are listed right now. List yours for free and buyers in the Philippines can message you
                directly, or check back soon for new listings.
              </>
            )}
          </p>

          <dl className="mt-8 grid max-w-[640px] grid-cols-3 gap-3">
            <Stat label="Items for sale" value={game.itemCount.toLocaleString("en-PH")} />
            <Stat label="Lowest price" value={game.lowestPrice ? formatPeso(game.lowestPrice) : "—"} />
            <Stat label="Currency offers" value={game.currencyCount.toLocaleString("en-PH")} />
          </dl>
        </Container>
      </Section>

      <Section className="pt-0">
        <Container>
          <SectionHeader
            title={`${name} items for sale`}
            href={`/marketplace?game=${encodeURIComponent(name)}`}
            linkLabel="Filter on marketplace"
          />
          {items.length > 0 ? (
            <ListingGrid>
              {items.map((l, i) => (
                <ListingCard
                  key={l.id}
                  id={l.id}
                  title={l.title}
                  game={l.itemName || name}
                  price={l.price}
                  image={l.image}
                  sellerName={l.sellerName}
                  vouches={l.vouches}
                  featured={l.featured}
                  note={l.condition || undefined}
                  priority={i < 4}
                />
              ))}
            </ListingGrid>
          ) : (
            <div className="flex flex-col items-start gap-4 rounded-[20px] bg-card p-6 md:p-8">
              <p className="text-[17px] font-semibold">Be the first to sell {name} items</p>
              <p className="max-w-[52ch] text-[15px] text-muted-foreground">
                Listing is free and takes about a minute. Buyers message you, you agree on payment, and every completed
                trade earns you a vouch.
              </p>
              <Button asChild>
                <Link href="/sell">Sell an item</Link>
              </Button>
            </div>
          )}
        </Container>
      </Section>

      {currency.length > 0 && (
        <Section surface>
          <Container>
            <SectionHeader title={`${name} currency offers`} href="/currency" linkLabel="All currency" />
            <div className="overflow-x-auto rounded-[20px] bg-card">
              <table className="w-full min-w-[560px] text-left text-[15px]">
                <thead className="text-xs text-muted-foreground">
                  <tr className="border-b border-white/[0.08]">
                    <th className="px-5 py-3 font-medium">Seller</th>
                    <th className="px-5 py-3 font-medium">Currency</th>
                    <th className="px-5 py-3 font-medium">Rate per ₱1</th>
                    <th className="px-5 py-3 font-medium">In stock</th>
                    <th className="px-5 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.06]">
                  {currency.map((offer) => (
                    <tr key={offer.id}>
                      <td className="px-5 py-3.5">
                        <span className="font-medium">{offer.sellerName}</span>
                        {offer.vouches > 0 && (
                          <span className="ml-2 inline-flex items-center gap-0.5 text-xs text-success tabular-nums">
                            <Check className="size-3" strokeWidth={2.5} />
                            {offer.vouches}
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-muted-foreground">{offer.currency}</td>
                      <td className="px-5 py-3.5 font-semibold tabular-nums">{offer.ratePerPeso.toLocaleString("en-PH")}</td>
                      <td className="px-5 py-3.5 tabular-nums text-muted-foreground">{offer.stock.toLocaleString("en-PH")}</td>
                      <td className="px-5 py-3.5 text-right">
                        <Link href={`/currency/${offer.id}`} className="text-link hover:underline">
                          View
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Container>
        </Section>
      )}

      <Section surface={currency.length === 0}>
        <Container>
          <h2 className="text-section mb-6">How to buy {name} items safely</h2>
          <ol className="grid gap-3 md:grid-cols-3">
            {[
              ["Check the seller", `Open the listing and look at the seller's vouches. Search their name and GCash number in the Hall of Shame.`],
              ["Agree in chat", `Tap Message seller and agree on the price, payment method and how the ${name} item will be delivered.`],
              ["Pay, receive, vouch", "Pay the seller directly with GCash or PayPal, receive the item in-game, then leave a vouch."],
            ].map(([title, body], i) => (
              <li key={title} className="rounded-[20px] bg-card p-5 md:p-6">
                <span className="text-[13px] font-semibold text-link">Step {i + 1}</span>
                <h3 className="mt-1 text-[17px] font-semibold">{title}</h3>
                <p className="mt-2 text-[15px] leading-relaxed text-muted-foreground">{body}</p>
              </li>
            ))}
          </ol>
          <p className="mt-5 text-[15px] text-muted-foreground">
            Before you pay anyone, search the{" "}
            <Link href="/hall-of-shame" className="text-link hover:underline">Hall of Shame</Link>.
          </p>
        </Container>
      </Section>

      <Section>
        <Container>
          <FaqSection entries={faq} title={`${name} trading FAQ`} />
        </Container>
      </Section>

      {otherGames.length > 0 && (
        <Section surface>
          <Container>
            <SectionHeader title="More Roblox games" href="/games" />
            <ul className="flex flex-wrap gap-2">
              {otherGames.map((g) => (
                <li key={g.slug}>
                  <Link
                    href={gamePath(g.displayName)}
                    className="inline-flex h-9 items-center gap-2 rounded-full bg-secondary px-4 text-sm font-medium transition-colors hover:bg-[#3a3a3c]"
                  >
                    {g.displayName}
                    {g.itemCount + g.currencyCount > 0 && (
                      <span className="text-xs font-normal text-muted-foreground tabular-nums">
                        {g.itemCount + g.currencyCount}
                      </span>
                    )}
                  </Link>
                </li>
              ))}
            </ul>
          </Container>
        </Section>
      )}
    </main>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[16px] bg-card px-4 py-3">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 text-[19px] font-semibold tabular-nums">{value}</dd>
    </div>
  )
}
