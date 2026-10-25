"use client"

import { useEffect, useRef, useState } from "react"
import { ImagePlus, Loader2, X } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { useUploadThing } from "@/lib/uploadthing-client"
import { cn } from "@/lib/utils"

const MAX_FILE_BYTES = 4 * 1024 * 1024

interface PendingImage {
  id: string
  preview: string
}

/**
 * Picks, uploads and orders listing photos. The first image is the cover shown on cards;
 * photos can be dragged to reorder or promoted with "Make cover".
 */
export function ListingImageUploader({
  value,
  onChange,
  max = 8,
  invalid,
}: {
  value: string[]
  onChange: (urls: string[]) => void
  max?: number
  invalid?: boolean
}) {
  const { toast } = useToast()
  const inputRef = useRef<HTMLInputElement>(null)
  const [pending, setPending] = useState<PendingImage[]>([])
  const [dragIndex, setDragIndex] = useState<number | null>(null)
  const [dropActive, setDropActive] = useState(false)
  // Uploads finish after renders; read the latest list instead of a stale closure
  const valueRef = useRef(value)
  valueRef.current = value

  const { startUpload } = useUploadThing("listingImage")

  useEffect(() => () => pending.forEach((p) => URL.revokeObjectURL(p.preview)), []) // eslint-disable-line react-hooks/exhaustive-deps

  const slotsLeft = max - value.length - pending.length

  const addFiles = async (fileList: FileList | File[]) => {
    const images = Array.from(fileList).filter((f) => f.type.startsWith("image/"))
    const tooBig = images.filter((f) => f.size > MAX_FILE_BYTES)
    const accepted = images.filter((f) => f.size <= MAX_FILE_BYTES).slice(0, Math.max(slotsLeft, 0))

    if (tooBig.length > 0) {
      toast({ title: "Image too large", description: "Each photo must be 4 MB or smaller.", variant: "destructive" })
    }
    if (images.length - tooBig.length > accepted.length) {
      toast({ title: `Up to ${max} photos`, description: "Some photos were left out." })
    }
    if (accepted.length === 0) return

    const batch = accepted.map((file) => ({ id: crypto.randomUUID(), preview: URL.createObjectURL(file) }))
    setPending((prev) => [...prev, ...batch])

    try {
      const result = await startUpload(accepted)
      const urls = (result ?? []).map((r) => r.url).filter(Boolean)
      if (urls.length === 0) throw new Error("Upload finished without any images")
      onChange([...valueRef.current, ...urls].slice(0, max))
    } catch (error) {
      toast({
        title: "Upload failed",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      })
    } finally {
      setPending((prev) => prev.filter((p) => !batch.some((b) => b.id === p.id)))
      batch.forEach((b) => URL.revokeObjectURL(b.preview))
    }
  }

  const remove = (index: number) => onChange(value.filter((_, i) => i !== index))

  const move = (from: number, to: number) => {
    if (from === to) return
    const next = [...value]
    const [item] = next.splice(from, 1)
    next.splice(to, 0, item)
    onChange(next)
  }

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => {
          if (e.target.files) addFiles(e.target.files)
          e.target.value = ""
        }}
      />

      {value.length === 0 && pending.length === 0 ? (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault()
            setDropActive(true)
          }}
          onDragLeave={() => setDropActive(false)}
          onDrop={(e) => {
            e.preventDefault()
            setDropActive(false)
            addFiles(e.dataTransfer.files)
          }}
          className={cn(
            "flex w-full flex-col items-center justify-center gap-3 rounded-[16px] border border-dashed px-6 py-12 text-center transition-colors",
            dropActive ? "border-link bg-link/[0.06]" : "border-white/[0.16] bg-secondary/40 hover:bg-secondary/70",
            invalid && "border-destructive/60",
          )}
        >
          <span className="grid size-12 place-items-center rounded-full bg-secondary text-link">
            <ImagePlus className="size-5" strokeWidth={1.75} />
          </span>
          <span>
            <span className="block text-[15px] font-semibold">Add photos</span>
            <span className="mt-1 block text-[13px] text-muted-foreground">
              {max === 1
                ? "Drag and drop or tap to choose. One photo, up to 4 MB."
                : `Drag and drop or tap to choose. Up to ${max} photos, 4 MB each.`}
            </span>
          </span>
        </button>
      ) : (
        <ul
          className="grid grid-cols-3 gap-2.5 sm:grid-cols-4"
          onDragOver={(e) => {
            if (dragIndex === null && e.dataTransfer.types.includes("Files")) {
              e.preventDefault()
            }
          }}
          onDrop={(e) => {
            if (dragIndex === null && e.dataTransfer.files.length > 0) {
              e.preventDefault()
              addFiles(e.dataTransfer.files)
            }
          }}
        >
          {value.map((url, index) => (
            <li
              key={url}
              draggable
              onDragStart={() => setDragIndex(index)}
              onDragEnd={() => setDragIndex(null)}
              onDragOver={(e) => {
                if (dragIndex !== null) e.preventDefault()
              }}
              onDrop={(e) => {
                if (dragIndex === null) return
                e.preventDefault()
                move(dragIndex, index)
                setDragIndex(null)
              }}
              className={cn(
                "group relative aspect-square cursor-grab overflow-hidden rounded-[14px] bg-secondary active:cursor-grabbing",
                dragIndex === index && "opacity-40",
              )}
            >
              <img src={url} alt={`Photo ${index + 1}`} className="h-full w-full object-contain p-[6%]" draggable={false} />
              {index === 0 ? (
                <span className="absolute left-2 top-2 rounded-full bg-black/65 px-2 py-0.5 text-[11px] font-medium">
                  Cover
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => move(index, 0)}
                  className="absolute bottom-2 left-2 rounded-full bg-black/65 px-2 py-0.5 text-[11px] font-medium opacity-100 transition-opacity hover:bg-black/80 sm:opacity-0 sm:group-hover:opacity-100 sm:focus-visible:opacity-100"
                >
                  Make cover
                </button>
              )}
              <button
                type="button"
                onClick={() => remove(index)}
                aria-label={`Remove photo ${index + 1}`}
                className="absolute right-2 top-2 grid size-7 place-items-center rounded-full bg-black/65 transition-colors hover:bg-black/85"
              >
                <X className="size-3.5" strokeWidth={2} />
              </button>
            </li>
          ))}

          {pending.map((p) => (
            <li key={p.id} className="relative aspect-square overflow-hidden rounded-[14px] bg-secondary">
              <img src={p.preview} alt="" className="h-full w-full object-contain p-[6%] opacity-40" />
              <Loader2 className="absolute inset-0 m-auto size-6 animate-spin text-foreground" strokeWidth={1.75} />
            </li>
          ))}

          {slotsLeft > 0 && (
            <li>
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                className="flex aspect-square w-full flex-col items-center justify-center gap-1.5 rounded-[14px] border border-dashed border-white/[0.16] text-[13px] text-muted-foreground transition-colors hover:bg-secondary/60 hover:text-foreground"
              >
                <ImagePlus className="size-5" strokeWidth={1.5} />
                Add
              </button>
            </li>
          )}
        </ul>
      )}

      <p className="mt-2.5 text-[13px] text-muted-foreground">
        {value.length > 0 && max > 1
          ? `${value.length} of ${max} photos. Drag to reorder; the first photo is the cover.`
          : "Show the item clearly. Screenshots from your inventory work best."}
      </p>
    </div>
  )
}
