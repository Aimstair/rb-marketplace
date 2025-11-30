"use client"

import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import Link from "next/link"
import { Star, Shield } from "lucide-react"

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

export default function TopVouchedSellers({ sellers = [], isLoading = false }: TopVouchedSellersProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} className="p-6 text-center">
            <Skeleton className="w-24 h-24 rounded-full mx-auto mb-4" />
            <Skeleton className="h-6 w-24 mx-auto mb-4" />
            <Skeleton className="h-4 w-32 mx-auto mb-4" />
            <Skeleton className="h-10 w-full" />
          </Card>
        ))}
      </div>
    )
  }

  if (sellers.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <p>No top traders available</p>
      </div>
    )
  }

  const formatDate = (date: Date) => {
    const d = new Date(date)
    return d.toLocaleDateString("en-US", { month: "short", year: "numeric" })
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {sellers.map((seller) => (
        <Card key={seller.id} className="p-6 text-center hover:shadow-lg transition-all">
          {/* Avatar */}
          <img
            src={seller.avatar || "/placeholder.svg"}
            alt={seller.username}
            className="w-24 h-24 rounded-full mx-auto mb-4 object-cover"
          />

          {/* Username with Badge */}
          <div className="mb-2 flex items-center justify-center gap-2">
            <h3 className="font-bold text-lg">{seller.username}</h3>
            {seller.verified && <Shield className="w-4 h-4 text-primary" />}
          </div>

          {/* Vouch Count */}
          <div className="flex items-center justify-center gap-1 mb-3">
            <Star className="w-5 h-5 fill-yellow-400 text-yellow-400" />
            <span className="font-bold">{seller.vouch}</span>
            <span className="text-muted-foreground">vouches</span>
          </div>

          {/* Meta */}
          <div className="text-sm text-muted-foreground mb-4 space-y-1">
            <p>Joined {formatDate(seller.joinDate)}</p>
            <p>{seller.listings} active listings</p>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2">
            <Link href={`/profile/${seller.id}`} className="flex-1">
              <Button variant="outline" className="w-full bg-transparent">
                View Profile
              </Button>
            </Link>
          </div>
        </Card>
      ))}
    </div>
  )
}
