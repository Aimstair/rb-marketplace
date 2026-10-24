"use client"

import Link from "next/link"
import { Skeleton } from "@/components/ui/skeleton"
import { ChipRow } from "@/components/filters/chip"
import { gamePath } from "@/lib/seo"

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

// Quiet, distinct hues for the game initial dots
const DOT_HUES = ["#ff453a", "#ff9f0a", "#2997ff", "#30d158", "#bf5af2", "#64d2ff", "#ffd60a", "#ff375f"]

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
          <span
            className="grid size-7 place-items-center rounded-full text-xs font-semibold text-black"
            style={{ background: DOT_HUES[idx % DOT_HUES.length] }}
            aria-hidden="true"
          >
            {game.game.charAt(0).toUpperCase()}
          </span>
          {game.game}
          <span className="text-xs font-normal text-muted-foreground tabular-nums">{game.listings}</span>
        </Link>
      ))}
    </ChipRow>
  )
}
