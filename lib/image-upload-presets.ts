export const IMAGE_CROP_PRESETS = {
  listing: {
    label: "Listing image",
    aspectRatio: 16 / 9,
    aspectRatioLabel: "16:9",
    outputWidth: 1280,
    outputHeight: 720,
    helperText: "Crop required to 16:9. Recommended size: 1280x720.",
  },
  giveaway: {
    label: "Giveaway image",
    aspectRatio: 16 / 9,
    aspectRatioLabel: "16:9",
    outputWidth: 1280,
    outputHeight: 720,
    helperText: "Crop required to 16:9. Recommended size: 1280x720.",
  },
} as const

export type ImageCropPreset = keyof typeof IMAGE_CROP_PRESETS
