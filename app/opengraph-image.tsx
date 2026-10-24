import { OG_SIZE, renderOgImage } from "@/lib/og-image"

export const size = OG_SIZE
export const contentType = "image/png"
export const alt = "RbMarket, the Roblox marketplace in the Philippines"

export default function Image() {
  return renderOgImage({
    eyebrow: "The Roblox marketplace in the Philippines",
    title: "Buy and sell Roblox items with trust.",
    subtitle: "Vouched sellers, prices in pesos, and a public scammer list.",
  })
}
