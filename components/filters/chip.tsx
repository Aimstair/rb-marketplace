"use client"

import type React from "react"
import { cn } from "@/lib/utils"

/** Pill-shaped filter chip. Selected chips invert to white on black. */
export function Chip({
  selected,
  className,
  ...props
}: React.ComponentProps<"button"> & { selected?: boolean }) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      className={cn(
        "inline-flex h-9 shrink-0 items-center gap-2 whitespace-nowrap rounded-full px-4 text-sm font-medium transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring",
        selected ? "bg-foreground text-background" : "bg-secondary text-foreground hover:bg-[#3a3a3c]",
        className,
      )}
      {...props}
    />
  )
}

/** Horizontally scrolling chip row that bleeds to the screen edge on mobile. */
export function ChipRow({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <div className={cn("no-scrollbar -mx-5 flex gap-2 overflow-x-auto px-5 md:mx-0 md:px-0", className)}>
      {children}
    </div>
  )
}

/** iOS-style segmented control. */
export function Segmented<T extends string>({
  value,
  options,
  onChange,
  className,
}: {
  value: T
  options: { value: T; label: string }[]
  onChange: (value: T) => void
  className?: string
}) {
  return (
    <div role="tablist" className={cn("inline-flex rounded-full bg-secondary p-[3px] text-sm font-medium", className)}>
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          role="tab"
          aria-selected={value === opt.value}
          onClick={() => onChange(opt.value)}
          className={cn(
            "rounded-full px-4 py-1.5 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring",
            value === opt.value ? "bg-[#48484a] text-foreground" : "text-muted-foreground hover:text-foreground",
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}
