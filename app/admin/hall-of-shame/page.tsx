"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useToast } from "@/hooks/use-toast"
import {
  getPendingHallOfShameEntries,
  reviewHallOfShameEntry,
  type HallOfShamePendingEntry,
} from "@/app/actions/hall-of-shame-actions"

export default function AdminHallOfShamePage() {
  const { toast } = useToast()
  const [entries, setEntries] = useState<HallOfShamePendingEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [processingId, setProcessingId] = useState<string | null>(null)
  const [search, setSearch] = useState("")
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [selectedEntryId, setSelectedEntryId] = useState<string | null>(null)

  const loadEntries = async () => {
    setLoading(true)
    const result = await getPendingHallOfShameEntries(page, search)

    if (!result.success) {
      toast({
        title: "Failed to load pending reports",
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
    setSelectedEntryId((current) => {
      if (current && (result.entries || []).some((entry) => entry.id === current)) {
        return current
      }

      return result.entries?.[0]?.id || null
    })
    setLoading(false)
  }

  useEffect(() => {
    loadEntries()
  }, [page])

  const handleSearch = async (event: React.FormEvent) => {
    event.preventDefault()
    setPage(1)
    await loadEntries()
  }

  const handleReview = async (entryId: string, action: "APPROVE" | "REJECT" | "REMOVE") => {
    let rejectionReason = ""
    let notes = ""

    if (action === "REJECT") {
      rejectionReason = window.prompt("Enter rejection reason", "Insufficient evidence")?.trim() || ""
      if (!rejectionReason) {
        return
      }
    }

    notes = window.prompt("Optional moderator notes", "")?.trim() || ""

    setProcessingId(entryId)
    const result = await reviewHallOfShameEntry(entryId, action, notes || undefined, rejectionReason || undefined)
    setProcessingId(null)

    if (!result.success) {
      toast({
        title: "Review action failed",
        description: result.error || "Please try again.",
        variant: "destructive",
      })
      return
    }

    toast({ title: `Entry ${action.toLowerCase()}d` })
    await loadEntries()
  }

  const selectedEntry = entries.find((entry) => entry.id === selectedEntryId) || null

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Hall of Shame Moderation</h1>
        <p className="text-muted-foreground">Review pending scam reports before they are published.</p>
      </div>

      <Card>
        <CardContent className="p-4">
          <form onSubmit={handleSearch} className="flex flex-wrap gap-2">
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search summary, alias, identifier"
              className="max-w-xl"
            />
            <Button type="submit">Search</Button>
          </form>
        </CardContent>
      </Card>

      {loading ? (
        <Card>
          <CardContent className="p-6 text-sm text-muted-foreground">Loading pending entries...</CardContent>
        </Card>
      ) : entries.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-sm text-muted-foreground">No pending entries to review.</CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 items-start lg:grid-cols-[minmax(0,1fr)_420px]">
          <div className="grid grid-cols-1 gap-4 items-start md:grid-cols-2 xl:grid-cols-3 relative h-full">
            {entries.map((entry) => {
              const isSelected = entry.id === selectedEntryId

              return (
                <button
                  key={entry.id}
                  type="button"
                  onClick={() => setSelectedEntryId(entry.id)}
                  className="text-left"
                >
                  <Card
                    className={`h-[390px] overflow-hidden transition-colors ${
                      isSelected ? "border-primary bg-primary/5" : "hover:border-primary/50"
                    }`}
                  >
                    <div className="h-50 bg-muted">
                      {entry.evidenceUrls?.[0] ? (
                        <img src={entry.evidenceUrls[0]} alt="Evidence preview" className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full items-center justify-center text-xs text-muted-foreground">No image</div>
                      )}
                    </div>
                    <CardContent className="space-y-2 p-4">
                      <div className="flex items-center justify-between">
                        <Badge variant="outline">PENDING</Badge>
                        <span className="text-xs text-muted-foreground">{new Date(entry.createdAt).toLocaleDateString()}</span>
                      </div>
                      <p className="line-clamp-2 text-sm">{entry.incidentSummary}</p>
                      <p className="text-xs text-muted-foreground">Reporter: {entry.reporter.username}</p>
                      <p className="text-xs text-muted-foreground">Evidence: {entry.evidenceUrls?.length || 0}</p>
                    </CardContent>
                  </Card>
                </button>
              )
            })}

            <div className="flex items-center gap-3 absolute bottom-0 left-1/2 -translate-x-1/2">
                <Button variant="outline" onClick={() => setPage((prev) => Math.max(1, prev - 1))} disabled={page <= 1}>
                Previous
                </Button>
                <p className="text-sm text-muted-foreground">Page {page} of {Math.max(1, totalPages)}</p>
                <Button
                variant="outline"
                onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
                disabled={page >= totalPages}
                >
                Next
                </Button>
            </div>
          </div>

          <Card className="h-[calc(100vh-7rem)] overflow-hidden lg:sticky lg:top-24">
            <CardHeader>
              <CardTitle>Submission Details</CardTitle>
            </CardHeader>
            <CardContent className="h-[calc(100%-5rem)] p-0">
              {!selectedEntry ? (
                <div className="p-6 text-sm text-muted-foreground">Select a submission to review.</div>
              ) : (
                <ScrollArea className="h-full px-6 pb-6">
                  <div className="space-y-4">
                    <div>
                      <p className="text-sm font-medium">Reporter</p>
                      <p className="text-sm text-muted-foreground">{selectedEntry.reporter.username} ({selectedEntry.reporter.email})</p>
                    </div>

                    <div>
                      <p className="text-sm font-medium">Incident Summary</p>
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap">{selectedEntry.incidentSummary}</p>
                    </div>

                    {!!selectedEntry.transactionContext && (
                      <div>
                        <p className="text-sm font-medium">Transaction Context</p>
                        <p className="text-sm text-muted-foreground whitespace-pre-wrap">{selectedEntry.transactionContext}</p>
                      </div>
                    )}

                    <div>
                      <p className="text-sm font-medium">Aliases</p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {(selectedEntry.aliases || []).map((alias) => (
                          <Badge key={alias} variant="secondary">{alias}</Badge>
                        ))}
                      </div>
                    </div>

                    <div>
                      <p className="text-sm font-medium">Identifiers</p>
                      <div className="mt-2 space-y-1 text-sm text-muted-foreground">
                        {(selectedEntry.identifiers || []).map((identifier, index) => (
                          <p key={`${identifier.type}-${identifier.value}-${index}`}>
                            {identifier.type}: {identifier.value}
                            {identifier.label ? ` (${identifier.label})` : ""}
                          </p>
                        ))}
                      </div>
                    </div>

                    <div>
                      <p className="text-sm font-medium">Evidence Gallery</p>
                      <div className="mt-2 grid grid-cols-2 gap-2">
                        {(selectedEntry.evidenceUrls || []).map((url) => (
                          <a key={url} href={url} target="_blank" rel="noreferrer" className="block overflow-hidden rounded-md border">
                            <img src={url} alt="Evidence" className="h-24 w-full object-cover" />
                          </a>
                        ))}
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2 pt-2">
                      <Button onClick={() => handleReview(selectedEntry.id, "APPROVE")} disabled={processingId === selectedEntry.id}>
                        Approve
                      </Button>
                      <Button
                        variant="destructive"
                        onClick={() => handleReview(selectedEntry.id, "REJECT")}
                        disabled={processingId === selectedEntry.id}
                      >
                        Reject
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => handleReview(selectedEntry.id, "REMOVE")}
                        disabled={processingId === selectedEntry.id}
                      >
                        Remove
                      </Button>
                    </div>
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
