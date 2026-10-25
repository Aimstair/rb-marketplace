"use client"

import { useRef, useState } from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"

const FALLBACK = "/placeholder.jpg"

/**
 * Swipeable photo carousel for a listing: scroll-snap track (swipe on touch), arrow buttons
 * and arrow keys on desktop, and a thumbnail strip.
 */
export function ListingGallery({ images, alt }: { images: string[]; alt: string }) {
  const photos = images.length > 0 ? images : [FALLBACK]
  const trackRef = useRef<HTMLDivElement>(null)
  const [active, setActive] = useState(0)
  const multiple = photos.length > 1

  const goTo = (index: number) => {
    const track = trackRef.current
    if (!track) return
    const next = (index + photos.length) % photos.length
    track.scrollTo({ left: next * track.clientWidth, behavior: "smooth" })
    setActive(next)
  }

  return (
    <div>
      <div
        className="group relative overflow-hidden rounded-[24px] bg-card"
        role="region"
        aria-roledescription="carousel"
        aria-label={`${alt} photos`}
        tabIndex={multiple ? 0 : undefined}
        onKeyDown={(e) => {
          if (!multiple) return
          if (e.key === "ArrowRight") goTo(active + 1)
          if (e.key === "ArrowLeft") goTo(active - 1)
        }}
      >
        <div
          ref={trackRef}
          onScroll={(e) => {
            const track = e.currentTarget
            const index = Math.round(track.scrollLeft / track.clientWidth)
            if (index !== active) setActive(index)
          }}
          className="flex aspect-square snap-x snap-mandatory overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {photos.map((src, i) => (
            <div key={`${src}-${i}`} className="relative h-full w-full shrink-0 snap-center" aria-hidden={i !== active}>
              <img
                src={src}
                alt={multiple ? `${alt}, photo ${i + 1} of ${photos.length}` : alt}
                loading={i === 0 ? "eager" : "lazy"}
                className="absolute inset-0 h-full w-full object-contain p-[10%]"
                onError={(e) => {
                  ;(e.target as HTMLImageElement).src = FALLBACK
                }}
              />
            </div>
          ))}
        </div>

        {multiple && (
          <>
            <button
              type="button"
              onClick={() => goTo(active - 1)}
              aria-label="Previous photo"
              className="absolute left-3 top-1/2 hidden size-10 -translate-y-1/2 place-items-center rounded-full bg-black/55 backdrop-blur transition-opacity hover:bg-black/75 md:grid md:opacity-0 md:group-hover:opacity-100 md:focus-visible:opacity-100"
            >
              <ChevronLeft className="size-5" strokeWidth={1.75} />
            </button>
            <button
              type="button"
              onClick={() => goTo(active + 1)}
              aria-label="Next photo"
              className="absolute right-3 top-1/2 hidden size-10 -translate-y-1/2 place-items-center rounded-full bg-black/55 backdrop-blur transition-opacity hover:bg-black/75 md:grid md:opacity-0 md:group-hover:opacity-100 md:focus-visible:opacity-100"
            >
              <ChevronRight className="size-5" strokeWidth={1.75} />
            </button>
            <div className="absolute inset-x-0 bottom-3 flex justify-center gap-1.5" aria-hidden>
              {photos.map((_, i) => (
                <span
                  key={i}
                  className={cn("h-1.5 rounded-full transition-all", i === active ? "w-4 bg-foreground" : "w-1.5 bg-foreground/35")}
                />
              ))}
            </div>
            <span className="absolute right-3 top-3 rounded-full bg-black/55 px-2.5 py-0.5 text-[12px] tabular-nums">
              {active + 1} / {photos.length}
            </span>
          </>
        )}
      </div>

      {multiple && (
        <div className="mt-3 flex gap-2.5 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {photos.map((src, i) => (
            <button
              key={`${src}-thumb-${i}`}
              type="button"
              onClick={() => goTo(i)}
              aria-label={`Show photo ${i + 1}`}
              aria-current={i === active}
              className={cn(
                "size-16 shrink-0 overflow-hidden rounded-xl bg-card p-1.5 transition",
                i === active ? "ring-2 ring-link" : "opacity-70 hover:opacity-100",
              )}
            >
              <img src={src} alt="" className="h-full w-full object-contain" />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
