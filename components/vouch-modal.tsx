"use client"

import { useState } from "react"
import { X, Star } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"

export default function VouchModal({ seller, listing, onClose, onSubmit }) {
  const [rating, setRating] = useState(5)
  const [comment, setComment] = useState("")
  const [hoveredRating, setHoveredRating] = useState(0)

  const handleSubmit = () => {
    onSubmit({
      rating,
      comment,
      seller,
      listing,
    })
  }

  return (
    <>
      {/* Overlay */}
      <div className="fixed inset-0 bg-black/50 z-40" onClick={onClose} />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b">
            <h2 className="text-2xl font-bold">Vouch for {seller.username}</h2>
            <button onClick={onClose} className="p-2 hover:bg-muted rounded-lg transition">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 space-y-6">
            {/* Listing Info */}
            <div className="bg-muted/50 p-4 rounded-lg flex items-center gap-3">
              <img
                src={listing.image || "/placeholder.svg"}
                alt={listing.title}
                className="w-12 h-12 rounded object-cover"
              />
              <div>
                <p className="font-semibold text-sm">{listing.title}</p>
                <p className="text-xs text-muted-foreground">₱{listing.price.toLocaleString()}</p>
              </div>
            </div>

            {/* Rating */}
            <div>
              <label className="text-sm font-semibold mb-3 block">Rate this seller</label>
              <div className="flex gap-2 justify-center">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    onMouseEnter={() => setHoveredRating(star)}
                    onMouseLeave={() => setHoveredRating(0)}
                    onClick={() => setRating(star)}
                    className="transition"
                  >
                    <Star
                      className={`w-8 h-8 transition ${
                        star <= (hoveredRating || rating) ? "fill-yellow-400 text-yellow-400" : "text-muted"
                      }`}
                    />
                  </button>
                ))}
              </div>
            </div>

            {/* Comment */}
            <div>
              <label className="text-sm font-semibold mb-2 block">Comment (Optional)</label>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Share your experience with this seller..."
                className="w-full px-3 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                rows={4}
              />
              <p className="text-xs text-muted-foreground mt-1">{comment.length}/500 characters</p>
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1 bg-transparent" onClick={onClose}>
                Cancel
              </Button>
              <Button className="flex-1" onClick={handleSubmit}>
                Submit Vouch
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </>
  )
}
