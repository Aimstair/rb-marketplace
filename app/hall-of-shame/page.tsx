"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import React from "react"
import { useSession } from "next-auth/react"
import { ChevronLeft, ChevronRight, ImageOff, Plus, ShieldAlert, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { MultiImageUpload } from "@/components/multi-image-upload"
import { Container } from "@/components/site/container"
import { SearchInput } from "@/components/search/search-input"
import { Chip, ChipRow } from "@/components/filters/chip"
import { getPublicHallOfShameEntries, submitHallOfShameEntry } from "@/app/actions/hall-of-shame-actions"
import type { HallOfShamePublicEntry } from "@/lib/schemas"
import { IDENTIFIER_LABELS } from "./identifier-labels"

const IDENTIFIER_TYPES = ["all", "GCASH", "BANK_ACCOUNT", "PAYPAL_EMAIL", "OTHER"] as const
const SUBMISSION_IDENTIFIER_TYPES = ["GCASH", "BANK_ACCOUNT", "PAYPAL_EMAIL", "OTHER"] as const
const ITEMS_PER_PAGE = 12

type IdentifierFilter = (typeof IDENTIFIER_TYPES)[number]
type SubmissionIdentifierType = (typeof SUBMISSION_IDENTIFIER_TYPES)[number]

type SubmissionIdentifier = {
  type: SubmissionIdentifierType
  value: string
  label: string
}

const formatDate = (value?: Date | string | null) =>
  value ? new Date(value).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : null

export default function HallOfShamePage() {
  const { toast } = useToast()
  const { status } = useSession()

  const [query, setQuery] = useState("")
  const [submittedQuery, setSubmittedQuery] = useState("")
  const [identifierType, setIdentifierType] = useState<IdentifierFilter>("all")
  const [page, setPage] = useState(1)
  const [entries, setEntries] = useState<HallOfShamePublicEntry[]>([])
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [loading, setLoading] = useState(true)
  const [reportOpen, setReportOpen] = useState(false)

  const [incidentSummary, setIncidentSummary] = useState("")
  const [transactionContext, setTransactionContext] = useState("")
  const [incidentDate, setIncidentDate] = useState("")
  const [amount, setAmount] = useState("")
  const [currency, setCurrency] = useState("PHP")
  const [aliases, setAliases] = useState<string[]>([""])
  const [identifiers, setIdentifiers] = useState<SubmissionIdentifier[]>([{ type: "GCASH", value: "", label: "" }])
  const [evidenceUrls, setEvidenceUrls] = useState<string[]>([])
  const [submitting, setSubmitting] = useState(false)

  const loadEntries = async (opts: { query?: string; identifierType?: IdentifierFilter; page?: number } = {}) => {
    const nextQuery = opts.query ?? submittedQuery
    const nextType = opts.identifierType ?? identifierType
    const nextPage = opts.page ?? page
    setLoading(true)
    const result = await getPublicHallOfShameEntries({
      query: nextQuery,
      identifierType: nextType,
      page: nextPage,
      itemsPerPage: ITEMS_PER_PAGE,
    })

    if (!result.success) {
      toast({ title: "Couldn't load reports", description: result.error || "Please try again.", variant: "destructive" })
      setEntries([])
      setTotal(0)
      setTotalPages(1)
    } else {
      setEntries(result.entries || [])
      setTotal(result.total || 0)
      setTotalPages(Math.max(1, result.pages || 1))
    }
    setLoading(false)
  }

  useEffect(() => {
    loadEntries()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Deep link from a record page: /hall-of-shame?report=1 opens the report form
  useEffect(() => {
    if (status === "authenticated" && new URLSearchParams(window.location.search).get("report") === "1") {
      setReportOpen(true)
    }
  }, [status])

  const runSearch = (event?: React.FormEvent) => {
    event?.preventDefault()
    const trimmed = query.trim()
    setSubmittedQuery(trimmed)
    setPage(1)
    loadEntries({ query: trimmed, page: 1 })
  }

  const changeType = (type: IdentifierFilter) => {
    setIdentifierType(type)
    setPage(1)
    loadEntries({ identifierType: type, page: 1 })
  }

  const goToPage = (next: number) => {
    setPage(next)
    loadEntries({ page: next })
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  const handleSubmitReport = async (event: React.FormEvent) => {
    event.preventDefault()

    const validAliases = aliases.map((value) => value.trim()).filter(Boolean)
    const validIdentifiers = identifiers
      .map((item) => ({ type: item.type, value: item.value.trim(), label: item.label.trim() || undefined }))
      .filter((item) => Boolean(item.value))

    if (validAliases.length === 0) {
      toast({ title: "Add the scammer's name", description: "Enter at least one username or alias.", variant: "destructive" })
      return
    }
    if (validIdentifiers.length === 0) {
      toast({ title: "Add a payment detail", description: "Enter the GCash number, bank account or PayPal they used.", variant: "destructive" })
      return
    }
    if (evidenceUrls.length === 0) {
      toast({ title: "Add evidence", description: "Upload at least one screenshot.", variant: "destructive" })
      return
    }

    setSubmitting(true)
    const result = await submitHallOfShameEntry({
      incidentSummary,
      transactionContext,
      incidentDate: incidentDate || null,
      amount: amount ? Number.parseInt(amount, 10) : null,
      currency,
      aliases: validAliases,
      identifiers: validIdentifiers,
      socialLinks: [],
      evidenceUrls,
    })
    setSubmitting(false)

    if (!result.success) {
      toast({ title: "Report not sent", description: result.error || "Check the form and try again.", variant: "destructive" })
      return
    }

    toast({ title: "Report sent", description: "Moderators will review it before it appears here." })
    setIncidentSummary("")
    setTransactionContext("")
    setIncidentDate("")
    setAmount("")
    setCurrency("PHP")
    setAliases([""])
    setIdentifiers([{ type: "GCASH", value: "", label: "" }])
    setEvidenceUrls([])
    setReportOpen(false)
  }

  const updateAlias = (index: number, value: string) =>
    setAliases((prev) => prev.map((item, idx) => (idx === index ? value : item)))
  const removeAlias = (index: number) =>
    setAliases((prev) => (prev.length <= 1 ? prev : prev.filter((_, idx) => idx !== index)))
  const updateIdentifier = (index: number, patch: Partial<SubmissionIdentifier>) =>
    setIdentifiers((prev) => prev.map((item, idx) => (idx === index ? { ...item, ...patch } : item)))
  const removeIdentifier = (index: number) =>
    setIdentifiers((prev) => (prev.length <= 1 ? prev : prev.filter((_, idx) => idx !== index)))

  const isSearching = Boolean(submittedQuery) || identifierType !== "all"

  const reportButton =
    status === "authenticated" ? (
      <Button variant="secondary" onClick={() => setReportOpen(true)}>
        <ShieldAlert strokeWidth={1.75} />
        Report a scammer
      </Button>
    ) : (
      <Button asChild variant="secondary">
        <Link href={`/auth/login?redirect=${encodeURIComponent("/hall-of-shame?report=1")}`}>
          <ShieldAlert strokeWidth={1.75} />
          Log in to report
        </Link>
      </Button>
    )

  return (
    <main className="min-h-screen bg-background">
      <Container className="pt-10 pb-16 md:pt-14 md:pb-20">
        {/* Search hero */}
        <section className="mx-auto max-w-3xl text-center">
          <h1 className="text-title">Hall of Shame</h1>
          <p className="mx-auto mt-3 max-w-[52ch] text-[17px] text-muted-foreground">
            Check a trader before you pay. Search a username, GCash number, bank account or PayPal email against
            verified scam reports.
          </p>
          <form onSubmit={runSearch} className="mt-7">
            <SearchInput
              size="lg"
              value={query}
              onValueChange={(v) => {
                setQuery(v)
                if (!v && submittedQuery) {
                  setSubmittedQuery("")
                  setPage(1)
                  loadEntries({ query: "", page: 1 })
                }
              }}
              placeholder="Username, GCash number, or email"
              aria-label="Search reports"
            />
          </form>
          <ChipRow className="mt-4 justify-start md:justify-center">
            {IDENTIFIER_TYPES.map((type) => (
              <Chip key={type} selected={identifierType === type} onClick={() => changeType(type)}>
                {type === "all" ? "All reports" : IDENTIFIER_LABELS[type]}
              </Chip>
            ))}
          </ChipRow>
        </section>

        {/* Results */}
        <section className="mx-auto mt-12 max-w-4xl">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <p className="text-[15px] text-muted-foreground" aria-live="polite">
              {loading
                ? "Searching…"
                : submittedQuery
                  ? `${total.toLocaleString()} report${total === 1 ? "" : "s"} matching “${submittedQuery}”`
                  : `${total.toLocaleString()} verified report${total === 1 ? "" : "s"}`}
            </p>
            {reportButton}
          </div>

          {loading ? (
            <div className="divide-y divide-white/[0.06] overflow-hidden rounded-[20px] bg-card">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex gap-4 p-4">
                  <Skeleton className="size-16 shrink-0 rounded-xl" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-40" />
                    <Skeleton className="h-3 w-full" />
                    <Skeleton className="h-3 w-56" />
                  </div>
                </div>
              ))}
            </div>
          ) : entries.length === 0 ? (
            <div className="rounded-[20px] bg-card px-6 py-14 text-center">
              {isSearching ? (
                <>
                  <p className="text-lg font-semibold">No reports found</p>
                  <p className="mx-auto mt-2 max-w-md text-muted-foreground">
                    Nobody has reported{submittedQuery ? ` “${submittedQuery}”` : " anything matching this filter"} yet.
                    That's a good sign, but still check their vouches and never pay before you see proof.
                  </p>
                </>
              ) : (
                <>
                  <ShieldAlert className="mx-auto size-8 text-muted-foreground" strokeWidth={1.5} />
                  <p className="mt-3 text-lg font-semibold">No scam reports yet</p>
                  <p className="mx-auto mt-2 max-w-md text-muted-foreground">
                    Good news for everyone. If a trader takes your money and disappears, report them here so others are
                    warned.
                  </p>
                </>
              )}
            </div>
          ) : (
            <ul className="divide-y divide-white/[0.06] overflow-hidden rounded-[20px] bg-card">
              {entries.map((entry) => {
                const [primaryAlias, ...otherAliases] = entry.aliases || []
                const firstIdentifier = entry.identifiers?.[0]
                const date = formatDate(entry.incidentDate || entry.publishedAt || entry.createdAt)
                return (
                  <li key={entry.id}>
                    <Link
                      href={`/hall-of-shame/${entry.id}`}
                      className="flex gap-4 p-4 transition-colors hover:bg-white/[0.03] md:p-5"
                    >
                      <span className="size-16 shrink-0 overflow-hidden rounded-xl bg-secondary">
                        {entry.evidenceUrls?.[0] ? (
                          <img src={entry.evidenceUrls[0]} alt="" loading="lazy" className="h-full w-full object-cover" />
                        ) : (
                          <span className="grid h-full w-full place-items-center text-muted-foreground">
                            <ImageOff className="size-5" strokeWidth={1.5} />
                          </span>
                        )}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex flex-wrap items-baseline gap-x-2">
                          <span className="font-semibold">{primaryAlias || "Unknown"}</span>
                          {otherAliases.length > 0 && (
                            <span className="text-[13px] text-muted-foreground">
                              also {otherAliases.slice(0, 2).join(", ")}
                              {otherAliases.length > 2 ? ` +${otherAliases.length - 2}` : ""}
                            </span>
                          )}
                        </span>
                        <span className="mt-1 line-clamp-2 block text-[15px] leading-snug text-foreground/85">
                          {entry.incidentSummary}
                        </span>
                        <span className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-muted-foreground">
                          {firstIdentifier && (
                            <span className="rounded-full bg-destructive/10 px-2 py-0.5 text-destructive">
                              {IDENTIFIER_LABELS[firstIdentifier.type]} · {firstIdentifier.value}
                            </span>
                          )}
                          {entry.amount ? (
                            <span className="tabular-nums">
                              {entry.currency === "PHP" || !entry.currency ? "₱" : `${entry.currency} `}
                              {entry.amount.toLocaleString()} lost
                            </span>
                          ) : null}
                          {date && <span>{date}</span>}
                        </span>
                      </span>
                      <ChevronRight className="mt-1 size-4 shrink-0 self-center text-muted-foreground" />
                    </Link>
                  </li>
                )
              })}
            </ul>
          )}

          {!loading && totalPages > 1 && (
            <nav aria-label="Pagination" className="mt-6 flex items-center justify-center gap-3">
              <Button variant="secondary" size="icon" aria-label="Previous page" onClick={() => goToPage(page - 1)} disabled={page <= 1}>
                <ChevronLeft className="size-4" />
              </Button>
              <span className="text-sm text-muted-foreground tabular-nums">
                Page {page} of {totalPages}
              </span>
              <Button variant="secondary" size="icon" aria-label="Next page" onClick={() => goToPage(page + 1)} disabled={page >= totalPages}>
                <ChevronRight className="size-4" />
              </Button>
            </nav>
          )}

          {/* How it works */}
          <div className="mt-12 grid gap-6 border-t border-white/[0.08] pt-8 text-[15px] sm:grid-cols-3">
            <div>
              <p className="font-semibold">Reported by buyers</p>
              <p className="mt-1 text-muted-foreground">Anyone who was scammed can file a report with screenshots.</p>
            </div>
            <div>
              <p className="font-semibold">Checked by moderators</p>
              <p className="mt-1 text-muted-foreground">Only reports with real evidence are published here.</p>
            </div>
            <div>
              <p className="font-semibold">Search before you pay</p>
              <p className="mt-1 text-muted-foreground">Check the seller's username and payment details every time.</p>
            </div>
          </div>
        </section>
      </Container>

      {/* Report form */}
      <Sheet open={reportOpen} onOpenChange={setReportOpen}>
        <SheetContent side="right" className="flex w-full flex-col gap-0 p-0 sm:max-w-lg">
          <SheetHeader className="border-b border-white/[0.08] px-6 pt-6 pb-4 text-left">
            <SheetTitle className="text-xl font-semibold">Report a scammer</SheetTitle>
            <SheetDescription>Moderators review every report before it's published.</SheetDescription>
          </SheetHeader>

          <form onSubmit={handleSubmitReport} className="flex min-h-0 flex-1 flex-col">
            <div className="flex-1 space-y-8 overflow-y-auto px-6 py-6">
              <fieldset className="space-y-4">
                <legend className="mb-1 text-[13px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Who scammed you
                </legend>
                <div className="space-y-2">
                  <Label>Username or alias</Label>
                  {aliases.map((alias, index) => (
                    <div key={`alias-${index}`} className="flex items-center gap-2">
                      <Input
                        value={alias}
                        onChange={(event) => updateAlias(index, event.target.value)}
                        placeholder="Roblox or Discord username"
                        required={index === 0}
                      />
                      {aliases.length > 1 && (
                        <Button type="button" variant="ghost" size="icon" aria-label="Remove alias" onClick={() => removeAlias(index)}>
                          <X />
                        </Button>
                      )}
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => setAliases((prev) => [...prev, ""])}
                    className="flex items-center gap-1 text-sm text-link hover:underline"
                  >
                    <Plus className="size-3.5" /> Add another name
                  </button>
                </div>

                <div className="space-y-2">
                  <Label>Payment details they used</Label>
                  {identifiers.map((item, index) => (
                    <div key={`identifier-${index}`} className="flex items-center gap-2">
                      <Select
                        value={item.type}
                        onValueChange={(value) => updateIdentifier(index, { type: value as SubmissionIdentifierType })}
                      >
                        <SelectTrigger className="w-[130px] shrink-0">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {SUBMISSION_IDENTIFIER_TYPES.map((type) => (
                            <SelectItem key={type} value={type}>
                              {IDENTIFIER_LABELS[type]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Input
                        value={item.value}
                        onChange={(event) => updateIdentifier(index, { value: event.target.value })}
                        placeholder="Number, account or email"
                        required={index === 0}
                      />
                      {identifiers.length > 1 && (
                        <Button type="button" variant="ghost" size="icon" aria-label="Remove payment detail" onClick={() => removeIdentifier(index)}>
                          <X />
                        </Button>
                      )}
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => setIdentifiers((prev) => [...prev, { type: "BANK_ACCOUNT", value: "", label: "" }])}
                    className="flex items-center gap-1 text-sm text-link hover:underline"
                  >
                    <Plus className="size-3.5" /> Add another payment detail
                  </button>
                </div>
              </fieldset>

              <fieldset className="space-y-4">
                <legend className="mb-1 text-[13px] font-semibold uppercase tracking-wide text-muted-foreground">
                  What happened
                </legend>
                <div className="space-y-2">
                  <Label htmlFor="incidentSummary">Summary</Label>
                  <Textarea
                    id="incidentSummary"
                    value={incidentSummary}
                    onChange={(event) => setIncidentSummary(event.target.value)}
                    placeholder="e.g. Paid ₱800 via GCash for a Shadow Dragon, seller blocked me after payment."
                    rows={4}
                    required
                  />
                  <p className="text-xs text-muted-foreground">At least 20 characters.</p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="incidentDate">Date</Label>
                    <Input id="incidentDate" type="date" value={incidentDate} onChange={(event) => setIncidentDate(event.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="amount">Amount lost</Label>
                    <div className="flex gap-2">
                      <Select value={currency} onValueChange={setCurrency}>
                        <SelectTrigger className="w-[84px] shrink-0" aria-label="Currency">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="PHP">PHP</SelectItem>
                          <SelectItem value="USD">USD</SelectItem>
                        </SelectContent>
                      </Select>
                      <Input
                        id="amount"
                        type="number"
                        inputMode="numeric"
                        min={1}
                        value={amount}
                        onChange={(event) => setAmount(event.target.value)}
                        placeholder="0"
                      />
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="transactionContext">
                    More details <span className="font-normal text-muted-foreground">(optional)</span>
                  </Label>
                  <Textarea
                    id="transactionContext"
                    value={transactionContext}
                    onChange={(event) => setTransactionContext(event.target.value)}
                    placeholder="Anything else that helps others recognize them"
                    rows={3}
                  />
                </div>
              </fieldset>

              <fieldset className="space-y-3">
                <legend className="mb-1 text-[13px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Evidence
                </legend>
                <p className="text-sm text-muted-foreground">Chat screenshots, payment receipts, their profile.</p>
                <MultiImageUpload endpoint="hallOfShameEvidence" values={evidenceUrls} onChange={setEvidenceUrls} maxImages={8} />
              </fieldset>
            </div>

            <div className="grid grid-cols-2 gap-3 border-t border-white/[0.08] px-6 py-4">
              <Button type="button" variant="secondary" onClick={() => setReportOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? "Sending…" : "Send report"}
              </Button>
            </div>
          </form>
        </SheetContent>
      </Sheet>
    </main>
  )
}
