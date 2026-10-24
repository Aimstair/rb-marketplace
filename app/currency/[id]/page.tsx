import { getListing } from "@/app/actions/listings"
import CurrencyListingClient from "./currency-client"

export default async function CurrencyListingDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  // Fetched on the server: the page arrives with the offer instead of a loading shell
  const initialResult = await getListing(id)
  return <CurrencyListingClient id={id} initialResult={initialResult} />
}
