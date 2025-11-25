"use client"

import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { Star, Shield } from "lucide-react"

const topSellers = [
  {
    id: 1,
    username: "NinjaTrader",
    avatar: "/user-avatar-profile.png",
    vouch: 342,
    joinDate: "Jan 2023",
    listings: 28,
    verified: true,
  },
  {
    id: 2,
    username: "PixelVault",
    avatar: "/user-avatar-profile-trading.jpg",
    vouch: 289,
    joinDate: "Mar 2023",
    listings: 15,
    verified: true,
  },
  {
    id: 3,
    username: "TradeMaster",
    avatar: "/user-avatar-master-trader.jpg",
    vouch: 567,
    joinDate: "May 2022",
    listings: 42,
    verified: true,
  },
  {
    id: 4,
    username: "SafeTrader99",
    avatar: "/user-avatar-trader-community.jpg",
    vouch: 198,
    joinDate: "Sep 2023",
    listings: 12,
    verified: false,
  },
]

export default function TopVouchedSellers() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {topSellers.map((seller) => (
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
            <p>Joined {seller.joinDate}</p>
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
