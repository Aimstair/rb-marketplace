"use client"

import Navigation from "@/components/navigation"
import { useAuth } from "@/lib/auth-context"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { Check, Zap, Crown, Star, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { upgradeSubscription, getMySubscription } from "@/app/actions/subscriptions"

export default function SubscriptionsPage() {
  const { user } = useAuth()
  const router = useRouter()
  const { toast } = useToast()
  const [currentPlan, setCurrentPlan] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [upgrading, setUpgrading] = useState<string | null>(null)

  // Load current subscription on mount
  useEffect(() => {
    if (!user) {
      router.push("/auth/login")
      return
    }

    const loadSubscription = async () => {
      try {
        const result = await getMySubscription(user.id)
        if (result.success && result.data) {
          setCurrentPlan(result.data.tier.toLowerCase())
        }
      } catch (err) {
        console.error("Failed to load subscription:", err)
      } finally {
        setLoading(false)
      }
    }

    loadSubscription()
  }, [user, router])

  const handleUpgrade = async (tier: "PRO" | "ELITE") => {
    if (!user) return

    try {
      setUpgrading(tier)
      const result = await upgradeSubscription(user.id, tier)

      if (result.success) {
        setCurrentPlan(tier.toLowerCase())
        toast({
          title: "Success",
          description: `Upgraded to ${tier} plan! You will have access to all premium features.`,
        })
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to upgrade subscription",
          variant: "destructive",
        })
      }
    } catch (err) {
      console.error("Upgrade failed:", err)
      toast({
        title: "Error",
        description: "Failed to process upgrade. Please try again.",
        variant: "destructive",
      })
    } finally {
      setUpgrading(null)
    }
  }

  if (!user) return null

  return (
    <>
      <Navigation />
      <main className="container max-w-[1920px] mx-auto px-6 py-8">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-3xl font-bold mb-2 text-center">Subscriptions & Boosts</h1>
          <p className="text-muted-foreground mb-8 text-center">Upgrade your account for better visibility and features</p>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Free Plan */}
                <Card className="p-6 relative">
                  <h2 className="text-2xl font-bold mb-2">Free</h2>
                  <p className="text-muted-foreground mb-6">Perfect to get started</p>
                  <div className="mb-8">
                    <p className="text-3xl font-bold mb-4">
                      ₱0<span className="text-sm text-muted-foreground">/month</span>
                    </p>
                  </div>
                  <Button
                    variant={currentPlan === "free" ? "secondary" : "outline"}
                    className="w-full mb-6"
                    disabled={currentPlan === "free"}
                  >
                    {currentPlan === "free" ? "Current Plan" : "Downgrade"}
                  </Button>
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Check className="w-5 h-5 text-green-500" />
                      <span className="text-sm font-medium">3 Listings</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Check className="w-5 h-5 text-green-500" />
                      <span className="text-sm">Basic profile</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Check className="w-5 h-5 text-green-500" />
                      <span className="text-sm">Standard search visibility</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Check className="w-5 h-5 text-green-500" />
                      <span className="text-sm">Standard support</span>
                    </div>
                  </div>
                </Card>

                {/* Pro Plan */}
                <Card className="p-6 relative border-primary border-2">
                  <Badge className="absolute -top-3 left-6">Most Popular</Badge>
                  <h2 className="text-2xl font-bold mb-2">Pro</h2>
                  <p className="text-muted-foreground mb-6">For active traders</p>
                  <div className="mb-8">
                    <p className="text-3xl font-bold mb-4">
                      ₱199<span className="text-sm text-muted-foreground">/month</span>
                    </p>
                  </div>
                  <Button
                    className="w-full mb-6"
                    variant={currentPlan === "pro" ? "secondary" : "default"}
                    disabled={currentPlan === "pro" || upgrading === "PRO"}
                    onClick={() => handleUpgrade("PRO")}
                  >
                    {upgrading === "PRO" ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Processing...
                      </>
                    ) : currentPlan === "pro" ? (
                      "Current Plan"
                    ) : (
                      <>
                        <Zap className="w-4 h-4 mr-2" />
                        Upgrade to Pro
                      </>
                    )}
                  </Button>
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Check className="w-5 h-5 text-green-500" />
                      <span className="text-sm font-medium">Up to 10 listings</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Star className="w-5 h-5 text-amber-500" />
                      <span className="text-sm font-medium">1 Featured Listing</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Check className="w-5 h-5 text-green-500" />
                      <span className="text-sm">Priority messaging</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Check className="w-5 h-5 text-green-500" />
                      <span className="text-sm">Enhanced visibility</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs bg-primary/10 text-primary border-primary/20">
                        Featured badge
                      </Badge>
                    </div>
                  </div>
                </Card>

                {/* Elite Plan */}
                <Card className="p-6 relative bg-gradient-to-b from-amber-500/5 to-transparent border-amber-500/30">
                  <Badge className="absolute -top-3 left-6 bg-amber-500 text-white">Best Value</Badge>
                  <h2 className="text-2xl font-bold mb-2">Elite</h2>
                  <p className="text-muted-foreground mb-6">For professional sellers</p>
                  <div className="mb-8">
                    <p className="text-3xl font-bold mb-4">
                      ₱499<span className="text-sm text-muted-foreground">/month</span>
                    </p>
                  </div>
                  <Button
                    variant={currentPlan === "elite" ? "secondary" : "outline"}
                    className="w-full mb-6"
                    disabled={currentPlan === "elite" || upgrading === "ELITE"}
                    onClick={() => handleUpgrade("ELITE")}
                  >
                    {upgrading === "ELITE" ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Processing...
                      </>
                    ) : currentPlan === "elite" ? (
                      "Current Plan"
                    ) : (
                      <>
                        <Crown className="w-4 h-4 mr-2" />
                        Upgrade to Elite
                      </>
                    )}
                  </Button>
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Check className="w-5 h-5 text-green-500" />
                      <span className="text-sm font-medium">Up to 30 listings</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Star className="w-5 h-5 text-amber-500" />
                      <span className="text-sm font-medium">3 Featured Listings</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Check className="w-5 h-5 text-green-500" />
                      <span className="text-sm">Priority support</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Check className="w-5 h-5 text-green-500" />
                      <span className="text-sm">Top visibility</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs bg-amber-500/10 text-amber-600 border-amber-500/20">
                        Elite badge
                      </Badge>
                    </div>
                  </div>
                </Card>
              </div>
            </>
          )}

          {/* Feature Comparison */}
          <Card className="mt-8 p-6">
            <h3 className="text-xl font-bold mb-4">Feature Comparison</h3>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4">Feature</th>
                    <th className="text-center py-3 px-4">Free</th>
                    <th className="text-center py-3 px-4">Pro</th>
                    <th className="text-center py-3 px-4">Elite</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b">
                    <td className="py-3 px-4">Listings</td>
                    <td className="text-center py-3 px-4">3</td>
                    <td className="text-center py-3 px-4">10</td>
                    <td className="text-center py-3 px-4">30</td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-3 px-4">Featured Listings</td>
                    <td className="text-center py-3 px-4">-</td>
                    <td className="text-center py-3 px-4">1</td>
                    <td className="text-center py-3 px-4">3</td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-3 px-4">Profile Badge</td>
                    <td className="text-center py-3 px-4">-</td>
                    <td className="text-center py-3 px-4">
                      <Badge variant="outline" className="text-xs">
                        Featured
                      </Badge>
                    </td>
                    <td className="text-center py-3 px-4">
                      <Badge className="text-xs bg-amber-500">Elite</Badge>
                    </td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-3 px-4">Search Visibility</td>
                    <td className="text-center py-3 px-4">Standard</td>
                    <td className="text-center py-3 px-4">Enhanced</td>
                    <td className="text-center py-3 px-4">Top</td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-3 px-4">Messaging</td>
                    <td className="text-center py-3 px-4">Standard</td>
                    <td className="text-center py-3 px-4">Priority</td>
                    <td className="text-center py-3 px-4">Priority</td>
                  </tr>
                  <tr>
                    <td className="py-3 px-4">Support</td>
                    <td className="text-center py-3 px-4">Standard</td>
                    <td className="text-center py-3 px-4">Standard</td>
                    <td className="text-center py-3 px-4">Priority</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      </main>
    </>
  )
}
