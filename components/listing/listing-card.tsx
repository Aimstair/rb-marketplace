import Image from "next/image"
import Link from "next/link"
import { Check } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

export interface ListingCardProps {
  id: string
  title: string
  game: string
  price: number
  image?: string | null
  sellerName: string
  vouches: number
  featured?: boolean
  /** Small muted note under the price, e.g. condition or "12 views" */
  note?: string
  href?: string
  priority?: boolean
  className?: string
}

export const formatPeso = (value: number) => `₱${value.toLocaleString("en-PH")}`

export function ListingCard({
  id,
  title,
  game,
  price,
  image,
  sellerName,
  vouches,
  featured,
  note,
  href,
  priority,
  className,
}: ListingCardProps) {
  return (
    <Link
      href={href ?? `/listing/${id}`}
      className={cn(
        "lift group flex flex-col overflow-hidden rounded-lg bg-card outline-none hover:bg-[#232325] focus-visible:ring-2 focus-visible:ring-ring",
        className,
      )}
    >
      <div className="relative m-1.5 aspect-square overflow-hidden rounded-md bg-secondary">
        <Image
          src={image || "/placeholder.svg"}
          alt={`${title} (${game})`}
          fill
          priority={priority}
          sizes="(max-width: 768px) 50vw, (max-width: 1200px) 25vw, 280px"
          className="object-contain p-[8%]"
        />
        {featured && (
          <span className="absolute left-2.5 top-2.5 rounded-full bg-black/55 px-2 py-0.5 text-[11px] font-medium text-foreground/90">
            Featured
          </span>
        )}
      </div>
      <div className="flex grow flex-col px-4 pb-4 pt-2">
        <p className="truncate text-xs text-muted-foreground">{game}</p>
        <h3 className="mt-0.5 line-clamp-2 text-[15px] font-semibold leading-snug tracking-[-0.01em]">{title}</h3>
        <p className="mt-1.5 font-semibold tabular-nums">{formatPeso(price)}</p>
        {note && <p className="mt-0.5 truncate text-xs text-muted-foreground">{note}</p>}
        <div className="mt-auto flex items-center gap-1.5 pt-3 text-xs text-muted-foreground">
          <span className="truncate">{sellerName}</span>
          {vouches > 0 && (
            <span className="flex shrink-0 items-center gap-0.5 text-success tabular-nums">
              <Check className="size-3" strokeWidth={2.5} />
              {vouches}
            </span>
          )}
        </div>
      </div>
    </Link>
  )
}

export function ListingCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-lg bg-card">
      <Skeleton className="m-1.5 aspect-square rounded-md" />
      <div className="space-y-2 px-4 pb-4 pt-2">
        <Skeleton className="h-3 w-1/3" />
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-4 w-1/4" />
        <Skeleton className="mt-3 h-3 w-1/2" />
      </div>
    </div>
  )
}

/** Standard responsive listing grid: 2 columns on mobile, 3 on tablet, 4 on desktop, 5 on wide screens. */
export function ListingGrid({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <div className={cn("grid grid-cols-2 gap-3 sm:gap-[18px] md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5", className)}>
      {children}
    </div>
  )
}
