"use client"

import { useState } from "react"
import Link from "next/link"
import { gamePath } from "@/lib/seo"
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts"
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart"
import { Skeleton } from "@/components/ui/skeleton"
import { Container, SectionHeader } from "@/components/site/container"
import { Segmented } from "@/components/filters/chip"
import TopVouchedSellers from "@/components/top-vouched-sellers"
import { getTrendsDashboard, type TrendsDashboard } from "@/app/actions/trends"
import { cn } from "@/lib/utils"

type RangeKey = "7" | "30" | "90" | "365"
type ChartMetric = "volume" | "trades"

const RANGE_OPTIONS: { value: RangeKey; label: string }[] = [
  { value: "7", label: "7D" },
  { value: "30", label: "30D" },
  { value: "90", label: "90D" },
  { value: "365", label: "1Y" },
]

const chartConfig = {
  volume: { label: "Volume", color: "var(--chart-1)" },
  transactions: { label: "Trades", color: "var(--chart-1)" },
} satisfies ChartConfig

const rangeLabel = (days: number) => (days === 365 ? "12 months" : `${days} days`)
const plural = (n: number, word: string) => `${n.toLocaleString()} ${word}${n === 1 ? "" : "s"}`

const peso = (value: number) => `₱${Math.round(value).toLocaleString("en-PH")}`
const compact = new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 })
const shortDate = (value: string) =>
  new Date(value).toLocaleDateString("en-US", { month: "short", day: "numeric" })

type TrendPoint = TrendsDashboard["marketTrends"][number]

/**
 * The API only returns days that had trades. Fill the gaps with zeros so quiet periods
 * read as quiet, and group long ranges by week so bars stay readable.
 */
function buildSeries(points: TrendPoint[], days: number) {
  const byDay = new Map(points.map((p) => [p.date, p]))
  const bucketDays = days > 90 ? 7 : days > 30 ? 3 : 1
  const today = new Date()
  today.setUTCHours(0, 0, 0, 0)
  const series: { date: string; volume: number; transactions: number }[] = []
  for (let offset = days - 1; offset >= 0; offset -= bucketDays) {
    let volume = 0
    let transactions = 0
    let label = ""
    for (let i = 0; i < bucketDays && offset - i >= 0; i++) {
      const d = new Date(today)
      d.setUTCDate(today.getUTCDate() - (offset - i))
      const key = d.toISOString().slice(0, 10)
      if (!label) label = key
      const hit = byDay.get(key)
      if (hit) {
        volume += hit.volume
        transactions += hit.transactions
      }
    }
    series.push({ date: label, volume, transactions })
  }
  return { series, bucketDays }
}

function timeAgo(value: Date | string) {
  const seconds = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 1000))
  if (seconds < 3600) return `${Math.max(1, Math.floor(seconds / 60))}m ago`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`
  return new Date(value).toLocaleDateString("en-US", { month: "short", day: "numeric" })
}

function Delta({ change, previous, days }: { change: number; previous?: number; days: number }) {
  // A percentage against zero is meaningless; say what actually happened instead
  if (previous === 0 && change > 0) {
    return <p className="mt-1 text-[13px] text-muted-foreground">None in the previous {rangeLabel(days)}</p>
  }
  if (!Number.isFinite(change) || change === 0) {
    return <p className="mt-1 text-[13px] text-muted-foreground">No change vs previous {rangeLabel(days)}</p>
  }
  const up = change > 0
  return (
    <p className="mt-1 text-[13px] text-muted-foreground">
      <span className={up ? "text-success" : "text-destructive"}>
        {up ? "▲" : "▼"} {Math.abs(change).toFixed(1)}%
      </span>{" "}
      vs previous {rangeLabel(days)}
    </p>
  )
}

/** Card shell shared by every section on this page. */
function Panel({ className, children }: { className?: string; children: React.ReactNode }) {
  return <section className={cn("rounded-[20px] bg-card p-5 md:p-6", className)}>{children}</section>
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="py-10 text-center text-sm text-muted-foreground">{children}</p>
}

export default function TrendsPageClient({ initial }: { initial: TrendsDashboard }) {
  const [data, setData] = useState<TrendsDashboard>(initial)
  const [range, setRange] = useState<RangeKey>(String(initial.days) as RangeKey)
  const [loading, setLoading] = useState(false)
  const [metric, setMetric] = useState<ChartMetric>("volume")
  const [showAllTrades, setShowAllTrades] = useState(false)

  const handleRangeChange = async (next: RangeKey) => {
    setRange(next)
    setLoading(true)
    try {
      setData(await getTrendsDashboard(Number(next)))
    } catch (error) {
      console.error("Failed to load trends:", error)
    } finally {
      setLoading(false)
    }
  }

  const days = data.days
  const m = data.metrics
  const stats = m
    ? [
        { label: "Trade volume", value: peso(m.tradeVolume.value), change: m.tradeVolume.change, previous: m.tradeVolume.previous },
        { label: "Completed trades", value: m.completedTransactions.value.toLocaleString(), change: m.completedTransactions.change, previous: m.completedTransactions.previous },
        { label: "Average deal", value: peso(m.averagePrice.value), change: m.averagePrice.change, previous: m.averagePrice.previous },
        { label: "Active traders", value: m.activeTraders.value.toLocaleString(), change: m.activeTraders.change, previous: m.activeTraders.previous },
      ]
    : []

  const chartKey = metric === "volume" ? "volume" : "transactions"
  const { series, bucketDays } = buildSeries(data.marketTrends, days)
  const chartTotal = data.marketTrends.reduce((sum, d) => sum + (metric === "volume" ? d.volume : d.transactions), 0)
  const maxGameListings = Math.max(1, ...data.games.map((g) => g.listings))
  const trades = showAllTrades ? data.activity : data.activity.slice(0, 6)
  const hasTrades = (m?.completedTransactions.value ?? 0) > 0
  const hasBestSellers = data.topSelling.length > 0
  const hasCurrency = Boolean(data.currency && data.currency.topCurrencies.length > 0)
  const hasActivity = data.activity.length > 0

  return (
    <main className="min-h-screen bg-background">
      <Container className="pt-10 pb-16 md:pt-14 md:pb-20">
        {/* Header */}
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-title">Roblox price trends</h1>
            <p className="mt-2 text-[17px] text-muted-foreground">What's selling on RbMarket, and for how much.</p>
          </div>
          <Segmented value={range} options={RANGE_OPTIONS} onChange={handleRangeChange} />
        </div>

        <div className={cn("mt-8 space-y-[18px] transition-opacity", loading && "opacity-60")} aria-busy={loading}>
          {!hasTrades && m ? (
            <Panel className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-[17px] font-semibold">No completed trades in the last {rangeLabel(days)}</p>
                <p className="mt-1 text-[15px] text-muted-foreground">
                  Listings are still live. Here&apos;s what buyers are looking at right now.
                </p>
              </div>
              {days < 365 && (
                <button
                  type="button"
                  onClick={() => handleRangeChange("365")}
                  className="shrink-0 text-[15px] text-link hover:underline underline-offset-2"
                >
                  Show the last 12 months ›
                </button>
              )}
            </Panel>
          ) : null}

          {/* Summary strip */}
          {(hasTrades || !m) && (
          <Panel className="grid grid-cols-2 gap-y-6 p-0 md:p-0 lg:grid-cols-4">
            {stats.length > 0
              ? stats.map((stat, i) => (
                  <div
                    key={stat.label}
                    className={cn(
                      "px-5 py-5 md:px-6",
                      i > 0 && "lg:border-l lg:border-white/[0.08]",
                      i % 2 === 1 && "border-l border-white/[0.08] lg:border-l",
                    )}
                  >
                    <p className="text-[13px] text-muted-foreground">{stat.label}</p>
                    <p className="mt-1 text-[28px] font-semibold tracking-[-0.02em] tabular-nums">{stat.value}</p>
                    <Delta change={stat.change} previous={stat.previous} days={days} />
                  </div>
                ))
              : Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="space-y-2 px-6 py-5">
                    <Skeleton className="h-3 w-24" />
                    <Skeleton className="h-7 w-32" />
                    <Skeleton className="h-3 w-40" />
                  </div>
                ))}
          </Panel>
          )}

          {/* Main chart */}
          {hasTrades && (
          <Panel>
            <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-[13px] text-muted-foreground">
                  {metric === "volume" ? "Trade volume" : "Completed trades"} · last {rangeLabel(days)}
                  {bucketDays === 7 ? " · per week" : bucketDays > 1 ? ` · per ${bucketDays} days` : " · per day"}
                </p>
                <p className="mt-0.5 text-[22px] font-semibold tracking-[-0.02em] tabular-nums">
                  {metric === "volume" ? peso(chartTotal) : chartTotal.toLocaleString()}
                </p>
              </div>
              <Segmented
                value={metric}
                onChange={setMetric}
                options={[
                  { value: "volume", label: "Volume" },
                  { value: "trades", label: "Trades" },
                ]}
              />
            </div>
            {data.marketTrends.length > 0 ? (
              <ChartContainer config={chartConfig} className="h-[260px] w-full md:h-[300px]">
                <BarChart data={series} margin={{ top: 8, right: 4, left: 4, bottom: 0 }} barCategoryGap="18%">
                  <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.06)" />
                  <XAxis
                    dataKey="date"
                    tickFormatter={shortDate}
                    tickLine={false}
                    axisLine={false}
                    tickMargin={10}
                    minTickGap={40}
                  />
                  <YAxis
                    tickFormatter={(v: number) => (metric === "volume" ? `₱${compact.format(v)}` : compact.format(v))}
                    tickLine={false}
                    axisLine={false}
                    width={56}
                    allowDecimals={false}
                  />
                  <ChartTooltip
                    cursor={{ fill: "rgba(255,255,255,0.05)" }}
                    content={
                      <ChartTooltipContent
                        hideIndicator
                        labelFormatter={(label) =>
                          bucketDays > 1 ? `From ${shortDate(String(label))}` : shortDate(String(label))
                        }
                        formatter={(value) => (
                          <span className="font-semibold tabular-nums">
                            {metric === "volume" ? peso(Number(value)) : plural(Number(value), "trade")}
                          </span>
                        )}
                      />
                    }
                  />
                  <Bar dataKey={chartKey} fill="var(--chart-1)" radius={[4, 4, 0, 0]} maxBarSize={28} isAnimationActive={false} />
                </BarChart>
              </ChartContainer>
            ) : (
              <Empty>No completed trades in this period yet.</Empty>
            )}
          </Panel>
          )}

          {/* Trending + best sellers */}
          <div className={cn("grid gap-[18px]", hasBestSellers && "lg:grid-cols-2")}>
            <Panel>
              <SectionHeader title="Trending now" href="/marketplace" className="mb-3 [&_h2]:text-[21px]" />
              {data.trending.length > 0 ? (
                <ul className={cn("-mx-2", !hasBestSellers && "grid gap-x-8 md:grid-cols-2")}>
                  {data.trending.slice(0, hasBestSellers ? 5 : 6).map((item) => (
                    <li key={item.id}>
                      <Link
                        href={item.listingType === "CURRENCY" ? `/currency/${item.id}` : `/listing/${item.id}`}
                        className="flex items-center gap-3 rounded-xl px-2 py-2.5 transition-colors hover:bg-white/[0.04]"
                      >
                        <span className="size-12 shrink-0 overflow-hidden rounded-xl bg-secondary">
                          {item.image && <img src={item.image} alt="" loading="lazy" className="h-full w-full object-contain p-1" />}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate font-medium">{item.title}</span>
                          <span className="block truncate text-[13px] text-muted-foreground">
                            {item.game} · {plural(item.views, "view")}
                          </span>
                        </span>
                        <span className="shrink-0 font-semibold tabular-nums">
                          {item.listingType === "CURRENCY" ? `${item.price.toLocaleString()}/₱1` : peso(item.price)}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <Empty>Nothing trending yet.</Empty>
              )}
            </Panel>

            {hasBestSellers && (
            <Panel>
              <SectionHeader title="Best sellers" className="mb-3 [&_h2]:text-[21px]" />
              {hasBestSellers ? (
                <ol className="divide-y divide-white/[0.06]">
                  {data.topSelling.map((item, i) => (
                    <li key={`${item.listing}-${i}`} className="flex items-center gap-4 py-3">
                      <span className="w-5 shrink-0 text-center text-[15px] font-semibold text-muted-foreground tabular-nums">
                        {i + 1}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-medium">{item.listing}</span>
                        <span className="text-[13px] text-muted-foreground tabular-nums">
                          {item.sales.toLocaleString()} sold
                        </span>
                      </span>
                      <span className="shrink-0 text-right">
                        <span className="block font-semibold tabular-nums">{peso(item.price)}</span>
                        <span className="text-[11px] text-muted-foreground">avg. price</span>
                      </span>
                    </li>
                  ))}
                </ol>
              ) : (
                <Empty>No sales recorded yet.</Empty>
              )}
            </Panel>
            )}
          </div>

          {/* Popular games */}
          <Panel>
            <SectionHeader title="Popular games" className="mb-4 [&_h2]:text-[21px]" />
            {data.games.length > 0 ? (
              <ul className="grid gap-x-10 gap-y-1 md:grid-cols-2">
                {data.games.map((game) => (
                  <li key={game.game}>
                    <Link
                      href={gamePath(game.game)}
                      className="group -mx-2 block rounded-xl px-2 py-2.5 transition-colors hover:bg-white/[0.04]"
                    >
                      <span className="flex items-baseline justify-between gap-3">
                        <span className="truncate font-medium">{game.game}</span>
                        <span className="shrink-0 text-[13px] text-muted-foreground tabular-nums">
                          {plural(game.listings, "listing")}
                        </span>
                      </span>
                      <span className="mt-2 block h-1.5 overflow-hidden rounded-full bg-secondary">
                        <span
                          className="block h-full rounded-full bg-link/80 transition-colors group-hover:bg-link"
                          style={{ width: `${Math.max(4, (game.listings / maxGameListings) * 100)}%` }}
                        />
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <Empty>No game data yet.</Empty>
            )}
          </Panel>

          {/* Currency + latest trades */}
          {(hasCurrency || hasActivity) && (
          <div className={cn("grid gap-[18px]", hasCurrency && hasActivity && "lg:grid-cols-2")}>
            {hasCurrency && (
            <Panel>
              <SectionHeader title="Currency market" href="/currency" linkLabel="Buy currency" className="mb-3 [&_h2]:text-[21px]" />
              {data.currency && data.currency.topCurrencies.length > 0 ? (
                <ul className="divide-y divide-white/[0.06]">
                  {data.currency.topCurrencies.map((c) => (
                    <li key={`${c.currencyId}-${c.game}`} className="flex items-center gap-4 py-3">
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-medium">{c.currency}</span>
                        <span className="block truncate text-[13px] text-muted-foreground">
                          {c.game} · {plural(c.listings, "seller")}
                        </span>
                      </span>
                      <span className="shrink-0 text-right">
                        <span className="block font-semibold tabular-nums">{compact.format(c.avgRate)}</span>
                        <span className="text-[11px] text-muted-foreground">avg. per ₱1</span>
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <Empty>No active currency sellers right now.</Empty>
              )}
            </Panel>
            )}

            {hasActivity && (
            <Panel>
              <SectionHeader title="Latest trades" className="mb-3 [&_h2]:text-[21px]" />
              {trades.length > 0 ? (
                <>
                  <ul className="divide-y divide-white/[0.06]">
                    {trades.map((trade) => (
                      <li key={trade.id} className="flex items-center gap-4 py-3">
                        <span className="min-w-0 flex-1">
                          <span className="block truncate">
                            <span className="font-medium">{trade.listingTitle}</span>
                          </span>
                          <span className="block truncate text-[13px] text-muted-foreground">
                            <Link href={`/profile/${trade.sellerId}`} className="hover:text-foreground">
                              {trade.sellerUsername}
                            </Link>{" "}
                            →{" "}
                            <Link href={`/profile/${trade.buyerId}`} className="hover:text-foreground">
                              {trade.buyerUsername}
                            </Link>
                          </span>
                        </span>
                        <span className="shrink-0 text-right">
                          <span className="block font-semibold tabular-nums">{peso(trade.price)}</span>
                          <span className="text-[11px] text-muted-foreground">{timeAgo(trade.completedAt)}</span>
                        </span>
                      </li>
                    ))}
                  </ul>
                  {data.activity.length > 6 && (
                    <button
                      type="button"
                      onClick={() => setShowAllTrades((v) => !v)}
                      className="mt-2 text-[15px] text-link hover:underline underline-offset-2"
                    >
                      {showAllTrades ? "Show fewer" : `Show ${data.activity.length - 6} more`}
                    </button>
                  )}
                </>
              ) : (
                <Empty>No completed trades yet.</Empty>
              )}
            </Panel>
            )}
          </div>
          )}

          {/* Top sellers */}
          <div className="pt-6">
            <SectionHeader title="Top sellers" />
            <TopVouchedSellers sellers={data.traders} />
          </div>
        </div>
      </Container>
    </main>
  )
}
