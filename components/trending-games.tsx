"use client"

import Link from "next/link"
import { Skeleton } from "@/components/ui/skeleton"
import { ChipRow } from "@/components/filters/chip"
import { gamePath } from "@/lib/seo"
import { GameIcon } from "@/components/site/game-icon"

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

/** Horizontal row of popular games, each linking to its game page. */
export default function TrendingGames({ games = [], isLoading = false }: TrendingGamesProps) {
  if (isLoading) {
    return (
      <ChipRow>
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-36 shrink-0 rounded-full" />
        ))}
      </ChipRow>
    )
  }

  if (games.length === 0) return null

  return (
    <ChipRow>
      {games.map((game, idx) => (
        <Link
          key={`${game.game}-${idx}`}
          href={gamePath(game.game)}
          className="flex h-10 shrink-0 items-center gap-2.5 rounded-full bg-secondary py-1.5 pl-1.5 pr-4 text-sm font-medium transition-colors hover:bg-[#3a3a3c]"
        >
          <GameIcon name={game.game} size={28} />
          {game.game}
          <span className="text-xs font-normal text-muted-foreground tabular-nums">{game.listings}</span>
        </Link>
      ))}
    </ChipRow>
  )
}
