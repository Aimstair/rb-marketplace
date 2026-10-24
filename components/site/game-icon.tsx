"use client"

import { useState } from "react"
import Image from "next/image"
import { gameSlug } from "@/lib/seo"
import { cn } from "@/lib/utils"

// Quiet, distinct hues for the fallback initial dots
const DOT_HUES = ["#ff453a", "#ff9f0a", "#2997ff", "#30d158", "#bf5af2", "#64d2ff", "#ffd60a", "#ff375f"]

function hueFor(name: string) {
  let hash = 0
  for (const ch of name) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0
  return DOT_HUES[hash % DOT_HUES.length]
}

/**
 * A game's icon from public/games/<slug>.webp (see scripts/fetch-game-icons.ts), falling back
 * to a colored initial when a game has no icon yet.
 */
export function GameIcon({ name, size = 28, className }: { name: string; size?: number; className?: string }) {
  const [failed, setFailed] = useState(false)
  const radius = size >= 40 ? "rounded-[12px]" : "rounded-full"

  if (failed) {
    return (
      <span
        className={cn("grid shrink-0 place-items-center font-semibold text-black", radius, className)}
        style={{ width: size, height: size, background: hueFor(name), fontSize: size * 0.42 }}
        aria-hidden
      >
        {name.charAt(0).toUpperCase()}
      </span>
    )
  }

  return (
    <Image
      src={`/games/${gameSlug(name)}.webp`}
      alt=""
      width={size}
      height={size}
      className={cn("shrink-0 bg-secondary object-cover", radius, className)}
      onError={() => setFailed(true)}
    />
  )
}
