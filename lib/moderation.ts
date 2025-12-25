import { prisma } from "@/lib/prisma"

/**
 * Check if text contains blacklisted words
 * Returns the first blacklisted word found, or null if none found
 */
export async function checkBlacklistedWords(
  text: string
): Promise<{ isBlacklisted: boolean; foundWord: string | null }> {
  try {
    // Get blacklisted words from settings
    const blacklistedWordsSetting = await prisma.systemSettings.findUnique({
      where: { key: "blacklisted_words" },
    })

    if (!blacklistedWordsSetting) {
      return { isBlacklisted: false, foundWord: null }
    }

    let blacklistedWords: string[] = []
    try {
      blacklistedWords = JSON.parse(blacklistedWordsSetting.value)
    } catch (e) {
      console.error("Error parsing blacklisted words:", e)
      return { isBlacklisted: false, foundWord: null }
    }

    // Check text (case-insensitive)
    const lowerText = text.toLowerCase()
    const foundWord = blacklistedWords.find((word) =>
      lowerText.includes(word.toLowerCase())
    )

    return {
      isBlacklisted: !!foundWord,
      foundWord: foundWord || null,
    }
  } catch (error) {
    console.error("Error checking blacklisted words:", error)
    return { isBlacklisted: false, foundWord: null }
  }
}

/**
 * Check multiple text fields for blacklisted words
 * Returns the first field that contains a blacklisted word
 */
export async function checkMultipleFields(
  fields: Record<string, string>
): Promise<{
  isBlacklisted: boolean
  foundWord: string | null
  field: string | null
}> {
  for (const [fieldName, fieldValue] of Object.entries(fields)) {
    if (!fieldValue) continue

    const result = await checkBlacklistedWords(fieldValue)
    if (result.isBlacklisted) {
      return {
        isBlacklisted: true,
        foundWord: result.foundWord,
        field: fieldName,
      }
    }
  }

  return { isBlacklisted: false, foundWord: null, field: null }
}

/**
 * Log auto-moderation action to audit log
 */
export async function logModerationAction(
  userId: string,
  action: string,
  details: string
): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        userId,
        action,
        details,
        timestamp: new Date(),
      },
    })
  } catch (error) {
    console.error("Error logging moderation action:", error)
  }
}

/**
 * Check if text contains prohibited external contact methods
 */
export async function checkExternalContactMethods(
  text: string
): Promise<{ hasExternalContact: boolean; method: string | null }> {
  const lowerText = text.toLowerCase()

  // Patterns for external contact methods
  const patterns = [
    { pattern: /discord\.gg\/\w+/i, method: "Discord invite" },
    { pattern: /discordapp\.com\/\w+/i, method: "Discord link" },
    { pattern: /disc[o0]rd/i, method: "Discord mention" },
    { pattern: /telegram\.me\/\w+/i, method: "Telegram link" },
    { pattern: /t\.me\/\w+/i, method: "Telegram invite" },
    { pattern: /whatsapp\.com/i, method: "WhatsApp link" },
    { pattern: /wa\.me/i, method: "WhatsApp link" },
    { pattern: /paypal\.me/i, method: "PayPal link" },
    { pattern: /venmo\.com/i, method: "Venmo link" },
    { pattern: /cashapp/i, method: "CashApp mention" },
    { pattern: /\b\w+@\w+\.\w+/i, method: "Email address" },
    { pattern: /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/, method: "Phone number" },
  ]

  for (const { pattern, method } of patterns) {
    if (pattern.test(text)) {
      return { hasExternalContact: true, method }
    }
  }

  return { hasExternalContact: false, method: null }
}

/**
 * Check if text contains scam-related content
 */
export async function checkScamContent(
  text: string
): Promise<{ isScam: boolean; reason: string | null }> {
  const lowerText = text.toLowerCase()

  const scamPatterns = [
    { pattern: /free\s+robux/i, reason: "Free Robux scam" },
    { pattern: /hack/i, reason: "Hacking mention" },
    { pattern: /exploit/i, reason: "Exploit mention" },
    { pattern: /cheat/i, reason: "Cheat mention" },
    { pattern: /doubl(e|ing)\s+(your|robux)/i, reason: "Doubling scam" },
    { pattern: /(steal|stolen)\s+account/i, reason: "Account theft" },
    { pattern: /too\s+good\s+to\s+be\s+true/i, reason: "Suspicious offer" },
    { pattern: /trust\s+me/i, reason: "Trust manipulation" },
    { pattern: /send\s+first/i, reason: "Send first scam" },
  ]

  for (const { pattern, reason } of scamPatterns) {
    if (pattern.test(text)) {
      return { isScam: true, reason }
    }
  }

  return { isScam: false, reason: null }
}

/**
 * Comprehensive content moderation check
 * Combines all moderation checks
 */
export async function moderateContent(
  text: string,
  context: "listing" | "message" | "profile" = "message"
): Promise<{
  isAllowed: boolean
  reason: string | null
  severity: "low" | "medium" | "high"
}> {
  // Check blacklisted words
  const blacklistCheck = await checkBlacklistedWords(text)
  if (blacklistCheck.isBlacklisted) {
    return {
      isAllowed: false,
      reason: `Contains prohibited word: "${blacklistCheck.foundWord}"`,
      severity: "high",
    }
  }

  // Check external contact methods (only for messages and listings)
  if (context === "message" || context === "listing") {
    const externalCheck = await checkExternalContactMethods(text)
    if (externalCheck.hasExternalContact) {
      return {
        isAllowed: false,
        reason: `Contains external contact method: ${externalCheck.method}`,
        severity: "high",
      }
    }
  }

  // Check scam content
  const scamCheck = await checkScamContent(text)
  if (scamCheck.isScam) {
    return {
      isAllowed: false,
      reason: `Potential scam detected: ${scamCheck.reason}`,
      severity: "high",
    }
  }

  return { isAllowed: true, reason: null, severity: "low" }
}
