import { ChevronDown } from "lucide-react"
import { FaqJsonLd } from "@/components/json-ld"
import type { FaqEntry } from "@/lib/seo-content"
import { cn } from "@/lib/utils"

/**
 * Questions and answers as native <details>, so every answer is in the HTML (readable by
 * crawlers and AI answer engines) while staying collapsed for people. Emits matching
 * FAQPage data unless `structuredData` is false, e.g. when a page already has one.
 */
export function FaqSection({
  entries,
  title = "Frequently asked questions",
  structuredData = true,
  className,
}: {
  entries: FaqEntry[]
  title?: string
  structuredData?: boolean
  className?: string
}) {
  return (
    <div className={cn("mx-auto w-full max-w-[860px]", className)}>
      {structuredData && <FaqJsonLd entries={entries} />}
      {title && <h2 className="text-section mb-6">{title}</h2>}
      <div className="divide-y divide-white/[0.08] overflow-hidden rounded-[20px] bg-card">
        {entries.map((entry) => (
          <details key={entry.question} className="group">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 text-[16px] font-semibold md:px-6 [&::-webkit-details-marker]:hidden">
              <h3>{entry.question}</h3>
              <ChevronDown
                className="size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180"
                strokeWidth={1.75}
                aria-hidden
              />
            </summary>
            <p className="px-5 pb-5 text-[15px] leading-relaxed text-muted-foreground md:px-6">{entry.answer}</p>
          </details>
        ))}
      </div>
    </div>
  )
}
