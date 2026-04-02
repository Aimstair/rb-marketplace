"use client"

import { useEffect, useMemo, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useToast } from "@/hooks/use-toast"
import { FileUpload } from "@/components/file-upload"
import {
  createAdminGiveaway,
  deactivateAdminGiveaway,
  endAdminGiveawayEarly,
  getAdminGiveawayDetail,
  getAdminGiveaways,
  removeAdminGiveawayParticipant,
  resumeAdminGiveaway,
  setAdminGiveawayStatus,
  updateAdminGiveaway,
} from "@/app/actions/giveaways"

type GiveawayStatus = "QUEUED" | "ACTIVE" | "PAUSED" | "COMPLETED" | "CANCELLED"

interface GiveawayListItem {
  id: string
  title: string
  description: string | null
  rewardLabel: string | null
  rewardImageUrl: string | null
  status: GiveawayStatus
  startsAt: string | null
  endsAt: string | null
  createdAt: string
  updatedAt: string
  entriesCount: number
  winnerUsername: string | null
}

interface GiveawayParticipant {
  id: string
  userId: string
  username: string
  email: string
  profilePicture: string | null
  joinedAt: string
}

interface GiveawayDetail extends GiveawayListItem {
  createdByUsername: string | null
  participants: GiveawayParticipant[]
}

interface GiveawayFormState {
  id: string | null
  title: string
  description: string
  rewardLabel: string
  rewardImageUrl: string
  startsAt: string
  endsAt: string
}

const EMPTY_FORM: GiveawayFormState = {
  id: null,
  title: "",
  description: "",
  rewardLabel: "",
  rewardImageUrl: "",
  startsAt: "",
  endsAt: "",
}

function toInputDateTime(value: string | null): string {
  if (!value) {
    return ""
  }

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return ""
  }

  const offset = date.getTimezoneOffset()
  const adjusted = new Date(date.getTime() - offset * 60000)
  return adjusted.toISOString().slice(0, 16)
}

export default function AdminGiveawaysPage() {
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [cards, setCards] = useState<GiveawayListItem[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [selectedDetail, setSelectedDetail] = useState<GiveawayDetail | null>(null)
  const [statusUpdating, setStatusUpdating] = useState(false)
  const [removeModalOpen, setRemoveModalOpen] = useState(false)
  const [removeReason, setRemoveReason] = useState("")
  const [participantToRemove, setParticipantToRemove] = useState<GiveawayParticipant | null>(null)
  const [form, setForm] = useState<GiveawayFormState>(EMPTY_FORM)

  const selectedCard = useMemo(
    () => cards.find((item) => item.id === selectedId) || null,
    [cards, selectedId]
  )

  const loadCards = async () => {
    setLoading(true)
    const result = await getAdminGiveaways()

    if (!result.success) {
      toast({
        title: "Failed to load giveaways",
        description: result.error || "Please try again.",
        variant: "destructive",
      })
      setCards([])
      setSelectedId(null)
      setLoading(false)
      return
    }

    const data = (result.data || []) as GiveawayListItem[]
    setCards(data)
    setSelectedId((current) => {
      if (current && data.some((entry) => entry.id === current)) {
        return current
      }

      return data[0]?.id || null
    })
    setLoading(false)
  }

  const loadDetail = async (giveawayId: string) => {
    const result = await getAdminGiveawayDetail(giveawayId)
    if (!result.success || !result.data) {
      toast({
        title: "Failed to load giveaway details",
        description: result.error || "Please try again.",
        variant: "destructive",
      })
      setSelectedDetail(null)
      return
    }

    setSelectedDetail(result.data as GiveawayDetail)
  }

  useEffect(() => {
    loadCards()
  }, [])

  useEffect(() => {
    if (!selectedId) {
      setSelectedDetail(null)
      return
    }

    loadDetail(selectedId)
  }, [selectedId])

  const resetForm = () => {
    setForm(EMPTY_FORM)
  }

  const populateFormFromSelected = () => {
    if (!selectedDetail) {
      return
    }

    setForm({
      id: selectedDetail.id,
      title: selectedDetail.title,
      description: selectedDetail.description || "",
      rewardLabel: selectedDetail.rewardLabel || "",
      rewardImageUrl: selectedDetail.rewardImageUrl || "",
      startsAt: toInputDateTime(selectedDetail.startsAt),
      endsAt: toInputDateTime(selectedDetail.endsAt),
    })
  }

  const saveForm = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!form.title.trim()) {
      toast({ title: "Title is required", variant: "destructive" })
      return
    }

    setSaving(true)
    const result = form.id
      ? await updateAdminGiveaway({
          id: form.id,
          title: form.title,
          description: form.description,
          rewardLabel: form.rewardLabel,
          rewardImageUrl: form.rewardImageUrl,
          startsAt: form.startsAt || null,
          endsAt: form.endsAt || null,
        })
      : await createAdminGiveaway({
          title: form.title,
          description: form.description,
          rewardLabel: form.rewardLabel,
          rewardImageUrl: form.rewardImageUrl,
          startsAt: form.startsAt || null,
          endsAt: form.endsAt || null,
        })

    setSaving(false)

    if (!result.success) {
      toast({
        title: form.id ? "Failed to update giveaway" : "Failed to create giveaway",
        description: result.error || "Please try again.",
        variant: "destructive",
      })
      return
    }

    toast({ title: form.id ? "Giveaway updated" : "Giveaway created" })
    await loadCards()
    if (result.data?.id) {
      setSelectedId(result.data.id)
    }
    resetForm()
  }

  const updateStatus = async (action: "activate" | "pause" | "resume" | "cancel" | "end") => {
    if (!selectedDetail) {
      return
    }

    setStatusUpdating(true)
    let result

    if (action === "activate") {
      result = await setAdminGiveawayStatus(selectedDetail.id, "ACTIVE")
    } else if (action === "pause") {
      result = await deactivateAdminGiveaway(selectedDetail.id)
    } else if (action === "resume") {
      result = await resumeAdminGiveaway(selectedDetail.id)
    } else if (action === "cancel") {
      result = await setAdminGiveawayStatus(selectedDetail.id, "CANCELLED")
    } else {
      result = await endAdminGiveawayEarly(selectedDetail.id, true)
    }

    setStatusUpdating(false)

    if (!result.success) {
      toast({
        title: "Status update failed",
        description: result.error || "Please try again.",
        variant: "destructive",
      })
      return
    }

    toast({ title: "Giveaway status updated" })
    await loadCards()
    await loadDetail(selectedDetail.id)
  }

  const openRemoveParticipantModal = (participant: GiveawayParticipant) => {
    setParticipantToRemove(participant)
    setRemoveReason("")
    setRemoveModalOpen(true)
  }

  const confirmRemoveParticipant = async () => {
    if (!selectedDetail || !participantToRemove || !removeReason.trim()) {
      return
    }

    const result = await removeAdminGiveawayParticipant({
      giveawayId: selectedDetail.id,
      userId: participantToRemove.userId,
      reason: removeReason.trim(),
    })

    if (!result.success) {
      toast({
        title: "Failed to remove participant",
        description: result.error || "Please try again.",
        variant: "destructive",
      })
      return
    }

    toast({ title: "Participant removed" })
    setRemoveModalOpen(false)
    setParticipantToRemove(null)
    setRemoveReason("")
    await loadCards()
    await loadDetail(selectedDetail.id)
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Giveaway Management</h1>
        <p className="text-muted-foreground">Create giveaways, manage participants, and control lifecycle states.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols">
        <div className="space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>{form.id ? "Edit Giveaway" : "Create Giveaway"}</CardTitle>
              <div className="flex gap-2">
                <Button type="button" variant="outline" size="sm" onClick={populateFormFromSelected} disabled={!selectedDetail}>
                  Edit Selected
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={resetForm}>
                  New
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <form onSubmit={saveForm} className="grid gap-4 lg:grid-cols-2">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="title">Title</Label>
                    <Input
                      id="title"
                      value={form.title}
                      onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))}
                      placeholder="Weekly top traders draw"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="rewardLabel">Reward label</Label>
                    <Input
                      id="rewardLabel"
                      value={form.rewardLabel}
                      onChange={(event) => setForm((prev) => ({ ...prev, rewardLabel: event.target.value }))}
                      placeholder="1,000 Robux"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      value={form.description}
                      onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
                      rows={4}
                      placeholder="Describe eligibility and prize distribution details."
                    />
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="startsAt">Starts at</Label>
                      <Input
                        id="startsAt"
                        type="datetime-local"
                        value={form.startsAt}
                        onChange={(event) => setForm((prev) => ({ ...prev, startsAt: event.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="endsAt">Ends at</Label>
                      <Input
                        id="endsAt"
                        type="datetime-local"
                        value={form.endsAt}
                        onChange={(event) => setForm((prev) => ({ ...prev, endsAt: event.target.value }))}
                      />
                    </div>
                  </div>
                  <Button type="submit" disabled={saving}>
                    {saving ? "Saving..." : form.id ? "Update Giveaway" : "Create Giveaway"}
                  </Button>
                </div>

                <div className="space-y-3">
                  <Label>Reward image</Label>
                  <FileUpload
                    endpoint="giveawayImage"
                    value={form.rewardImageUrl || null}
                    onChange={(url) => setForm((prev) => ({ ...prev, rewardImageUrl: url || "" }))}
                  />
                  <div className="rounded-md border p-3 text-sm text-muted-foreground">
                    <p className="font-medium text-foreground mb-2">Preview</p>
                    {form.rewardImageUrl ? (
                      <img src={form.rewardImageUrl} alt="Giveaway reward preview" className="h-40 w-full rounded-md border object-cover" />
                    ) : (
                      <div className="flex h-40 items-center justify-center rounded-md border bg-muted">No image selected</div>
                    )}
                  </div>
                </div>
              </form>
            </CardContent>
          </Card>
        
        <div className="flex flex-row w-full gap-6">
          <Card className="w-full">
            <CardHeader>
              <CardTitle>Existing Giveaways</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <p className="text-sm text-muted-foreground">Loading giveaways...</p>
              ) : cards.length === 0 ? (
                <p className="text-sm text-muted-foreground">No giveaways found.</p>
              ) : (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {cards.map((entry) => {
                    const isSelected = selectedId === entry.id
                    return (
                      <button key={entry.id} type="button" className="text-left" onClick={() => setSelectedId(entry.id)}>
                        <Card
                          className={`h-[260px] overflow-hidden transition-colors ${
                            isSelected ? "border-primary bg-primary/5" : "hover:border-primary/50"
                          }`}
                        >
                          <div className="h-28 bg-muted">
                            {entry.rewardImageUrl ? (
                              <img src={entry.rewardImageUrl} alt="Reward" className="h-full w-full object-cover" />
                            ) : (
                              <div className="flex h-full items-center justify-center text-xs text-muted-foreground">No image</div>
                            )}
                          </div>
                          <CardContent className="space-y-2 p-4">
                            <div className="flex items-center justify-between gap-2">
                              <Badge variant="outline">{entry.status}</Badge>
                              <span className="text-xs text-muted-foreground">{entry.entriesCount} entries</span>
                            </div>
                            <p className="line-clamp-2 text-sm font-medium">{entry.title}</p>
                            <p className="line-clamp-2 text-xs text-muted-foreground">{entry.rewardLabel || entry.description || "No details"}</p>
                          </CardContent>
                        </Card>
                      </button>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="h-[calc(100vh-7rem)] overflow-hidden lg:sticky lg:top-24 w-[750px]">
            <CardHeader>
                <CardTitle>Giveaway Details</CardTitle>
            </CardHeader>
            <CardContent className="h-[calc(100%-5rem)] p-0">
                {!selectedDetail || !selectedCard ? (
                <div className="p-6 text-sm text-muted-foreground">Select a giveaway card to view details.</div>
                ) : (
                <ScrollArea className="h-full px-6 pb-6">
                    <div className="space-y-4">
                    <div className="space-y-1">
                        <p className="text-lg font-semibold">{selectedDetail.title}</p>
                        <p className="text-sm text-muted-foreground">Created by: {selectedDetail.createdByUsername || "Unknown"}</p>
                    </div>

                    {selectedDetail.rewardImageUrl && (
                        <img src={selectedDetail.rewardImageUrl} alt="Reward" className="h-40 w-full rounded-md border object-cover" />
                    )}

                    <div className="grid grid-cols-2 gap-3 text-sm">
                        <div>
                        <p className="font-medium">Status</p>
                        <p className="text-muted-foreground">{selectedDetail.status}</p>
                        </div>
                        <div>
                        <p className="font-medium">Participants</p>
                        <p className="text-muted-foreground">{selectedDetail.participants.length}</p>
                        </div>
                        <div>
                        <p className="font-medium">Starts</p>
                        <p className="text-muted-foreground">{selectedDetail.startsAt ? new Date(selectedDetail.startsAt).toLocaleString() : "Not set"}</p>
                        </div>
                        <div>
                        <p className="font-medium">Ends</p>
                        <p className="text-muted-foreground">{selectedDetail.endsAt ? new Date(selectedDetail.endsAt).toLocaleString() : "Not set"}</p>
                        </div>
                    </div>

                    <div>
                        <p className="text-sm font-medium">Description</p>
                        <p className="text-sm text-muted-foreground whitespace-pre-wrap">{selectedDetail.description || "No description"}</p>
                    </div>

                    <div>
                        <p className="text-sm font-medium mb-2">Participants</p>
                        {selectedDetail.participants.length === 0 ? (
                        <p className="text-sm text-muted-foreground">No participants yet.</p>
                        ) : (
                        <div className="space-y-2">
                            {selectedDetail.participants.map((participant) => (
                            <div key={participant.id} className="flex items-center justify-between rounded-md border p-2">
                                <div>
                                <p className="text-sm font-medium">{participant.username}</p>
                                <p className="text-xs text-muted-foreground">{participant.email}</p>
                                </div>
                                <Button
                                type="button"
                                variant="destructive"
                                size="sm"
                                onClick={() => openRemoveParticipantModal(participant)}
                                >
                                Remove
                                </Button>
                            </div>
                            ))}
                        </div>
                        )}
                    </div>

                    <div className="space-y-2 border-t pt-3">
                        <p className="text-sm font-medium">Lifecycle actions</p>
                        <div className="flex flex-wrap gap-2">
                        {selectedDetail.status === "QUEUED" && (
                            <Button type="button" variant="outline" onClick={() => updateStatus("activate")} disabled={statusUpdating}>
                            Activate
                            </Button>
                        )}

                        {selectedDetail.status === "ACTIVE" && (
                            <Button type="button" variant="outline" onClick={() => updateStatus("pause")} disabled={statusUpdating}>
                            Deactivate
                            </Button>
                        )}

                        {selectedDetail.status === "PAUSED" && (
                            <Button type="button" variant="outline" onClick={() => updateStatus("resume")} disabled={statusUpdating}>
                            Resume
                            </Button>
                        )}

                        {(selectedDetail.status === "ACTIVE" || selectedDetail.status === "PAUSED") && (
                            <Button type="button" variant="destructive" onClick={() => updateStatus("end")} disabled={statusUpdating}>
                            End Early
                            </Button>
                        )}

                        {selectedDetail.status !== "CANCELLED" && selectedDetail.status !== "COMPLETED" && (
                            <Button type="button" variant="ghost" onClick={() => updateStatus("cancel")} disabled={statusUpdating}>
                            Cancel
                            </Button>
                        )}
                        </div>
                    </div>
                    </div>
                </ScrollArea>
                )}
            </CardContent>
          </Card>
        </div>
        </div>
      </div>

      <Dialog open={removeModalOpen} onOpenChange={setRemoveModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove Participant</DialogTitle>
            <DialogDescription>
              Provide a required reason. The user will be notified about this removal.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="removeReason">Reason</Label>
            <Textarea
              id="removeReason"
              value={removeReason}
              onChange={(event) => setRemoveReason(event.target.value)}
              placeholder="Reason for removal"
              rows={4}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setRemoveModalOpen(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={!removeReason.trim() || !participantToRemove}
              onClick={confirmRemoveParticipant}
            >
              Remove Participant
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
