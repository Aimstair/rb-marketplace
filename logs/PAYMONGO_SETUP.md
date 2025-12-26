# PayMongo Payment Integration - Setup Guide

## Overview
This integration provides secure payment processing for subscription upgrades using PayMongo's Payment Links API. All sensitive operations are handled server-side with proper security measures.

## Security Features Implemented

### ✅ Server-Side Only Operations
- Payment creation happens server-side via server actions
- Secret keys never exposed to client
- All payment verification done server-side

### ✅ Webhook Signature Verification
- All webhook requests verified with HMAC SHA256 signature
- Prevents unauthorized payment confirmations
- Rejects invalid signatures automatically

### ✅ Idempotency & Duplicate Prevention
- Checks if payment already processed before upgrading
- Prevents double-charging and duplicate subscriptions
- Database constraints ensure data integrity

### ✅ Payment Records Audit Trail
- All payments stored in database with full metadata
- Transaction history available for review
- Status tracking (pending → completed/failed)

## Setup Instructions

### 1. Get PayMongo Credentials

1. Sign up at https://dashboard.paymongo.com
2. Navigate to **Developers** section
3. Copy your keys:
   - **Secret Key** (sk_test_...)
   - **Public Key** (pk_test_...)

### 2. Configure Environment Variables

Add to your `.env.local` file:

```bash
# PayMongo API Keys
PAYMONGO_SECRET_KEY=sk_test_your_secret_key_here
PAYMONGO_PUBLIC_KEY=pk_test_your_public_key_here
PAYMONGO_WEBHOOK_SECRET=whsec_your_webhook_secret_here
```

**⚠️ IMPORTANT:** Never commit these keys to Git. Add `.env.local` to `.gitignore`.

### 3. Run Database Migration

Create the Payment table:

```bash
npx prisma migrate dev --name add_payment_model
```

### 4. Configure PayMongo Webhooks

1. Go to PayMongo Dashboard > **Developers** > **Webhooks**
2. Click **Add Endpoint**
3. Set URL: `https://your-domain.com/api/webhooks/paymongo`
4. Select events:
   - ✅ `payment.paid`
   - ✅ `link.payment.paid`
   - ✅ `payment.failed`
5. Copy the **Webhook Secret** and add to `.env.local`

### 5. Test Mode Configuration

For development/testing:
- Use `sk_test_` and `pk_test_` keys
- PayMongo provides test card numbers
- No real money charged

For production:
- Switch to `sk_live_` and `pk_live_` keys
- Complete PayMongo business verification
- Real payments will be processed

## Payment Flow

### User Journey
```
1. User clicks "Upgrade to Pro/Elite"
   ↓
2. Server creates PayMongo payment link
   ↓
3. Payment record created in database (status: pending)
   ↓
4. User redirected to PayMongo checkout
   ↓
5. User completes payment
   ↓
6. PayMongo sends webhook to /api/webhooks/paymongo
   ↓
7. Webhook verifies signature & updates database
   ↓
8. Subscription upgraded, user notified
```

### Server Actions

**`createSubscriptionPayment(tier)`**
- Creates PayMongo payment link
- Stores payment record in database
- Returns checkout URL for redirection

**`verifyAndProcessPayment(paymentId)`**
- Verifies payment status with PayMongo API
- Updates subscription if payment succeeded
- Sends notification to user

## Security Checklist

- [ ] Environment variables configured
- [ ] Webhook signature verification enabled
- [ ] Database migration applied
- [ ] Payment table has proper indexes
- [ ] Test mode working correctly
- [ ] Webhook endpoint accessible (not blocked by firewall)
- [ ] HTTPS enabled on production domain
- [ ] Secret keys kept secure and not in Git

## Testing

### Test Payment Flow

1. Use test mode credentials
2. Navigate to `/subscriptions`
3. Click upgrade button
4. Use test payment methods from PayMongo docs
5. Verify webhook received and processed
6. Check subscription upgraded in database

### Test Cards (Test Mode)

PayMongo provides test card numbers:
- **Success:** Card ending in 4242
- **Declined:** Card ending in 0002
- Full list: https://developers.paymongo.com/docs/testing

### Verify Webhook

Test webhook locally using ngrok or similar:
```bash
ngrok http 3000
# Use ngrok URL + /api/webhooks/paymongo in PayMongo dashboard
```

## Pricing Configuration

Current pricing (in centavos):
- **PRO:** ₱199.00 (19900 centavos)
- **ELITE:** ₱499.00 (49900 centavos)

To modify, edit `app/actions/payments.ts`:
```typescript
const SUBSCRIPTION_PRICING = {
  PRO: 19900,
  ELITE: 49900,
}
```

## Troubleshooting

### Webhook Not Received
- Check webhook URL is publicly accessible
- Verify HTTPS is enabled
- Check firewall/security rules
- View webhook logs in PayMongo dashboard

### Payment Not Processing
- Check database for payment record
- Verify payment status in PayMongo dashboard
- Check server logs for errors
- Ensure webhook secret is correct

### Invalid Signature Error
- Webhook secret might be wrong
- Copy fresh secret from PayMongo dashboard
- Restart server after updating `.env.local`

## API Endpoints

### POST `/api/webhooks/paymongo`
Receives payment webhooks from PayMongo.
- Verifies signature
- Processes payment events
- Updates subscriptions

**Security:** Only processes requests with valid signature.

## Database Schema

### Payment Model
```prisma
model Payment {
  id                String   @id @default(cuid())
  userId            String
  amount            Float    // In PHP
  currency          String   @default("PHP")
  status            String   // pending | completed | failed
  provider          String   // paymongo
  providerPaymentId String   // PayMongo ID
  type              String   // subscription | boost
  metadata          Json?
  paidAt            DateTime?
  createdAt         DateTime @default(now())
}
```

## Support

For PayMongo-specific issues:
- Documentation: https://developers.paymongo.com
- Support: support@paymongo.com

For integration issues:
- Check server logs
- Review webhook logs in PayMongo dashboard
- Verify environment variables are set correctly
