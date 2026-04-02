# SEO + Production Rollout Checklist

## 1) SEO Coverage Implemented

- Route metadata is defined for:
  - `/marketplace`
  - `/currency`
  - `/listing/[id]`
  - `/currency/[id]`
- Canonical host now uses `NEXT_PUBLIC_APP_URL` (fallback `NEXTAUTH_URL`, then `https://rbmarket.app`).
- JSON-LD product schema is rendered on listing and currency detail pages.
- Sitemap includes:
  - static pages
  - item listing URLs (`/listing/[id]`)
  - currency listing URLs (`/currency/[id]`)
  - profile URLs

## 2) Environment Variables Required in Production

Use `.env.example` as source of truth and set all values in DigitalOcean App Platform.

Minimum critical set:
- `DATABASE_URL`
- `NEXTAUTH_URL`
- `NEXTAUTH_SECRET`
- `AUTH_SECRET`
- `NEXT_PUBLIC_APP_URL`
- `UPLOADTHING_SECRET`
- `UPLOADTHING_APP_ID`
- `PAYMONGO_SECRET_KEY`
- `PAYMONGO_PUBLIC_KEY`
- `PAYMONGO_WEBHOOK_SECRET` (if webhook enabled)
- `ACTIVE_PAYMENT_PROVIDER`
- `ENABLED_PAYMENT_PROVIDERS`
- `PUSHER_APP_ID`
- `PUSHER_KEY`
- `PUSHER_SECRET`
- `PUSHER_CLUSTER`
- `NEXT_PUBLIC_PUSHER_KEY`
- `NEXT_PUBLIC_PUSHER_CLUSTER`

Conditional:
- PayPal: `PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET`, `PAYPAL_WEBHOOK_ID`
- Email: `RESEND_API_KEY`, `EMAIL_FROM`
- Cron features: `GIVEAWAY_CRON_SECRET`, `EMAIL_DIGEST_CRON_SECRET`
- Distributed rate limiting: `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`

## 3) Non-Destructive Database Change Process

When adding a new table or new columns:

1. Edit `prisma/schema.prisma`.
2. Generate migration locally:
   - `pnpm prisma migrate dev --name add_<feature_name>`
3. Review generated SQL before commit.
   - Safe-first pattern: `CREATE TABLE`, `ALTER TABLE ADD COLUMN`, `CREATE INDEX`.
   - Avoid destructive operations in same release.
4. Commit migration and deploy app.
5. In DigitalOcean DB, take backup snapshot before running migration in production.
6. Apply migration in App Console:
   - `pnpm prisma migrate deploy`
7. Validate row counts before/after for key tables (`users`, `item_listings`, `currency_listings`, `transactions`, `vouches`, `payments`).

## 4) Commands to Never Run in Production

- `prisma migrate reset`
- `node clear-migrations.js`
- `node prisma/seed.js`

These commands can erase data.

## 5) Validation After Deploy

- `GET /robots.txt`
- `GET /sitemap.xml`
- Check page source for metadata and canonical tags on:
  - `/listing/<id>`
  - `/currency/<id>`
  - `/marketplace`
  - `/currency`
- Run rollout checks if configured:
  - `node scripts/phase6-rollout-check.js`
