import { z } from "zod"

// ===== SIGNUP SCHEMAS =====
export const signUpSchema = z.object({
  username: z
    .string()
    .min(3, "Username must be at least 3 characters")
    .max(20, "Username must be at most 20 characters")
    .regex(/^[a-zA-Z0-9_-]+$/, "Username can only contain letters, numbers, underscores, and hyphens"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  confirmPassword: z.string(),
  agreeTerms: z.boolean(),
})

export type SignUpInput = z.infer<typeof signUpSchema>

export interface SignUpResult {
  success: boolean
  error?: string
  userId?: string
}

// ===== LISTING SCHEMAS =====
export const createItemListingSchema = z.object({
  title: z.string().min(5, "Title must be at least 5 characters").max(100, "Title must be at most 100 characters"),
  description: z.string().min(10, "Description must be at least 10 characters").max(2000, "Description must be at most 2000 characters"),
  category: z.enum(["Accessories", "Games", "Accounts"]),
  game: z.string().min(1, "Please select a game"),
  itemType: z.string().min(1, "Please select an item type"),
  price: z.number().min(1, "Price must be at least 1").max(1000000, "Price must be at most 1,000,000"),
  stock: z.number().min(1, "Stock must be at least 1").optional().default(1),
  image: z.string().url("Please provide a valid image URL"),
  condition: z.enum(["Mint", "New", "Used"]),
  paymentMethods: z.array(z.string()).min(1, "Select at least one payment method"),
  pricingMode: z.enum(["per-peso", "per-item"]).optional().default("per-item"),
})

export const createCurrencyListingSchema = z.object({
  game: z.string().min(1, "Please select a game"),
  currencyType: z.string().min(1, "Please select a currency type"),
  ratePerPeso: z.number().min(0.01, "Rate must be at least 0.01"),
  stock: z.number().min(1, "Stock must be at least 1"),
  minOrder: z.number().min(1, "Minimum order must be at least 1"),
  maxOrder: z.number().min(1, "Maximum order must be at least 1"),
  image: z.string().url("Please provide a valid image URL"),
  description: z.string().max(500, "Description must be at most 500 characters").optional(),
  paymentMethods: z.array(z.string()).min(1, "Select at least one payment method"),
  pricingMode: z.enum(["per-peso", "per-item"]).optional().default("per-peso"),
})

export type CreateItemListingInput = z.infer<typeof createItemListingSchema>
export type CreateCurrencyListingInput = z.infer<typeof createCurrencyListingSchema>

// ===== LISTING INTERFACES =====
export interface ListingFilters {
  search?: string
  mainCategory?: string
  selectedGame?: string
  selectedItemType?: string
  sortBy?: string
  priceRange?: {
    min: number
    max: number
  }
  page?: number
  itemsPerPage?: number
  sellerId?: string
  status?: string // e.g., "available", "sold"
  includeSold?: boolean // If true, include sold listings
}

export interface ListingResponse {
  id: string
  title: string
  listingType?: "ITEM" | "CURRENCY"
  game: string
  price: number
  image: string
  seller: {
    id: string
    username: string
  }
  vouch: number
  status: string
  category: string
  itemType: string
  condition: string
  upvotes: number
  downvotes: number
  featured: boolean
  views?: number
  inquiries?: number
}

export interface GetListingsResult {
  listings: ListingResponse[]
  total: number
  totalPages: number
  currentPage: number
}

export interface CreateListingResult {
  success: boolean
  listingId?: string
  error?: string
}

// ===== HALL OF SHAME SCHEMAS =====
const hallIdentifierTypeSchema = z.enum(["GCASH", "BANK_ACCOUNT", "PAYPAL_EMAIL", "OTHER"])

export const hallOfShameSubmissionSchema = z.object({
  incidentSummary: z
    .string()
    .min(20, "Incident summary must be at least 20 characters")
    .max(1000, "Incident summary must be at most 1000 characters"),
  transactionContext: z
    .string()
    .max(2000, "Transaction context must be at most 2000 characters")
    .optional()
    .default(""),
  incidentDate: z
    .string()
    .datetime({ offset: true })
    .or(z.string().date())
    .optional()
    .nullable(),
  amount: z.number().int().positive().optional().nullable(),
  currency: z.string().trim().min(3).max(8).optional().default("PHP"),
  aliases: z.array(z.string().trim().min(1).max(100)).min(1).max(10),
  identifiers: z
    .array(
      z.object({
        type: hallIdentifierTypeSchema,
        value: z.string().trim().min(2).max(120),
        label: z.string().trim().max(100).optional(),
      })
    )
    .min(1)
    .max(12),
  socialLinks: z
    .array(
      z.object({
        platform: z.string().trim().min(2).max(60),
        url: z.string().trim().url().max(500).optional(),
        handle: z.string().trim().max(100).optional(),
      })
    )
    .max(10)
    .optional()
    .default([]),
  evidenceUrls: z.array(z.string().trim().url().max(1000)).min(1).max(20),
})

export const hallOfShameSearchSchema = z.object({
  query: z.string().trim().max(120).optional().default(""),
  identifierType: hallIdentifierTypeSchema.or(z.literal("all")).optional().default("all"),
  page: z.number().int().min(1).optional().default(1),
  itemsPerPage: z.number().int().min(1).max(50).optional().default(10),
  pageSize: z.number().int().min(1).max(50).optional().default(10),
  sortBy: z.enum(["newest", "oldest"]).optional().default("newest"),
})

export const hallOfShameCommentCreateSchema = z.object({
  entryId: z.string().trim().min(1),
  content: z.string().trim().min(3, "Comment is too short").max(1000, "Comment is too long"),
})

export const hallOfShameCommentQuerySchema = z.object({
  entryId: z.string().trim().min(1),
  page: z.number().int().min(1).optional().default(1),
  itemsPerPage: z.number().int().min(1).max(50).optional().default(10),
  pageSize: z.number().int().min(1).max(50).optional().default(10),
})

export type HallOfShameSubmissionInput = z.infer<typeof hallOfShameSubmissionSchema>
export type HallOfShameSearchInput = z.infer<typeof hallOfShameSearchSchema>
export type HallOfShameCommentCreateInput = z.infer<typeof hallOfShameCommentCreateSchema>
export type HallOfShameCommentQueryInput = z.infer<typeof hallOfShameCommentQuerySchema>

export interface HallOfShamePublicEntry {
  id: string
  incidentSummary: string
  transactionContext?: string | null
  incidentDate?: Date | string | null
  amount?: number | null
  currency?: string | null
  aliases: string[]
  identifiers: Array<{
    type: "GCASH" | "BANK_ACCOUNT" | "PAYPAL_EMAIL" | "OTHER"
    label?: string | null
    value: string
  }>
  socialLinks: Array<{
    platform: string
    url?: string | null
    handle?: string | null
  }>
  evidenceUrls: string[]
  createdAt: Date
  publishedAt?: Date | null
}

export interface HallOfShameCommentView {
  id: string
  content: string
  createdAt: Date
  updatedAt: Date
  author: {
    id: string
    username: string
    profilePicture?: string | null
    isVerified: boolean
  }
}
