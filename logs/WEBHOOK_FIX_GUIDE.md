# PayMongo Webhook Issue - Solution

## 🚨 The Problem

Your payments are successful in PayMongo, but the webhook isn't reaching your local server to update the database. This is because:

1. **Webhooks need a PUBLIC URL** - PayMongo sends webhook events to a public HTTPS URL
2. **Localhost is NOT publicly accessible** - `http://localhost:3000` can't receive webhooks from PayMongo
3. **Code changes need server restart** - The dev server started before we made the fixes

## 🔧 Immediate Fix

### Step 1: Restart Your Dev Server

The code changes won't take effect until you restart:

```powershell
# Stop the current dev server (Ctrl+C in the terminal running npm run dev)
# Then restart it:
npm run dev
```

### Step 2: Set Up Public URL (Choose ONE option)

#### Option A: ngrok (Recommended - More Stable)

1. **Get ngrok authtoken:**
   - Go to https://dashboard.ngrok.com/signup
   - Sign up for free account
   - Copy your authtoken from https://dashboard.ngrok.com/get-started/your-authtoken

2. **Configure ngrok:**
   ```powershell
   & "$env:USERPROFILE\ngrok\ngrok.exe" config add-authtoken YOUR_TOKEN_HERE
   ```

3. **Start ngrok tunnel:**
   ```powershell
   & "$env:USERPROFILE\ngrok\ngrok.exe" http 3000
   ```

4. **Copy the HTTPS URL** (looks like: `https://xxxx-xx-xx-xx-xx.ngrok-free.app`)

#### Option B: localtunnel (No Signup Needed)

```powershell
npx localtunnel --port 3000
```

Copy the URL provided (looks like: `https://xxxx.loca.lt`)

### Step 3: Configure PayMongo Webhook

1. Go to https://dashboard.paymongo.com
2. Navigate to **Developers** → **Webhooks**
3. Click **Add Endpoint** or **Edit** existing webhook
4. Set URL to: `https://your-ngrok-or-localtunnel-url/api/webhooks/paymongo`
   - Example: `https://abc123.ngrok-free.app/api/webhooks/paymongo`
5. Enable these events:
   - ✅ `link.payment.paid`
   - ✅ `payment.paid`
   - ✅ `payment.failed`
6. **Save** and copy the **Webhook Secret**

### Step 4: Update Environment Variables

Add to your `.env.local`:

```bash
# PayMongo Keys
PAYMONGO_SECRET_KEY=sk_test_your_secret_key
PAYMONGO_PUBLIC_KEY=pk_test_your_public_key
PAYMONGO_WEBHOOK_SECRET=whsec_your_webhook_secret_from_step_3

# App URL
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### Step 5: Restart Dev Server Again

After adding environment variables:

```powershell
# Stop dev server (Ctrl+C)
npm run dev
```

## ✅ Testing the Fix

### Test Webhook is Working:

1. **Start your dev server** (Step 5)
2. **Start ngrok/localtunnel** (Step 2)
3. **Configure PayMongo webhook** (Step 3)
4. **Test a payment:**
   - Go to `/subscriptions`
   - Click upgrade
   - Complete payment in new tab
   - Watch for:
     - Tab closes automatically
     - Toast notification appears
     - Subscription updates in real-time

### Check Webhook Logs:

1. Go to PayMongo Dashboard → Webhooks
2. Click on your webhook
3. View **Recent Deliveries**
4. Should see successful `link.payment.paid` events

### Monitor Server Logs:

Watch your dev server terminal for:
```
[PayMongo Webhook] Received event: link.payment.paid
[PayMongo Webhook] Processing link payment: link_xxx
[PayMongo Webhook] Upgraded user xxx to ELITE
```

## 🎯 Current Status

**✅ Your subscription is now ELITE!**
- Payment manually processed
- Tier: ELITE (₱499/month)
- Expires: January 25, 2026
- Features: 30 listings, 3 featured, priority support

**Pending payments in database:**
- 3 payments marked as pending
- Already paid in PayMongo
- Need webhook to auto-process future payments

## 🔄 Why Manual Processing Was Needed

Without webhook setup:
```
PayMongo ✅ → [Webhook URL] ❌ → Your Server ❌ → Database ❌
```

With webhook setup:
```
PayMongo ✅ → [Ngrok URL] ✅ → Your Server ✅ → Database ✅
```

## 📋 Checklist

Complete these steps in order:

- [ ] Stop dev server (Ctrl+C)
- [ ] Add `NEXT_PUBLIC_APP_URL` to `.env.local`
- [ ] Restart dev server
- [ ] Choose ngrok OR localtunnel
- [ ] Start tunnel and copy URL
- [ ] Configure PayMongo webhook with tunnel URL
- [ ] Add webhook secret to `.env.local`
- [ ] Restart dev server one more time
- [ ] Test a payment to verify it works
- [ ] Check webhook logs in PayMongo dashboard

## 🐛 Troubleshooting

### "Redirecting to payment" message stuck?

**Cause:** Old code is still running
**Fix:** 
```powershell
# Stop all node processes
Get-Process node | Stop-Process -Force
# Restart dev server
npm run dev
```

### Payment successful but not updating?

**Cause:** Webhook not configured or not accessible
**Fix:** Follow Step 2 and Step 3 above

### Webhook showing errors?

**Cause:** Webhook secret mismatch
**Fix:** 
1. Get fresh webhook secret from PayMongo
2. Update `.env.local`
3. Restart dev server

### ngrok/localtunnel connection lost?

**Cause:** Tunnel disconnected
**Fix:**
1. Restart tunnel
2. Update PayMongo webhook URL with new tunnel URL
3. Test again

## 💡 Production Deployment

When you deploy to production:

1. **No tunnel needed** - Your production URL is already public
2. **Update webhook URL** to production domain:
   - Example: `https://yourdomain.com/api/webhooks/paymongo`
3. **Switch to live keys** (`sk_live_`, `pk_live_`)
4. **Update `NEXT_PUBLIC_APP_URL`** to production domain

## 📞 Support

If issues persist:

1. **Check webhook logs** in PayMongo dashboard
2. **Check dev server logs** for errors
3. **Use fix script** for manual processing:
   ```powershell
   node fix-pending-payment.js
   ```

---

**Next Steps:** Follow the checklist above to enable automatic webhook processing!
