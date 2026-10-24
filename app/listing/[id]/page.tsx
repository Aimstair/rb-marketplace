import { getListing } from "@/app/actions/listings"
import ListingClient from "./listing-client"

export default async function ListingDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  // Fetched on the server: the page arrives with the listing instead of a loading shell
  const initialResult = await getListing(id)
  return <ListingClient id={id} initialResult={initialResult} />
}
