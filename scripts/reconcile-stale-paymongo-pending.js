/* eslint-disable no-console */
const { PrismaClient } = require("@prisma/client")
const { loadEnvConfig } = require("@next/env")

loadEnvConfig(process.cwd())

function parseArgs(args) {
  const options = {
    execute: false,
    provider: "paymongo",
    minAgeHours: 24,
    requireTierMatch: false,
  }

  for (const arg of args) {
    if (arg === "--execute") {
      options.execute = true
      continue
    }

    if (arg === "--require-tier-match") {
      options.requireTierMatch = true
      continue
    }

    if (arg.startsWith("--provider=")) {
      const value = arg.split("=")[1]?.trim().toLowerCase()
      if (value) {
        options.provider = value
      }
      continue
    }

    if (arg.startsWith("--min-age-hours=")) {
      const value = Number(arg.split("=")[1])
      if (Number.isFinite(value) && value >= 0) {
        options.minAgeHours = value
      }
    }
  }

  return options
}

function normalizeTier(metadata) {
  const tier = metadata && typeof metadata === "object" ? metadata.tier : null
  return typeof tier === "string" ? tier.toUpperCase() : null
}

async function main() {
  const prisma = new PrismaClient()
  const options = parseArgs(process.argv.slice(2))

  const cutoff = new Date()
  cutoff.setHours(cutoff.getHours() - options.minAgeHours)

  try {
    console.log("\n=== Reconcile Stale Pending Payments ===")
    console.log(`provider=${options.provider}`)
    console.log(`minAgeHours=${options.minAgeHours}`)
    console.log(`requireTierMatch=${options.requireTierMatch}`)
    console.log(`mode=${options.execute ? "execute" : "dry-run"}`)

    const candidates = await prisma.payment.findMany({
      where: {
        provider: options.provider,
        status: "pending",
        updatedAt: { lte: cutoff },
      },
      select: {
        id: true,
        userId: true,
        amount: true,
        type: true,
        createdAt: true,
        updatedAt: true,
        metadata: true,
        providerPaymentId: true,
        user: {
          select: {
            username: true,
            email: true,
            subscriptionTier: true,
          },
        },
      },
      orderBy: { updatedAt: "asc" },
    })

    const filtered = options.requireTierMatch
      ? candidates.filter((payment) => {
          const targetTier = normalizeTier(payment.metadata)
          const currentTier = (payment.user.subscriptionTier || "").toUpperCase()
          return Boolean(targetTier) && targetTier === currentTier
        })
      : candidates

    console.log(`\nCandidates found: ${candidates.length}`)
    console.log(`Candidates after filters: ${filtered.length}`)

    if (filtered.length === 0) {
      console.log("No rows matched reconciliation criteria.")
      return
    }

    for (const payment of filtered.slice(0, 20)) {
      const tier = normalizeTier(payment.metadata) || "N/A"
      console.log(
        `- id=${payment.id} user=${payment.user.username} tier=${tier} currentTier=${payment.user.subscriptionTier} updatedAt=${payment.updatedAt.toISOString()} providerPaymentId=${payment.providerPaymentId}`
      )
    }

    if (filtered.length > 20) {
      console.log(`... and ${filtered.length - 20} more`)
    }

    if (!options.execute) {
      console.log("\nDry-run only. Re-run with --execute to apply status changes.")
      return
    }

    const ids = filtered.map((payment) => payment.id)
    const nowIso = new Date().toISOString()

    const updated = await prisma.payment.updateMany({
      where: {
        id: { in: ids },
        status: "pending",
      },
      data: {
        status: "failed",
      },
    })

    for (const payment of filtered) {
      const baseMetadata = payment.metadata && typeof payment.metadata === "object" ? payment.metadata : {}
      await prisma.payment.update({
        where: { id: payment.id },
        data: {
          metadata: {
            ...baseMetadata,
            reconciliation: {
              source: "scripts/reconcile-stale-paymongo-pending.js",
              reconciledAt: nowIso,
              reason: "stale_pending_cleanup",
              requireTierMatch: options.requireTierMatch,
              minAgeHours: options.minAgeHours,
            },
          },
        },
      })
    }

    console.log(`\nUpdated rows: ${updated.count}`)
  } catch (error) {
    console.error("Reconciliation failed:", error)
    process.exitCode = 1
  } finally {
    await prisma.$disconnect()
  }
}

main()
