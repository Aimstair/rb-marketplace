import type React from "react"
import Link from "next/link"
import { cn } from "@/lib/utils"

/** Page-width wrapper shared by every screen, so all content lines up with the header. */
export function Container({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn("mx-auto w-full max-w-[1440px] px-5 md:px-8 lg:px-10", className)}
      {...props}
    />
  )
}

/** Vertical section rhythm, optionally on the raised surface band. */
export function Section({
  surface,
  className,
  ...props
}: React.ComponentProps<"section"> & { surface?: boolean }) {
  return <section className={cn("py-14 md:py-20", surface && "bg-surface", className)} {...props} />
}

/** Section title with an optional "See all ›" link. */
export function SectionHeader({
  title,
  href,
  linkLabel = "See all",
  className,
}: {
  title: React.ReactNode
  href?: string
  linkLabel?: string
  className?: string
}) {
  return (
    <div className={cn("mb-5 flex items-baseline justify-between gap-4", className)}>
      <h2 className="text-section">{title}</h2>
      {href && (
        <Link href={href} className="shrink-0 text-[15px] text-link hover:underline underline-offset-2">
          {linkLabel} ›
        </Link>
      )}
    </div>
  )
}
