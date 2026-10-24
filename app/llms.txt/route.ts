import { getSeoGames } from "@/lib/games"
import { GENERAL_FAQ } from "@/lib/seo-content"
import { SITE_DEFINITION, SITE_NAME, SUPPORT_EMAIL, gamePath, getSiteUrl } from "@/lib/seo"
import { formatPeso } from "@/components/listing/listing-card"

export const revalidate = 3600

/**
 * llms.txt (https://llmstxt.org): a plain-Markdown map of the site for AI assistants and
 * answer engines, so they can describe RbMarket accurately and link to the right pages.
 */
export async function GET() {
  const base = getSiteUrl()
  const games = await getSeoGames().catch(() => [])

  const gameLines = games.map((g) => {
    const live = g.itemCount + g.currencyCount
    const detail = live > 0 ? `${live} live listing${live === 1 ? "" : "s"}${g.lowestPrice ? `, from ${formatPeso(g.lowestPrice)}` : ""}` : "no listings yet"
    const currencies = g.currencies.length > 0 ? `; currencies: ${g.currencies.join(", ")}` : ""
    return `- [${g.displayName}](${base}${gamePath(g.displayName)}): buy and sell ${g.displayName} items (${detail}${currencies})`
  })

  const body = `# ${SITE_NAME}

> ${SITE_DEFINITION}

Key facts:
- Country: Philippines. All prices are in Philippine pesos (PHP, ₱).
- Payments: buyers pay sellers directly, usually by GCash or PayPal (sometimes bank transfer). ${SITE_NAME} never holds trade money.
- Fees: free to sign up, list and message. No commission on trades. Optional paid plans and listing boosts.
- Trust: sellers build "vouches" from completed trades; the Hall of Shame is a moderated public list of reported scammers with their aliases and payment identifiers.
- Not affiliated with Roblox Corporation or any game developer.
- Contact: ${SUPPORT_EMAIL}

## Marketplace
- [Items marketplace](${base}/marketplace): all Roblox item, pet and limited listings, searchable and filterable by game
- [Currency](${base}/currency): in-game currency offers with a rate per ₱1, stock and order limits
- [Games](${base}/games): every supported Roblox game
- [Price trends](${base}/trends): listing volume, prices and popular games over time
- [Sell an item](${base}/sell): create a listing (account required)

## Games
${gameLines.join("\n")}

## Trust and safety
- [Hall of Shame](${base}/hall-of-shame): moderated scammer reports, searchable by name, Roblox username or GCash number
- [How RbMarket works and FAQ](${base}/faq)
- [Terms of Service](${base}/terms)
- [Privacy Policy](${base}/privacy)

## Guides
- [Blog and guides](${base}/blog)

## FAQ
${GENERAL_FAQ.map((entry) => `### ${entry.question}\n${entry.answer}`).join("\n\n")}
`

  return new Response(body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=3600",
    },
  })
}
