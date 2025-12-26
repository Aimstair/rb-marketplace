// Test script to verify webhook configuration
// Run: node test-webhook-config.js

const crypto = require("crypto")

const WEBHOOK_SECRET = process.env.PAYMONGO_WEBHOOK_SECRET || ""

console.log("\n🔍 Webhook Configuration Test\n")

// Check if secret is set
if (!WEBHOOK_SECRET) {
  console.log("❌ PAYMONGO_WEBHOOK_SECRET is not set!")
  console.log("   Add it to your .env.local file\n")
  process.exit(1)
}

console.log("✅ Webhook secret is set")
console.log(`   Format: ${WEBHOOK_SECRET.substring(0, 10)}...`)
console.log(`   Length: ${WEBHOOK_SECRET.length} characters\n`)

// Test signature generation
const testPayload = JSON.stringify({
  data: {
    attributes: {
      type: "link.payment.paid",
      data: {
        id: "link_test123",
        attributes: {
          amount: 19900,
          metadata: {
            userId: "test",
            tier: "PRO"
          }
        }
      }
    }
  }
})

try {
  const signature = crypto
    .createHmac("sha256", WEBHOOK_SECRET)
    .update(testPayload)
    .digest("hex")
  
  console.log("✅ Signature generation works")
  console.log(`   Test signature: ${signature.substring(0, 20)}...\n`)
} catch (error) {
  console.log("❌ Error generating signature:")
  console.log(`   ${error.message}\n`)
}

// Instructions
console.log("📋 Next Steps:\n")
console.log("1. Go to PayMongo Dashboard: https://dashboard.paymongo.com/developers/webhooks")
console.log("2. Check your webhook configuration:")
console.log("   - URL: https://interinsular-semiconcealed-fran.ngrok-free.dev/api/webhooks/paymongo")
console.log("   - Events enabled: link.payment.paid, payment.paid, payment.failed")
console.log("   - Status: Active")
console.log("\n3. Test the webhook by:")
console.log("   - Making a test payment")
console.log("   - Checking 'Recent Deliveries' in PayMongo webhook dashboard")
console.log("   - Looking for any error messages\n")

console.log("4. Common issues:")
console.log("   - Webhook secret mismatch (copy fresh from PayMongo)")
console.log("   - Webhook URL not updated with current ngrok URL")
console.log("   - Events not enabled in PayMongo dashboard")
console.log("   - Dev server not restarted after adding secret\n")

console.log("💡 Tip: PayMongo only sends webhooks for NEW payments")
console.log("   Old payments won't trigger webhooks - make a new test payment!\n")
