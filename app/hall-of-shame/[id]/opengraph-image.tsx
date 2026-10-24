import { OG_SIZE, renderOgImage } from "@/lib/og-image"
import { prisma } from "@/lib/prisma"

export const size = OG_SIZE

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

  return renderOgImage({
    eyebrow: "Hall of Shame record",
    title: alias,
    subtitle: summary,
    accent: "#ff453a",
  })
}
