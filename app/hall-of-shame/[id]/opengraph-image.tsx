import { ImageResponse } from "next/og"
import { prisma } from "@/lib/prisma"

export const size = {
  width: 1200,
  height: 630,
}

export const contentType = "image/png"

function makeSnippet(value: string | null | undefined, maxLength = 160): string {
  const trimmed = (value || "").trim()
  if (!trimmed) {
    return "Community incident report and safety details."
  }

  if (trimmed.length <= maxLength) {
    return trimmed
  }

  return `${trimmed.slice(0, maxLength)}...`
}

export default async function Image({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const hallTable = (prisma as any).hallOfShameEntry

  const entry = await hallTable.findFirst({
    where: {
      id,
      status: "APPROVED",
    },
    include: {
      aliases: {
        select: { alias: true },
        orderBy: { createdAt: "asc" },
      },
    },
  })

  const alias = (entry?.aliases || [])[0]?.alias || "Incident Record"
  const summary = makeSnippet(entry?.incidentSummary)

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "linear-gradient(135deg, #111827 0%, #7f1d1d 55%, #dc2626 100%)",
          color: "#fff7ed",
          padding: "64px",
        }}
      >
        <div style={{ fontSize: 30, opacity: 0.94 }}>RbMarket Hall of Shame</div>

        <div style={{ display: "flex", flexDirection: "column", gap: "18px", maxWidth: "1000px" }}>
          <div style={{ fontSize: 62, fontWeight: 800, lineHeight: 1.05 }}>{alias}</div>
          <div style={{ fontSize: 30, lineHeight: 1.26, opacity: 0.9 }}>{summary}</div>
        </div>

        <div style={{ fontSize: 24, opacity: 0.86 }}>Incident detail and verification context</div>
      </div>
    ),
    size
  )
}
