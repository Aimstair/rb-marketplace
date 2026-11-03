import type { Metadata } from "next"
import { redirect } from "next/navigation"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { getSellOptions } from "@/lib/games"
import { getListingSlot } from "@/lib/listing-limits"
import { SellForm } from "./sell-form"

export const metadata: Metadata = {
  title: "Sell Roblox items",
  robots: { index: false, follow: false },
}

export default async function SellPage() {
  const session = await auth()
  if (!session?.user?.email) {
    redirect("/auth/login?redirect=/sell")
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true, subscriptionTier: true },
  })
  if (!user) {
    redirect("/auth/login?redirect=/sell")
  }

  // Loaded with the page so the game, type and currency pickers are filled on first paint,
  // and a seller at their plan's limit sees it before filling in the form
  const [games, slot] = await Promise.all([getSellOptions(), getListingSlot(user.id, user.subscriptionTier)])

  return <SellForm games={games} slot={slot} />
}
