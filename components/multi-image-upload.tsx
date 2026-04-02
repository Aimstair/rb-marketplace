"use client"

import { useMemo } from "react"
import { UploadDropzone } from "@uploadthing/react"
import type { OurFileRouter } from "@/app/api/uploadthing/core"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import { X } from "lucide-react"

interface MultiImageUploadProps {
  endpoint: keyof OurFileRouter
  values: string[]
  onChange: (urls: string[]) => void
  maxImages?: number
}

export function MultiImageUpload({ endpoint, values, onChange, maxImages = 8 }: MultiImageUploadProps) {
  const { toast } = useToast()

  const canUploadMore = useMemo(() => values.length < maxImages, [values.length, maxImages])

  const handleRemove = (urlToRemove: string) => {
    onChange(values.filter((url) => url !== urlToRemove))
  }

  return (
    <div className="space-y-3">
      {canUploadMore && (
        <UploadDropzone<OurFileRouter, keyof OurFileRouter>
          endpoint={endpoint}
          onClientUploadComplete={(res) => {
            const uploadedUrls = (res || []).map((file) => file.url).filter(Boolean)
            if (uploadedUrls.length === 0) {
              return
            }

            const merged = Array.from(new Set([...values, ...uploadedUrls])).slice(0, maxImages)
            onChange(merged)
            toast({
              title: "Photos uploaded",
              description: `${uploadedUrls.length} image(s) uploaded successfully.`,
            })
          }}
          onUploadError={(error: Error) => {
            toast({
              title: "Upload failed",
              description: error.message || "Failed to upload image.",
              variant: "destructive",
            })
          }}
          appearance={{
            button:
              "bg-primary text-primary-foreground hover:bg-primary/90 ut-uploading:bg-primary/60 after:bg-primary",
            allowedContent: "text-primary",
            label: "text-sm font-semibold text-foreground",
            container:
              "w-full rounded-lg border-2 border-dashed border-border bg-background transition-colors ut-uploading:border-primary ut-uploading:bg-primary/5",
            uploadIcon: "text-muted-foreground",
          }}
        />
      )}

      {values.length > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {values.map((url) => (
            <div key={url} className="relative overflow-hidden rounded-md border bg-muted">
              <img src={url} alt="Uploaded evidence" className="h-24 w-full object-cover" />
              <Button
                type="button"
                variant="destructive"
                size="icon"
                className="absolute right-1 top-1 h-7 w-7"
                onClick={() => handleRemove(url)}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          ))}
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        {values.length}/{maxImages} uploaded
      </p>
    </div>
  )
}
