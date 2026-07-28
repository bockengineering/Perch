# Production Runbook

Perch uses two long-lived branches:

- `dev`: integration and preview deployments.
- `main`: the production source of truth.

Make changes on a short-lived branch or directly on `dev`, verify them, then fast-forward `main` to the tested
`dev` commit. Never put production-only secrets in Git; Vercel environment scopes keep Production and Preview
configuration separate.

## 1. Required Services

- Vercel project linked to this repository, with `main` selected as its Production Branch.
- Supabase Postgres and Auth.
- Stripe platform account with Connect enabled.
- A UniFi Site Manager API key for each cafe.
- A continuously running worker process for `npm run worker`. Vercel Functions do not run this polling loop.

The portal fast path can grant access during a guest redirect, but the worker is still required for silent
authorization when UniFi detects a guest before the portal page is opened.

## 2. Production Environment

Set these in Vercel's Production scope:

```text
APP_URL
DATABASE_URL or POSTGRES_PRISMA_URL
SUPABASE_URL
SUPABASE_PUBLISHABLE_KEY or SUPABASE_ANON_KEY
SUPABASE_SECRET_KEY or SUPABASE_SERVICE_ROLE_KEY
PLATFORM_SESSION_SECRET
CAFE_SESSION_SECRET
STRIPE_SECRET_KEY
STRIPE_WEBHOOK_SECRET_CONNECT
STRIPE_CONNECT_CLIENT_ID
APP_MAC_PEPPER
FIELD_ENCRYPTION_KEY
VOUCHER_CODE_SECRET
```

Use production-safe switches:

```text
NETWORK_PROVIDER_MODE=unifi
STRIPE_MOCK_CHECKOUT=false
DEMO_TOOLS_ENABLED=false
HOSTED_PREVIEW_DEMO_ENABLED=false
PUBLIC_SIGNUP_ENABLED=false
DISABLE_BASIC_AUTH=true
```

Keep public signup off for the first-customer phase. Provision cafes through the platform console so UniFi,
Stripe, and support details are checked with the owner. Before enabling public signup, configure the Supabase
admin key and replace the process-local signup rate limiter with a shared durable limiter.

Runtime traffic should use Supabase's transaction pooler connection. Run migrations with a direct database
connection from an operator machine or protected deployment job.

## 3. Adopt The Migration History

New databases need only:

```bash
DATABASE_URL="postgresql://direct-connection" npm run db:migrate:deploy
```

For the existing Perch database that was created with `prisma db push`, inspect it and take a backup first.
Then record the baseline without replaying it and apply the hardening migration:

```bash
DATABASE_URL="postgresql://direct-connection" \
  npx prisma migrate resolve --applied 20260728000000_baseline
DATABASE_URL="postgresql://direct-connection" npm run db:migrate:deploy
```

The hardening migration:

- changes untouched checkout-grace defaults from 10 minutes / 20 daily grants to 5 minutes / 1 daily grant;
- removes historical MAC, access-point, and destination URL values from portal query JSON;
- enables RLS and revokes Supabase Data API roles from server-owned Prisma tables.

Perch accesses these tables through its server database role. Do not point Prisma at the `anon` or
`authenticated` roles.

## 4. Stripe And UniFi

Create a Stripe Connect webhook for:

```text
https://YOUR_DOMAIN/api/webhooks/stripe-connect
```

Subscribe at minimum to:

- `checkout.session.completed`
- `charge.refunded`
- `charge.dispute.created`
- `account.updated`
- `account.application.deauthorized`

For each cafe, complete Connect onboarding, confirm charges and payouts are enabled, save the UniFi integration,
test the connection, select allowed guest SSIDs, and point UniFi's external portal URL at:

```text
https://YOUR_DOMAIN/p/CAFE_SLUG
```

## 5. Release

On `dev`:

```bash
npm ci
npm run lint
npm run typecheck
npm test
npm run build
```

Smoke-test a preview with a test cafe, test UniFi site, and Stripe test mode. Then fast-forward and push:

```bash
git switch main
git merge --ff-only dev
git push origin main
git push origin dev
```

After Vercel reports Ready, verify:

- `/api/health/config` returns only `{"ok":true}` in production.
- `/demo` says demo tools are disabled.
- `/admin` and `/cafe` require a valid signed login.
- a real portal visit grants the free allowance and does not expose the MAC in application logs;
- a Stripe test payment creates an authorized paid grant;
- a failed grant leaves the Stripe webhook retryable;
- the worker is healthy and processing active shops.

## 6. Rollback

Promote the last known-good Vercel deployment or revert the release commit and push `main`. Do not roll back a
database migration by deleting migration records. Add a forward migration when a schema correction is needed.
