"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import { useSession } from "next-auth/react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import Navigation from "@/components/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useToast } from "@/hooks/use-toast"
import {
  createHallOfShameComment,
  getHallOfShameComments,
  getPublicHallOfShameEntryById,
} from "@/app/actions/hall-of-shame-actions"
import type { HallOfShameCommentView, HallOfShamePublicEntry } from "@/lib/schemas"

const COMMENT_BATCH_SIZE = 20

export default function HallOfShameDetailPage() {
  const params = useParams<{ id: string }>()
  const { data: session } = useSession()
  const { toast } = useToast()

  const [entry, setEntry] = useState<HallOfShamePublicEntry | null>(null)
  const [comments, setComments] = useState<HallOfShameCommentView[]>([])
  const [loading, setLoading] = useState(true)
  const [commentLoading, setCommentLoading] = useState(false)
  const [postingComment, setPostingComment] = useState(false)
  const [comment, setComment] = useState("")
  const [selectedEvidenceIndex, setSelectedEvidenceIndex] = useState(0)
  const [visibleCommentCount, setVisibleCommentCount] = useState(COMMENT_BATCH_SIZE)

  const selectedEvidenceUrl = useMemo(() => {
    if (!entry?.evidenceUrls?.length) {
      return null
    }

    return entry.evidenceUrls[selectedEvidenceIndex] || entry.evidenceUrls[0]
  }, [entry, selectedEvidenceIndex])

  const visibleComments = useMemo(
    () => comments.slice(0, visibleCommentCount),
    [comments, visibleCommentCount]
  )

  const getInitials = (value: string) => {
    const trimmed = value.trim()
    if (!trimmed) {
      return "U"
    }

    return trimmed
      .split(" ")
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() || "")
      .join("")
  }

  const loadEntry = async () => {
    setLoading(true)
    const result = await getPublicHallOfShameEntryById(params.id)
    if (!result.success || !result.entry) {
      toast({ title: "Record not found", description: result.error || "This record is unavailable.", variant: "destructive" })
      setEntry(null)
      setLoading(false)
      return
    }

    setEntry(result.entry)
    setSelectedEvidenceIndex(0)
    setLoading(false)
  }

  const loadComments = async () => {
    setCommentLoading(true)
    const result = await getHallOfShameComments({ entryId: params.id, page: 1, itemsPerPage: 20 })
    if (result.success) {
      setComments(result.comments || [])
    }
    setCommentLoading(false)
  }

  useEffect(() => {
    if (!params.id) {
      return
    }

    loadEntry()
    loadComments()
  }, [params.id])

  useEffect(() => {
    setVisibleCommentCount(COMMENT_BATCH_SIZE)
  }, [params.id, comments.length])

  const handlePostComment = async (event: React.FormEvent) => {
    event.preventDefault()

    if (!comment.trim()) {
      return
    }

    setPostingComment(true)
    const result = await createHallOfShameComment({ entryId: params.id, content: comment })
    setPostingComment(false)

    if (!result.success) {
      toast({ title: "Unable to post comment", description: result.error || "Try again.", variant: "destructive" })
      return
    }

    setComment("")
    await loadComments()
    toast({ title: "Comment posted" })
  }

  const showPrevImage = () => {
    if (!entry?.evidenceUrls?.length) {
      return
    }

    setSelectedEvidenceIndex((current) => {
      if (current <= 0) {
        return entry.evidenceUrls.length - 1
      }

      return current - 1
    })
  }

  const showNextImage = () => {
    if (!entry?.evidenceUrls?.length) {
      return
    }

    setSelectedEvidenceIndex((current) => (current + 1) % entry.evidenceUrls.length)
  }

  return (
    <main className="min-h-screen bg-background">
      <Navigation />

      <div className="container max-w-[1920px] mx-auto px-6 py-8 space-y-6">
        <div>
          <Link href="/hall-of-shame">
            <Button variant="outline" size="sm">Back to Hall of Shame</Button>
          </Link>
        </div>

        {loading || !entry ? (
          <Card>
            <CardContent className="p-6 text-sm text-muted-foreground">Loading record...</CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Incident Record</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
                <section className="space-y-3">
                  <p className="text-sm font-medium">Evidence</p>

                  {selectedEvidenceUrl ? (
                    <div className="space-y-3">
                      <div className="relative overflow-hidden rounded-xl border bg-muted/40 aspect-4/3">
                        <a href={selectedEvidenceUrl} target="_blank" rel="noreferrer" className="block h-full w-full">
                          <img
                            src={selectedEvidenceUrl}
                            alt="Selected evidence"
                            className="h-full w-full object-cover"
                          />
                        </a>

                        {(entry.evidenceUrls || []).length > 1 && (
                          <>
                            <Button
                              type="button"
                              variant="secondary"
                              size="icon"
                              className="absolute left-3 top-1/2 -translate-y-1/2"
                              onClick={showPrevImage}
                            >
                              <ChevronLeft className="h-4 w-4" />
                            </Button>
                            <Button
                              type="button"
                              variant="secondary"
                              size="icon"
                              className="absolute right-3 top-1/2 -translate-y-1/2"
                              onClick={showNextImage}
                            >
                              <ChevronRight className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                      </div>

                      {(entry.evidenceUrls || []).length > 1 && (
                        <div className="flex gap-2 overflow-x-auto pb-1">
                          {entry.evidenceUrls.map((url, index) => {
                            const isSelected = selectedEvidenceUrl === url

                            return (
                              <button
                                key={url}
                                type="button"
                                onClick={() => setSelectedEvidenceIndex(index)}
                                className={`shrink-0 overflow-hidden rounded-md border transition ${
                                  isSelected ? "border-primary ring-2 ring-primary/30" : "border-border"
                                }`}
                              >
                                <img src={url} alt={`Evidence ${index + 1}`} className="h-20 w-28 object-cover" />
                              </button>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="flex h-[420px] items-center justify-center rounded-xl border bg-muted/40 text-sm text-muted-foreground">
                      No evidence images available
                    </div>
                  )}
                </section>

                <section className="space-y-4">
                  <div className="rounded-lg border p-4 space-y-3">
                    <p className="text-sm font-semibold">Aliases</p>
                    <div className="flex flex-wrap gap-2">
                      {entry.aliases.map((alias) => (
                        <Badge key={alias} variant="secondary">{alias}</Badge>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-lg border p-4 space-y-2">
                    <p className="text-sm font-semibold">Incident Summary</p>
                    <p className="text-sm leading-relaxed text-muted-foreground">{entry.incidentSummary}</p>
                  </div>

                  {entry.transactionContext && (
                    <div className="rounded-lg border p-4 space-y-2">
                      <p className="text-sm font-semibold">Transaction Context</p>
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap">{entry.transactionContext}</p>
                    </div>
                  )}

                  <div className="rounded-lg border p-4 space-y-2">
                    <p className="text-sm font-semibold">Payment / Bank Details</p>
                    <div className="space-y-2">
                      {entry.identifiers.map((identifier, index) => (
                        <div key={`${identifier.type}-${identifier.value}-${index}`} className="rounded-md bg-muted/40 p-2 text-sm">
                          <span className="font-medium">{identifier.type}</span>
                          <span className="text-muted-foreground">: {identifier.value}</span>
                          {identifier.label ? <span className="text-muted-foreground"> ({identifier.label})</span> : null}
                        </div>
                      ))}
                    </div>
                  </div>
                </section>
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Community Comments</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {commentLoading ? (
              <p className="text-sm text-muted-foreground">Loading comments...</p>
            ) : comments.length === 0 ? (
              <p className="text-sm text-muted-foreground">No comments yet.</p>
            ) : (
              <div className="space-y-4">
                {visibleComments.map((item) => (
                  <div key={item.id} className="flex gap-3 rounded-lg border p-4">
                    <Avatar className="h-10 w-10 border">
                      <AvatarImage src={item.author.profilePicture || undefined} alt={item.author.username} />
                      <AvatarFallback>{getInitials(item.author.username)}</AvatarFallback>
                    </Avatar>

                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                        <p className="text-sm font-semibold">{item.author.username}</p>
                        {item.author.isVerified && (
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                            Verified
                          </Badge>
                        )}
                        <span className="text-xs text-muted-foreground">{new Date(item.createdAt).toLocaleString()}</span>
                      </div>
                      <p className="text-sm whitespace-pre-wrap leading-relaxed">{item.content}</p>
                    </div>
                  </div>
                ))}
                {comments.length > visibleCommentCount ? (
                  <div className="flex justify-center">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() =>
                        setVisibleCommentCount((prev) =>
                          Math.min(comments.length, prev + COMMENT_BATCH_SIZE)
                        )
                      }
                    >
                      Load More Comments
                    </Button>
                  </div>
                ) : null}
              </div>
            )}

            <form onSubmit={handlePostComment} className="border-t pt-4">
              <div className="flex items-start gap-3">
                <Avatar className="h-10 w-10 border">
                  <AvatarImage src={session?.user?.image || undefined} alt={session?.user?.name || "You"} />
                  <AvatarFallback>{getInitials(session?.user?.name || "You")}</AvatarFallback>
                </Avatar>

                <div className="flex-1 space-y-3">
                  <Textarea
                    value={comment}
                    onChange={(event) => setComment(event.target.value)}
                    rows={4}
                    placeholder={session?.user ? "Write a comment..." : "Log in to comment"}
                    disabled={!session?.user || postingComment}
                  />
                  <div className="flex justify-end">
                    <Button type="submit" disabled={!session?.user || postingComment}>
                      {postingComment ? "Posting..." : "Post Comment"}
                    </Button>
                  </div>
                </div>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </main>
  )
}
