/**
 * Utility functions for subscription management
 */

export const SUBSCRIPTION_LIMITS = {
  FREE: { maxListings: 3, featuredListings: 0 },
  PRO: { maxListings: 10, featuredListings: 1 },
  ELITE: { maxListings: 30, featuredListings: 3 },
} as const

export type SubscriptionTier = keyof typeof SUBSCRIPTION_LIMITS

export function getSubscriptionLimits(tier: string) {
  const normalizedTier = tier.toUpperCase() as SubscriptionTier
  return SUBSCRIPTION_LIMITS[normalizedTier] || SUBSCRIPTION_LIMITS.FREE
}

export function getSubscriptionBadge(tier: string) {
  const normalizedTier = tier.toUpperCase()
  
  switch (normalizedTier) {
    case "PRO":
      return {
        label: "Pro",
        variant: "default" as const,
        className: "bg-blue-500 hover:bg-blue-600 text-white",
      }
    case "ELITE":
      return {
        label: "Elite",
        variant: "default" as const,
        className: "bg-amber-500 hover:bg-amber-600 text-white",
      }
    default:
      return null
  }
}

export function isSubscriptionActive(tier: string, status: string, endsAt: Date | null): boolean {
  if (tier === "FREE") return true
  if (status !== "ACTIVE") return false
  if (!endsAt) return false
  return new Date(endsAt) > new Date()
}
