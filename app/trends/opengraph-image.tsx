import { ImageResponse } from "next/og"

export const size = {
  width: 1200,
  height: 630,
}

export const contentType = "image/png"
export const alt = "RbMarket trends and pricing insights"

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "linear-gradient(140deg, #111827 0%, #0f766e 52%, #22d3ee 100%)",
          color: "#f8fafc",
          padding: "64px",
        }}
      >
        <div style={{ fontSize: 30, opacity: 0.95 }}>RbMarket Trends</div>

        <div style={{ display: "flex", flexDirection: "column", gap: "18px", maxWidth: "980px" }}>
          <div style={{ fontSize: 66, fontWeight: 800, lineHeight: 1.04 }}>
            Market Signals for Smarter Roblox Trades
          </div>
          <div style={{ fontSize: 31, lineHeight: 1.25, opacity: 0.92 }}>
            Track price moves, active traders, demand shifts, and listing momentum in one dashboard.
          </div>
        </div>

        <div style={{ fontSize: 24, opacity: 0.88 }}>rbmarket.app/trends</div>
      </div>
    ),
    size
  )
}
