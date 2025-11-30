"use client"

import { Card } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import Link from "next/link"
import { TrendingUp } from "lucide-react"

interface TrendingGame {
  game: string
  listings: number
  avgPrice: number
  totalViews: number
}

interface TrendingGamesProps {
  games?: TrendingGame[]
  isLoading?: boolean
}

export default function TrendingGames({ games = [], isLoading = false }: TrendingGamesProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <Card key={i} className="overflow-hidden">
            <Skeleton className="w-full aspect-square" />
          </Card>
        ))}
      </div>
    )
  }

  if (games.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <p>No trending games available</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
      {games.map((game, idx) => (
        <Link key={`${game.game}-${idx}`} href={`/marketplace?game=${encodeURIComponent(game.game)}`}>
          <Card className="overflow-hidden hover:shadow-lg transition-all cursor-pointer group">
            <div className="relative aspect-square bg-gradient-to-br from-primary/20 to-primary/10 flex flex-col items-center justify-center">
              <TrendingUp className="w-8 h-8 text-primary mb-2" />
              <p className="text-foreground font-bold text-center px-2 text-sm">{game.game}</p>
              <p className="text-muted-foreground text-xs mt-1">{game.listings} listings</p>
            </div>
          </Card>
        </Link>
      ))}
    </div>
  )
}
