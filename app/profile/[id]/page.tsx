import { notFound } from "next/navigation"
import { getProfile } from "@/app/actions/profile"
import ProfilePageClient from "./profile-page-client"

export default async function ProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  // Loaded on the server (cached for 30s per profile): the page arrives with data, and a
  // missing user becomes a real 404 without a separate existence query.
  const initialResult = await getProfile(id)
  if (!initialResult.success && initialResult.error === "User not found") {
    notFound()
  }

  return <ProfilePageClient profileId={id} initialResult={initialResult} />
}
