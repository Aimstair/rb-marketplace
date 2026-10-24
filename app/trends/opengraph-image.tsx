import { OG_SIZE, renderOgImage } from "@/lib/og-image"

export const size = OG_SIZE
export const contentType = "image/png"
export const alt = "RbMarket Roblox price trends"

export default function Image() {
  return renderOgImage({
    eyebrow: "Price trends",
    title: "What Roblox items are selling for.",
    subtitle: "Listings, prices and popular games on RbMarket, updated daily.",
  })
}
