"use client"

import { useState, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"
import { Star, MessageCircle, Loader2 } from "lucide-react"
import { getTrendingListings } from "@/app/actions/trends"

interface TrendingListing {
  id: string
  title: string
  game: string
  price: number
  image: string
  seller: {
    username: string
    vouch: number
  }
  views: number
  vouchCount: number
}

export default function FeaturedListings() {
  const [listings, setListings] = useState<TrendingListing[]>([])
  const [loading, setLoading] = useState(true)

  // Load trending listings on mount
  useEffect(() => {
    const loadListings = async () => {
      try {
        const result = await getTrendingListings(4)
        if (result.success && result.data) {
          setListings(result.data)
        }
      } catch (err) {
        console.error("Failed to load trending listings:", err)
      } finally {
        setLoading(false)
      }
    }

    loadListings()
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!listings.length) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">No listings available yet</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {listings.map((listing) => (
        <Link key={listing.id} href={`/listing/${listing.id}`}>
          <Card className="overflow-hidden hover:shadow-lg transition-all duration-300 cursor-pointer group h-full">
            {/* Image */}
            <div className="relative h-48 bg-muted overflow-hidden">
              <img
                src={listing.image || "/placeholder.svg"}
                alt={listing.title}
                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
              />
              <Badge className="absolute top-3 right-3 bg-primary text-primary-foreground">
                {listing.views} views
              </Badge>
            </div>

            {/* Content */}
            <div className="p-4">
              <h3 className="font-bold line-clamp-2 mb-2 group-hover:text-primary transition">{listing.title}</h3>

              <p className="text-sm text-muted-foreground mb-3">{listing.game}</p>

              {/* Price */}
              <div className="mb-3">
                <p className="text-2xl font-bold text-primary">₱{listing.price.toLocaleString()}</p>
              </div>

              {/* Seller Info */}
              <div className="flex items-center justify-between text-sm mb-4 pb-4 border-b">
                <span className="text-muted-foreground">{listing.seller.username}</span>
                <div className="flex items-center gap-1">
                  <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                  <span className="font-semibold">{listing.seller.vouch}</span>
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
