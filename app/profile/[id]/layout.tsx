import { Metadata } from "next"
import { unstable_cache } from "next/cache"
import { prisma } from "@/lib/prisma"
import { notFound } from "next/navigation"
import { truncate } from "@/lib/seo"

function isNotFoundMetadataError(error: unknown): boolean {
  if (typeof error !== "object" || error === null) {
    return false
  }

  if (!("digest" in error)) {
    return false
  }

  const digest = (error as { digest?: unknown }).digest
  return typeof digest === "string" && digest.startsWith("NEXT_HTTP_ERROR_FALLBACK;404")
}

// Metadata lookups are cached so a warm page view runs no extra query
const getCachedUserMeta = unstable_cache(
  async (id: string) =>
    prisma.user.findUnique({
      where: { id },
      select: {
        username: true,
        bio: true,
        profilePicture: true,
        isBanned: true,
        _count: {
          select: {
            itemListings: { where: { status: "available" } },
            currencyListings: { where: { status: "available" } },
            vouchesReceived: { where: { status: "VALID" } },
          },
        },
      },
    }),
  ["profile-user-meta-v2"],
  { revalidate: 60 },
)

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  try {
    const resolvedParams = await params
    const user = await getCachedUserMeta(resolvedParams.id)

    if (!user) {
      notFound()
    }

    const { itemListings, currencyListings, vouchesReceived } = user._count
    const live = itemListings + currencyListings
    const title = `${user.username}: Roblox Trader Profile`
    const description = user.bio
      ? truncate(`${user.username} on RbMarket: ${user.bio}`, 160)
      : `${user.username} on RbMarket, the Roblox marketplace in the Philippines. ${vouchesReceived} vouches and ${live} live listings.`
    const path = `/profile/${resolvedParams.id}`

    return {
      title,
      description,
      alternates: { canonical: path },
      // Empty profiles are thin pages; index traders with listings or vouches only
      robots: { index: !user.isBanned && live + vouchesReceived > 0, follow: !user.isBanned },
      openGraph: {
        title,
        description,
        type: "profile",
        url: path,
        images: user.profilePicture ? [{ url: user.profilePicture, width: 400, height: 400, alt: user.username }] : undefined,
      },
      twitter: { card: "summary", title, description, images: user.profilePicture ? [user.profilePicture] : undefined },
    }
  } catch (error) {
    if (isNotFoundMetadataError(error)) {
      throw error
    }

    console.error("Error generating profile metadata:", error)
    return {
      title: "Trader profile",
    }
  }
}

export default function ProfileLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
