/**
 * Shared SEO constants and helpers. Every page's metadata, structured data, sitemap and
 * llms.txt read the brand, URL and wording from here so they never drift apart.
 */

export const SITE_NAME = "RbMarket"
export const SITE_TAGLINE = "Roblox Marketplace Philippines"
export const DEFAULT_SITE_URL = "https://rbmarket.app"
export const SUPPORT_EMAIL = "support@rbmarket.app"
export const SITE_LOCALE = "en_PH"

/** One-sentence definition, written so search engines and AI answers can quote it as-is. */
export const SITE_DEFINITION =
  "RbMarket is a Philippine peer-to-peer Roblox marketplace where players buy and sell Roblox items, pets, limiteds and in-game currency for pesos, paying sellers directly with GCash or PayPal."

export const SITE_DESCRIPTION =
  "Buy and sell Roblox items, pets and in-game currency in the Philippines. Prices in pesos, GCash and PayPal, vouched sellers and a public scammer list. Free to list."

export function getSiteUrl(): string {
  const candidate = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || DEFAULT_SITE_URL
  try {
    return new URL(candidate).toString().replace(/\/$/, "")
  } catch {
    return DEFAULT_SITE_URL
  }
}

export function absoluteUrl(pathOrUrl: string): string {
  if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl
  return `${getSiteUrl()}${pathOrUrl.startsWith("/") ? "" : "/"}${pathOrUrl}`
}

/** URL slug for a game name: "Pet Simulator 99" -> "pet-simulator-99". */
export function gameSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
}

export function gamePath(name: string): string {
  return `/games/${gameSlug(name)}`
}

/** Trims text to a meta-description length on a word boundary. */
export function truncate(text: string, max = 155): string {
  const clean = text.replace(/\s+/g, " ").trim()
  if (clean.length <= max) return clean
  const cut = clean.slice(0, max - 1)
  const trimmed = cut.slice(0, Math.max(cut.lastIndexOf(" "), max - 20))
  // A cut that lands on a full stop reads as finished; anything else gets an ellipsis
  return /[.!?]$/.test(trimmed) ? trimmed : `${trimmed}…`
}

/** Strips HTML tags, for descriptions built from rich text such as blog posts. */
export function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, " ").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim()
}
