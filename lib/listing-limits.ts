import { prisma } from "@/lib/prisma"
import { DEFAULT_SUBSCRIPTION_LIMITS } from "@/lib/subscription-utils"

export interface ListingLimits {
  free: number
  pro: number
  elite: number
}

const SETTING_KEYS = ["max_listings_free", "max_listings_pro", "max_listings_elite"] as const

/** Per-plan listing limits from admin settings, falling back to the published plan limits. */
export async function getListingLimits(): Promise<ListingLimits> {
  const settings = await prisma.systemSettings.findMany({ where: { key: { in: [...SETTING_KEYS] } } })
  const read = (key: (typeof SETTING_KEYS)[number], fallback: number) => {
    const value = parseInt(settings.find((s) => s.key === key)?.value ?? "", 10)
    return Number.isFinite(value) && value >= 0 ? value : fallback
  }

  return {
    free: read("max_listings_free", DEFAULT_SUBSCRIPTION_LIMITS.FREE.maxListings),
    pro: read("max_listings_pro", DEFAULT_SUBSCRIPTION_LIMITS.PRO.maxListings),
    elite: read("max_listings_elite", DEFAULT_SUBSCRIPTION_LIMITS.ELITE.maxListings),
  }
}

export function limitForTier(tier: string | null | undefined, limits: ListingLimits): number {
  const normalized = (tier ?? "FREE").toUpperCase()
  if (normalized === "ELITE") return limits.elite
  if (normalized === "PRO") return limits.pro
  return limits.free
}

/**
 * Listings that use up a plan slot: visible ("available") item and currency listings.
 * Hidden, sold, deleted and banned listings don't count.
 */
export async function countActiveListings(sellerId: string): Promise<number> {
  const [items, currencies] = await Promise.all([
    prisma.itemListing.count({ where: { sellerId, status: "available" } }),
    prisma.currencyListing.count({ where: { sellerId, status: "available" } }),
  ])
  return items + currencies
}

export interface ListingSlot {
  active: number
  max: number
  /** Plan name for display, e.g. "Free" */
  plan: string
  /** The plan to upgrade to for more listings, if any */
  upgrade: { plan: string; max: number } | null
}

/** How many listings the seller is using against their plan, and what upgrading would give. */
export async function getListingSlot(sellerId: string, tier: string | null | undefined): Promise<ListingSlot> {
  const [limits, active] = await Promise.all([getListingLimits(), countActiveListings(sellerId)])
  const normalized = (tier ?? "FREE").toUpperCase()
  return {
    active,
    max: limitForTier(normalized, limits),
    plan: normalized === "ELITE" ? "Elite" : normalized === "PRO" ? "Pro" : "Free",
    upgrade:
      normalized === "ELITE" ? null : normalized === "PRO" ? { plan: "Elite", max: limits.elite } : { plan: "Pro", max: limits.pro },
  }
}

/** Whether the seller can make one more listing visible, with an error message when not. */
export async function checkListingSlot(
  sellerId: string,
  tier: string | null | undefined,
): Promise<{ allowed: true } | { allowed: false; error: string }> {
  const slot = await getListingSlot(sellerId, tier)
  if (slot.active < slot.max) return { allowed: true }

  return {
    allowed: false,
    error:
      `You're using ${slot.active} of ${slot.max} active listings on the ${slot.plan} plan. ` +
      (slot.upgrade
        ? `Hide or delete a listing, or upgrade to ${slot.upgrade.plan} for up to ${slot.upgrade.max}.`
        : "Hide or delete a listing to add another."),
  }
}
