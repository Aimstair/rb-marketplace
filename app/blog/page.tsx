import type { Metadata } from "next"
import Link from "next/link"
import { getPublishedPosts } from "@/app/actions/blog"
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

export const metadata: Metadata = {
  title: "Roblox Trading Guides: Buy, Sell & Stay Safe",
  description: "Guides to buying and selling Roblox items, pets and currency in the Philippines: pricing, GCash payments and how to avoid scams.",
  alternates: { canonical: "/blog" },
  openGraph: { url: "/blog", type: "website" },
}

export default async function BlogPage() {
  const posts = await getPublishedPosts()

  return (
    <main className="min-h-screen bg-background">
      
      {/* Hero Section */}
      <div className="bg-surface py-16 md:py-24 border-b border-white/[0.08]">
        <div className="mx-auto w-full max-w-[1440px] px-5 md:px-8 lg:px-10">
          <div className="max-w-3xl">
            <h1 className="text-title mb-4">Roblox trading guides</h1>
            <p className="text-lg text-muted-foreground">
              Master the Roblox economy. Learn the safest ways to sell items for cash, track trends, and avoid scams.
            </p>
          </div>
        </div>
      </div>

      {/* Post Grid */}
      <div className="mx-auto w-full max-w-[1440px] px-5 md:px-8 lg:px-10 pt-10 pb-16 md:pt-14 md:pb-20">
        {posts.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground border rounded-xl border-dashed">
            <p>No guides published yet. Check back soon!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {posts.map((post) => (
              <Link key={post.id} href={`/blog/${post.slug}`}>
                <Card className="h-full overflow-hidden hover:border-primary/50 transition-colors flex flex-col cursor-pointer group">
                  {post.image ? (
                    <div className="aspect-video relative overflow-hidden bg-muted">
                      <img 
                        src={post.image} 
                        alt={post.title} 
                        className="object-cover w-full h-full transition-transform duration-500"
                      />
                    </div>
                  ) : (
                    <div className="aspect-video bg-muted flex items-center justify-center">
                      <span className="text-muted-foreground font-semibold text-lg">RBMarketplace</span>
                    </div>
                  )}
                  <CardHeader>
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="secondary">Guide</Badge>
                      <span className="text-xs text-muted-foreground">
                        {new Date(post.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <h2 className="text-xl font-semibold line-clamp-2 group-hover:text-link transition-colors">
                      {post.title}
                    </h2>
                  </CardHeader>
                  <CardContent className="flex-1">
                    <p className="text-muted-foreground line-clamp-3 text-sm">
                      {post.excerpt}
                    </p>
                  </CardContent>
                  <CardFooter className="pt-4 border-t border-border/50 bg-muted/10">
                    <div className="flex items-center gap-3">
                      <Avatar className="w-8 h-8 border">
                        <AvatarImage src={post.author.profilePicture || ""} />
                        <AvatarFallback>{post.author.username[0]?.toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <span className="text-sm font-medium">{post.author.username}</span>
                    </div>
                  </CardFooter>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}
