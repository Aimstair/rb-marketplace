# 🔧 Webhook Not Working - Complete Fix

## The Problem

Your webhook secret is in `.env.local` but **Node.js can't read it** because:
1. The dev server was started BEFORE you added the secret
2. Environment variables are only loaded when the server starts

## ✅ Complete Fix (Step-by-Step)

### Step 1: Verify Webhook Secret Format

Your current secret: `whsk_mqQseRh8GMgoRtuWXEynKoc8`

PayMongo webhook secrets usually start with:
- `whsec_...` (for webhook secrets)
- NOT `whsk_...`

**Action:** Double-check in PayMongo Dashboard → Webhooks → Copy fresh secret

### Step 2: Update .env.local (If Needed)

If your secret is wrong, update this line in `.env.local`:

```bash
PAYMONGO_WEBHOOK_SECRET="whsec_YOUR_ACTUAL_SECRET_HERE"
```

### Step 3: CRITICAL - Restart Dev Server

**You MUST restart the dev server** for changes to take effect:

```powershell
# In the terminal running npm run dev:
# Press Ctrl+C to stop

# Then start again:
npm run dev
```

### Step 4: Verify ngrok URL in PayMongo

Your current ngrok URL:
```
https://interinsular-semiconcealed-fran.ngrok-free.dev/api/webhooks/paymongo
```

**Check in PayMongo Dashboard:**
1. Go to: https://dashboard.paymongo.com/developers/webhooks
2. Click on your webhook
3. Verify URL matches EXACTLY (including `/api/webhooks/paymongo`)
4. Verify these events are enabled:
   - ✅ `link.payment.paid`
   - ✅ `payment.paid`
   - ✅ `payment.failed`
5. Check Status shows "Active" (not "Disabled")

### Step 5: Test with NEW Payment

**IMPORTANT:** PayMongo only sends webhooks for NEW payments!

Old payments (already completed) won't trigger webhooks. You need to:
1. Make a completely NEW test payment
2. Watch the dev server logs for:
   ```
   [PayMongo Webhook] Received event: link.payment.paid
   ```
3. Check ngrok dashboard: http://127.0.0.1:4040

## 🔍 Debugging Checklist

Go through each item:

- [ ] Webhook secret copied correctly from PayMongo (starts with `whsec_`)
- [ ] Secret added to `.env.local`
- [ ] Dev server RESTARTED after adding secret
- [ ] ngrok is running (`https://interinsular-semiconcealed-fran.ngrok-free.dev`)
- [ ] PayMongo webhook URL configured with current ngrok URL
- [ ] Events enabled: `link.payment.paid`, `payment.paid`, `payment.failed`
- [ ] Webhook status is "Active" in PayMongo
- [ ] Made a NEW test payment (not reusing old one)

## 📊 Check Webhook Deliveries in PayMongo

1. Go to: https://dashboard.paymongo.com/developers/webhooks
2. Click on your webhook
3. Go to "Recent Deliveries" tab
4. Look for:
   - ✅ Green checkmark = Webhook delivered successfully
   - ❌ Red X = Failed delivery (click to see error)
   
If you see errors:
- **401 Unauthorized** = Signature mismatch (wrong secret)
- **404 Not Found** = URL is wrong
- **500 Server Error** = Check dev server logs

## 🧪 Test Webhook is Working

After completing all steps above:

### Test 1: Make a Small Payment
```
1. Go to /subscriptions
2. Try to upgrade (use test card)
3. Complete payment
4. Watch dev server terminal for webhook logs
```

### Test 2: Check ngrok Dashboard
```
1. Open: http://127.0.0.1:4040
2. Look for POST requests to /api/webhooks/paymongo
3. Click on a request to see details
```

### Test 3: Check PayMongo Logs
```
1. PayMongo Dashboard → Webhooks
2. Recent Deliveries
3. Should show successful deliveries with 200 status
```

## ⚠️ Common Mistakes

### Mistake 1: Not Restarting Dev Server
**Symptom:** Webhook secret still not recognized
**Fix:** Must restart dev server after ANY .env.local changes

### Mistake 2: Using Old Payment Links
**Symptom:** No webhooks received
**Fix:** PayMongo only sends webhooks for NEW payments - create a fresh payment link

### Mistake 3: Wrong Webhook Secret
**Symptom:** 401 errors in PayMongo delivery logs
**Fix:** Copy fresh secret from PayMongo dashboard, ensure it starts with `whsec_`

### Mistake 4: ngrok URL Changed
**Symptom:** 404 or timeout errors
**Fix:** Each time ngrok restarts, update URL in PayMongo dashboard

## 🎯 Quick Test Command

After restarting dev server, run this to verify environment is loaded:

```powershell
cd "$env:USERPROFILE\Documents\Passion Projects\Marketplace\v3\rb-marketplace"
node test-webhook-config.js
```

Should show:
```
✅ Webhook secret is set
```

If it shows ❌, the secret is NOT loaded - check .env.local and restart dev server.

## 📝 Current Status

- ✅ ngrok running: `https://interinsular-semiconcealed-fran.ngrok-free.dev`
- ✅ Dev server running on port 3000
- ✅ Webhook endpoint accessible (returns 401 for invalid signatures)
- ⚠️ Environment variable not loaded by dev server
- ⚠️ Need to restart dev server

## 🚀 Action Required NOW

1. **Stop dev server** (Ctrl+C in the terminal running it)
2. **Verify webhook secret** in .env.local (should start with `whsec_`)
3. **Start dev server again**: `npm run dev`
4. **Test environment loaded**: `node test-webhook-config.js`
5. **Make a NEW test payment**
6. **Watch for webhook in dev server logs**

---

Once you restart the dev server, webhooks should start working! 🎉
