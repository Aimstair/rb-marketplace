/* eslint-disable no-console */
const fs = require("fs")
const path = require("path")
const { PrismaClient } = require("@prisma/client")

const prisma = new PrismaClient()

const cleanupTargets = [
  "test-webhook-config.js",
  "test-send-webhook.js",
  "fix-pending-payment.js",
  "logs/PAYMONGO_SETUP.md",
  "logs/PAYMONGO_QUICK_REFERENCE.md",
  "logs/PAYMONGO_FIX_SUMMARY.md",
]

async function main() {
  const executeCleanup = process.argv.includes("--execute-cleanup")

  const [pendingPaymongo, totalPaymongoPendingOrRecent] = await Promise.all([
    prisma.payment.count({ where: { provider: "paymongo", status: "pending" } }),
    prisma.payment.count({
      where: {
        provider: "paymongo",
        OR: [
          { status: "pending" },
          { updatedAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } },
        ],
      },
    }),
  ])

  console.log("\n=== PayMongo Retirement Gate ===")
  console.log(`Pending PayMongo payments: ${pendingPaymongo}`)
  console.log(`Pending/recent (30d) PayMongo records: ${totalPaymongoPendingOrRecent}`)

  if (pendingPaymongo > 0) {
    const oldestPending = await prisma.payment.findFirst({
      where: { provider: "paymongo", status: "pending" },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        createdAt: true,
        amount: true,
        userId: true,
      },
    })

    console.log("\nRetirement blocked: pending PayMongo payments still exist.")
    if (oldestPending) {
      console.log("Oldest pending payment:")
      console.log(`- id=${oldestPending.id}`)
      console.log(`- createdAt=${oldestPending.createdAt.toISOString()}`)
      console.log(`- amount=${oldestPending.amount}`)
      console.log(`- userId=${oldestPending.userId}`)
    }

    process.exitCode = 1
    return
  }

  console.log("\nRetirement gate PASSED: no pending PayMongo payments remain.")
  console.log("Recommended flag updates:")
  console.log("- ENABLE_PAYMONGO_WEBHOOK=false")
  console.log("- ENABLED_SUBSCRIPTION_PAYMENT_PROVIDERS=paypal")
  console.log("- ACTIVE_SUBSCRIPTION_PAYMENT_PROVIDER=paypal")

  if (!executeCleanup) {
    console.log("\nCleanup preview mode. Re-run with --execute-cleanup to remove legacy PayMongo scripts/docs.")
    for (const relativePath of cleanupTargets) {
      const absolutePath = path.resolve(relativePath)
      const exists = fs.existsSync(absolutePath)
      console.log(`- ${relativePath}: ${exists ? "would remove" : "already missing"}`)
    }
    return
  }

  console.log("\nExecuting cleanup...")
  for (const relativePath of cleanupTargets) {
    const absolutePath = path.resolve(relativePath)
    if (!fs.existsSync(absolutePath)) {
      console.log(`- skip ${relativePath} (already missing)`)
      continue
    }

    fs.unlinkSync(absolutePath)
    console.log(`- removed ${relativePath}`)
  }
}

main()
  .catch((error) => {
    console.error("PayMongo retirement gate failed with exception:", error)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
