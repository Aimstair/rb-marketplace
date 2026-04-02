import { ImageResponse } from "next/og"

export const size = {
  width: 1200,
  height: 630,
}

export const contentType = "image/png"
export const alt = "RbMarket Hall of Shame scam records"

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
          background: "linear-gradient(135deg, #3f1d1d 0%, #7f1d1d 45%, #b91c1c 100%)",
          color: "#fff1f2",
          padding: "64px",
        }}
      >
        <div style={{ fontSize: 30, opacity: 0.95 }}>RbMarket Safety Center</div>

        <div style={{ display: "flex", flexDirection: "column", gap: "18px", maxWidth: "980px" }}>
          <div style={{ fontSize: 64, fontWeight: 800, lineHeight: 1.05 }}>
            Hall of Shame Records and Scam Signals
          </div>
          <div style={{ fontSize: 31, lineHeight: 1.25, opacity: 0.9 }}>
            Review aliases, payment identifiers, and incident reports before you trade.
          </div>
        </div>

        <div style={{ fontSize: 24, opacity: 0.86 }}>rbmarket.app/hall-of-shame</div>
      </div>
    ),
    size
  )
}
