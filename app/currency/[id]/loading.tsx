"use client"

import { Skeleton } from "@/components/ui/skeleton"
import { Card } from "@/components/ui/card"

export default function CurrencyListingLoading() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column */}
          <div className="lg:col-span-2">
            <Skeleton className="w-full h-96 rounded-lg mb-6" />
            <div className="flex gap-2 mb-6">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="w-20 h-20 rounded-lg" />
              ))}
            </div>

            <div className="grid grid-cols-2 gap-4 mb-6">
              {[1, 2, 3, 4].map((i) => (
                <Card key={i} className="p-4">
                  <Skeleton className="h-6 mb-2" />
                  <Skeleton className="h-4" />
                </Card>
              ))}
            </div>

            <Card className="p-6 mb-6">
              <Skeleton className="h-6 mb-4" />
              <Skeleton className="h-4 mb-2" />
              <Skeleton className="h-4" />
            </Card>
          </div>

          {/* Right Column */}
          <div className="lg:col-span-1">
            <Skeleton className="w-full h-32 rounded-lg mb-6" />
            <div className="space-y-3 mb-6">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="w-full h-10" />
              ))}
            </div>

            <Card className="p-6">
              <Skeleton className="w-16 h-16 rounded-full mb-4" />
              <Skeleton className="h-4 mb-2" />
              <Skeleton className="h-4" />
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
