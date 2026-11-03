"use client"

import type React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { getMyListingSlot } from "@/app/actions/listings-management"
import type { ListingSlot } from "@/lib/listing-limits"
import { ToastAction } from "@/components/ui/toast"
import { toast } from "@/hooks/use-toast"

// One in-flight or recent lookup shared by every Sell link on the page. Started on hover/focus
// so the click is usually instant; refreshed after a short while so hiding a listing elsewhere
// is picked up.
const FRESH_MS = 15_000
let cached: { at: number; promise: Promise<ListingSlot | null> } | null = null

function loadSlot() {
  if (!cached || Date.now() - cached.at > FRESH_MS) {
    const promise = getMyListingSlot().catch(() => null)
    cached = { at: Date.now(), promise }
  }
  return cached.promise
}

export function showListingLimitToast(slot: ListingSlot, onUpgrade: () => void) {
  toast({
    variant: "destructive",
    title: `Listing limit reached (${slot.active}/${slot.max})`,
    action: slot.upgrade ? (
      <ToastAction altText={`Upgrade to ${slot.upgrade.plan}`} onClick={onUpgrade}>
        Upgrade
      </ToastAction>
    ) : undefined,
  })
}

/**
 * A link to /sell that checks the seller's plan limit first: at the limit it stays put and
 * shows a toast with an upgrade action instead of opening a form they can't submit.
 * Signed-out visitors go straight through (the sell page sends them to log in).
 */
export function SellLink({
  children,
  onClick,
  onPointerEnter,
  onFocus,
  ...props
}: Omit<React.ComponentProps<typeof Link>, "href"> & { href?: string }) {
  const router = useRouter()
  const href = props.href ?? "/sell"

  return (
    <Link
      {...props}
      href={href}
      onPointerEnter={(e) => {
        loadSlot()
        onPointerEnter?.(e)
      }}
      onFocus={(e) => {
        loadSlot()
        onFocus?.(e)
      }}
      onClick={async (e) => {
        onClick?.(e)
        if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return
        e.preventDefault()

        const slot = await loadSlot()
        if (slot && slot.active >= slot.max) {
          cached = null
          showListingLimitToast(slot, () => router.push("/subscriptions"))
          return
        }
        router.push(href)
      }}
    >
      {children}
    </Link>
  )
}
