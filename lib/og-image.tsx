import { ImageResponse } from "next/og"

export const OG_SIZE = { width: 1200, height: 630 }

interface OgImageOptions {
  eyebrow: string
  title: string
  subtitle?: string
  /** Accent for the eyebrow and glow: blue by default, red for scam records */
  accent?: string
  footer?: string
}

/** Social preview card in the Pro Dark style: black canvas, white headline, one soft glow. */
export function renderOgImage({ eyebrow, title, subtitle, accent = "#2997ff", footer = "rbmarket.app" }: OgImageOptions) {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#000000",
          backgroundImage: `radial-gradient(circle at 85% 20%, ${accent}40 0%, transparent 45%)`,
          color: "#f5f5f7",
          padding: "72px",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "14px", fontSize: 30, fontWeight: 600 }}>
          <div
            style={{
              width: "46px",
              height: "46px",
              borderRadius: "12px",
              background: "#f5f5f7",
              color: "#000000",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: 800,
              fontSize: 26,
            }}
          >
            rb
          </div>
          RbMarket
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "20px", maxWidth: "1000px" }}>
          <div style={{ fontSize: 28, fontWeight: 600, color: accent }}>{eyebrow}</div>
          <div style={{ fontSize: 72, fontWeight: 700, lineHeight: 1.04, letterSpacing: "-0.03em" }}>{title}</div>
          {subtitle && <div style={{ fontSize: 30, lineHeight: 1.3, color: "#a1a1a6" }}>{subtitle}</div>}
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 24, color: "#a1a1a6" }}>
          <span>{footer}</span>
          <span>GCash · PayPal · Prices in PHP</span>
        </div>
      </div>
    ),
    OG_SIZE,
  )
}
