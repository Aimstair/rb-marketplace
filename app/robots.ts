import type { MetadataRoute } from "next"
import { getSiteUrl } from "@/lib/seo"

// Private and utility routes. A crawler follows only the most specific group that names it,
// so every group below repeats this list rather than relying on the "*" group.
const PRIVATE_PATHS = [
  "/api/",
  "/admin",
  "/auth/",
  "/sell",
  "/messages",
  "/my-listings",
  "/my-transactions",
  "/settings",
  "/notifications",
  "/maintenance",
  "/*?*sort=",
  "/*?*page=",
]

// Search and AI answer engines that are welcome to read public pages, so RbMarket can be
// cited in ChatGPT, Perplexity, Claude, Gemini and Copilot answers.
const ANSWER_ENGINE_BOTS = [
  "Googlebot",
  "Bingbot",
  "OAI-SearchBot",
  "ChatGPT-User",
  "GPTBot",
  "PerplexityBot",
  "Perplexity-User",
  "ClaudeBot",
  "Claude-SearchBot",
  "Claude-User",
  "Google-Extended",
  "Applebot",
  "Applebot-Extended",
  "DuckAssistBot",
  "meta-externalagent",
]

export default function robots(): MetadataRoute.Robots {
  const baseUrl = getSiteUrl()

  return {
    rules: [
      { userAgent: "*", allow: "/", disallow: PRIVATE_PATHS },
      { userAgent: ANSWER_ENGINE_BOTS, allow: "/", disallow: PRIVATE_PATHS },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
    host: baseUrl,
  }
}
