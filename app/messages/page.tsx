import dynamic from "next/dynamic"

const MessagesPageClient = dynamic(() => import("./messages-page-client"), {
  loading: () => (
    <main className="mx-auto w-full max-w-[1440px] px-5 md:px-8 lg:px-10 py-8">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 h-[700px]">
        <div className="md:col-span-1 border rounded-lg bg-card animate-pulse" />
        <div className="md:col-span-2 border rounded-lg bg-card animate-pulse" />
      </div>
    </main>
  ),
})

export default function MessagesPage() {
  return <MessagesPageClient />
}
