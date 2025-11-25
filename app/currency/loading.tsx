import { Card } from "@/components/ui/card"

export default function Loading() {
  return (
    <div className="min-h-screen bg-background">
      <div className="bg-gradient-to-r from-primary/10 to-primary/5 py-12">
        <div className="container mx-auto px-4">
          <div className="h-10 bg-muted rounded w-48 mb-4 animate-pulse" />
          <div className="h-6 bg-muted rounded w-96 animate-pulse" />
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-1">
            <Card className="p-6 space-y-6">
              <div className="h-8 bg-muted rounded animate-pulse" />
              <div className="h-10 bg-muted rounded animate-pulse" />
              <div className="space-y-2">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="h-8 bg-muted rounded animate-pulse" />
                ))}
              </div>
            </Card>
          </div>

          <div className="lg:col-span-3 space-y-4">
            {[...Array(5)].map((_, i) => (
              <Card key={i} className="p-4 h-32 bg-muted animate-pulse" />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
