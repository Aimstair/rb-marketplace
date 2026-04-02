import dynamic from "next/dynamic"

const TrendsPageClient = dynamic(() => import("./trends-page-client"), {
  loading: () => (
    <main className="container max-w-[1920px] mx-auto px-6 py-8">
      <div className="space-y-6">
        <div className="h-10 w-64 rounded bg-muted animate-pulse" />
        <div className="h-[520px] rounded-lg bg-card border animate-pulse" />
      </div>
    </main>
  ),
})

export default function TrendsPage() {
  return <TrendsPageClient />
}
