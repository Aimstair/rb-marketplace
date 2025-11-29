import { Metadata } from "next"
import { prisma } from "@/lib/prisma"

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  try {
    const resolvedParams = await params
    const user = await prisma.user.findUnique({
      where: { id: resolvedParams.id },
      select: {
        username: true,
        bio: true,
        avatar: true,
      },
    })

    if (!user) {
      return {
        title: "Profile Not Found - RB Marketplace",
        description: "The user profile you're looking for doesn't exist.",
      }
    }

    return {
      title: `${user.username}'s Profile - RB Marketplace`,
      description: user.bio || `${user.username} is a trusted trader on RB Marketplace. Check out their listings and trading history.`,
      keywords: [user.username, "profile", "trader", "Roblox", "marketplace"],
      openGraph: {
        title: `${user.username}'s Profile - RB Marketplace`,
        description: user.bio || `Check out ${user.username}'s profile on RB Marketplace`,
        type: "profile",
        images: user.avatar
          ? [
              {
                url: user.avatar,
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
        images: user.avatar ? [user.avatar] : [],
      },
    }
  } catch (error) {
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
