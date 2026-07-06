"use client"

import { useEffect, useMemo, useState } from "react"
import { Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"

interface ImageCropDialogProps {
  open: boolean
  imageUrl: string | null
  sourceFile: File | null
  aspectRatio: number
  aspectRatioLabel: string
  outputWidth: number
  outputHeight: number
  title: string
  description?: string
  confirming?: boolean
  onCancel: () => void
  onConfirm: (croppedFile: File) => Promise<void>
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error("Failed to load the selected image"))
    image.src = url
  })
}

function getFileBaseName(fileName: string): string {
  const dotIndex = fileName.lastIndexOf(".")
  if (dotIndex <= 0) {
    return fileName
  }

  return fileName.slice(0, dotIndex)
}

async function buildCroppedFile({
  sourceUrl,
  sourceFile,
  aspectRatio,
  outputWidth,
  outputHeight,
  zoom,
  offsetX,
  offsetY,
}: {
  sourceUrl: string
  sourceFile: File
  aspectRatio: number
  outputWidth: number
  outputHeight: number
  zoom: number
  offsetX: number
  offsetY: number
}): Promise<File> {
  const image = await loadImage(sourceUrl)
  const imageWidth = image.naturalWidth
  const imageHeight = image.naturalHeight

  let baseCropWidth = imageWidth
  let baseCropHeight = imageWidth / aspectRatio

  if (baseCropHeight > imageHeight) {
    baseCropHeight = imageHeight
    baseCropWidth = imageHeight * aspectRatio
  }

  const cropWidth = baseCropWidth / zoom
  const cropHeight = baseCropHeight / zoom

  const centeredX = (imageWidth - cropWidth) / 2
  const centeredY = (imageHeight - cropHeight) / 2
  const maxShiftX = Math.max(0, centeredX)
  const maxShiftY = Math.max(0, centeredY)

  const sourceX = Math.min(
    Math.max(0, centeredX + offsetX * maxShiftX),
    Math.max(0, imageWidth - cropWidth)
  )
  const sourceY = Math.min(
    Math.max(0, centeredY + offsetY * maxShiftY),
    Math.max(0, imageHeight - cropHeight)
  )

  const canvas = document.createElement("canvas")
  canvas.width = outputWidth
  canvas.height = outputHeight

  const context = canvas.getContext("2d")
  if (!context) {
    throw new Error("Failed to prepare image crop canvas")
  }

  context.drawImage(
    image,
    sourceX,
    sourceY,
    cropWidth,
    cropHeight,
    0,
    0,
    outputWidth,
    outputHeight
  )

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (result) => {
        if (!result) {
          reject(new Error("Failed to generate cropped image"))
          return
        }

        resolve(result)
      },
      "image/webp",
      0.80
    )
  })

  const normalizedName = `${getFileBaseName(sourceFile.name)}-cropped.webp`
  return new File([blob], normalizedName, {
    type: "image/webp",
    lastModified: Date.now(),
  })
}

export function ImageCropDialog({
  open,
  imageUrl,
  sourceFile,
  aspectRatio,
  aspectRatioLabel,
  outputWidth,
  outputHeight,
  title,
  description,
  confirming = false,
  onCancel,
  onConfirm,
}: ImageCropDialogProps) {
  const [zoom, setZoom] = useState(1)
  const [offsetX, setOffsetX] = useState(0)
  const [offsetY, setOffsetY] = useState(0)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  useEffect(() => {
    if (!open) {
      return
    }

    setZoom(1)
    setOffsetX(0)
    setOffsetY(0)
    setErrorMessage(null)
  }, [open, imageUrl])

  const hasImage = Boolean(imageUrl && sourceFile)

  const previewTransform = useMemo(() => {
    return `translate(${offsetX * 50}%, ${offsetY * 50}%) scale(${zoom})`
  }, [offsetX, offsetY, zoom])

  const handleConfirm = async () => {
    if (!imageUrl || !sourceFile) {
      setErrorMessage("Please choose an image first.")
      return
    }

    setErrorMessage(null)

    try {
      const croppedFile = await buildCroppedFile({
        sourceUrl: imageUrl,
        sourceFile,
        aspectRatio,
        outputWidth,
        outputHeight,
        zoom,
        offsetX,
        offsetY,
      })

      await onConfirm(croppedFile)
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to crop image"
      setErrorMessage(message)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && !confirming && onCancel()}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            {description || "Position your image inside the frame to match the required display size."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-md border bg-muted/30 p-2">
            <div className="relative w-full overflow-hidden rounded-md bg-black/80" style={{ aspectRatio }}>
              {hasImage ? (
                <img
                  src={imageUrl || ""}
                  alt="Crop preview"
                  className="h-full w-full select-none object-cover"
                  style={{ transform: previewTransform }}
                  draggable={false}
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-sm text-muted-foreground">
                  No image selected
                </div>
              )}
            </div>
          </div>

          <div className="rounded-md border p-3 text-sm text-muted-foreground">
            <p>
              Required ratio: <span className="font-medium text-foreground">{aspectRatioLabel}</span>
            </p>
            <p>
              Output size: <span className="font-medium text-foreground">{outputWidth} x {outputHeight}</span>
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label>Zoom</Label>
              <Slider
                min={1}
                max={3}
                step={0.01}
                value={[zoom]}
                onValueChange={(value) => setZoom(value[0] || 1)}
                disabled={confirming}
              />
            </div>
            <div className="space-y-2">
              <Label>Horizontal Position</Label>
              <Slider
                min={-1}
                max={1}
                step={0.01}
                value={[offsetX]}
                onValueChange={(value) => setOffsetX(value[0] || 0)}
                disabled={confirming}
              />
            </div>
            <div className="space-y-2">
              <Label>Vertical Position</Label>
              <Slider
                min={-1}
                max={1}
                step={0.01}
                value={[offsetY]}
                onValueChange={(value) => setOffsetY(value[0] || 0)}
                disabled={confirming}
              />
            </div>
          </div>

          {errorMessage && <p className="text-sm text-destructive">{errorMessage}</p>}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onCancel} disabled={confirming}>
            Cancel
          </Button>
          <Button type="button" onClick={() => void handleConfirm()} disabled={confirming || !hasImage}>
            {confirming ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Uploading...
              </>
            ) : (
              "Crop and Upload"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
