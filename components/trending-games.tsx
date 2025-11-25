"use client"

import { Card } from "@/components/ui/card"
import Link from "next/link"
import { TrendingUp } from "lucide-react"

const trendingGames = [
  { id: 1, name: "Adopt Me", listings: 2843, image: "/adopt-me-roblox-game.jpg" },
  { id: 2, name: "Pet Simulator X", listings: 1956, image: "/pet-simulator-x-roblox.jpg" },
  { id: 3, name: "Blox Fruits", listings: 3241, image: "/blox-fruits-roblox.jpg" },
  { id: 4, name: "Roblox Limiteds", listings: 1842, image: "/roblox-limited-items.jpg" },
  { id: 5, name: "Brookhaven RP", listings: 542, image: "/brookhaven-rp-roblox.jpg" },
  { id: 6, name: "Jailbreak", listings: 723, image: "/generic-prison-escape-game.png" },
]

export default function TrendingGames() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
      {trendingGames.map((game) => (
        <Link key={game.id} href={`/marketplace?game=${game.id}`}>
          <Card className="overflow-hidden hover:shadow-lg transition-all cursor-pointer group">
            <div className="relative aspect-square bg-muted">
              <img
                src={game.image || "/placeholder.svg"}
                alt={game.name}
                className="w-full h-full object-cover group-hover:scale-110 transition-transform"
              />
              <div className="absolute inset-0 bg-black/40 group-hover:bg-black/50 transition flex flex-col items-center justify-center">
                <TrendingUp className="w-6 h-6 text-white mb-2" />
                <p className="text-white font-bold text-center px-2">{game.name}</p>
                <p className="text-white/80 text-xs mt-1">{game.listings} listings</p>
              </div>
            </div>
          </Card>
        </Link>
      ))}
    </div>
  )
}
