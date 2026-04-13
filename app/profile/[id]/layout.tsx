import { Metadata } from "next"
import { prisma } from "@/lib/prisma"
import { notFound } from "next/navigation"

const DEFAULT_SITE_URL = "https://rbmarket.app"

function getSiteUrl(): string {
  const candidate = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || DEFAULT_SITE_URL
  try {
    return new URL(candidate).toString().replace(/\/$/, "")
  } catch {
    return DEFAULT_SITE_URL
  }
}

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

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  try {
    const resolvedParams = await params
    const siteUrl = getSiteUrl()
    const user = await prisma.user.findUnique({
      where: { id: resolvedParams.id },
      select: {
        username: true,
        bio: true,
        profilePicture: true,
        isBanned: true,
      },
    })

    if (!user) {
      notFound()
    }

    return {
      title: `${user.username}'s Profile - RB Marketplace`,
      description: user.bio || `${user.username} is a trusted trader on RB Marketplace. Check out their listings and trading history.`,
      metadataBase: new URL(siteUrl),
      alternates: {
        canonical: `/profile/${resolvedParams.id}`,
      },
      robots: {
        index: !user.isBanned,
        follow: !user.isBanned,
      },
      keywords: [user.username, "profile", "trader", "Roblox", "marketplace"],
      openGraph: {
        title: `${user.username}'s Profile - RB Marketplace`,
        description: user.bio || `Check out ${user.username}'s profile on RB Marketplace`,
        type: "profile",
        url: `${siteUrl}/profile/${resolvedParams.id}`,
        images: user.profilePicture
          ? [
              {
                url: user.profilePicture,
                width: 400,
                height: 400,
                alt: user.username,
              },
            ]
          : [],
      },
      twitter: {
        card: "summary",
        title: `${user.username}'s Profile - RB Marketplace`,
        description: user.bio || `Check out ${user.username}'s profile`,
        images: user.profilePicture ? [user.profilePicture] : [],
      },
    }
  } catch (error) {
    if (isNotFoundMetadataError(error)) {
      throw error
    }

    console.error("Error generating profile metadata:", error)
    return {
      title: "Profile - RB Marketplace",
      description: "Browse user profiles on RB Marketplace",
    }
  }
}

export default function ProfileLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
