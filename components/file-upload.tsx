"use client"

import { useEffect, useRef, useState } from "react"
import { UploadDropzone } from "@uploadthing/react"
import type { OurFileRouter } from "@/app/api/uploadthing/core"
import { Loader2, Upload, X } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { Button } from "@/components/ui/button"
import { ImageCropDialog } from "@/components/image-crop-dialog"
import { IMAGE_CROP_PRESETS, type ImageCropPreset } from "@/lib/image-upload-presets"
import { useUploadThing } from "@/lib/uploadthing-client"

interface FileUploadProps {
  endpoint: keyof OurFileRouter
  value: string | null
  onChange: (url: string | null) => void
  onRemove?: () => void
  cropPreset?: ImageCropPreset
}

export function FileUpload({ endpoint, value, onChange, onRemove, cropPreset }: FileUploadProps) {
  const { toast } = useToast()
  const [isDropzoneUploading, setIsDropzoneUploading] = useState(false)
  const [isCropUploading, setIsCropUploading] = useState(false)
  const [cropDialogOpen, setCropDialogOpen] = useState(false)
  const [cropSourceFile, setCropSourceFile] = useState<File | null>(null)
  const [cropSourceUrl, setCropSourceUrl] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const cropConfig = cropPreset ? IMAGE_CROP_PRESETS[cropPreset] : null

  const { startUpload, isUploading } = useUploadThing(endpoint)

  useEffect(() => {
    return () => {
      if (cropSourceUrl) {
        URL.revokeObjectURL(cropSourceUrl)
      }
    }
  }, [cropSourceUrl])

  const closeCropDialog = () => {
    setCropDialogOpen(false)
    setCropSourceFile(null)
    setCropSourceUrl((current) => {
      if (current) {
        URL.revokeObjectURL(current)
      }
      return null
    })
  }

  const openImagePicker = () => {
    fileInputRef.current?.click()
  }

  const handleCropFileSelected = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selected = event.target.files?.[0]
    event.target.value = ""

    if (!selected) {
      return
    }

    if (!selected.type.startsWith("image/")) {
      toast({
        title: "Invalid file",
        description: "Please select an image file.",
        variant: "destructive",
      })
      return
    }

    if (cropSourceUrl) {
      URL.revokeObjectURL(cropSourceUrl)
    }

    setCropSourceFile(selected)
    setCropSourceUrl(URL.createObjectURL(selected))
    setCropDialogOpen(true)
  }

  const handleCropConfirm = async (croppedFile: File) => {
    setIsCropUploading(true)

    try {
      const uploadResult = await startUpload([croppedFile])
      const uploadedUrl = uploadResult?.[0]?.url

      if (!uploadedUrl) {
        throw new Error("Upload completed without a file URL")
      }

      onChange(uploadedUrl)
      closeCropDialog()

      toast({
        title: "Success",
        description: `${cropConfig?.label || "Image"} uploaded successfully`,
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to upload image"
      toast({
        title: "Upload failed",
        description: message,
        variant: "destructive",
      })
      throw error
    } finally {
      setIsCropUploading(false)
    }
  }

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

  if (cropConfig) {
    return (
      <div className="space-y-3">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleCropFileSelected}
          disabled={isUploading || isCropUploading}
        />

        <div className="w-full rounded-lg border-2 border-dashed border-border bg-background p-5">
          <div className="flex flex-col items-center justify-center gap-3 text-center">
            <div className="rounded-full bg-primary/10 p-3 text-primary">
              <Upload className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">Upload and crop image</p>
              <p className="text-xs text-muted-foreground">{cropConfig.helperText}</p>
            </div>
            <Button
              type="button"
              onClick={openImagePicker}
              disabled={isUploading || isCropUploading}
            >
              {isUploading || isCropUploading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Uploading...
                </>
              ) : (
                "Choose Image"
              )}
            </Button>
          </div>
        </div>

        <ImageCropDialog
          open={cropDialogOpen}
          imageUrl={cropSourceUrl}
          sourceFile={cropSourceFile}
          aspectRatio={cropConfig.aspectRatio}
          aspectRatioLabel={cropConfig.aspectRatioLabel}
          outputWidth={cropConfig.outputWidth}
          outputHeight={cropConfig.outputHeight}
          title={`Crop ${cropConfig.label}`}
          description={`Cropping is required to match the ${cropConfig.aspectRatioLabel} display slot.`}
          confirming={isUploading || isCropUploading}
          onCancel={closeCropDialog}
          onConfirm={handleCropConfirm}
        />
      </div>
    )
  }

  return (
    <div className="w-full">
      <UploadDropzone<OurFileRouter, keyof OurFileRouter>
        endpoint={endpoint}
        onClientUploadComplete={(res) => {
          setIsDropzoneUploading(false)
          if (res && res.length > 0) {
            onChange(res[0].url)
            toast({
              title: "Success",
              description: "File uploaded successfully",
            })
          }
        }}
        onUploadError={(error: Error) => {
          setIsDropzoneUploading(false)
          toast({
            title: "Error",
            description: error.message || "Failed to upload file",
            variant: "destructive",
          })
        }}
        onUploadBegin={() => {
          setIsDropzoneUploading(true)
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
      {isDropzoneUploading && (
        <p className="mt-2 text-xs text-muted-foreground">Uploading image...</p>
      )}
    </div>
  )
}
