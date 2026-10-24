"use client"

import type React from "react"
import { Search, X } from "lucide-react"
import { cn } from "@/lib/utils"

/** Large pill search field used in heroes and page headers. */
export function SearchInput({
  value,
  onValueChange,
  className,
  size = "default",
  ...props
}: Omit<React.ComponentProps<"input">, "size" | "onChange" | "value"> & {
  value: string
  onValueChange: (value: string) => void
  size?: "default" | "lg"
}) {
  return (
    <div className={cn("relative w-full", className)}>
      <Search
        className={cn(
          "pointer-events-none absolute top-1/2 -translate-y-1/2 text-muted-foreground",
          size === "lg" ? "left-5 size-5" : "left-4 size-4",
        )}
        strokeWidth={1.5}
      />
      <input
        type="search"
        value={value}
        onChange={(e) => onValueChange(e.target.value)}
        className={cn(
          "w-full rounded-full border border-input bg-card text-foreground placeholder:text-muted-foreground outline-none transition-colors focus:border-ring focus-visible:ring-2 focus-visible:ring-ring/40 [&::-webkit-search-cancel-button]:hidden",
          size === "lg" ? "h-14 pl-13 pr-12 text-[17px]" : "h-11 pl-11 pr-10 text-[15px]",
        )}
        {...props}
      />
      {value && (
        <button
          type="button"
          aria-label="Clear search"
          onClick={() => onValueChange("")}
          className="absolute right-3 top-1/2 grid size-6 -translate-y-1/2 place-items-center rounded-full bg-secondary text-muted-foreground hover:text-foreground"
        >
          <X className="size-3.5" strokeWidth={2} />
        </button>
      )}
    </div>
  )
}
