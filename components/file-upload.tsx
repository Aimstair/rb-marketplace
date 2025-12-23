"use client"

import { useState } from "react"
import { UploadDropzone } from "@uploadthing/react"
import { OurFileRouter } from "@/app/api/uploadthing/core"
import { X } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { Button } from "@/components/ui/button"

interface FileUploadProps {
  endpoint: keyof OurFileRouter
  value: string | null
  onChange: (url: string | null) => void
  onRemove?: () => void
}

export function FileUpload({ endpoint, value, onChange, onRemove }: FileUploadProps) {
  const { toast } = useToast()
  const [isUploading, setIsUploading] = useState(false)

  // Show preview if value exists and is not empty
  if (value && value.trim() !== "") {
    return (
      <div className="relative inline-block w-full">
        <div className="aspect-video w-full rounded-lg overflow-hidden border-2 border-border bg-muted flex items-center justify-center">
          <img src={value} alt="Uploaded content" className="w-full h-full object-cover" />
        </div>
        <Button
          type="button"
          variant="destructive"
          size="icon"
          className="absolute top-2 right-2"
          onClick={() => {
            onChange(null)
            onRemove?.()
          }}
        >
          <X className="w-4 h-4" />
        </Button>
      </div>
    )
  }

  return (
    <div className="w-full">
      <UploadDropzone<OurFileRouter>
        endpoint={endpoint}
        onClientUploadComplete={(res) => {
          if (res && res.length > 0) {
            onChange(res[0].url)
            toast({
              title: "Success",
              description: "File uploaded successfully",
            })
          }
        }}
        onUploadError={(error: Error) => {
          toast({
            title: "Error",
            description: error.message || "Failed to upload file",
            variant: "destructive",
          })
        }}
        onUploadBegin={() => {
          setIsUploading(true)
        }}
        onDrop={() => {
          setIsUploading(false)
        }}
        appearance={{
          button:
            "bg-primary text-primary-foreground hover:bg-primary/90 ut-uploading:bg-primary/50 ut-uploading:cursor-not-allowed after:bg-primary",
          allowedContent: "flex h-16 flex-col items-center justify-center px-2 text-primary",
          label: "text-sm font-semibold text-foreground",
          container: "w-full rounded-lg border-2 border-dashed border-border bg-background ut-uploading:border-primary ut-uploading:bg-primary/5 transition-colors",
          uploadIcon: "text-muted-foreground",
        }}
      />
    </div>
  )
}
