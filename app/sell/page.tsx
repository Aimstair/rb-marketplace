import type { Metadata } from "next"
import { redirect } from "next/navigation"
import { auth } from "@/auth"
import { getSellOptions } from "@/lib/games"
import { SellForm } from "./sell-form"

export const metadata: Metadata = {
  title: "Sell Roblox items",
  robots: { index: false, follow: false },
}

export default async function SellPage() {
  const session = await auth()
  if (!session?.user) {
    redirect("/auth/login?redirect=/sell")
  }

  // Loaded with the page so the game, type and currency pickers are filled on first paint
  const games = await getSellOptions()

  return <SellForm games={games} />
}
