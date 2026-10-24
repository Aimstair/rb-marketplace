"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import { useSession } from "next-auth/react"
import { Check, ChevronLeft, ChevronRight, Copy, ShieldAlert } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useToast } from "@/hooks/use-toast"
import { Container } from "@/components/site/container"
import {
  createHallOfShameComment,
  getHallOfShameComments,
  getPublicHallOfShameEntryById,
} from "@/app/actions/hall-of-shame-actions"
import type { HallOfShameCommentView, HallOfShamePublicEntry } from "@/lib/schemas"
import { IDENTIFIER_LABELS } from "../identifier-labels"

const COMMENT_BATCH_SIZE = 20

const formatDate = (value?: Date | string | null) =>
  value ? new Date(value).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }) : null

const getInitials = (value: string) =>
  value
    .trim()
    .split(" ")
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || "")
    .join("") || "U"

export default function HallOfShameDetailPage() {
  const params = useParams<{ id: string }>()
  const { data: session } = useSession()
  const { toast } = useToast()

  const [entry, setEntry] = useState<HallOfShamePublicEntry | null>(null)
  const [notFound, setNotFound] = useState(false)
  const [comments, setComments] = useState<HallOfShameCommentView[]>([])
  const [loading, setLoading] = useState(true)
  const [commentLoading, setCommentLoading] = useState(false)
  const [postingComment, setPostingComment] = useState(false)
  const [comment, setComment] = useState("")
  const [selectedEvidenceIndex, setSelectedEvidenceIndex] = useState(0)
  const [visibleCommentCount, setVisibleCommentCount] = useState(COMMENT_BATCH_SIZE)
  const [copiedValue, setCopiedValue] = useState<string | null>(null)

  const evidence = entry?.evidenceUrls || []
  const selectedEvidenceUrl = evidence[selectedEvidenceIndex] || evidence[0] || null
  const visibleComments = useMemo(() => comments.slice(0, visibleCommentCount), [comments, visibleCommentCount])

  const loadEntry = async () => {
    setLoading(true)
    const result = await getPublicHallOfShameEntryById(params.id)
    if (!result.success || !result.entry) {
      setEntry(null)
      setNotFound(true)
    } else {
      setEntry(result.entry)
      setSelectedEvidenceIndex(0)
    }
    setLoading(false)
  }

  const loadComments = async () => {
    setCommentLoading(true)
    const result = await getHallOfShameComments({ entryId: params.id, page: 1, itemsPerPage: 20 })
    if (result.success) setComments(result.comments || [])
    setCommentLoading(false)
  }

  useEffect(() => {
    if (!params.id) return
    loadEntry()
    loadComments()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id])

  useEffect(() => {
    setVisibleCommentCount(COMMENT_BATCH_SIZE)
  }, [params.id, comments.length])

  const handlePostComment = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!comment.trim()) return

    setPostingComment(true)
    const result = await createHallOfShameComment({ entryId: params.id, content: comment })
    setPostingComment(false)

    if (!result.success) {
      toast({ title: "Comment not posted", description: result.error || "Try again.", variant: "destructive" })
      return
    }
    setComment("")
    await loadComments()
  }

  const copyValue = async (value: string) => {
    try {
      await navigator.clipboard.writeText(value)
      setCopiedValue(value)
      setTimeout(() => setCopiedValue((current) => (current === value ? null : current)), 1500)
    } catch {
      toast({ title: "Couldn't copy", description: "Select the text and copy it manually.", variant: "destructive" })
    }
  }

  const stepEvidence = (step: number) =>
    setSelectedEvidenceIndex((current) => (current + step + evidence.length) % evidence.length)

  const [primaryAlias, ...otherAliases] = entry?.aliases || []
  const incidentDate = formatDate(entry?.incidentDate)
  const reportedDate = formatDate(entry?.publishedAt || entry?.createdAt)

  return (
    <main className="min-h-screen bg-background">
      <Container className="pt-6 pb-16 md:pt-8 md:pb-20">
        <Link
          href="/hall-of-shame"
          className="mb-6 inline-flex items-center gap-1 text-[15px] text-link hover:underline underline-offset-2"
        >
          <ChevronLeft className="size-4" />
          Hall of Shame
        </Link>

        {loading ? (
          <div className="space-y-4">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-10 w-72" />
            <Skeleton className="h-4 w-96" />
            <div className="grid gap-[18px] pt-6 lg:grid-cols-[minmax(0,1fr)_380px]">
              <Skeleton className="h-[420px] rounded-[20px]" />
              <Skeleton className="h-[260px] rounded-[20px]" />
            </div>
          </div>
        ) : notFound || !entry ? (
          <div className="mx-auto max-w-lg rounded-[20px] bg-card px-8 py-14 text-center">
            <p className="text-lg font-semibold">This report isn't available</p>
            <p className="mt-2 text-muted-foreground">It may have been removed or is still under review.</p>
            <Button asChild variant="secondary" className="mt-6">
              <Link href="/hall-of-shame">Back to Hall of Shame</Link>
            </Button>
          </div>
        ) : (
          <>
            {/* Header */}
            <header className="max-w-3xl">
              <p className="flex items-center gap-1.5 text-[13px] font-semibold text-destructive">
                <ShieldAlert className="size-4" strokeWidth={2} />
                Verified scam report
              </p>
              <h1 className="mt-2 text-title break-words">{primaryAlias || "Unknown trader"}</h1>
              {otherAliases.length > 0 && (
                <p className="mt-2 text-[15px] text-muted-foreground">Also known as {otherAliases.join(", ")}</p>
              )}
              <dl className="mt-5 flex flex-wrap gap-x-8 gap-y-3 text-[15px]">
                {entry.amount ? (
                  <div>
                    <dt className="text-[13px] text-muted-foreground">Amount lost</dt>
                    <dd className="font-semibold tabular-nums">
                      {entry.currency === "PHP" || !entry.currency ? "₱" : `${entry.currency} `}
                      {entry.amount.toLocaleString()}
                    </dd>
                  </div>
                ) : null}
                {incidentDate && (
                  <div>
                    <dt className="text-[13px] text-muted-foreground">Happened</dt>
                    <dd className="font-semibold">{incidentDate}</dd>
                  </div>
                )}
                {reportedDate && (
                  <div>
                    <dt className="text-[13px] text-muted-foreground">Published</dt>
                    <dd className="font-semibold">{reportedDate}</dd>
                  </div>
                )}
                <div>
                  <dt className="text-[13px] text-muted-foreground">Evidence</dt>
                  <dd className="font-semibold tabular-nums">
                    {evidence.length} screenshot{evidence.length === 1 ? "" : "s"}
                  </dd>
                </div>
              </dl>
            </header>

            <div className="mt-10 grid items-start gap-[18px] lg:grid-cols-[minmax(0,1fr)_380px]">
              {/* Story + evidence */}
              <div className="space-y-[18px]">
                <section className="rounded-[20px] bg-card p-6 md:p-8">
                  <h2 className="text-[21px] font-semibold tracking-[-0.015em]">What happened</h2>
                  <p className="mt-3 max-w-[65ch] whitespace-pre-wrap text-[17px] leading-relaxed text-foreground/90">
                    {entry.incidentSummary}
                  </p>
                  {entry.transactionContext && (
                    <p className="mt-4 max-w-[65ch] whitespace-pre-wrap text-[15px] leading-relaxed text-muted-foreground">
                      {entry.transactionContext}
                    </p>
                  )}
                </section>

                {selectedEvidenceUrl && (
                  <section className="rounded-[20px] bg-card p-4 md:p-5">
                    <div className="relative overflow-hidden rounded-2xl bg-black">
                      <a href={selectedEvidenceUrl} target="_blank" rel="noreferrer" className="block" aria-label="Open full-size evidence">
                        <img src={selectedEvidenceUrl} alt={`Evidence ${selectedEvidenceIndex + 1}`} className="max-h-[560px] w-full object-contain" />
                      </a>
                      {evidence.length > 1 && (
                        <>
                          <Button
                            type="button"
                            variant="secondary"
                            size="icon"
                            aria-label="Previous screenshot"
                            className="absolute left-3 top-1/2 -translate-y-1/2 bg-black/60 hover:bg-black/80"
                            onClick={() => stepEvidence(-1)}
                          >
                            <ChevronLeft className="size-4" />
                          </Button>
                          <Button
                            type="button"
                            variant="secondary"
                            size="icon"
                            aria-label="Next screenshot"
                            className="absolute right-3 top-1/2 -translate-y-1/2 bg-black/60 hover:bg-black/80"
                            onClick={() => stepEvidence(1)}
                          >
                            <ChevronRight className="size-4" />
                          </Button>
                          <span className="absolute bottom-3 right-3 rounded-full bg-black/60 px-2.5 py-1 text-xs tabular-nums">
                            {selectedEvidenceIndex + 1} / {evidence.length}
                          </span>
                        </>
                      )}
                    </div>
                    {evidence.length > 1 && (
                      <div className="no-scrollbar mt-3 flex gap-2 overflow-x-auto">
                        {evidence.map((url, index) => (
                          <button
                            key={url}
                            type="button"
                            onClick={() => setSelectedEvidenceIndex(index)}
                            aria-label={`Show screenshot ${index + 1}`}
                            className={`shrink-0 overflow-hidden rounded-xl transition ${
                              index === selectedEvidenceIndex ? "ring-2 ring-link" : "opacity-60 hover:opacity-100"
                            }`}
                          >
                            <img src={url} alt="" className="h-16 w-24 object-cover" />
                          </button>
                        ))}
                      </div>
                    )}
                  </section>
                )}
              </div>

              {/* Payment details to avoid */}
              <aside className="space-y-[18px] lg:sticky lg:top-[76px]">
                <section className="rounded-[20px] bg-card p-6">
                  <h2 className="text-[17px] font-semibold">Don't send money to</h2>
                  <p className="mt-1 text-[13px] text-muted-foreground">Compare these with the details your seller gives you.</p>
                  <ul className="mt-4 space-y-2">
                    {entry.identifiers.map((identifier, index) => (
                      <li
                        key={`${identifier.type}-${identifier.value}-${index}`}
                        className="flex items-center gap-3 rounded-xl bg-destructive/10 px-3.5 py-2.5"
                      >
                        <span className="min-w-0 flex-1">
                          <span className="block text-[11px] font-semibold uppercase tracking-wide text-destructive">
                            {IDENTIFIER_LABELS[identifier.type]}
                            {identifier.label ? ` · ${identifier.label}` : ""}
                          </span>
                          <span className="block break-all font-medium tabular-nums">{identifier.value}</span>
                        </span>
                        <button
                          type="button"
                          onClick={() => copyValue(identifier.value)}
                          aria-label={`Copy ${identifier.value}`}
                          className="grid size-8 shrink-0 place-items-center rounded-full text-muted-foreground hover:bg-white/10 hover:text-foreground"
                        >
                          {copiedValue === identifier.value ? (
                            <Check className="size-4 text-success" strokeWidth={2.5} />
                          ) : (
                            <Copy className="size-4" strokeWidth={1.75} />
                          )}
                        </button>
                      </li>
                    ))}
                  </ul>
                </section>

                <section className="rounded-[20px] bg-card p-6 text-[15px]">
                  <p className="font-semibold">Got scammed by someone else?</p>
                  <p className="mt-1 text-muted-foreground">Report them so the next buyer is warned.</p>
                  <Button asChild variant="secondary" className="mt-4 w-full">
                    <Link href="/hall-of-shame?report=1">File a report</Link>
                  </Button>
                </section>
              </aside>
            </div>

            {/* Comments */}
            <section className="mt-14 max-w-3xl">
              <h2 className="text-section">
                Comments{comments.length > 0 && <span className="text-muted-foreground"> {comments.length}</span>}
              </h2>

              {session?.user ? (
                <form onSubmit={handlePostComment} className="mt-5 flex items-start gap-3">
                  <Avatar className="size-10">
                    <AvatarImage src={session.user.image || undefined} alt="" />
                    <AvatarFallback>{getInitials(session.user.name || "You")}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 space-y-3">
                    <Textarea
                      value={comment}
                      onChange={(event) => setComment(event.target.value)}
                      rows={3}
                      placeholder="Were you scammed by them too? Share what you know."
                      disabled={postingComment}
                    />
                    <div className="flex justify-end">
                      <Button type="submit" size="sm" disabled={postingComment || !comment.trim()}>
                        {postingComment ? "Posting…" : "Post comment"}
                      </Button>
                    </div>
                  </div>
                </form>
              ) : (
                <p className="mt-4 text-[15px] text-muted-foreground">
                  <Link href={`/auth/login?redirect=/hall-of-shame/${params.id}`} className="text-link hover:underline">
                    Log in
                  </Link>{" "}
                  to add a comment.
                </p>
              )}

              <div className="mt-6">
                {commentLoading ? (
                  <div className="space-y-4">
                    {[1, 2].map((i) => (
                      <div key={i} className="flex gap-3">
                        <Skeleton className="size-10 rounded-full" />
                        <div className="flex-1 space-y-2">
                          <Skeleton className="h-3 w-32" />
                          <Skeleton className="h-3 w-full" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : comments.length === 0 ? (
                  <p className="text-[15px] text-muted-foreground">No comments yet.</p>
                ) : (
                  <ul className="divide-y divide-white/[0.06]">
                    {visibleComments.map((item) => (
                      <li key={item.id} className="flex gap-3 py-4">
                        <Avatar className="size-10">
                          <AvatarImage src={item.author.profilePicture || undefined} alt="" />
                          <AvatarFallback>{getInitials(item.author.username)}</AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                            <Link href={`/profile/${item.author.id}`} className="text-[15px] font-semibold hover:underline">
                              {item.author.username}
                            </Link>
                            {item.author.isVerified && <Badge className="px-1.5 py-0 text-[10px]">Verified</Badge>}
                            <span className="text-[13px] text-muted-foreground">
                              {new Date(item.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                            </span>
                          </div>
                          <p className="mt-1 whitespace-pre-wrap text-[15px] leading-relaxed">{item.content}</p>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
                {comments.length > visibleCommentCount && (
                  <button
                    type="button"
                    onClick={() => setVisibleCommentCount((prev) => Math.min(comments.length, prev + COMMENT_BATCH_SIZE))}
                    className="mt-2 text-[15px] text-link hover:underline"
                  >
                    Show more comments
                  </button>
                )}
              </div>
            </section>
          </>
        )}
      </Container>
    </main>
  )
}
