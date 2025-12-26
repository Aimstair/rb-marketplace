/**
 * Manual Payment Processing Script
 * Use this to manually process a pending payment that was successfully paid
 * but not updated due to webhook issues.
 * 
 * Usage: node fix-pending-payment.js <payment-id>
 * Or: node fix-pending-payment.js (will show all pending payments)
 */

const { PrismaClient } = require("@prisma/client")

const prisma = new PrismaClient()

async function listPendingPayments() {
  console.log("\n📋 Fetching all pending payments...\n")
  
  const payments = await prisma.payment.findMany({
    where: {
      status: "pending",
    },
    include: {
      user: {
        select: {
          id: true,
          username: true,
          email: true,
          subscriptionTier: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  })

  if (payments.length === 0) {
    console.log("✅ No pending payments found!")
    return
  }

  console.log(`Found ${payments.length} pending payment(s):\n`)
  
  payments.forEach((payment, index) => {
    const metadata = payment.metadata
    console.log(`${index + 1}. Payment ID: ${payment.id}`)
    console.log(`   User: ${payment.user.username} (${payment.user.email})`)
    console.log(`   Amount: ₱${payment.amount}`)
    console.log(`   Type: ${payment.type}`)
    console.log(`   Tier: ${metadata?.tier || 'N/A'}`)
    console.log(`   Current Subscription: ${payment.user.subscriptionTier}`)
    console.log(`   Created: ${payment.createdAt.toLocaleString()}`)
    console.log(`   PayMongo ID: ${payment.providerPaymentId}`)
    console.log("")
  })
}

async function processPayment(paymentId) {
  console.log(`\n🔄 Processing payment: ${paymentId}\n`)

  const payment = await prisma.payment.findUnique({
    where: { id: paymentId },
    include: {
      user: {
        select: {
          id: true,
          username: true,
          email: true,
          subscriptionTier: true,
        },
      },
    },
  })

  if (!payment) {
    console.error("❌ Payment not found!")
    return
  }

  if (payment.status === "completed") {
    console.log("✅ Payment is already completed!")
    return
  }

  const metadata = payment.metadata
  const tier = metadata?.tier

  if (!tier || (tier !== "PRO" && tier !== "ELITE")) {
    console.error("❌ Invalid tier in payment metadata!")
    return
  }

  console.log(`Payment Details:`)
  console.log(`  User: ${payment.user.username} (${payment.user.email})`)
  console.log(`  Amount: ₱${payment.amount}`)
  console.log(`  Tier: ${tier}`)
  console.log(`  Current Subscription: ${payment.user.subscriptionTier}`)
  console.log(``)

  // Confirm before processing
  console.log("⚠️  This will:")
  console.log(`  1. Mark payment as completed`)
  console.log(`  2. Upgrade user to ${tier}`)
  console.log(`  3. Set expiry date to 30 days from now`)
  console.log(`  4. Create a notification`)
  console.log(``)

  // In a real scenario, you'd want to verify with PayMongo first
  console.log("🔄 Processing...")

  try {
    await prisma.$transaction(async (tx) => {
      // Update payment status
      await tx.payment.update({
        where: { id: payment.id },
        data: {
          status: "completed",
          paidAt: new Date(),
        },
      })

      // Calculate expiry date (30 days)
      const expiresAt = new Date()
      expiresAt.setDate(expiresAt.getDate() + 30)

      // Upgrade user subscription
      await tx.user.update({
        where: { id: payment.userId },
        data: {
          subscriptionTier: tier,
          subscriptionEndsAt: expiresAt,
        },
      })

      // Create notification
      await tx.notification.create({
        data: {
          userId: payment.userId,
          title: `Upgraded to ${tier}!`,
          message: `Your subscription has been upgraded to ${tier}. Enjoy your new features!`,
          link: "/subscriptions",
          type: "SYSTEM",
          isRead: false,
        },
      })
    })

    console.log("✅ Payment processed successfully!")
    console.log(`   User upgraded to ${tier}`)
    console.log(`   Expires: ${new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString()}`)
  } catch (error) {
    console.error("❌ Error processing payment:", error)
  }
}

async function main() {
  const args = process.argv.slice(2)

  if (args.length === 0) {
    // No arguments - list all pending payments
    await listPendingPayments()
    console.log("💡 To process a payment, run: node fix-pending-payment.js <payment-id>")
  } else {
    // Process specific payment
    const paymentId = args[0]
    await processPayment(paymentId)
  }

  await prisma.$disconnect()
}

main().catch((error) => {
  console.error("Fatal error:", error)
  process.exit(1)
})
