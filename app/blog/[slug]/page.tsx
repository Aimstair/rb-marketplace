import { getPostBySlug } from "@/app/actions/blog"
import { notFound } from "next/navigation"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"
import { ChevronLeft } from "lucide-react"
import type { Metadata } from "next"
import { ArticleJsonLd } from "@/components/json-ld"
import { stripHtml, truncate } from "@/lib/seo"

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const post = await getPostBySlug(slug)

  if (!post) {
    return { title: "Guide not found", robots: { index: false, follow: false } }
  }

  const description = truncate(post.excerpt || stripHtml(post.content), 160)
  return {
    title: post.title,
    description,
    alternates: { canonical: `/blog/${post.slug}` },
    robots: { index: post.published, follow: true },
    openGraph: {
      type: "article",
      title: post.title,
      description,
      url: `/blog/${post.slug}`,
      publishedTime: new Date(post.createdAt).toISOString(),
      modifiedTime: new Date(post.updatedAt).toISOString(),
      authors: [post.author.username],
      images: post.image ? [post.image] : undefined,
    },
    twitter: { card: "summary_large_image", title: post.title, description, images: post.image ? [post.image] : undefined },
  }
}

export default async function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const post = await getPostBySlug(slug)

  if (!post || !post.published) {
    notFound()
  }

  return (
    <main className="min-h-screen bg-background">
      <ArticleJsonLd
        title={post.title}
        description={truncate(post.excerpt || stripHtml(post.content), 160)}
        path={`/blog/${post.slug}`}
        image={post.image}
        authorName={post.author.username}
        publishedAt={post.createdAt}
        updatedAt={post.updatedAt}
      />
      <article className="mx-auto w-full max-w-[1440px] px-5 md:px-8 lg:px-10 pt-10 pb-16 md:pt-14 md:pb-20">
        <div className="max-w-4xl mx-auto">
          <Link href="/blog" className="inline-flex items-center text-sm text-muted-foreground hover:text-link mb-8 transition-colors">
            <ChevronLeft className="w-4 h-4 mr-1" />
            Back to Guides
          </Link>

          <div className="mb-8">
            <div className="flex items-center gap-3 mb-4">
              <Badge>Guide</Badge>
              <span className="text-muted-foreground text-sm">
                {new Date(post.createdAt).toLocaleDateString(undefined, {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </span>
            </div>
            <h1 className="text-4xl md:text-6xl font-semibold mb-6 leading-tight">{post.title}</h1>
            
            <div className="flex items-center gap-4 py-4 border-y">
              <Avatar className="w-12 h-12">
                <AvatarImage src={post.author.profilePicture || ""} />
                <AvatarFallback>{post.author.username[0]?.toUpperCase()}</AvatarFallback>
              </Avatar>
              <div>
                <p className="font-semibold">{post.author.username}</p>
                <p className="text-sm text-muted-foreground">Author</p>
              </div>
            </div>
          </div>

          {post.image && (
            <div className="aspect-video relative rounded-2xl overflow-hidden bg-muted mb-12">
              <img src={post.image} alt={post.title} className="object-cover w-full h-full" />
            </div>
          )}

          {/* For MVP, we render raw text preserving whitespace, or if it has HTML, dangerouslySetInnerHTML could be used. */}
          <div className="prose prose-lg dark:prose-invert max-w-none">
            <div dangerouslySetInnerHTML={{ __html: post.content }} />
          </div>
        </div>
      </article>
    </main>
  )
}
