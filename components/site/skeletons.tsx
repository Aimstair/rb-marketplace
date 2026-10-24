import type React from "react"
import { Skeleton } from "@/components/ui/skeleton"
import { Container } from "@/components/site/container"
import { ListingCardSkeleton, ListingGrid } from "@/components/listing/listing-card"
import { cn } from "@/lib/utils"

/**
 * Route-level loading skeletons. Each mirrors the real screen's layout (widths, grids,
 * card shapes) so content swaps in without the page jumping, and each fills the viewport
 * so the footer never flashes up under the header while data loads.
 */

function Page({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <main className="min-h-screen bg-background" aria-busy="true" aria-label="Loading">
      <Container className={cn("pt-10 pb-16 md:pt-14 md:pb-20", className)}>{children}</Container>
    </main>
  )
}

/** Rounded card surface used by most sections. */
function Panel({ className, children }: { className?: string; children?: React.ReactNode }) {
  return <div className={cn("rounded-[20px] bg-card p-5 md:p-6", className)}>{children}</div>
}

function TitleBlock({ center, withControl }: { center?: boolean; withControl?: boolean }) {
  return (
    <div className={cn("flex flex-wrap items-end justify-between gap-4", center && "justify-center text-center")}>
      <div className={cn("space-y-3", center && "flex flex-col items-center")}>
        <Skeleton className="h-11 w-48 rounded-xl md:h-12 md:w-56" />
        <Skeleton className="h-4 w-72 max-w-full" />
      </div>
      {withControl && <Skeleton className="h-10 w-48 rounded-full" />}
    </div>
  )
}

function Rows({ count = 5, thumb = true }: { count?: number; thumb?: boolean }) {
  return (
    <div className="divide-y divide-white/[0.06]">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 py-3.5">
          {thumb && <Skeleton className="size-12 shrink-0 rounded-xl" />}
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-3 w-1/3" />
          </div>
          <Skeleton className="h-4 w-16" />
        </div>
      ))}
    </div>
  )
}

function ChipsRow({ count = 5, className }: { count?: number; className?: string }) {
  return (
    <div className={cn("flex gap-2 overflow-hidden", className)}>
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton key={i} className="h-9 w-24 shrink-0 rounded-full" />
      ))}
    </div>
  )
}

function Field({ wide }: { wide?: boolean }) {
  return (
    <div className="space-y-2">
      <Skeleton className="h-3 w-24" />
      <Skeleton className={cn("rounded-xl", wide ? "h-28" : "h-10")} />
    </div>
  )
}

export function HomeSkeleton() {
  return (
    <Page className="pt-12 md:pt-20">
      <div className="grid items-center gap-10 md:grid-cols-2">
        <div className="space-y-5">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-14 w-full max-w-md rounded-xl" />
          <Skeleton className="h-14 w-4/5 max-w-sm rounded-xl" />
          <Skeleton className="h-5 w-full max-w-md" />
          <Skeleton className="h-14 w-full max-w-[520px] rounded-full" />
          <div className="flex gap-4">
            <Skeleton className="h-12 w-36 rounded-full" />
            <Skeleton className="h-12 w-32 rounded-full" />
          </div>
        </div>
        <Skeleton className="mx-auto aspect-square w-full max-w-[520px] rounded-[28px]" />
      </div>
      <ChipsRow count={6} className="mt-12" />
      <Skeleton className="mt-14 mb-5 h-7 w-44" />
      <ListingGrid>
        {Array.from({ length: 5 }).map((_, i) => (
          <ListingCardSkeleton key={i} />
        ))}
      </ListingGrid>
    </Page>
  )
}

export function MarketplaceSkeleton() {
  return (
    <Page>
      <TitleBlock withControl />
      <Skeleton className="mt-6 h-11 w-full rounded-full" />
      <ChipsRow count={6} className="mt-5" />
      <Skeleton className="mt-5 mb-4 h-3 w-24" />
      <ListingGrid>
        {Array.from({ length: 10 }).map((_, i) => (
          <ListingCardSkeleton key={i} />
        ))}
      </ListingGrid>
    </Page>
  )
}

export function ListingDetailSkeleton() {
  return (
    <Page className="pt-6 md:pt-8">
      <Skeleton className="mb-6 h-3 w-56" />
      <div className="grid gap-10 lg:grid-cols-[1.1fr_1fr]">
        <div className="space-y-3">
          <Skeleton className="aspect-square w-full rounded-[24px]" />
          <div className="flex gap-2.5">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="size-16 rounded-xl" />
            ))}
          </div>
        </div>
        <div className="space-y-5">
          <Skeleton className="h-3 w-40" />
          <Skeleton className="h-10 w-4/5 rounded-xl" />
          <Skeleton className="h-9 w-32 rounded-xl" />
          <div className="space-y-0 divide-y divide-white/[0.06] border-y border-white/[0.06]">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex justify-between py-3.5">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-28" />
              </div>
            ))}
          </div>
          <Skeleton className="h-12 w-full rounded-full" />
          <div className="grid grid-cols-2 gap-2.5">
            <Skeleton className="h-12 rounded-full" />
            <Skeleton className="h-12 rounded-full" />
          </div>
          <Skeleton className="h-[72px] w-full rounded-[20px]" />
        </div>
      </div>
    </Page>
  )
}

export function CurrencyListSkeleton() {
  return (
    <Page>
      <TitleBlock withControl />
      <ChipsRow count={4} className="mt-6" />
      <div className="mt-6 grid gap-[18px] md:grid-cols-[1fr_1.2fr]">
        <Skeleton className="h-[132px] rounded-[20px]" />
        <Skeleton className="h-[132px] rounded-[20px]" />
      </div>
      <div className="mt-8 mb-4 flex items-center justify-between gap-3">
        <Skeleton className="h-11 w-full max-w-sm rounded-full" />
        <Skeleton className="h-4 w-32" />
      </div>
      <Panel>
        <Rows count={6} />
      </Panel>
    </Page>
  )
}

export function CurrencyDetailSkeleton() {
  return (
    <Page className="pt-6 md:pt-8">
      <Skeleton className="mb-6 h-3 w-48" />
      <div className="grid items-start gap-x-10 gap-y-8 lg:grid-cols-[minmax(0,1fr)_420px]">
        <div>
          <div className="flex items-center gap-5">
            <Skeleton className="size-20 rounded-[22px]" />
            <div className="space-y-3">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-11 w-48 rounded-xl" />
            </div>
          </div>
          <Skeleton className="mt-6 h-9 w-56 rounded-xl" />
          <div className="mt-8 divide-y divide-white/[0.06] border-y border-white/[0.06]">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex justify-between py-3.5">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-32" />
              </div>
            ))}
          </div>
        </div>
        <div className="space-y-[18px] lg:row-span-2">
          <div className="space-y-4 rounded-[24px] bg-card p-6">
            <div className="flex justify-between">
              <Skeleton className="h-5 w-28" />
              <Skeleton className="h-8 w-36 rounded-full" />
            </div>
            <Skeleton className="h-14 w-full rounded-2xl" />
            <ChipsRow count={4} />
            <Skeleton className="h-24 w-full rounded-2xl" />
            <Skeleton className="h-12 w-full rounded-full" />
          </div>
          <Skeleton className="h-[72px] w-full rounded-[20px]" />
        </div>
      </div>
    </Page>
  )
}

export function TrendsSkeleton() {
  return (
    <Page>
      <TitleBlock withControl />
      <div className="mt-8 space-y-[18px]">
        <div className="grid grid-cols-2 rounded-[20px] bg-card lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="space-y-2.5 px-6 py-5">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-7 w-32 rounded-lg" />
              <Skeleton className="h-3 w-40 max-w-full" />
            </div>
          ))}
        </div>
        <Panel>
          <div className="mb-4 flex justify-between">
            <div className="space-y-2">
              <Skeleton className="h-3 w-40" />
              <Skeleton className="h-6 w-28 rounded-lg" />
            </div>
            <Skeleton className="h-9 w-40 rounded-full" />
          </div>
          <Skeleton className="h-[260px] w-full rounded-xl md:h-[300px]" />
        </Panel>
        <div className="grid gap-[18px] lg:grid-cols-2">
          <Panel>
            <Skeleton className="mb-3 h-6 w-36" />
            <Rows count={5} />
          </Panel>
          <Panel>
            <Skeleton className="mb-3 h-6 w-32" />
            <Rows count={5} thumb={false} />
          </Panel>
        </div>
      </div>
    </Page>
  )
}

export function HallOfShameSkeleton() {
  return (
    <Page>
      <div className="mx-auto flex max-w-3xl flex-col items-center text-center">
        <Skeleton className="h-12 w-64 rounded-xl" />
        <Skeleton className="mt-4 h-4 w-96 max-w-full" />
        <Skeleton className="mt-2 h-4 w-80 max-w-full" />
        <Skeleton className="mt-7 h-14 w-full rounded-full" />
        <ChipsRow count={5} className="mt-4 justify-center" />
      </div>
      <div className="mx-auto mt-12 max-w-4xl">
        <div className="mb-4 flex items-center justify-between">
          <Skeleton className="h-4 w-36" />
          <Skeleton className="h-10 w-40 rounded-full" />
        </div>
        <div className="divide-y divide-white/[0.06] rounded-[20px] bg-card px-5">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex gap-4 py-5">
              <Skeleton className="size-16 shrink-0 rounded-xl" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-56" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </Page>
  )
}

export function HallOfShameDetailSkeleton() {
  return (
    <Page className="pt-6 md:pt-8">
      <Skeleton className="mb-6 h-4 w-28" />
      <div className="max-w-3xl space-y-3">
        <Skeleton className="h-3 w-36" />
        <Skeleton className="h-11 w-72 rounded-xl" />
        <Skeleton className="h-4 w-56" />
        <div className="flex gap-8 pt-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-4 w-24" />
            </div>
          ))}
        </div>
      </div>
      <div className="mt-10 grid gap-[18px] lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className="space-y-[18px]">
          <Panel className="space-y-3 md:p-8">
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-11/12" />
            <Skeleton className="h-4 w-2/3" />
          </Panel>
          <Skeleton className="h-[360px] w-full rounded-[20px]" />
        </div>
        <Panel className="h-fit space-y-3">
          <Skeleton className="h-5 w-44" />
          <Skeleton className="h-3 w-56" />
          <Skeleton className="h-14 w-full rounded-xl" />
          <Skeleton className="h-14 w-full rounded-xl" />
        </Panel>
      </div>
    </Page>
  )
}

export function ProfileSkeleton() {
  return (
    <main className="min-h-screen bg-background" aria-busy="true" aria-label="Loading">
      <Skeleton className="h-40 w-full rounded-none md:h-56" />
      <Container className="relative z-10 -mt-20 pb-16 md:pb-20">
        <div className="mb-8 rounded-[24px] bg-card p-6 md:p-8">
          <div className="flex flex-col gap-6 md:flex-row">
            <Skeleton className="size-28 shrink-0 rounded-full md:size-32" />
            <div className="flex-1 space-y-3">
              <Skeleton className="h-10 w-56 rounded-xl" />
              <Skeleton className="h-4 w-full max-w-lg" />
              <div className="grid grid-cols-2 gap-4 pt-2 md:grid-cols-5">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="space-y-2">
                    <Skeleton className="h-3 w-16" />
                    <Skeleton className="h-5 w-12" />
                  </div>
                ))}
              </div>
              <div className="flex gap-2 pt-2">
                <Skeleton className="h-10 w-28 rounded-full" />
                <Skeleton className="h-10 w-36 rounded-full" />
              </div>
            </div>
          </div>
        </div>
        <Skeleton className="mb-6 h-10 w-80 max-w-full rounded-full" />
        <ListingGrid>
          {Array.from({ length: 5 }).map((_, i) => (
            <ListingCardSkeleton key={i} />
          ))}
        </ListingGrid>
      </Container>
    </main>
  )
}

export function MessagesSkeleton() {
  return (
    <main className="min-h-screen bg-background" aria-busy="true" aria-label="Loading">
      <Container className="py-8">
        <div className="grid grid-cols-1 gap-4 md:h-[calc(100dvh-52px-4rem)] md:min-h-[560px] md:grid-cols-3">
          <div className="flex flex-col rounded-[20px] bg-card max-md:h-[420px]">
            <div className="space-y-3 p-4">
              <Skeleton className="h-6 w-28" />
              <Skeleton className="h-10 w-full rounded-xl" />
              <Skeleton className="h-8 w-full rounded-full" />
            </div>
            <div className="space-y-1 px-4">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="flex gap-3 py-3">
                  <Skeleton className="size-11 shrink-0 rounded-xl" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-2/3" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="hidden flex-col rounded-[20px] bg-card md:col-span-2 md:flex">
            <div className="flex items-center gap-3 border-b border-white/[0.06] p-4">
              <Skeleton className="size-10 rounded-full" />
              <Skeleton className="h-4 w-36" />
            </div>
            <div className="flex-1 space-y-4 p-5">
              <Skeleton className="h-10 w-2/5 rounded-[20px] rounded-bl-md" />
              <Skeleton className="ml-auto h-10 w-1/3 rounded-[20px] rounded-br-md" />
              <Skeleton className="h-16 w-1/2 rounded-[20px] rounded-bl-md" />
              <Skeleton className="ml-auto h-10 w-2/5 rounded-[20px] rounded-br-md" />
            </div>
            <div className="border-t border-white/[0.06] p-4">
              <Skeleton className="h-11 w-full rounded-full" />
            </div>
          </div>
        </div>
      </Container>
    </main>
  )
}

/** Notifications, my transactions: title plus a list of rows. */
export function ListPageSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <Page>
      <TitleBlock />
      <Skeleton className="mt-8 mb-6 h-11 w-full max-w-md rounded-full" />
      <Panel>
        <Rows count={rows} />
      </Panel>
    </Page>
  )
}

/** My listings: title with action, usage summary card, then the listings table. */
export function MyListingsSkeleton() {
  return (
    <Page>
      <div className="flex items-end justify-between gap-4">
        <Skeleton className="h-11 w-52 rounded-xl md:h-12" />
        <Skeleton className="h-10 w-36 rounded-full" />
      </div>
      <Skeleton className="mt-8 h-24 w-full rounded-[20px]" />
      <div className="mt-6 flex flex-wrap gap-3">
        <Skeleton className="h-10 w-full max-w-sm rounded-xl" />
        <Skeleton className="h-10 w-36 rounded-xl" />
      </div>
      <Panel className="mt-6">
        <Rows count={6} />
      </Panel>
    </Page>
  )
}

/** Sell and settings: title, segmented control, form card, side card. */
export function FormPageSkeleton() {
  return (
    <Page>
      <TitleBlock />
      <Skeleton className="mt-8 h-11 w-60 rounded-full" />
      <div className="mt-8 grid gap-8 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {[0, 1].map((card) => (
            <div key={card} className="space-y-5 rounded-[20px] bg-card p-6 sm:p-8">
              <Skeleton className="h-6 w-40" />
              <Field />
              <Field wide={card === 0} />
              <div className="grid grid-cols-2 gap-4">
                <Field />
                <Field />
              </div>
            </div>
          ))}
        </div>
        <div className="space-y-4">
          <Skeleton className="h-72 w-full rounded-[20px]" />
          <Skeleton className="h-40 w-full rounded-[20px]" />
        </div>
      </div>
    </Page>
  )
}

export function SubscriptionsSkeleton() {
  return (
    <Page>
      <TitleBlock center />
      <div className="mx-auto mt-10 grid max-w-6xl gap-6 md:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="space-y-4 rounded-[20px] bg-card p-6">
            <Skeleton className="h-6 w-24" />
            <Skeleton className="h-10 w-32 rounded-xl" />
            <div className="space-y-2.5 pt-2">
              {[1, 2, 3, 4].map((j) => (
                <Skeleton key={j} className="h-3.5 w-full" />
              ))}
            </div>
            <Skeleton className="h-11 w-full rounded-full" />
          </div>
        ))}
      </div>
    </Page>
  )
}

export function AuthSkeleton() {
  return (
    <main
      className="grid min-h-screen bg-background lg:grid-cols-[minmax(0,1fr)_minmax(480px,600px)]"
      aria-busy="true"
      aria-label="Loading"
    >
      <div className="hidden border-r border-white/[0.06] bg-surface p-12 lg:flex lg:flex-col lg:justify-center">
        <div className="max-w-md space-y-4">
          <Skeleton className="h-14 w-4/5 rounded-xl" />
          <Skeleton className="h-14 w-1/2 rounded-xl" />
          <div className="space-y-5 pt-8">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex gap-4">
                <Skeleton className="size-10 shrink-0 rounded-xl" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-4 w-full" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="flex min-h-screen items-center justify-center px-6">
        <div className="w-full max-w-[380px] space-y-5">
          <Skeleton className="h-9 w-56 rounded-xl" />
          <Skeleton className="h-5 w-72 max-w-full" />
          <div className="space-y-2 pt-4">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-12 w-full rounded-xl" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-12 w-full rounded-xl" />
          </div>
          <Skeleton className="h-12 w-full rounded-full" />
        </div>
      </div>
    </main>
  )
}

export function BlogSkeleton() {
  return (
    <main className="min-h-screen bg-background" aria-busy="true" aria-label="Loading">
      <div className="border-b border-white/[0.08] bg-surface py-16 md:py-24">
        <Container className="space-y-4">
          <Skeleton className="h-11 w-96 max-w-full rounded-xl" />
          <Skeleton className="h-5 w-[32rem] max-w-full" />
        </Container>
      </div>
      <Container className="grid gap-6 py-14 md:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="overflow-hidden rounded-[20px] bg-card">
            <Skeleton className="aspect-video w-full rounded-none" />
            <div className="space-y-3 p-5">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-5 w-4/5" />
              <Skeleton className="h-3 w-full" />
            </div>
          </div>
        ))}
      </Container>
    </main>
  )
}

export function BlogPostSkeleton() {
  return (
    <Page>
      <div className="mx-auto max-w-4xl space-y-4">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-3 w-40" />
        <Skeleton className="h-12 w-4/5 rounded-xl" />
        <Skeleton className="aspect-video w-full rounded-[24px]" />
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <Skeleton key={i} className={cn("h-4", i % 3 === 0 ? "w-2/3" : "w-full")} />
        ))}
      </div>
    </Page>
  )
}

/** Fallback for any route without its own skeleton. */
export function GenericPageSkeleton() {
  return (
    <Page>
      <TitleBlock />
      <div className="mt-8 grid gap-[18px] lg:grid-cols-2">
        <Skeleton className="h-64 rounded-[20px]" />
        <Skeleton className="h-64 rounded-[20px]" />
      </div>
    </Page>
  )
}
