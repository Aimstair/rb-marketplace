# Phase 6 QA, Rollout, and Operations Closure

## Scope Completed

This phase closes operational readiness for:
- Giveaway lifecycle production safety controls
- Email dispatch and digest production controls
- Mixed-provider payment monitoring and rollout
- PayMongo retirement gating and cleanup automation

## New Operational Controls

### Feature Flags
- `ENABLE_GIVEAWAY_FEATURE` (default: true)
- `ENABLE_EMAIL_NOTIFICATIONS_FEATURE` (default: true)
- `ENABLE_PAYMONGO_WEBHOOK` (default: true)

Centralized in:
- `lib/feature-flags.ts`

### Cron Security and Dry-Run Safety
- Giveaway cron endpoint (`/api/giveaways/tick`) now supports:
  - feature-flag skip mode
  - `dryRun: true` snapshot mode
- Digest cron endpoint (`/api/notifications/digest`) now supports:
  - feature-flag skip mode
  - `dryRun: true` snapshot mode

Required secrets when enabled:
- `GIVEAWAY_CRON_SECRET`
- `EMAIL_DIGEST_CRON_SECRET`

### PayMongo Retirement Safety
- PayMongo webhook now respects `ENABLE_PAYMONGO_WEBHOOK`
- When disabled, `/api/webhooks/paymongo` returns HTTP 410

## Monitoring and Alert Validation

### Health Endpoints
1. Baseline health:
- `GET /api/health`
- Includes DB connectivity latency and feature flag snapshot.

2. Operational health:
- `GET /api/ops/health`
- Includes alerts for:
  - multiple ACTIVE giveaways
  - overdue ACTIVE or stale QUEUED giveaways
  - digest backlog
  - stale pending payments
  - pending PayMongo while webhook is disabled
  - missing cron secrets with enabled features
  - missing PayPal env with PayPal enabled

## QA and Rollout Automation

### Commands
1. Data QA audit:
- `pnpm phase6:qa:audit`

2. Rollout and runtime validation:
- `pnpm phase6:rollout:check`

3. PayMongo retirement gate (preview):
- `pnpm phase6:retire:paymongo`

4. PayMongo retirement cleanup execution (after gate passes):
- `node scripts/paymongo-retirement-gate.js --execute-cleanup`

### Suggested Rollout Sequence
1. Run `pnpm phase6:qa:audit` in staging/prod replica.
2. Keep providers dual-enabled:
- `ENABLED_SUBSCRIPTION_PAYMENT_PROVIDERS=paymongo,paypal`
- `ACTIVE_SUBSCRIPTION_PAYMENT_PROVIDER=paymongo`
3. Validate runtime and cron in dry-run:
- `pnpm phase6:rollout:check`
4. Switch active provider to PayPal:
- `ACTIVE_SUBSCRIPTION_PAYMENT_PROVIDER=paypal`
5. Keep PayMongo enabled temporarily for in-flight reconciliation.
6. After `pnpm phase6:retire:paymongo` passes:
- set `ENABLE_PAYMONGO_WEBHOOK=false`
- set `ENABLED_SUBSCRIPTION_PAYMENT_PROVIDERS=paypal`
- optionally execute cleanup script with `--execute-cleanup`

## Cleanup Targets (Retirement Script)
- `test-webhook-config.js`
- `test-send-webhook.js`
- `fix-pending-payment.js`
- `logs/PAYMONGO_SETUP.md`
- `logs/PAYMONGO_QUICK_REFERENCE.md`
- `logs/PAYMONGO_FIX_SUMMARY.md`

## Notes
- Cleanup is intentionally two-step (gate, then execute) to prevent accidental legacy removal while in-flight PayMongo payments remain.
- Structured observability logs remain in `lib/observability.ts` and are now paired with operational health and rollout validation commands.
