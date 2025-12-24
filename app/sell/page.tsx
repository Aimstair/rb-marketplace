"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { X, Plus, Coins, Package } from "lucide-react"
import Navigation from "@/components/navigation"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { FileUpload } from "@/components/file-upload"
import Link from "next/link"
import { useAuth } from "@/lib/auth-context"
import { createListing, createCurrencyListing, createNewCurrencyListing, getFilterOptions } from "@/app/actions/listings"
import { getGames, getCurrenciesForGame, getCategories, getItemTypesForGameAndCategory, type GameOption, type CurrencyOption, type GameItemOption } from "@/app/actions/games"

const paymentMethods = ["GCash", "PayPal", "Robux Gift Cards", "Cross-Trade", "Venmo"]

export default function SellPage() {
  const { user } = useAuth()
  const router = useRouter()

  // Dynamic filter states
  const [categories, setCategories] = useState<{ label: string; value: string }[]>([])
  const [games, setGames] = useState<{ label: string; value: string }[]>([])
  const [itemTypes, setItemTypes] = useState<{ label: string; value: string }[]>([])
  const [conditions, setConditions] = useState<{ label: string; value: string }[]>([])
  
  // New states for games and currencies from database
  const [availableGames, setAvailableGames] = useState<GameOption[]>([])
  const [availableCurrencies, setAvailableCurrencies] = useState<CurrencyOption[]>([])
  const [availableCategories, setAvailableCategories] = useState<string[]>([])
  const [availableItemTypes, setAvailableItemTypes] = useState<GameItemOption[]>([])

  useEffect(() => {
    if (!user) {
      router.push("/auth/login?redirect=/sell")
    }
  }, [user, router])

  // Fetch filter options on mount
  useEffect(() => {
    const fetchFilters = async () => {
      try {
        const [categoriesData, gamesData, itemTypesData, conditionsData, dbGames, dbCategories] = await Promise.all([
          getFilterOptions("CATEGORY"),
          getFilterOptions("GAME"),
          getFilterOptions("ITEM_TYPE"),
          getFilterOptions("CONDITION"),
          getGames(),
          getCategories(),
        ])
        setCategories(categoriesData)
        setGames(gamesData)
        setItemTypes(itemTypesData)
        setConditions(conditionsData)
        setAvailableGames(dbGames)
        setAvailableCategories(dbCategories)
      } catch (error) {
        console.error("Error fetching filter options:", error)
      }
    }
    fetchFilters()
  }, [])

  const [listingType, setListingType] = useState<"item" | "currency">("item")

  const [itemFormData, setItemFormData] = useState({
    title: "",
    description: "",
    category: "",
    itemType: "",
    game: "",
    price: "",
    stock: "1",
    pricingMode: "per-item" as "per-peso" | "per-item",
    image: "",
    images: [] as File[],
    paymentMethods: [] as string[],
    hasProof: false,
  })

  const [currencyFormData, setCurrencyFormData] = useState({
    game: "",
    currencyType: "",
    ratePerPeso: "",
    stock: "",
    pricingMode: "per-peso" as "per-peso" | "per-item",
    image: "",
    description: "",
    paymentMethods: [] as string[],
  })

  const [imagePreview, setImagePreview] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  
  // Field-specific errors
  const [itemErrors, setItemErrors] = useState<Record<string, string>>({})
  const [currencyErrors, setCurrencyErrors] = useState<Record<string, string>>({})

  // Fetch currencies when game is selected
  useEffect(() => {
    const fetchCurrencies = async () => {
      if (currencyFormData.game) {
        try {
          const currencies = await getCurrenciesForGame(currencyFormData.game)
          setAvailableCurrencies(currencies)
        } catch (error) {
          console.error("Error fetching currencies:", error)
          setAvailableCurrencies([])
        }
      } else {
        setAvailableCurrencies([])
      }
    }
    fetchCurrencies()
  }, [currencyFormData.game])

  // Fetch item types when game and category are selected
  useEffect(() => {
    const fetchItemTypes = async () => {
      if (itemFormData.game && itemFormData.category) {
        try {
          const itemTypes = await getItemTypesForGameAndCategory(itemFormData.game, itemFormData.category)
          setAvailableItemTypes(itemTypes)
        } catch (error) {
          console.error("Error fetching item types:", error)
          setAvailableItemTypes([])
        }
      } else {
        setAvailableItemTypes([])
      }
    }
    fetchItemTypes()
  }, [itemFormData.game, itemFormData.category])

  if (!user) {
    return null
  }

  const handleItemChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target
    const checked = (e.target as HTMLInputElement).checked
    let updates: any = { [name]: type === "checkbox" ? checked : value }
    
    // Clear dependent fields when parent field changes
    if (name === "category") {
      updates.game = ""
      updates.itemType = ""
    } else if (name === "game") {
      updates.itemType = ""
    }
    
    setItemFormData({
      ...itemFormData,
      ...updates,
    })
    
    // Clear error for this field
    if (itemErrors[name]) {
      setItemErrors({ ...itemErrors, [name]: "" })
    }
  }

  const handleCurrencyChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    let updates: any = { [name]: value }
    
    // Reset currency type when game changes
    if (name === "game") {
      updates.currencyType = ""
    }
    
    setCurrencyFormData({
      ...currencyFormData,
      ...updates,
    })
    
    // Clear error for this field
    if (currencyErrors[name]) {
      setCurrencyErrors({ ...currencyErrors, [name]: "" })
    }
  }

  const handleItemPaymentChange = (method: string) => {
    setItemFormData((prev) => ({
      ...prev,
      paymentMethods: prev.paymentMethods.includes(method)
        ? prev.paymentMethods.filter((m) => m !== method)
        : [...prev.paymentMethods, method],
    }))
  }

  const handleCurrencyPaymentChange = (method: string) => {
    setCurrencyFormData((prev) => ({
      ...prev,
      paymentMethods: prev.paymentMethods.includes(method)
        ? prev.paymentMethods.filter((m) => m !== method)
        : [...prev.paymentMethods, method],
    }))
  }

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Now using FileUpload component - this can be removed
    const files = Array.from(e.target.files || [])
    setImagePreview([...imagePreview, ...files.map((file) => URL.createObjectURL(file))])
  }

  const removeImage = (index: number) => {
    // Now using FileUpload component - this can be removed
    setImagePreview(imagePreview.filter((_, i) => i !== index))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsLoading(true)

    try {
      if (listingType === "item") {
        // Validate all fields
        const errors: Record<string, string> = {}
        
        if (!itemFormData.title || itemFormData.title.trim().length < 5) {
          errors.title = "Title must be at least 5 characters"
        }
        if (!itemFormData.description || itemFormData.description.trim().length < 10) {
          errors.description = "Description must be at least 10 characters"
        }
        if (!itemFormData.category) {
          errors.category = "Please select a category"
        }
        // Only require game for Games and Accounts categories
        if ((itemFormData.category === "Games" || itemFormData.category === "Accounts") && !itemFormData.game) {
          errors.game = "Please select a game"
        }
        // Only require item type for Games category (not Accounts or Accessories)
        if (itemFormData.category === "Games" && itemFormData.game && availableItemTypes.length > 0 && !itemFormData.itemType) {
          errors.itemType = "Please select an item type"
        }
        if (!itemFormData.price || Number(itemFormData.price) <= 0) {
          errors.price = "Price must be greater than 0"
        }
        if (!itemFormData.stock || Number(itemFormData.stock) < 1) {
          errors.stock = "Stock must be at least 1"
        }
        if (!itemFormData.image) {
          errors.image = "Please upload an image"
        }
        if (itemFormData.paymentMethods.length === 0) {
          errors.paymentMethods = "Select at least one payment method"
        }
        
        if (Object.keys(errors).length > 0) {
          setItemErrors(errors)
          setError("Please fix the errors below")
          setIsLoading(false)
          
          // Scroll to first error field
          const firstErrorField = Object.keys(errors)[0]
          const element = document.querySelector(`[name="${firstErrorField}"]`) as HTMLElement
          if (element) {
            element.scrollIntoView({ behavior: "smooth", block: "center" })
            element.focus()
          }
          return
        }
        
        setItemErrors({})

        const result = await createListing({
          title: itemFormData.title,
          description: itemFormData.description,
          category: itemFormData.category as "Accessories" | "Games" | "Accounts",
          game: itemFormData.game || "General", // Default to "General" for Accessories
          itemType: itemFormData.itemType || (itemFormData.category === "Accounts" ? "Account" : itemFormData.category === "Accessories" ? "Accessory" : "General"),
          price: Number(itemFormData.price),
          stock: Number(itemFormData.stock) || 1,
          image: itemFormData.image,
          condition: "New" as "Mint" | "New" | "Used",
          paymentMethods: itemFormData.paymentMethods,
          pricingMode: itemFormData.pricingMode,
        })

        if (result.success) {
          setSuccess(true)
          // Redirect to the new listing or marketplace
          setTimeout(() => {
            router.push(`/listing/${result.listingId}`)
          }, 1500)
        } else {
          setError(result.error || "Failed to create listing")
        }
      } else {
        // Currency listing validation
        const errors: Record<string, string> = {}
        
        if (!currencyFormData.game) {
          errors.game = "Please select a game"
        }
        if (!currencyFormData.currencyType) {
          errors.currencyType = "Please select a currency type"
        }
        if (!currencyFormData.ratePerPeso || Number(currencyFormData.ratePerPeso) <= 0) {
          errors.ratePerPeso = "Rate must be greater than 0"
        }
        if (!currencyFormData.stock || Number(currencyFormData.stock) < 1) {
          errors.stock = "Stock must be at least 1"
        }
        if (!currencyFormData.image) {
          errors.image = "Please upload an image"
        }
        if (currencyFormData.paymentMethods.length === 0) {
          errors.paymentMethods = "Select at least one payment method"
        }
        
        if (Object.keys(errors).length > 0) {
          setCurrencyErrors(errors)
          setError("Please fix the errors below")
          setIsLoading(false)
          
          // Scroll to first error field
          const firstErrorField = Object.keys(errors)[0]
          const element = document.querySelector(`[name="${firstErrorField}"]`) as HTMLElement
          if (element) {
            element.scrollIntoView({ behavior: "smooth", block: "center" })
            element.focus()
          }
          return
        }
        
        setCurrencyErrors({})

        // Currency listing - Use new CurrencyListing model
        const result = await createNewCurrencyListing({
          game: currencyFormData.game,
          currencyType: currencyFormData.currencyType,
          ratePerPeso: Number(currencyFormData.ratePerPeso),
          stock: Number(currencyFormData.stock),
          minOrder: 1,
          maxOrder: Number(currencyFormData.stock),
          image: currencyFormData.image,
          description: currencyFormData.description || undefined,
          paymentMethods: currencyFormData.paymentMethods,
          pricingMode: currencyFormData.pricingMode,
        })

        if (result.success) {
          setSuccess(true)
          // Redirect to the new listing
          setTimeout(() => {
            router.push(`/currency/${result.listingId}`)
          }, 1500)
        } else {
          setError(result.error || "Failed to create listing")
        }
      }
    } catch (err) {
      setError("An unexpected error occurred. Please try again.")
      console.error("Submit error:", err)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-background">
      <Navigation />

      <div className="container max-w-[1920px] mx-auto px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Create a Listing</h1>
          <p className="text-muted-foreground">Share your item or currency with the community and start trading</p>
        </div>

        <Card className="p-2 mb-8 inline-flex gap-2">
          <Button
            variant={listingType === "item" ? "default" : "ghost"}
            onClick={() => setListingType("item")}
            className="gap-2"
          >
            <Package className="w-4 h-4" />
            Item Listing
          </Button>
          <Button
            variant={listingType === "currency" ? "default" : "ghost"}
            onClick={() => setListingType("currency")}
            className="gap-2"
          >
            <Coins className="w-4 h-4" />
            Currency Listing
          </Button>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Form */}
          <div className="lg:col-span-2">
            {/* Error Alert */}
            {error && (
              <Card className="p-4 mb-6 bg-destructive/10 border-destructive/20">
                <p className="text-sm text-destructive">{error}</p>
              </Card>
            )}

            {/* Success Alert */}
            {success && (
              <Card className="p-4 mb-6 bg-green-500/10 border-green-500/20">
                <p className="text-sm text-green-700">Listing created successfully! Redirecting...</p>
              </Card>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              {listingType === "item" ? (
                <>
                  {/* Item Form */}
                  <Card className="p-6">
                    <h2 className="text-xl font-bold mb-4">Item Details</h2>
                    <div className="space-y-4">
                      <div>
                        <label className="text-sm font-semibold mb-2 block">Item Title *</label>
                        <Input
                          type="text"
                          name="title"
                          placeholder="Golden Dragon Pet - Mint Condition"
                          value={itemFormData.title}
                          onChange={handleItemChange}
                          maxLength={100}
                          className={itemErrors.title ? "border-red-500" : ""}
                        />
                        {itemErrors.title && (
                          <p className="text-xs text-red-500 mt-1">{itemErrors.title}</p>
                        )}
                        <p className="text-xs text-muted-foreground mt-1">{itemFormData.title.length}/100</p>
                      </div>

                      <div>
                        <label className="text-sm font-semibold mb-2 block">Description *</label>
                        <textarea
                          name="description"
                          placeholder="Describe the item in detail. Include any special features, condition, etc."
                          value={itemFormData.description}
                          onChange={handleItemChange}
                          maxLength={2000}
                          className={`w-full px-3 py-2 border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary resize-none ${
                            itemErrors.description ? "border-red-500" : "border-border"
                          }`}
                          rows={6}
                        />
                        {itemErrors.description && (
                          <p className="text-xs text-red-500 mt-1">{itemErrors.description}</p>
                        )}
                        <p className="text-xs text-muted-foreground mt-1">{itemFormData.description.length}/2000</p>
                      </div>
                    </div>
                  </Card>

                  <Card className="p-6">
                    <h2 className="text-xl font-bold mb-4">Category</h2>
                    <div className="space-y-4">
                      <div>
                        <label className="text-sm font-semibold mb-2 block">Category *</label>
                        <select
                          name="category"
                          value={itemFormData.category}
                          onChange={handleItemChange}
                          className={`w-full px-3 py-2 border rounded-lg bg-background ${
                            itemErrors.category ? "border-red-500" : "border-border"
                          }`}
                        >
                          <option value="">Select category</option>
                          {availableCategories.map((cat) => (
                            <option key={cat} value={cat}>
                              {cat}
                            </option>
                          ))}
                        </select>
                        {itemErrors.category && (
                          <p className="text-xs text-red-500 mt-1">{itemErrors.category}</p>
                        )}
                      </div>

                      {itemFormData.category && (itemFormData.category === "Games" || itemFormData.category === "Accounts") && (
                        <div>
                          <label className="text-sm font-semibold mb-2 block">Game *</label>
                          <select
                            name="game"
                            value={itemFormData.game}
                            onChange={handleItemChange}
                            className={`w-full px-3 py-2 border rounded-lg bg-background ${
                              itemErrors.game ? "border-red-500" : "border-border"
                            }`}
                          >
                            <option value="">Select game</option>
                            {availableGames.map((g) => (
                              <option key={g.id} value={g.name}>
                                {g.displayName}
                              </option>
                            ))}
                          </select>
                          {itemErrors.game && (
                            <p className="text-xs text-red-500 mt-1">{itemErrors.game}</p>
                          )}
                        </div>
                      )}

                      {itemFormData.category && itemFormData.game && itemFormData.category !== "Accounts" && availableItemTypes.length > 0 && (
                        <div>
                          <label className="text-sm font-semibold mb-2 block">Item Type *</label>
                          <select
                            name="itemType"
                            value={itemFormData.itemType}
                            onChange={handleItemChange}
                            className={`w-full px-3 py-2 border rounded-lg bg-background ${
                              itemErrors.itemType ? "border-red-500" : "border-border"
                            }`}
                          >
                            <option value="">Select item type</option>
                            {availableItemTypes.map((type) => (
                              <option key={type.id} value={type.itemType}>
                                {type.displayName}
                              </option>
                            ))}
                          </select>
                          {itemErrors.itemType && (
                            <p className="text-xs text-red-500 mt-1">{itemErrors.itemType}</p>
                          )}
                        </div>
                      )}
                    </div>
                  </Card>

                  <Card className="p-6">
                    <h2 className="text-xl font-bold mb-4">Pricing & Stock</h2>
                    <div className="space-y-4">
                      <div>
                        <label className="text-sm font-semibold mb-2 block">Pricing Mode *</label>
                        <div className="flex gap-4 mb-4">
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="radio"
                              name="itemPricingMode"
                              value="per-peso"
                              checked={itemFormData.pricingMode === "per-peso"}
                              onChange={(e) => setItemFormData((prev) => ({ ...prev, pricingMode: e.target.value as "per-peso" | "per-item" }))}
                              className="w-4 h-4"
                            />
                            <span>Items per Price</span>
                          </label>
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="radio"
                              name="itemPricingMode"
                              value="per-item"
                              checked={itemFormData.pricingMode === "per-item"}
                              onChange={(e) => setItemFormData((prev) => ({ ...prev, pricingMode: e.target.value as "per-peso" | "per-item" }))}
                              className="w-4 h-4"
                            />
                            <span>Price per Item</span>
                          </label>
                        </div>
                      </div>

                      <div>
                        <label className="text-sm font-semibold mb-2 block">
                          {itemFormData.pricingMode === "per-item" ? "Price per Item (PHP)" : "Items per PHP"} *
                        </label>
                        <Input
                          type="number"
                          name="price"
                          placeholder={itemFormData.pricingMode === "per-item" ? "2500" : "3"}
                          value={itemFormData.price}
                          onChange={handleItemChange}
                          min="0"
                          step="0.1"
                          className={itemErrors.price ? "border-red-500" : ""}
                        />
                        {itemErrors.price && (
                          <p className="text-xs text-red-500 mt-1">{itemErrors.price}</p>
                        )}
                        <p className="text-xs text-muted-foreground mt-1">
                          {itemFormData.pricingMode === "per-item" 
                            ? "Example: 2500 means buyer pays ₱2500 for 1 item"
                            : "Example: 3 means buyer gets 3 items for ₱1"
                          }
                        </p>
                      </div>

                      <div>
                        <label className="text-sm font-semibold mb-2 block">Quantity *</label>
                        <Input
                          type="number"
                          name="stock"
                          placeholder="1"
                          value={itemFormData.stock}
                          onChange={handleItemChange}
                          min="1"
                          className={itemErrors.stock ? "border-red-500" : ""}
                        />
                        {itemErrors.stock && (
                          <p className="text-xs text-red-500 mt-1">{itemErrors.stock}</p>
                        )}
                        <p className="text-xs text-muted-foreground mt-1">
                          How many units are you selling? (e.g., 5 items at ₱{itemFormData.price || "X"} each, or 1 bundle of 5 items for ₱{itemFormData.price || "X"})
                        </p>
                      </div>
                    </div>
                  </Card>

                  <Card className="p-6">
                    <h2 className="text-xl font-bold mb-4">Images</h2>
                    <div className="space-y-4">
                      <div>
                        <label className="text-sm font-semibold mb-2 block">Item Image *</label>
                        <FileUpload
                          endpoint="listingImage"
                          value={itemFormData.image}
                          onChange={(url) => {
                            setItemFormData((prev) => ({
                              ...prev,
                              image: url || "",
                            }))
                            // Clear error when image is uploaded
                            if (itemErrors.image && url) {
                              setItemErrors((prev) => ({ ...prev, image: "" }))
                            }
                          }}
                        />
                        {itemErrors.image && (
                          <p className="text-xs text-red-500 mt-1">{itemErrors.image}</p>
                        )}
                        <p className="text-xs text-muted-foreground mt-1">Upload a clear image of your item</p>
                      </div>
                    </div>
                  </Card>

                  <Card className="p-6">
                    <h2 className="text-xl font-bold mb-4">Payment & Proof</h2>
                    <div className="space-y-4">
                      <div>
                        <label className="text-sm font-semibold mb-3 block">Accept Payment Via *</label>
                        <div className="flex flex-wrap gap-2">
                          {paymentMethods.map((method) => (
                            <button
                              key={method}
                              type="button"
                              onClick={() => {
                                handleItemPaymentChange(method)
                                // Clear error when payment method is selected
                                if (itemErrors.paymentMethods) {
                                  setItemErrors((prev) => ({ ...prev, paymentMethods: "" }))
                                }
                              }}
                              className={`px-4 py-2 rounded-lg border transition ${
                                itemFormData.paymentMethods.includes(method)
                                  ? "bg-primary text-primary-foreground border-primary"
                                  : "border-border hover:border-primary/50"
                              }`}
                            >
                              {method}
                            </button>
                          ))}
                        </div>
                        {itemErrors.paymentMethods && (
                          <p className="text-xs text-red-500 mt-2">{itemErrors.paymentMethods}</p>
                        )}
                      </div>

                      <label className="flex items-start gap-3">
                        <input
                          type="checkbox"
                          name="hasProof"
                          checked={itemFormData.hasProof}
                          onChange={handleItemChange}
                          className="mt-1"
                        />
                        <span className="text-sm">I have screenshots/video proof of this item</span>
                      </label>
                    </div>
                  </Card>
                </>
              ) : (
                <>
                  <Card className="p-6">
                    <h2 className="text-xl font-bold mb-4">Currency Details</h2>
                    <div className="space-y-4">
                      <div>
                        <label className="text-sm font-semibold mb-2 block">Game *</label>
                        <select
                          name="game"
                          value={currencyFormData.game}
                          onChange={handleCurrencyChange}
                          className={`w-full px-3 py-2 border rounded-lg bg-background ${
                            currencyErrors.game ? "border-red-500" : "border-border"
                          }`}
                        >
                          <option value="">Select a game</option>
                          {availableGames.map((game) => (
                            <option key={game.id} value={game.name}>
                              {game.displayName}
                            </option>
                          ))}
                        </select>
                        {currencyErrors.game && (
                          <p className="text-xs text-red-500 mt-1">{currencyErrors.game}</p>
                        )}
                      </div>

                      {currencyFormData.game && availableCurrencies.length > 0 && (
                        <div>
                          <label className="text-sm font-semibold mb-2 block">Currency Type *</label>
                          <select
                            name="currencyType"
                            value={currencyFormData.currencyType}
                            onChange={handleCurrencyChange}
                            className={`w-full px-3 py-2 border rounded-lg bg-background ${
                              currencyErrors.currencyType ? "border-red-500" : "border-border"
                            }`}
                          >
                            <option value="">Select currency type</option>
                            {availableCurrencies.map((currency) => (
                              <option key={currency.id} value={currency.name}>
                                {currency.displayName}
                              </option>
                            ))}
                          </select>
                          {currencyErrors.currencyType && (
                            <p className="text-xs text-red-500 mt-1">{currencyErrors.currencyType}</p>
                          )}
                        </div>
                      )}

                      <div>
                        <label className="text-sm font-semibold mb-2 block">Pricing Mode *</label>
                        <div className="flex gap-4 mb-4">
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="radio"
                              name="pricingMode"
                              value="per-peso"
                              checked={currencyFormData.pricingMode === "per-peso"}
                              onChange={(e) => setCurrencyFormData((prev) => ({ ...prev, pricingMode: e.target.value as "per-peso" | "per-item" }))}
                              className="w-4 h-4"
                            />
                            <span>Items per Price</span>
                          </label>
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="radio"
                              name="pricingMode"
                              value="per-item"
                              checked={currencyFormData.pricingMode === "per-item"}
                              onChange={(e) => setCurrencyFormData((prev) => ({ ...prev, pricingMode: e.target.value as "per-peso" | "per-item" }))}
                              className="w-4 h-4"
                            />
                            <span>Price per Item</span>
                          </label>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-sm font-semibold mb-2 block">
                            {currencyFormData.pricingMode === "per-peso" ? "Currency per PHP" : "PHP per Currency"} *
                          </label>
                          <div className="flex items-center gap-2">
                            <Input
                              type="number"
                              name="ratePerPeso"
                              placeholder="3"
                              value={currencyFormData.ratePerPeso}
                              onChange={handleCurrencyChange}
                              min="0"
                              step="0.1"
                              className={currencyErrors.ratePerPeso ? "border-red-500" : ""}
                            />
                            {currencyFormData.pricingMode === "per-peso" ? (
                              <span className="text-sm text-muted-foreground whitespace-nowrap">{currencyFormData.currencyType || "currency"} per ₱1</span>
                            ) : (
                              <span className="text-sm text-muted-foreground whitespace-nowrap">₱1 per {currencyFormData.currencyType || "currency"}</span>
                            )}
                          </div>
                          {currencyErrors.ratePerPeso && (
                            <p className="text-xs text-red-500 mt-1">{currencyErrors.ratePerPeso}</p>
                          )}
                          <p className="text-xs text-muted-foreground mt-1">
                            {currencyFormData.pricingMode === "per-peso" 
                              ? `Example: 3 means buyer gets 3 ${currencyFormData.currencyType || "currency"} for ₱1`
                              : `Example: 3 means buyer pays ₱3 for 1 ${currencyFormData.currencyType || "currency"}`
                            }
                          </p>
                        </div>

                        <div>
                          <label className="text-sm font-semibold mb-2 block">Stock Available *</label>
                          <Input
                            type="number"
                            name="stock"
                            placeholder="10000"
                            value={currencyFormData.stock}
                            onChange={handleCurrencyChange}
                            min="0"
                            className={currencyErrors.stock ? "border-red-500" : ""}
                          />
                          {currencyErrors.stock && (
                            <p className="text-xs text-red-500 mt-1">{currencyErrors.stock}</p>
                          )}
                          <p className="text-xs text-muted-foreground mt-1">
                            Total {currencyFormData.currencyType || "currency"} you have for sale
                          </p>
                        </div>
                      </div>

                      <div>
                        <label className="text-sm font-semibold mb-2 block">Additional Notes</label>
                        <textarea
                          name="description"
                          placeholder="Any additional information about your currency listing (delivery time, restrictions, etc.)"
                          value={currencyFormData.description}
                          onChange={handleCurrencyChange}
                          maxLength={500}
                          className={`w-full px-3 py-2 border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary resize-none ${
                            currencyErrors.description ? "border-red-500" : "border-border"
                          }`}
                          rows={4}
                        />
                        {currencyErrors.description && (
                          <p className="text-xs text-red-500 mt-1">{currencyErrors.description}</p>
                        )}
                        <p className="text-xs text-muted-foreground mt-1">{currencyFormData.description.length}/500</p>
                      </div>
                    </div>
                  </Card>

                  <Card className="p-6">
                    <h2 className="text-xl font-bold mb-4">Currency Image</h2>
                    <div className="space-y-4">
                      <div>
                        <label className="text-sm font-semibold mb-2 block">Currency Image *</label>
                        <FileUpload
                          endpoint="listingImage"
                          value={currencyFormData.image}
                          onChange={(url) => {
                            setCurrencyFormData((prev) => ({
                              ...prev,
                              image: url || "",
                            }))
                            // Clear error when image is uploaded
                            if (currencyErrors.image && url) {
                              setCurrencyErrors((prev) => ({ ...prev, image: "" }))
                            }
                          }}
                        />
                        {currencyErrors.image && (
                          <p className="text-xs text-red-500 mt-1">{currencyErrors.image}</p>
                        )}
                        <p className="text-xs text-muted-foreground mt-1">
                          Upload a clear image of your currency
                        </p>
                      </div>
                    </div>
                  </Card>

                  <Card className="p-6">
                    <h2 className="text-xl font-bold mb-4">Payment Methods</h2>
                    <div>
                      <label className="text-sm font-semibold mb-3 block">Accept Payment Via *</label>
                      <div className="flex flex-wrap gap-2">
                        {paymentMethods.map((method) => (
                          <button
                            key={method}
                            type="button"
                            onClick={() => {
                              handleCurrencyPaymentChange(method)
                              // Clear error when payment method is selected
                              if (currencyErrors.paymentMethods) {
                                setCurrencyErrors((prev) => ({ ...prev, paymentMethods: "" }))
                              }
                            }}
                            className={`px-4 py-2 rounded-lg border transition ${
                              currencyFormData.paymentMethods.includes(method)
                                ? "bg-primary text-primary-foreground border-primary"
                                : "border-border hover:border-primary/50"
                            }`}
                          >
                            {method}
                          </button>
                        ))}
                      </div>
                      {currencyErrors.paymentMethods && (
                        <p className="text-xs text-red-500 mt-2">{currencyErrors.paymentMethods}</p>
                      )}
                    </div>
                  </Card>
                </>
              )}

              {/* Actions */}
              <div className="flex gap-2">
                <Link href={listingType === "item" ? "/marketplace" : "/currency"} className="flex-1">
                  <Button variant="outline" size="lg" className="w-full bg-transparent">
                    Cancel
                  </Button>
                </Link>
                <Button type="submit" size="lg" className="flex-1" disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <span className="w-4 h-4 mr-2 animate-spin inline-block border-2 border-current border-t-transparent rounded-full" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4 mr-2" />
                      Create {listingType === "item" ? "Item" : "Currency"} Listing
                    </>
                  )}
                </Button>
              </div>
            </form>
          </div>

          {/* Preview & Tips */}
          <div className="space-y-6">
            {/* Preview */}
            <Card className="p-6">
              <h2 className="text-xl font-bold mb-4">Listing Preview</h2>
              {listingType === "item" ? (
                <div className="border rounded-lg overflow-hidden">
                  <div className="aspect-video bg-muted flex items-center justify-center">
                    {itemFormData.image ? (
                      <img
                        src={itemFormData.image}
                        alt="Preview"
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.currentTarget.src = "/placeholder.jpg"
                        }}
                      />
                    ) : (
                      <p className="text-muted-foreground text-sm">No image</p>
                    )}
                  </div>
                  <div className="p-4">
                    <p className="font-semibold truncate">{itemFormData.title || "Item Title"}</p>
                    <p className="text-primary font-bold mt-1">
                      {itemFormData.price ? `₱${Number(itemFormData.price).toLocaleString()}` : "₱0"}
                    </p>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {itemFormData.game && (
                        <Badge variant="secondary" className="text-xs">
                          {itemFormData.game}
                        </Badge>
                      )}
                      {itemFormData.category && (
                        <Badge variant="outline" className="text-xs">
                          {itemFormData.category}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="border rounded-lg p-4">
                  <div className="flex items-center gap-3 mb-3">
                    {currencyFormData.image ? (
                      <img
                        src={currencyFormData.image}
                        alt="Currency"
                        className="w-12 h-12 rounded-full object-cover"
                        onError={(e) => {
                          e.currentTarget.src = "/placeholder.svg"
                        }}
                      />
                    ) : (
                      <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                        <Coins className="w-6 h-6 text-primary" />
                      </div>
                    )}
                    <div>
                      <p className="font-semibold">{currencyFormData.game || "Game Name"}</p>
                      <p className="text-sm text-muted-foreground">
                        {currencyFormData.currencyType || "Currency Type"}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {currencyFormData.stock
                          ? `${Number(currencyFormData.stock).toLocaleString()} in stock`
                          : "No stock set"}
                      </p>
                    </div>
                  </div>
                  <div className="bg-muted rounded-lg p-3">
                    <p className="text-sm text-muted-foreground">Rate</p>
                    <p className="font-bold text-lg text-primary">
                      {currencyFormData.ratePerPeso
                        ? `${currencyFormData.ratePerPeso} ${currencyFormData.currencyType || "currency"} per ₱1`
                        : "Set your rate"}
                    </p>
                  </div>
                </div>
              )}
            </Card>

            {/* Tips */}
            <Card className="p-6">
              <h2 className="text-xl font-bold mb-4">Listing Tips</h2>
              <ul className="space-y-3 text-sm text-muted-foreground">
                <li className="flex items-start gap-2">
                  <span className="text-primary">•</span>
                  Use clear, high-quality images
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary">•</span>
                  Write detailed descriptions
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary">•</span>
                  Set competitive prices
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary">•</span>
                  Respond quickly to inquiries
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary">•</span>
                  Always provide proof of ownership
                </li>
              </ul>
            </Card>

            {/* Safety */}
            <Card className="p-6 bg-primary/5 border-primary/20">
              <h2 className="text-xl font-bold mb-4">Safety First</h2>
              <p className="text-sm text-muted-foreground">
                Never share your Roblox password or personal information. Use our secure messaging system for all
                communications.
              </p>
            </Card>
          </div>
        </div>
      </div>
    </main>
  )
}
