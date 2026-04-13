import { notFound } from "next/navigation"
import { prisma } from "@/lib/prisma"
import ProfilePageClient from "./profile-page-client"

export default async function ProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const user = await prisma.user.findUnique({
    where: { id },
    select: { id: true },
  })

  if (!user) {
    notFound()
  }

  return <ProfilePageClient profileId={id} />
}
