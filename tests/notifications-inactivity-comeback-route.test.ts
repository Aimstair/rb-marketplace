import { beforeEach, describe, expect, it, vi } from "vitest"
import { NextRequest } from "next/server"

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findMany: vi.fn(),
    },
  },
}))

vi.mock("@/lib/engagement-email", () => ({
  sendInactivityComebackEmail: vi.fn(),
}))

vi.mock("@/lib/feature-flags", () => ({
  isEmailNotificationsFeatureEnabled: vi.fn(() => true),
}))

vi.mock("@/lib/observability", () => ({
  logInfo: vi.fn(),
  logWarn: vi.fn(),
  logError: vi.fn(),
}))

import { prisma } from "@/lib/prisma"
import { sendInactivityComebackEmail } from "@/lib/engagement-email"
import { POST } from "@/app/api/notifications/inactivity-comeback/route"

const mockedFindMany = vi.mocked(prisma.user.findMany)
const mockedSendInactivityComebackEmail = vi.mocked(sendInactivityComebackEmail)

function createPostRequest(body: unknown, headers?: Record<string, string>) {
  return new NextRequest("http://localhost/api/notifications/inactivity-comeback", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(headers || {}),
    },
    body: JSON.stringify(body),
  })
}

describe("POST /api/notifications/inactivity-comeback", () => {
  beforeEach(() => {
    process.env.EMAIL_INACTIVITY_CRON_SECRET = "inactivity-secret"
    mockedFindMany.mockReset()
    mockedSendInactivityComebackEmail.mockReset()
  })

  it("rejects unauthorized requests", async () => {
    const response = await POST(createPostRequest({ dryRun: true }))
    const body = await response.json()

    expect(response.status).toBe(401)
    expect(body.success).toBe(false)
    expect(body.error).toBe("Unauthorized")
  })

  it("supports dry-run mode without dispatching emails", async () => {
    mockedFindMany.mockResolvedValue([
      {
        id: "user-1",
        email: "user1@example.com",
        lastActive: new Date("2026-03-01T00:00:00.000Z"),
      },
      {
        id: "user-2",
        email: "user2@example.com",
        lastActive: new Date("2026-03-02T00:00:00.000Z"),
      },
    ] as never)

    const response = await POST(
      createPostRequest(
        { dryRun: true, minInactivityDays: 7, batchLimit: 50 },
        { "x-email-inactivity-secret": "inactivity-secret" }
      )
    )

    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.success).toBe(true)
    expect(body.dryRun).toBe(true)
    expect(body.usersEvaluated).toBe(2)
    expect(body.emailsQueued).toBe(2)
    expect(body.emailsSent).toBe(0)
    expect(body.emailsFailed).toBe(0)
    expect(mockedSendInactivityComebackEmail).not.toHaveBeenCalled()
  })

  it("executes dispatch path and aggregates send outcomes", async () => {
    mockedFindMany.mockResolvedValue([
      {
        id: "user-send-1",
        email: "send1@example.com",
        lastActive: new Date("2026-03-01T00:00:00.000Z"),
      },
      {
        id: "user-send-2",
        email: "send2@example.com",
        lastActive: new Date("2026-03-03T00:00:00.000Z"),
      },
      {
        id: "user-no-email",
        email: "",
        lastActive: new Date("2026-03-04T00:00:00.000Z"),
      },
    ] as never)

    mockedSendInactivityComebackEmail
      .mockResolvedValueOnce({
        sent: true,
        deduped: false,
        skipped: false,
        attempts: 2,
        retries: 1,
      })
      .mockResolvedValueOnce({
        sent: false,
        deduped: true,
        skipped: false,
        attempts: 0,
        retries: 0,
      })

    const response = await POST(
      createPostRequest(
        { dryRun: false, campaignDate: "2026-04-02", minInactivityDays: 7, batchLimit: 100 },
        { "x-email-inactivity-secret": "inactivity-secret" }
      )
    )
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.success).toBe(true)
    expect(body.dryRun).toBe(false)
    expect(body.emailsQueued).toBe(2)
    expect(body.emailsSent).toBe(1)
    expect(body.emailsDeduped).toBe(1)
    expect(body.retryAttempts).toBe(1)
    expect(mockedSendInactivityComebackEmail).toHaveBeenCalledTimes(2)
  })
})
