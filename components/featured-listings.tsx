"use client"

import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"
import { Star, MessageCircle } from "lucide-react"

// Mock data - replace with real data from API
const mockListings = [
  {
    id: 1,
    title: "Golden Dragon Pet",
    game: "Adopt Me",
    price: "₱2,500",
    image: "/golden-dragon-pet-roblox.jpg",
    seller: "NinjaTrader",
    vouch: 42,
    featured: true,
  },
  {
    id: 2,
    title: "Dominus Astrorum",
    game: "Roblox Limited",
    price: "₱8,999",
    image: "/dominus-astrorum-roblox-limited.jpg",
    seller: "PixelVault",
    vouch: 89,
    featured: true,
  },
  {
    id: 3,
    title: "Blox Fruits Zoan Tier 3",
    game: "Blox Fruits",
    price: "₱1,200",
    image: "/blox-fruits-zoan-tier.jpg",
    seller: "TradeMaster",
    vouch: 156,
    featured: true,
  },
  {
    id: 4,
    title: "Pet Simulator X Huge Pets Bundle",
    game: "Pet Simulator X",
    price: "₱3,800",
    image: "/pet-simulator-x-huge-pets-bundle.jpg",
    seller: "CasualPlayer",
    vouch: 23,
    featured: false,
  },
]

export default function FeaturedListings() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {mockListings.map((listing) => (
        <Link key={listing.id} href={`/listing/${listing.id}`}>
          <Card className="overflow-hidden hover:shadow-lg transition-all duration-300 cursor-pointer group h-full">
            {/* Image */}
            <div className="relative h-48 bg-muted overflow-hidden">
              <img
                src={listing.image || "/placeholder.svg"}
                alt={listing.title}
                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
              />
              {listing.featured && (
                <Badge className="absolute top-3 right-3 bg-primary text-primary-foreground">Featured</Badge>
              )}
            </div>

            {/* Content */}
            <div className="p-4">
              <h3 className="font-bold line-clamp-2 mb-2 group-hover:text-primary transition">{listing.title}</h3>

              <p className="text-sm text-muted-foreground mb-3">{listing.game}</p>

              {/* Price */}
              <div className="mb-3">
                <p className="text-2xl font-bold text-primary">{listing.price}</p>
              </div>

              {/* Seller Info */}
              <div className="flex items-center justify-between text-sm mb-4 pb-4 border-b">
                <span className="text-muted-foreground">{listing.seller}</span>
                <div className="flex items-center gap-1">
                  <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                  <span className="font-semibold">{listing.vouch}</span>
                </div>
              </div>

              {/* Contact Button */}
              <button className="w-full flex items-center justify-center gap-2 py-2 rounded-md bg-primary/10 text-primary hover:bg-primary/20 transition text-sm font-medium">
                <MessageCircle className="w-4 h-4" />
                Message
              </button>
            </div>
          </Card>
        </Link>
      ))}
    </div>
  )
}
