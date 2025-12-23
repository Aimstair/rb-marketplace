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

export type { ListingResponse }
export interface ListingResponse {
  id: string
  title: string
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
