import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
    },
    notification: {
      create: vi.fn(),
      count: vi.fn(),
    },
  },
}))

vi.mock("@/lib/feature-flags", () => ({
  isRealtimeMessagingFeatureEnabled: vi.fn(() => false),
}))

vi.mock("@/auth", () => ({
  auth: vi.fn(),
}))

import { prisma } from "@/lib/prisma"
import { createNotification } from "@/app/actions/notifications"

const mockedFindUnique = vi.mocked(prisma.user.findUnique)
const mockedCreate = vi.mocked(prisma.notification.create)

describe("createNotification preference enforcement", () => {
  beforeEach(() => {
    mockedFindUnique.mockReset()
    mockedCreate.mockReset()
  })

  it("skips MESSAGE notifications when notifyNewMessages is disabled", async () => {
    mockedFindUnique.mockResolvedValue({
      id: "user-1",
      preferences: {
        notifyNewMessages: false,
        notifyTradeUpdates: true,
      },
    } as never)

    const result = await createNotification("user-1", "MESSAGE", "New message", "hello")

    expect(result.success).toBe(true)
    expect(mockedCreate).not.toHaveBeenCalled()
  })

  it("skips ORDER notifications when notifyTradeUpdates is disabled", async () => {
    mockedFindUnique.mockResolvedValue({
      id: "user-2",
      preferences: {
        notifyNewMessages: true,
        notifyTradeUpdates: false,
      },
    } as never)

    const result = await createNotification("user-2", "ORDER_UPDATE", "Trade update", "updated")

    expect(result.success).toBe(true)
    expect(mockedCreate).not.toHaveBeenCalled()
  })

  it("still creates SYSTEM notifications regardless of preferences", async () => {
    mockedFindUnique.mockResolvedValue({
      id: "user-3",
      preferences: {
        notifyNewMessages: false,
        notifyTradeUpdates: false,
      },
    } as never)

    mockedCreate.mockResolvedValue({
      id: "notif-1",
      type: "SYSTEM",
      title: "System",
      message: "important",
      link: null,
      isRead: false,
      createdAt: new Date("2026-04-02T00:00:00.000Z"),
    } as never)

    const result = await createNotification("user-3", "SYSTEM", "System", "important")

    expect(result.success).toBe(true)
    expect(mockedCreate).toHaveBeenCalledTimes(1)
  })
})
