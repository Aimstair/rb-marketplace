import Link from "next/link"
import { getSeoGames } from "@/lib/games"
import { gamePath } from "@/lib/seo"

const COLUMNS = [
  {
    title: "Marketplace",
    links: [
      { href: "/marketplace", label: "Browse items" },
      { href: "/currency", label: "Buy currency" },
      { href: "/games", label: "All games" },
      { href: "/sell", label: "Sell an item" },
      { href: "/trends", label: "Price trends" },
    ],
  },
  {
    title: "Trust & Safety",
    links: [
      { href: "/hall-of-shame", label: "Hall of Shame" },
      { href: "/faq", label: "How it works" },
      { href: "/subscriptions", label: "Boosts & plans" },
    ],
  },
  {
    title: "RbMarket",
    links: [
      { href: "/blog", label: "Guides" },
      { href: "/auth/signup", label: "Create an account" },
    ],
  },
  {
    title: "Legal",
    links: [
      { href: "/terms", label: "Terms of Service" },
      { href: "/privacy", label: "Privacy Policy" },
    ],
  },
]

export async function SiteFooter() {
  // Links to the busiest game pages, so every page passes link value to them
  const games = await getSeoGames().catch(() => [])
  const popular = [...games]
    .sort((a, b) => b.itemCount + b.currencyCount - (a.itemCount + a.currencyCount))
    .slice(0, 6)
  const columns = popular.length
    ? [
        COLUMNS[0],
        { title: "Popular games", links: popular.map((g) => ({ href: gamePath(g.displayName), label: g.displayName })) },
        ...COLUMNS.slice(1),
      ]
    : COLUMNS

  return (
    <footer className="border-t border-white/[0.08] bg-surface text-xs text-muted-foreground">
      <div className="mx-auto max-w-[1440px] px-5 md:px-8 lg:px-10 py-10">
        <div className="grid grid-cols-2 gap-8 sm:grid-cols-3 lg:grid-cols-5">
          {columns.map((col) => (
            <div key={col.title}>
              <p className="mb-3 font-semibold text-foreground/90">{col.title}</p>
              <ul className="space-y-2">
                {col.links.map((link) => (
                  <li key={link.href}>
                    <Link href={link.href} className="hover:text-foreground hover:underline underline-offset-2">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-10 flex flex-col gap-2 border-t border-white/[0.08] pt-5 sm:flex-row sm:justify-between">
          <p>Copyright © {new Date().getFullYear()} RbMarket, the Roblox marketplace in the Philippines. Not affiliated with Roblox Corporation.</p>
          <p>Payments by GCash and PayPal · Prices in PHP</p>
        </div>
      </div>
    </footer>
  )
}
