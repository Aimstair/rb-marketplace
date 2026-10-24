import { OG_SIZE, renderOgImage } from "@/lib/og-image"

export const size = OG_SIZE
export const contentType = "image/png"
export const alt = "RbMarket Hall of Shame scam records"

export default function Image() {
  return renderOgImage({
    eyebrow: "Hall of Shame",
    title: "Check a trader before you pay.",
    subtitle: "Moderated scam reports with aliases, Roblox usernames and GCash numbers.",
    accent: "#ff453a",
  })
}
