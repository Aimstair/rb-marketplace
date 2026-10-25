"use client"

import type React from "react"
import { useMemo, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Check, Coins, ImageIcon, Package, Search, ShieldCheck } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { GameIcon } from "@/components/site/game-icon"
import { ListingImageUploader } from "@/components/listing/listing-image-uploader"
import { createListing, createNewCurrencyListing } from "@/app/actions/listings"
import type { SellGameOption } from "@/lib/games"
import { cn } from "@/lib/utils"

const PAYMENT_METHODS = ["GCash", "PayPal", "Bank transfer", "Robux Gift Cards", "Cross-Trade"]
const MAX_PHOTOS = 8
const GAMES_COLLAPSED = 12

type ListingKind = "item" | "currency"
type PricingMode = "per-item" | "per-peso"
type Errors = Record<string, string>

const fieldClass =
  "w-full rounded-xl border bg-secondary/40 px-3.5 py-2.5 text-[15px] outline-none transition-colors placeholder:text-muted-foreground focus:border-ring focus:ring-2 focus:ring-ring/40"

export function SellForm({ games }: { games: SellGameOption[] }) {
  const router = useRouter()
  const [kind, setKind] = useState<ListingKind>("item")
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [errors, setErrors] = useState<Errors>({})

  const [item, setItem] = useState({
    game: "",
    itemType: "",
    images: [] as string[],
    title: "",
    description: "",
    pricingMode: "per-item" as PricingMode,
    price: "",
    stock: "1",
    paymentMethods: [] as string[],
  })

  const [currency, setCurrency] = useState({
    game: "",
    currencyType: "",
    images: [] as string[],
    pricingMode: "per-peso" as PricingMode,
    rate: "",
    stock: "",
    description: "",
    paymentMethods: [] as string[],
  })

  const itemGames = useMemo(() => games.filter((g) => g.itemTypes.length > 0), [games])
  const currencyGames = useMemo(() => games.filter((g) => g.currencies.length > 0), [games])
  const selectedItemGame = itemGames.find((g) => g.name === item.game)
  const selectedCurrencyGame = currencyGames.find((g) => g.name === currency.game)
  const selectedType = selectedItemGame?.itemTypes.find((t) => t.name === item.itemType)
  const selectedCurrency = selectedCurrencyGame?.currencies.find((c) => c.name === currency.currencyType)

  const clearError = (key: string) => {
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: "" }))
  }

  const updateItem = <K extends keyof typeof item>(key: K, value: (typeof item)[K]) => {
    setItem((prev) => ({ ...prev, [key]: value }))
    clearError(key)
  }

  const updateCurrency = <K extends keyof typeof currency>(key: K, value: (typeof currency)[K]) => {
    setCurrency((prev) => ({ ...prev, [key]: value }))
    clearError(key)
  }

  const toggle = (list: string[], value: string) =>
    list.includes(value) ? list.filter((v) => v !== value) : [...list, value]

  const failValidation = (next: Errors) => {
    setErrors(next)
    setFormError("A few things need fixing before you can publish.")
    const first = Object.keys(next)[0]
    document.querySelector(`[data-field="${first}"]`)?.scrollIntoView({ behavior: "smooth", block: "center" })
  }

  const submitItem = async () => {
    const next: Errors = {}
    if (!item.game) next.game = "Choose the game this item is from"
    else if (!item.itemType) next.itemType = "Choose what kind of item it is"
    if (item.images.length === 0) next.images = "Add at least one photo"
    if (item.title.trim().length < 5) next.title = "Use at least 5 characters"
    if (item.description.trim().length < 10) next.description = "Use at least 10 characters"
    if (!(Number(item.price) > 0)) next.price = "Enter a price above 0"
    if (!(Number(item.stock) >= 1)) next.stock = "Quantity must be at least 1"
    if (item.paymentMethods.length === 0) next.paymentMethods = "Pick at least one payment method"
    if (Object.keys(next).length > 0) return failValidation(next)

    const result = await createListing({
      title: item.title.trim(),
      description: item.description.trim(),
      category: selectedType?.category === "Accounts" ? "Accounts" : "Games",
      game: item.game,
      itemType: item.itemType,
      price: Number(item.price),
      stock: Number(item.stock),
      images: item.images,
      condition: "New",
      paymentMethods: item.paymentMethods,
      pricingMode: item.pricingMode,
    })
    if (!result.success) throw new Error(result.error || "Failed to create listing")
    router.push(`/listing/${result.listingId}`)
  }

  const submitCurrency = async () => {
    const next: Errors = {}
    if (!currency.game) next.game = "Choose the game"
    else if (!currency.currencyType) next.currencyType = "Choose the currency"
    if (!(Number(currency.rate) > 0)) next.rate = "Enter a rate above 0"
    if (!(Number(currency.stock) >= 1)) next.stock = "Stock must be at least 1"
    if (currency.images.length === 0) next.images = "Add a photo"
    if (currency.paymentMethods.length === 0) next.paymentMethods = "Pick at least one payment method"
    if (Object.keys(next).length > 0) return failValidation(next)

    const result = await createNewCurrencyListing({
      game: currency.game,
      currencyType: currency.currencyType,
      ratePerPeso: Number(currency.rate),
      stock: Number(currency.stock),
      minOrder: 1,
      maxOrder: Number(currency.stock),
      image: currency.images[0],
      description: currency.description.trim() || undefined,
      paymentMethods: currency.paymentMethods,
      pricingMode: currency.pricingMode,
    })
    if (!result.success) throw new Error(result.error || "Failed to create listing")
    router.push(`/currency/${result.listingId}`)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError(null)
    setSubmitting(true)
    try {
      await (kind === "item" ? submitItem() : submitCurrency())
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Something went wrong. Please try again.")
      window.scrollTo({ top: 0, behavior: "smooth" })
    } finally {
      setSubmitting(false)
    }
  }

  const itemSteps = [
    { label: "Game and type", done: Boolean(item.game && item.itemType) },
    { label: "Photos", done: item.images.length > 0 },
    { label: "Title and description", done: item.title.trim().length >= 5 && item.description.trim().length >= 10 },
    { label: "Price and quantity", done: Number(item.price) > 0 && Number(item.stock) >= 1 },
    { label: "Payment", done: item.paymentMethods.length > 0 },
  ]
  const currencySteps = [
    { label: "Game and currency", done: Boolean(currency.game && currency.currencyType) },
    { label: "Rate and stock", done: Number(currency.rate) > 0 && Number(currency.stock) >= 1 },
    { label: "Photo", done: currency.images.length > 0 },
    { label: "Payment", done: currency.paymentMethods.length > 0 },
  ]
  const steps = kind === "item" ? itemSteps : currencySteps
  const ready = steps.every((s) => s.done)

  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto w-full max-w-[1160px] px-5 pb-20 pt-10 md:px-8 md:pt-14">
        <header className="mb-8 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-title">Sell on RbMarket</h1>
            <p className="mt-2 text-[17px] text-muted-foreground">
              Listing is free. Buyers message you directly and pay you, with no fees taken.
            </p>
          </div>
          <div role="tablist" aria-label="Listing type" className="inline-flex self-start rounded-full bg-secondary p-[3px] text-sm font-medium">
            {([
              { value: "item", label: "Item", icon: Package },
              { value: "currency", label: "Currency", icon: Coins },
            ] as const).map(({ value, label, icon: Icon }) => (
              <button
                key={value}
                type="button"
                role="tab"
                aria-selected={kind === value}
                onClick={() => {
                  setKind(value)
                  setErrors({})
                  setFormError(null)
                }}
                className={cn(
                  "flex items-center gap-2 rounded-full px-5 py-2 transition-colors",
                  kind === value ? "bg-[#48484a] text-foreground" : "text-muted-foreground hover:text-foreground",
                )}
              >
                <Icon className="size-4" strokeWidth={1.75} />
                {label}
              </button>
            ))}
          </div>
        </header>

        {formError && (
          <div role="alert" className="mb-6 rounded-[14px] bg-destructive/10 px-5 py-4 text-[15px] text-destructive">
            {formError}
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_340px] lg:gap-10">
          <div className="space-y-4">
            {kind === "item" ? (
              <>
                <Step number={1} title="What are you selling?">
                  <Field label="Game" error={errors.game} field="game">
                    <GamePicker
                      games={itemGames}
                      value={item.game}
                      onChange={(name) => {
                        setItem((prev) => ({ ...prev, game: name, itemType: "" }))
                        clearError("game")
                      }}
                    />
                  </Field>
                  {selectedItemGame && (
                    <Field label="Type" error={errors.itemType} field="itemType">
                      <ChipGroup
                        options={selectedItemGame.itemTypes.map((t) => ({ value: t.name, label: t.displayName }))}
                        value={item.itemType}
                        onChange={(v) => updateItem("itemType", v)}
                      />
                    </Field>
                  )}
                </Step>

                <Step number={2} title="Photos" hint={`Up to ${MAX_PHOTOS}`}>
                  <div data-field="images">
                    <ListingImageUploader
                      value={item.images}
                      onChange={(urls) => updateItem("images", urls)}
                      max={MAX_PHOTOS}
                      invalid={Boolean(errors.images)}
                    />
                    <ErrorText message={errors.images} />
                  </div>
                </Step>

                <Step number={3} title="Describe it">
                  <Field label="Title" error={errors.title} field="title" counter={`${item.title.length}/100`}>
                    <Input
                      value={item.title}
                      onChange={(e) => updateItem("title", e.target.value)}
                      maxLength={100}
                      placeholder={selectedType ? `e.g. ${selectedType.displayName} for ${selectedItemGame?.displayName}` : "e.g. Mega Neon Shadow Dragon"}
                      aria-invalid={Boolean(errors.title)}
                    />
                  </Field>
                  <Field label="Description" error={errors.description} field="description" counter={`${item.description.length}/2000`}>
                    <textarea
                      value={item.description}
                      onChange={(e) => updateItem("description", e.target.value)}
                      maxLength={2000}
                      rows={5}
                      placeholder="What's included, rarity or stats, and how you deliver it in-game."
                      aria-invalid={Boolean(errors.description)}
                      className={cn(fieldClass, "resize-none", errors.description ? "border-destructive/50" : "border-border")}
                    />
                  </Field>
                </Step>

                <Step number={4} title="Price and quantity">
                  <Segmented
                    label="Pricing"
                    value={item.pricingMode}
                    onChange={(v) => updateItem("pricingMode", v)}
                    options={[
                      { value: "per-item", label: "Price per item" },
                      { value: "per-peso", label: "Items per ₱1" },
                    ]}
                  />
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field
                      label={item.pricingMode === "per-item" ? "Price" : "Items per ₱1"}
                      error={errors.price}
                      field="price"
                    >
                      <AffixInput
                        prefix={item.pricingMode === "per-item" ? "₱" : undefined}
                        suffix={item.pricingMode === "per-peso" ? "per ₱1" : undefined}
                        value={item.price}
                        onChange={(v) => updateItem("price", v)}
                        placeholder={item.pricingMode === "per-item" ? "250" : "3"}
                        invalid={Boolean(errors.price)}
                      />
                    </Field>
                    <Field label="Quantity" error={errors.stock} field="stock">
                      <AffixInput
                        value={item.stock}
                        onChange={(v) => updateItem("stock", v)}
                        placeholder="1"
                        suffix="in stock"
                        step="1"
                        invalid={Boolean(errors.stock)}
                      />
                    </Field>
                  </div>
                  <p className="text-[13px] text-muted-foreground">
                    {item.pricingMode === "per-item"
                      ? `Buyers pay ₱${item.price || "X"} for each item.`
                      : `Buyers get ${item.price || "X"} items for every ₱1.`}
                  </p>
                </Step>

                <Step number={5} title="How buyers can pay">
                  <PaymentPicker
                    value={item.paymentMethods}
                    error={errors.paymentMethods}
                    onToggle={(m) => updateItem("paymentMethods", toggle(item.paymentMethods, m))}
                  />
                </Step>
              </>
            ) : (
              <>
                <Step number={1} title="What currency are you selling?">
                  <Field label="Game" error={errors.game} field="game">
                    <GamePicker
                      games={currencyGames}
                      value={currency.game}
                      onChange={(name) => {
                        setCurrency((prev) => ({ ...prev, game: name, currencyType: "" }))
                        clearError("game")
                      }}
                    />
                  </Field>
                  {selectedCurrencyGame && (
                    <Field label="Currency" error={errors.currencyType} field="currencyType">
                      <ChipGroup
                        options={selectedCurrencyGame.currencies.map((c) => ({ value: c.name, label: c.displayName }))}
                        value={currency.currencyType}
                        onChange={(v) => updateCurrency("currencyType", v)}
                      />
                    </Field>
                  )}
                </Step>

                <Step number={2} title="Rate and stock">
                  <Segmented
                    label="Pricing"
                    value={currency.pricingMode}
                    onChange={(v) => updateCurrency("pricingMode", v)}
                    options={[
                      { value: "per-peso", label: "Amount per ₱1" },
                      { value: "per-item", label: "Price per unit" },
                    ]}
                  />
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="Rate" error={errors.rate} field="rate">
                      <AffixInput
                        prefix={currency.pricingMode === "per-item" ? "₱" : undefined}
                        suffix={currency.pricingMode === "per-peso" ? "per ₱1" : "each"}
                        value={currency.rate}
                        onChange={(v) => updateCurrency("rate", v)}
                        placeholder="3"
                        invalid={Boolean(errors.rate)}
                      />
                    </Field>
                    <Field label="Stock available" error={errors.stock} field="stock">
                      <AffixInput
                        value={currency.stock}
                        onChange={(v) => updateCurrency("stock", v)}
                        placeholder="10000"
                        step="1"
                        suffix={selectedCurrency?.displayName}
                        invalid={Boolean(errors.stock)}
                      />
                    </Field>
                  </div>
                  <p className="text-[13px] text-muted-foreground">
                    {currency.pricingMode === "per-peso"
                      ? `Buyers get ${currency.rate || "X"} ${selectedCurrency?.displayName || "currency"} for every ₱1.`
                      : `Buyers pay ₱${currency.rate || "X"} for each ${selectedCurrency?.displayName || "unit"}.`}
                  </p>
                </Step>

                <Step number={3} title="Photo">
                  <div data-field="images">
                    <ListingImageUploader
                      value={currency.images}
                      onChange={(urls) => updateCurrency("images", urls)}
                      max={1}
                      invalid={Boolean(errors.images)}
                    />
                    <ErrorText message={errors.images} />
                  </div>
                </Step>

                <Step number={4} title="Notes" hint="Optional">
                  <Field label="Delivery time, limits or anything buyers should know" field="description" counter={`${currency.description.length}/500`}>
                    <textarea
                      value={currency.description}
                      onChange={(e) => updateCurrency("description", e.target.value)}
                      maxLength={500}
                      rows={4}
                      placeholder="e.g. Delivered within 10 minutes via trade. Online 6pm–12am."
                      className={cn(fieldClass, "resize-none border-border")}
                    />
                  </Field>
                </Step>

                <Step number={5} title="How buyers can pay">
                  <PaymentPicker
                    value={currency.paymentMethods}
                    error={errors.paymentMethods}
                    onToggle={(m) => updateCurrency("paymentMethods", toggle(currency.paymentMethods, m))}
                  />
                </Step>
              </>
            )}
          </div>

          {/* Preview, progress and publish */}
          <aside className="space-y-4 lg:sticky lg:top-[76px]">
            <div className="rounded-[20px] bg-card p-5">
              <p className="mb-3 text-[13px] font-medium text-muted-foreground">Preview</p>
              {kind === "item" ? (
                <div className="overflow-hidden rounded-[14px] bg-secondary/40">
                  <div className="relative aspect-square bg-secondary">
                    {item.images[0] ? (
                      <img src={item.images[0]} alt="" className="h-full w-full object-contain p-[8%]" />
                    ) : (
                      <div className="grid h-full place-items-center text-muted-foreground">
                        <ImageIcon className="size-8" strokeWidth={1.25} />
                      </div>
                    )}
                    {item.images.length > 1 && (
                      <span className="absolute right-2.5 top-2.5 rounded-full bg-black/60 px-2 py-0.5 text-[11px] tabular-nums">
                        1 / {item.images.length}
                      </span>
                    )}
                  </div>
                  <div className="px-4 pb-4 pt-3">
                    <p className="truncate text-xs text-muted-foreground">
                      {[selectedItemGame?.displayName, selectedType?.displayName].filter(Boolean).join(" · ") || "Game"}
                    </p>
                    <p className="mt-0.5 line-clamp-2 text-[15px] font-semibold leading-snug">
                      {item.title.trim() || "Your listing title"}
                    </p>
                    <p className="mt-1.5 font-semibold tabular-nums">
                      {item.pricingMode === "per-item"
                        ? `₱${Number(item.price || 0).toLocaleString("en-PH")}`
                        : `${Number(item.price || 0).toLocaleString("en-PH")} per ₱1`}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="rounded-[14px] bg-secondary/40 p-4">
                  <div className="flex items-center gap-3">
                    {currency.images[0] ? (
                      <img src={currency.images[0]} alt="" className="size-12 rounded-full bg-secondary object-cover" />
                    ) : selectedCurrencyGame ? (
                      <GameIcon name={selectedCurrencyGame.name} size={48} />
                    ) : (
                      <span className="grid size-12 place-items-center rounded-full bg-secondary text-link">
                        <Coins className="size-5" strokeWidth={1.5} />
                      </span>
                    )}
                    <div className="min-w-0">
                      <p className="truncate font-semibold">{selectedCurrency?.displayName || "Currency"}</p>
                      <p className="truncate text-[13px] text-muted-foreground">{selectedCurrencyGame?.displayName || "Game"}</p>
                    </div>
                  </div>
                  <p className="mt-4 text-[22px] font-semibold tabular-nums">
                    {currency.pricingMode === "per-peso"
                      ? `${Number(currency.rate || 0).toLocaleString("en-PH")} per ₱1`
                      : `₱${Number(currency.rate || 0).toLocaleString("en-PH")} each`}
                  </p>
                  <p className="text-[13px] text-muted-foreground">
                    {currency.stock ? `${Number(currency.stock).toLocaleString("en-PH")} available` : "Set your stock"}
                  </p>
                </div>
              )}

              <ol className="mt-5 space-y-2.5">
                {steps.map((step) => (
                  <li key={step.label} className="flex items-center gap-2.5 text-[14px]">
                    <span
                      className={cn(
                        "grid size-5 shrink-0 place-items-center rounded-full",
                        step.done ? "bg-success text-black" : "border border-white/20",
                      )}
                    >
                      {step.done && <Check className="size-3" strokeWidth={3} />}
                    </span>
                    <span className={step.done ? "text-foreground" : "text-muted-foreground"}>{step.label}</span>
                  </li>
                ))}
              </ol>

              <Button type="submit" size="lg" className="mt-5 w-full" disabled={submitting}>
                {submitting ? "Publishing…" : ready ? "Publish listing" : "Review and publish"}
              </Button>
              <Button asChild variant="ghost" size="lg" className="mt-1.5 w-full text-muted-foreground">
                <Link href={kind === "item" ? "/marketplace" : "/currency"}>Cancel</Link>
              </Button>
            </div>

            <div className="flex gap-3 rounded-[20px] bg-card p-5 text-[13px] leading-relaxed text-muted-foreground">
              <ShieldCheck className="mt-0.5 size-5 shrink-0 text-link" strokeWidth={1.5} />
              <p>
                Never share your Roblox password. Keep the whole deal in RbMarket chat so there&apos;s a record, and
                check buyers against the{" "}
                <Link href="/hall-of-shame" className="text-link hover:underline">
                  Hall of Shame
                </Link>
                .
              </p>
            </div>
          </aside>
        </form>
      </div>
    </main>
  )
}

function Step({ number, title, hint, children }: { number: number; title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-[20px] bg-card p-5 md:p-7">
      <div className="mb-5 flex items-center gap-3">
        <span className="grid size-7 shrink-0 place-items-center rounded-full bg-secondary text-[13px] font-semibold tabular-nums">
          {number}
        </span>
        <h2 className="text-[19px] font-semibold tracking-[-0.015em]">{title}</h2>
        {hint && <span className="ml-auto text-[13px] text-muted-foreground">{hint}</span>}
      </div>
      <div className="space-y-5">{children}</div>
    </section>
  )
}

function Field({
  label,
  error,
  field,
  counter,
  children,
}: {
  label: string
  error?: string
  field: string
  counter?: string
  children: React.ReactNode
}) {
  return (
    <div data-field={field}>
      <div className="mb-2 flex items-baseline justify-between gap-3">
        <span className="text-[13px] font-medium text-muted-foreground">{label}</span>
        {counter && <span className="text-[12px] tabular-nums text-muted-foreground">{counter}</span>}
      </div>
      {children}
      <ErrorText message={error} />
    </div>
  )
}

function ErrorText({ message }: { message?: string }) {
  if (!message) return null
  return <p className="mt-2 text-[13px] text-destructive">{message}</p>
}

function GamePicker({
  games,
  value,
  onChange,
}: {
  games: SellGameOption[]
  value: string
  onChange: (name: string) => void
}) {
  const [query, setQuery] = useState("")
  const [expanded, setExpanded] = useState(false)
  const selected = games.find((g) => g.name === value)

  if (games.length === 0) {
    return <p className="rounded-[14px] bg-secondary/40 px-4 py-3 text-[14px] text-muted-foreground">No games are available yet.</p>
  }

  if (selected) {
    return (
      <div className="flex items-center gap-3 rounded-[14px] bg-secondary/50 p-2.5 pr-3">
        <GameIcon name={selected.name} size={44} />
        <span className="min-w-0 flex-1 truncate font-semibold">{selected.displayName}</span>
        <button type="button" onClick={() => onChange("")} className="shrink-0 text-[14px] text-link hover:underline">
          Change
        </button>
      </div>
    )
  }

  const q = query.trim().toLowerCase()
  const matches = q ? games.filter((g) => g.displayName.toLowerCase().includes(q)) : games
  const shown = q || expanded ? matches : matches.slice(0, GAMES_COLLAPSED)

  return (
    <div>
      <div className="relative mb-3">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" strokeWidth={1.75} />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={`Search ${games.length} games`}
          className="pl-10"
          aria-label="Search games"
        />
      </div>
      {shown.length === 0 ? (
        <p className="px-1 py-3 text-[14px] text-muted-foreground">No game matches “{query}”.</p>
      ) : (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {shown.map((g) => (
            <button
              key={g.name}
              type="button"
              onClick={() => onChange(g.name)}
              className="flex items-center gap-2.5 rounded-[14px] bg-secondary/40 p-2 text-left text-[14px] font-medium transition-colors hover:bg-secondary"
            >
              <GameIcon name={g.name} size={36} className="rounded-[10px]" />
              <span className="line-clamp-2 leading-tight">{g.displayName}</span>
            </button>
          ))}
        </div>
      )}
      {!q && matches.length > GAMES_COLLAPSED && (
        <button type="button" onClick={() => setExpanded((v) => !v)} className="mt-3 text-[14px] text-link hover:underline">
          {expanded ? "Show fewer games" : `Show all ${matches.length} games`}
        </button>
      )}
    </div>
  )
}

function ChipGroup({
  options,
  value,
  onChange,
}: {
  options: { value: string; label: string }[]
  value: string
  onChange: (value: string) => void
}) {
  return (
    <div role="radiogroup" className="flex flex-wrap gap-2">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          onClick={() => onChange(o.value)}
          className={cn(
            "rounded-full px-4 py-2 text-[14px] font-medium transition-colors",
            value === o.value ? "bg-foreground text-background" : "bg-secondary text-foreground hover:bg-[#3a3a3c]",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

function Segmented<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string
  value: T
  options: { value: T; label: string }[]
  onChange: (value: T) => void
}) {
  return (
    <div role="radiogroup" aria-label={label} className="inline-flex rounded-full bg-secondary p-[3px] text-[14px] font-medium">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          onClick={() => onChange(o.value)}
          className={cn(
            "rounded-full px-4 py-1.5 transition-colors",
            value === o.value ? "bg-[#48484a] text-foreground" : "text-muted-foreground hover:text-foreground",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

function AffixInput({
  value,
  onChange,
  prefix,
  suffix,
  placeholder,
  step = "any",
  invalid,
}: {
  value: string
  onChange: (value: string) => void
  prefix?: string
  suffix?: string
  placeholder?: string
  step?: string
  invalid?: boolean
}) {
  return (
    <div
      className={cn(
        "flex h-11 items-center gap-2 rounded-xl border bg-secondary/40 px-3.5 transition-colors focus-within:border-ring focus-within:ring-2 focus-within:ring-ring/40",
        invalid ? "border-destructive/50" : "border-border",
      )}
    >
      {prefix && <span className="text-[15px] text-muted-foreground">{prefix}</span>}
      <input
        type="number"
        inputMode="decimal"
        min="0"
        step={step}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-invalid={invalid}
        className="h-full min-w-0 flex-1 bg-transparent text-[15px] tabular-nums outline-none placeholder:text-muted-foreground [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
      />
      {suffix && <span className="shrink-0 truncate text-[13px] text-muted-foreground">{suffix}</span>}
    </div>
  )
}

function PaymentPicker({ value, error, onToggle }: { value: string[]; error?: string; onToggle: (method: string) => void }) {
  return (
    <div data-field="paymentMethods">
      <div className="flex flex-wrap gap-2">
        {PAYMENT_METHODS.map((method) => {
          const on = value.includes(method)
          return (
            <button
              key={method}
              type="button"
              role="checkbox"
              aria-checked={on}
              onClick={() => onToggle(method)}
              className={cn(
                "flex items-center gap-1.5 rounded-full px-4 py-2 text-[14px] font-medium transition-colors",
                on ? "bg-foreground text-background" : "bg-secondary text-foreground hover:bg-[#3a3a3c]",
              )}
            >
              {on && <Check className="size-3.5" strokeWidth={2.5} />}
              {method}
            </button>
          )
        })}
      </div>
      <ErrorText message={error} />
      <p className="mt-2.5 text-[13px] text-muted-foreground">Buyers pay you directly. RbMarket never holds the money.</p>
    </div>
  )
}
