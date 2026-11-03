"use client"

import { useAuth } from "@/lib/auth-context"
import { useRouter } from "next/navigation"
import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { ListPageSkeleton } from "@/components/site/skeletons"
import { SellLink } from "@/components/listing/sell-link"
import { getTransactions } from "@/app/actions/transactions"
import type { TransactionData } from "@/app/actions/transactions"
import { TransactionCard } from "@/components/transaction-card"
import { cn } from "@/lib/utils"

const PAGE_SIZE = 10

type Side = "buying" | "selling"
type StatusFilter = "all" | "action" | "PENDING" | "COMPLETED" | "CANCELLED"

const STATUS_FILTERS: { value: StatusFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "action", label: "Needs you" },
  { value: "PENDING", label: "In progress" },
  { value: "COMPLETED", label: "Completed" },
  { value: "CANCELLED", label: "Cancelled" },
]

export default function MyTransactionsPage() {
  const { user, isLoading: isAuthLoading } = useAuth()
  const router = useRouter()
  const [transactions, setTransactions] = useState<TransactionData[]>([])
  const [loading, setLoading] = useState(true)
  const [side, setSide] = useState<Side>("buying")
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all")
  const [searchQuery, setSearchQuery] = useState("")
  const [visible, setVisible] = useState(PAGE_SIZE)

  const loadTransactions = useCallback(async () => {
    try {
      const result = await getTransactions()
      if (result.success && result.transactions) setTransactions(result.transactions)
    } catch (error) {
      console.error("Error loading transactions:", error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (isAuthLoading) return
    if (!user) {
      router.push("/auth/login?redirect=/my-transactions")
      return
    }
    loadTransactions()
  }, [user, isAuthLoading, router, loadTransactions])

  // Back to the first page whenever the view changes
  useEffect(() => setVisible(PAGE_SIZE), [side, statusFilter, searchQuery])

  const isMine = (tx: TransactionData, s: Side) => (s === "buying" ? tx.buyerId === user?.id : tx.sellerId === user?.id)
  const needsMe = (tx: TransactionData) =>
    tx.status === "PENDING" && !(tx.buyerId === user?.id ? tx.buyerConfirmed : tx.sellerConfirmed)

  const sideCounts = useMemo(
    () => ({
      buying: transactions.filter((tx) => isMine(tx, "buying")).length,
      selling: transactions.filter((tx) => isMine(tx, "selling")).length,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [transactions, user?.id],
  )

  const stats = useMemo(() => {
    const mine = transactions.filter((tx) => isMine(tx, side))
    return {
      action: mine.filter(needsMe).length,
      inProgress: mine.filter((tx) => tx.status === "PENDING").length,
      completed: mine.filter((tx) => tx.status === "COMPLETED").length,
      completedValue: mine.filter((tx) => tx.status === "COMPLETED").reduce((sum, tx) => sum + tx.price, 0),
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [transactions, side, user?.id])

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    return transactions.filter((tx) => {
      if (!isMine(tx, side)) return false
      if (statusFilter === "action" && !needsMe(tx)) return false
      if (statusFilter !== "all" && statusFilter !== "action" && tx.status !== statusFilter) return false
      if (!q) return true
      const other = side === "buying" ? tx.seller.username : tx.buyer.username
      return tx.listing.title.toLowerCase().includes(q) || other.toLowerCase().includes(q)
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [transactions, side, statusFilter, searchQuery, user?.id])

  // Session loading, or about to redirect to login: keep the page shape instead of a blank gap
  if (isAuthLoading || !user) {
    return <ListPageSkeleton />
  }

  const hasAnyOnSide = sideCounts[side] > 0

  return (
    <main className="mx-auto w-full max-w-[1000px] px-5 pb-16 pt-10 md:px-8 md:pb-20 md:pt-14">
      <header className="mb-8 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-title">Transactions</h1>
          <p className="mt-2 text-[17px] text-muted-foreground">
            Confirm each order once you&apos;ve received the item or payment. It completes when both sides confirm.
          </p>
        </div>
        <div role="tablist" aria-label="Transaction side" className="inline-flex self-start rounded-full bg-secondary p-[3px] text-sm font-medium">
          {(["buying", "selling"] as const).map((value) => (
            <button
              key={value}
              type="button"
              role="tab"
              aria-selected={side === value}
              onClick={() => setSide(value)}
              className={cn(
                "rounded-full px-5 py-2 capitalize transition-colors",
                side === value ? "bg-[#48484a] text-foreground" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {value} <span className="tabular-nums text-muted-foreground">{sideCounts[value]}</span>
            </button>
          ))}
        </div>
      </header>

      <section aria-label="Summary" className="mb-8 grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatTile
          label="Needs your confirmation"
          value={stats.action}
          highlight={stats.action > 0}
          onClick={() => setStatusFilter("action")}
        />
        <StatTile label="In progress" value={stats.inProgress} onClick={() => setStatusFilter("PENDING")} />
        <StatTile label="Completed" value={stats.completed} onClick={() => setStatusFilter("COMPLETED")} />
        <StatTile
          label={side === "buying" ? "Total spent" : "Total earned"}
          value={`₱${stats.completedValue.toLocaleString()}`}
        />
      </section>

      <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div role="radiogroup" aria-label="Status" className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.value}
              type="button"
              role="radio"
              aria-checked={statusFilter === f.value}
              onClick={() => setStatusFilter(f.value)}
              className={cn(
                "shrink-0 rounded-full px-4 py-2 text-[14px] font-medium transition-colors",
                statusFilter === f.value ? "bg-foreground text-background" : "bg-secondary text-foreground hover:bg-[#3a3a3c]",
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
        <div className="relative md:w-72">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" strokeWidth={1.75} />
          <Input
            placeholder={side === "buying" ? "Search items or sellers" : "Search items or buyers"}
            className="pl-10"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            aria-label="Search transactions"
          />
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-[120px] w-full rounded-[20px]" />
          ))}
        </div>
      ) : !hasAnyOnSide ? (
        <EmptyState side={side} />
      ) : filtered.length === 0 ? (
        <div className="rounded-[20px] bg-card px-6 py-12 text-center">
          <p className="text-[17px] font-semibold">No matching transactions</p>
          <p className="mt-1 text-[15px] text-muted-foreground">Try another filter or search.</p>
          <Button
            variant="secondary"
            className="mt-5"
            onClick={() => {
              setStatusFilter("all")
              setSearchQuery("")
            }}
          >
            Clear filters
          </Button>
        </div>
      ) : (
        <>
          <div className="space-y-3">
            {filtered.slice(0, visible).map((tx) => (
              <TransactionCard key={tx.id} transaction={tx} currentUserId={user.id} onUpdate={loadTransactions} />
            ))}
          </div>
          {filtered.length > visible && (
            <div className="mt-6 flex justify-center">
              <Button variant="secondary" onClick={() => setVisible((v) => v + PAGE_SIZE)}>
                Show more
              </Button>
            </div>
          )}
        </>
      )}
    </main>
  )
}

function StatTile({
  label,
  value,
  highlight,
  onClick,
}: {
  label: string
  value: number | string
  highlight?: boolean
  onClick?: () => void
}) {
  const content = (
    <>
      <span className={cn("block text-[28px] font-semibold tabular-nums leading-none", highlight && "text-warning")}>
        {value}
      </span>
      <span className="mt-2 block text-[13px] text-muted-foreground">{label}</span>
    </>
  )
  return onClick ? (
    <button type="button" onClick={onClick} className="rounded-[20px] bg-card p-4 text-left transition-colors hover:bg-[#232325] sm:p-5">
      {content}
    </button>
  ) : (
    <div className="rounded-[20px] bg-card p-4 sm:p-5">{content}</div>
  )
}

function EmptyState({ side }: { side: Side }) {
  return (
    <div className="rounded-[20px] bg-card px-6 py-14 text-center">
      <p className="text-[21px] font-semibold">
        {side === "buying" ? "No purchases yet" : "No sales yet"}
      </p>
      <p className="mx-auto mt-2 max-w-md text-[15px] text-muted-foreground">
        {side === "buying"
          ? "When you agree to buy something in chat, the order shows up here so you can confirm it."
          : "When a buyer starts an order on one of your listings, it shows up here."}
      </p>
      <Button asChild className="mt-6">
        {side === "buying" ? <Link href="/marketplace">Browse items</Link> : <SellLink>Sell an item</SellLink>}
      </Button>
    </div>
  )
}
