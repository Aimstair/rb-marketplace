import { ImageResponse } from "next/og"

export const size = {
  width: 1200,
  height: 630,
}

export const contentType = "image/png"
export const alt = "RbMarket - Roblox marketplace for trusted trading"

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
          background: "linear-gradient(135deg, #0f172a 0%, #1e293b 45%, #0ea5e9 100%)",
          color: "#f8fafc",
          padding: "64px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "16px", fontSize: 30, opacity: 0.95 }}>
          <div
            style={{
              width: "44px",
              height: "44px",
              borderRadius: "12px",
              background: "#38bdf8",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#082f49",
              fontWeight: 800,
            }}
          >
            R
          </div>
          RbMarket
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "18px", maxWidth: "980px" }}>
          <div style={{ fontSize: 68, fontWeight: 800, lineHeight: 1.04 }}>
            Trade Roblox Items and Currency with Confidence
          </div>
          <div style={{ fontSize: 32, lineHeight: 1.25, opacity: 0.92 }}>
            Trusted sellers, live listings, community vouches, and safer peer-to-peer transactions.
          </div>
        </div>

        <div style={{ fontSize: 24, opacity: 0.88 }}>rbmarket.app</div>
      </div>
    ),
    size
  )
}
