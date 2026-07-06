import Link from "next/link"
import Navigation from "@/components/navigation"
import { getPublishedPosts } from "@/app/actions/blog"
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

export const metadata = {
  title: "Blog & Guides | RBMarketplace",
  description: "Learn how to safely buy and sell Roblox items, pets, and currencies for real cash.",
}

export default async function BlogPage() {
  const posts = await getPublishedPosts()

  return (
    <main className="min-h-screen bg-background">
      <Navigation />
      
      {/* Hero Section */}
      <div className="bg-muted/30 py-16 md:py-24 border-b">
        <div className="container max-w-[1920px] mx-auto px-6">
          <div className="max-w-3xl">
            <h1 className="text-4xl md:text-5xl font-bold mb-4">Marketplace Guides & Insights</h1>
            <p className="text-lg text-muted-foreground">
              Master the Roblox economy. Learn the safest ways to sell items for cash, track trends, and avoid scams.
            </p>
          </div>
        </div>
      </div>

      {/* Post Grid */}
      <div className="container max-w-[1920px] mx-auto px-6 py-12">
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
                        className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-500"
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
                    <h2 className="text-xl font-bold line-clamp-2 group-hover:text-primary transition-colors">
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
