"use client"

import Link from "next/link"
import { BadgeCheck, Check } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"

interface TopTrader {
  id: string
  username: string
  avatar: string | null
  vouch: number
  joinDate: Date
  listings: number
  verified: boolean
}

interface TopVouchedSellersProps {
  sellers?: TopTrader[]
  isLoading?: boolean
}

const formatDate = (date: Date) =>
  new Date(date).toLocaleDateString("en-US", { month: "short", year: "numeric" })

export default function TopVouchedSellers({ sellers = [], isLoading = false }: TopVouchedSellersProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-[18px] sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 rounded-lg bg-card p-4">
            <Skeleton className="size-12 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-3 w-32" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (sellers.length === 0) {
    return <p className="text-muted-foreground">No top traders yet.</p>
  }

  return (
    <div className="grid grid-cols-1 gap-[18px] sm:grid-cols-2 lg:grid-cols-4">
      {sellers.map((seller) => (
        <Link
          key={seller.id}
          href={`/profile/${seller.id}`}
          className="lift flex items-center gap-3 rounded-lg bg-card p-4 hover:bg-[#232325]"
        >
          <img
            src={seller.avatar || "/placeholder.svg"}
            alt=""
            className="size-12 shrink-0 rounded-full bg-secondary object-cover"
          />
          <div className="min-w-0">
            <p className="flex items-center gap-1 truncate font-semibold">
              <span className="truncate">{seller.username}</span>
              {seller.verified && (
                <BadgeCheck className="size-4 shrink-0 text-link" strokeWidth={1.75} aria-label="Verified" />
              )}
            </p>
            <p className="flex items-center gap-1 text-xs text-muted-foreground">
              <span className="flex items-center gap-0.5 text-success tabular-nums">
                <Check className="size-3" strokeWidth={2.5} />
                {seller.vouch}
              </span>
              · {seller.listings} listings · Since {formatDate(seller.joinDate)}
            </p>
          </div>
        </Link>
      ))}
    </div>
  )
}
