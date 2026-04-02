"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import React from "react"
import Navigation from "@/components/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { MultiImageUpload } from "@/components/multi-image-upload"
import {
  getPublicHallOfShameEntries,
  submitHallOfShameEntry,
} from "@/app/actions/hall-of-shame-actions"
import type { HallOfShamePublicEntry } from "@/lib/schemas"
import { X } from "lucide-react"

const IDENTIFIER_TYPES = ["all", "GCASH", "BANK_ACCOUNT", "PAYPAL_EMAIL", "OTHER"] as const
const SUBMISSION_IDENTIFIER_TYPES = ["GCASH", "BANK_ACCOUNT", "PAYPAL_EMAIL", "OTHER"] as const
const LISTING_CARD_BATCH_SIZE = 8

type IdentifierFilter = (typeof IDENTIFIER_TYPES)[number]
type SubmissionIdentifierType = (typeof SUBMISSION_IDENTIFIER_TYPES)[number]

type SubmissionIdentifier = {
  type: SubmissionIdentifierType
  value: string
  label: string
}

export default function HallOfShamePage() {
  const { toast } = useToast()

  const [query, setQuery] = useState("")
  const [identifierType, setIdentifierType] = useState<IdentifierFilter>("all")
  const [page, setPage] = useState(1)
  const [entries, setEntries] = useState<HallOfShamePublicEntry[]>([])
  const [visibleEntryCount, setVisibleEntryCount] = useState(LISTING_CARD_BATCH_SIZE)
  const [totalPages, setTotalPages] = useState(1)
  const [loading, setLoading] = useState(true)

  const [incidentSummary, setIncidentSummary] = useState("")
  const [transactionContext, setTransactionContext] = useState("")
  const [incidentDate, setIncidentDate] = useState("")
  const [amount, setAmount] = useState("")
  const [currency, setCurrency] = useState("PHP")
  const [aliases, setAliases] = useState<string[]>([""])
  const [identifiers, setIdentifiers] = useState<SubmissionIdentifier[]>([
    { type: "GCASH", value: "", label: "" },
  ])
  const [evidenceUrls, setEvidenceUrls] = useState<string[]>([])
  const [submitting, setSubmitting] = useState(false)

  const loadEntries = async () => {
    setLoading(true)
    setVisibleEntryCount(LISTING_CARD_BATCH_SIZE)
    const result = await getPublicHallOfShameEntries({
      query,
      identifierType,
      page,
      itemsPerPage: 12,
    })

    if (!result.success) {
      toast({
        title: "Failed to load entries",
        description: result.error || "Please try again.",
        variant: "destructive",
      })
      setEntries([])
      setTotalPages(1)
      setLoading(false)
      return
    }

    setEntries(result.entries || [])
    setTotalPages(result.pages || 1)
    setLoading(false)
  }

  useEffect(() => {
    loadEntries()
  }, [page])

  const visibleEntries = useMemo(
    () => entries.slice(0, visibleEntryCount),
    [entries, visibleEntryCount]
  )

  const handleSearch = async (event: React.FormEvent) => {
    event.preventDefault()
    setPage(1)
    await loadEntries()
  }

  const handleSubmitReport = async (event: React.FormEvent) => {
    event.preventDefault()

    const validAliases = aliases.map((value) => value.trim()).filter(Boolean)
    const validIdentifiers = identifiers
      .map((item) => ({
        type: item.type,
        value: item.value.trim(),
        label: item.label.trim() || undefined,
      }))
      .filter((item) => Boolean(item.value))

    if (validIdentifiers.length === 0) {
      toast({ title: "Identifier required", description: "Please provide a payment identifier.", variant: "destructive" })
      return
    }

    if (validAliases.length === 0) {
      toast({ title: "Alias required", description: "Please provide at least one alias.", variant: "destructive" })
      return
    }

    if (evidenceUrls.length === 0) {
      toast({ title: "Evidence required", description: "Please provide at least one evidence URL.", variant: "destructive" })
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
      toast({
        title: "Submission failed",
        description: result.error || "Please review your input and try again.",
        variant: "destructive",
      })
      return
    }

    toast({ title: "Report submitted", description: "Your report is now pending moderation review." })

    setIncidentSummary("")
    setTransactionContext("")
    setIncidentDate("")
    setAmount("")
    setCurrency("PHP")
    setAliases([""])
    setIdentifiers([{ type: "GCASH", value: "", label: "" }])
    setEvidenceUrls([])

    await loadEntries()
  }

  const updateAlias = (index: number, value: string) => {
    setAliases((prev) => prev.map((item, idx) => (idx === index ? value : item)))
  }

  const addAlias = () => {
    setAliases((prev) => [...prev, ""])
  }

  const removeAlias = (index: number) => {
    setAliases((prev) => {
      if (prev.length <= 1) {
        return prev
      }

      return prev.filter((_, idx) => idx !== index)
    })
  }

  const updateIdentifier = (index: number, patch: Partial<SubmissionIdentifier>) => {
    setIdentifiers((prev) => prev.map((item, idx) => (idx === index ? { ...item, ...patch } : item)))
  }

  const addIdentifier = () => {
    setIdentifiers((prev) => [...prev, { type: "BANK_ACCOUNT", value: "", label: "" }])
  }

  const removeIdentifier = (index: number) => {
    setIdentifiers((prev) => {
      if (prev.length <= 1) {
        return prev
      }

      return prev.filter((_, idx) => idx !== index)
    })
  }

  return (
    <main className="min-h-screen bg-background">
      <Navigation />

      <div className="container max-w-[1920px] mx-auto px-6 py-8 space-y-8">
        <section className="space-y-2">
          <h1 className="text-3xl font-bold">Hall of Shame</h1>
          <p className="text-muted-foreground">
            Community-maintained records of verified scam incidents. Search by alias, payment identifier, or keywords.
          </p>
        </section>

        <Card>
          <CardHeader>
            <CardTitle>Search Public Records</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSearch} className="grid gap-3 md:grid-cols-4">
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search aliases, summaries, identifiers"
                className="md:col-span-2"
              />
              <select
                value={identifierType}
                onChange={(event) => setIdentifierType(event.target.value as IdentifierFilter)}
                className="h-10 rounded-md border bg-background px-3"
              >
                {IDENTIFIER_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
              <Button type="submit">Search</Button>
            </form>
          </CardContent>
        </Card>

        <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_500px] relative">
          <div className="space-y-4">
            {loading ? (
              <Card>
                <CardContent className="p-6 text-sm text-muted-foreground">Loading records...</CardContent>
              </Card>
            ) : entries.length === 0 ? (
              <Card>
                <CardContent className="p-6 text-sm text-muted-foreground">No approved records found.</CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {visibleEntries.map((entry) => (
                  <Link key={entry.id} href={`/hall-of-shame/${entry.id}`} className="block h-full">
                    <Card className="h-[380px] overflow-hidden transition-colors hover:border-primary/60">
                      <div className="h-50 bg-muted">
                        {entry.evidenceUrls?.[0] ? (
                          <img src={entry.evidenceUrls[0]} alt="Scam evidence preview" className="h-full w-full object-cover" />
                        ) : (
                          <div className="flex h-full items-center justify-center text-xs text-muted-foreground">No preview</div>
                        )}
                      </div>
                      <CardContent className="space-y-2 p-4">
                        <div className="flex flex-wrap gap-1">
                          {(entry.aliases || []).slice(0, 2).map((alias) => (
                            <Badge key={alias} variant="secondary" className="max-w-[120px] truncate">{alias}</Badge>
                          ))}
                          {(entry.aliases || []).length > 2 && (
                            <Badge variant="outline">+{entry.aliases.length - 2}</Badge>
                          )}
                        </div>
                        <p className="line-clamp-2 text-sm leading-relaxed">{entry.incidentSummary}</p>
                        <div className="text-xs text-muted-foreground">
                          <p>{entry.publishedAt ? new Date(entry.publishedAt).toLocaleDateString() : "Unpublished"}</p>
                          <p>Evidence: {entry.evidenceUrls?.length || 0}</p>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            )}

            {!loading && entries.length > visibleEntryCount ? (
              <div className="flex justify-center">
                <Button
                  variant="outline"
                  onClick={() =>
                    setVisibleEntryCount((prev) =>
                      Math.min(entries.length, prev + LISTING_CARD_BATCH_SIZE)
                    )
                  }
                >
                  Load More Records
                </Button>
              </div>
            ) : null}

            <div className="flex items-center gap-3 justify-center absolute bottom-0 right-1/2 -translate-x-1/2">
              <Button variant="outline" onClick={() => setPage((prev) => Math.max(1, prev - 1))} disabled={page <= 1}>
                Previous
              </Button>
              <p className="text-sm text-muted-foreground">Page {page} of {Math.max(1, totalPages)}</p>
              <Button variant="outline" onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))} disabled={page >= totalPages}>
                Next
              </Button>
            </div>
          </div>

          <Card className="h-[calc(100vh-7rem)] overflow-y-auto lg:sticky lg:top-24">
            <CardHeader>
              <CardTitle>Submit a Scam Report</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmitReport} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="incidentSummary">Incident summary</Label>
                  <Textarea
                    id="incidentSummary"
                    value={incidentSummary}
                    onChange={(event) => setIncidentSummary(event.target.value)}
                    placeholder="What happened and how the scam occurred"
                    rows={4}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="transactionContext">Transaction context</Label>
                  <Textarea
                    id="transactionContext"
                    value={transactionContext}
                    onChange={(event) => setTransactionContext(event.target.value)}
                    placeholder="Optional additional context"
                    rows={3}
                  />
                </div>

                <div className="grid gap-3 md:grid-cols-3">
                  <div className="space-y-2">
                    <Label htmlFor="incidentDate">Incident date</Label>
                    <Input id="incidentDate" type="date" value={incidentDate} onChange={(event) => setIncidentDate(event.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="amount">Amount</Label>
                    <Input id="amount" type="number" min={1} value={amount} onChange={(event) => setAmount(event.target.value)} placeholder="0" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="currency">Currency</Label>
                    <Input id="currency" value={currency} onChange={(event) => setCurrency(event.target.value.toUpperCase())} placeholder="PHP" />
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label>Aliases</Label>
                    <Button type="button" variant="outline" size="sm" onClick={addAlias}>Add Alias</Button>
                  </div>
                  <div className="space-y-2">
                    {aliases.map((alias, index) => (
                      <div key={`alias-${index}`} className="flex items-center gap-2">
                        <Input
                          value={alias}
                          onChange={(event) => updateAlias(index, event.target.value)}
                          placeholder="Alias or username"
                          required={index === 0}
                        />
                        <Button type="button" variant="ghost" size="icon" onClick={() => removeAlias(index)} disabled={aliases.length === 1}>
                          <X className="text-red-500" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label>Payment and bank details</Label>
                    <Button type="button" variant="outline" size="sm" onClick={addIdentifier}>Add Entry</Button>
                  </div>
                  <div className="space-y-1">
                    {identifiers.map((item, index) => (
                      <React.Fragment key={`identifier-${index}`}>
                        <div className="grid gap-2 md:grid-cols-10">
                          <select
                            value={item.type}
                            onChange={(event) => updateIdentifier(index, { type: event.target.value as SubmissionIdentifierType })}
                            className="h-10 col-span-3 rounded-md border bg-background px-3"
                          >
                            {SUBMISSION_IDENTIFIER_TYPES.map((type) => (
                              <option key={type} value={type}>{type}</option>
                            ))}
                          </select>
                          <Input
                            className="col-span-3"
                            value={item.value}
                            onChange={(event) => updateIdentifier(index, { value: event.target.value })}
                            placeholder="Account number, email, or handle"
                            required={index === 0}
                          />
                          <Input
                            className="col-span-3"
                            value={item.label}
                            onChange={(event) => updateIdentifier(index, { label: event.target.value })}
                            placeholder="Label (optional)"
                          />
                          <Button type="button" variant="ghost" size="icon" onClick={() => removeIdentifier(index)} disabled={identifiers.length === 1}>
                            <X className="text-red-500" />
                          </Button>
                        </div>
                      </React.Fragment>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Evidence photos</Label>
                  <MultiImageUpload
                    endpoint="hallOfShameEvidence"
                    values={evidenceUrls}
                    onChange={setEvidenceUrls}
                    maxImages={8}
                  />
                </div>

                <Button type="submit" disabled={submitting} className="w-full">
                  {submitting ? "Submitting..." : "Submit Report"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </section>
      </div>
    </main>
  )
}
