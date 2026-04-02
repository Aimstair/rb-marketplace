import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
    },
  },
}))

vi.mock("@/lib/email", () => ({
  sendEmail: vi.fn(),
}))

vi.mock("@/lib/observability", () => ({
  logInfo: vi.fn(),
  logWarn: vi.fn(),
  logError: vi.fn(),
}))

import { sendEmail } from "@/lib/email"
import { clearCampaignDispatchGuard } from "@/lib/campaign-idempotency"
import { sendCampaignEmailToRecipient } from "@/lib/engagement-email"

const mockedSendEmail = vi.mocked(sendEmail)

describe("campaign delivery guards", () => {
  beforeEach(() => {
    delete process.env.UPSTASH_REDIS_REST_URL
    delete process.env.UPSTASH_REDIS_REST_TOKEN
    mockedSendEmail.mockReset()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it("retries failed sends with backoff and reports retry count", async () => {
    vi.useFakeTimers()
    mockedSendEmail
      .mockResolvedValueOnce(false)
      .mockResolvedValueOnce(false)
      .mockResolvedValueOnce(true)

    const campaignKey = `retry-backoff-${Date.now()}`
    const sendPromise = sendCampaignEmailToRecipient({
      campaignKey,
      recipientUserId: "user-retry-1",
      to: "retry@example.com",
      subject: "Retry test",
      html: "<p>Retry</p>",
      maxAttempts: 3,
    })

    await vi.runAllTimersAsync()
    const result = await sendPromise

    expect(mockedSendEmail).toHaveBeenCalledTimes(3)
    expect(result.sent).toBe(true)
    expect(result.retries).toBe(2)
    expect(result.deduped).toBe(false)

    await clearCampaignDispatchGuard(`${campaignKey}:user-retry-1`)
  })

  it("dedupes repeated recipient sends for the same campaign key", async () => {
    mockedSendEmail.mockResolvedValue(true)

    const campaignKey = `dedupe-${Date.now()}`
    const recipientUserId = "user-dedupe-1"

    const first = await sendCampaignEmailToRecipient({
      campaignKey,
      recipientUserId,
      to: "dedupe@example.com",
      subject: "Dedupe first",
      html: "<p>First</p>",
      maxAttempts: 3,
    })

    const second = await sendCampaignEmailToRecipient({
      campaignKey,
      recipientUserId,
      to: "dedupe@example.com",
      subject: "Dedupe second",
      html: "<p>Second</p>",
      maxAttempts: 3,
    })

    expect(first.sent).toBe(true)
    expect(first.deduped).toBe(false)
    expect(second.sent).toBe(false)
    expect(second.deduped).toBe(true)
    expect(mockedSendEmail).toHaveBeenCalledTimes(1)

    await clearCampaignDispatchGuard(`${campaignKey}:${recipientUserId}`)
  })
})
