import { getTrendsDashboard } from "@/app/actions/trends"
import TrendsPageClient from "./trends-page-client"

export default async function TrendsPage() {
  // Open on the shortest range that actually has trades, so a quiet month doesn't greet
  // visitors with a page of zeros. The client refetches when the range changes.
  let initial = await getTrendsDashboard(30)
  if (!initial.metrics?.completedTransactions.value) {
    initial = await getTrendsDashboard(365)
  }
  return <TrendsPageClient initial={initial} />
}
