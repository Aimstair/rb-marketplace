/**
 * Utility functions for subscription management
 */

// Default limits (fallback if system settings not available)
export const DEFAULT_SUBSCRIPTION_LIMITS = {
  FREE: { maxListings: 10, featuredListings: 0 },
  PRO: { maxListings: 50, featuredListings: 1 },
  ELITE: { maxListings: 100, featuredListings: 3 },
} as const

export type SubscriptionTier = keyof typeof DEFAULT_SUBSCRIPTION_LIMITS

export function getSubscriptionLimits(tier: string, customLimits?: { free?: number; pro?: number; elite?: number }) {
  const normalizedTier = tier.toUpperCase() as SubscriptionTier
  
  // If custom limits provided (from system settings), use those
  if (customLimits) {
    const maxListings = 
      normalizedTier === "ELITE" ? (customLimits.elite ?? DEFAULT_SUBSCRIPTION_LIMITS.ELITE.maxListings) :
      normalizedTier === "PRO" ? (customLimits.pro ?? DEFAULT_SUBSCRIPTION_LIMITS.PRO.maxListings) :
      (customLimits.free ?? DEFAULT_SUBSCRIPTION_LIMITS.FREE.maxListings)
    
    const featuredListings = DEFAULT_SUBSCRIPTION_LIMITS[normalizedTier]?.featuredListings ?? 0
    
    return { maxListings, featuredListings }
  }
  
  // Otherwise use defaults
  return DEFAULT_SUBSCRIPTION_LIMITS[normalizedTier] || DEFAULT_SUBSCRIPTION_LIMITS.FREE
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
