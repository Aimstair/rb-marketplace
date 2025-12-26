/**
 * PayMongo Webhook Test Sender
 * This simulates a PayMongo webhook to test your endpoint
 * 
 * Usage: node test-send-webhook.js
 */

const crypto = require("crypto")
const http = require("http")  // Use http for localhost

// Read webhook secret from .env.local
const fs = require("fs")
const envContent = fs.readFileSync(".env.local", "utf8")
const secretMatch = envContent.match(/PAYMONGO_WEBHOOK_SECRET\s*=\s*"?([^"\n]+)"?/)
const WEBHOOK_SECRET = secretMatch ? secretMatch[1] : ""

console.log("\n🧪 PayMongo Webhook Test Sender\n")

if (!WEBHOOK_SECRET) {
  console.log("❌ Could not find PAYMONGO_WEBHOOK_SECRET in .env.local")
  process.exit(1)
}

console.log(`✅ Webhook secret found: ${WEBHOOK_SECRET.substring(0, 10)}...`)
console.log(`   Length: ${WEBHOOK_SECRET.length} characters\n`)

// Create test payload that matches PayMongo structure
const testPayload = {
  data: {
    id: "evt_test_" + Date.now(),
    type: "event",
    attributes: {
      type: "link.payment.paid",
      livemode: false,
      data: {
        id: "link_TEST" + Date.now(),
        type: "link",
        attributes: {
          amount: 19900,
          archived: false,
          currency: "PHP",
          description: "Test Payment - PRO Subscription",
          livemode: false,
          fee: 2985,
          remarks: "Upgrade to PRO plan",
          status: "paid",
          tax_amount: null,
          taxes: [],
          checkout_url: "https://test.paymongo.com/links/test",
          reference_number: "TEST123",
          created_at: Date.now(),
          updated_at: Date.now(),
          payments: [],
          metadata: {
            userId: "test_user_123",
            tier: "PRO",
            username: "testuser",
            email: "test@example.com",
            type: "subscription"
          }
        }
      },
      created_at: Math.floor(Date.now() / 1000),
      updated_at: Math.floor(Date.now() / 1000)
    }
  }
}

const payload = JSON.stringify(testPayload)

// Generate signature
const signature = crypto
  .createHmac("sha256", WEBHOOK_SECRET)
  .update(payload)
  .digest("hex")

console.log("📦 Test payload created")
console.log(`   Event type: link.payment.paid`)
console.log(`   Link ID: ${testPayload.data.attributes.data.id}`)
console.log(`   Signature: ${signature.substring(0, 20)}...\n`)

// Send to local webhook endpoint
const options = {
  hostname: "localhost",
  port: 3000,
  path: "/api/webhooks/paymongo",
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "Content-Length": payload.length,
    "paymongo-signature": signature
  }
}

console.log("🚀 Sending test webhook to http://localhost:3000/api/webhooks/paymongo\n")

const httpReq = http.request(options, (res) => {
  console.log(`📨 Response: ${res.statusCode} ${res.statusMessage}`)
  
  let data = ""
  res.on("data", (chunk) => {
    data += chunk
  })
  
  res.on("end", () => {
    console.log(`   Body: ${data}\n`)
    
    if (res.statusCode === 200) {
      console.log("✅ SUCCESS! Webhook was received and processed!")
      console.log("\n💡 This means:")
      console.log("   • Webhook endpoint is working")
      console.log("   • Signature verification is correct")
      console.log("   • Your PayMongo webhooks should work now")
      console.log("\n🎯 Next step:")
      console.log("   Make a real payment and check if it auto-updates!")
    } else if (res.statusCode === 401) {
      console.log("❌ FAILED: Invalid signature")
      console.log("\n💡 This means:")
      console.log("   • Webhook secret might be wrong")
      console.log("   • Check if secret in .env.local matches PayMongo")
      console.log("   • Make sure dev server was restarted after adding secret")
      console.log("\n📋 To fix:")
      console.log("   1. Go to PayMongo Dashboard → Webhooks")
      console.log("   2. Copy the EXACT webhook secret")
      console.log("   3. Update PAYMONGO_WEBHOOK_SECRET in .env.local")
      console.log("   4. Restart dev server (npm run dev)")
      console.log("   5. Run this test again")
    } else {
      console.log("⚠️  Unexpected response")
      console.log("   Check dev server logs for errors")
    }
  })
})

httpReq.on("error", (error) => {
  console.log(`❌ Error sending request: ${error.message}`)
  console.log("\n💡 Make sure:")
  console.log("   • Dev server is running (npm run dev)")
  console.log("   • Server is listening on port 3000")
})

httpReq.write(payload)
httpReq.end()
