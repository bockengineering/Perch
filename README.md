# Perch

Perch is a UniFi-only captive portal SaaS for coffee shops. Cafes point their UniFi guest Wi-Fi portal at Perch, guests receive one automatic 60-minute free grant per local calendar day, and paid extensions run through Stripe Connect with Perch taking an application fee.

## Local Setup

```bash
npm install
cp .env.example .env
npm run db:generate
npm run db:push
npm run seed
npm run dev
```

Perch expects Postgres. The app uses Prisma, Next.js App Router, TypeScript, Stripe Checkout/Connect, a UniFi provider, and a mock network provider for local development.

## Environment Variables

Copy `.env.example` to `.env` and replace every placeholder:

- `DATABASE_URL`: Postgres connection string. On Vercel with the Supabase integration, Perch also accepts `POSTGRES_PRISMA_URL`, `POSTGRES_URL`, `POSTGRES_URL_NON_POOLING`, or `SUPABASE_DB_URL`.
- `APP_URL`: public app URL, for example `http://localhost:3000`.
- `NEXTAUTH_SECRET`: auth/session secret placeholder for future auth expansion.
- `ADMIN_BASIC_USERNAME` / `ADMIN_BASIC_PASSWORD`: basic admin/staff gate.
- `DISABLE_BASIC_AUTH`: set `true` in production after session-based admin accounts are ready.
- `PLATFORM_ADMIN_EMAIL` / `PLATFORM_ADMIN_PASSWORD`: optional production bootstrap login for the platform admin UI. In local/demo mode Perch falls back to `ADMIN_BASIC_USERNAME` / `ADMIN_BASIC_PASSWORD`.
- `PLATFORM_SESSION_SECRET`: secret used to sign platform admin session cookies.
- `RESEND_API_KEY`: server-only Resend credential used to email new cafe invite requests.
- `INVITE_REQUEST_TO_EMAIL`: optional notification recipient. Defaults to `PLATFORM_ADMIN_EMAIL`.
- `INVITE_REQUEST_FROM_EMAIL`: optional verified sender. Defaults to Resend's onboarding sender for initial testing.
- `CAFE_LOGIN_EMAIL` / `CAFE_LOGIN_PASSWORD`: cafe owner login for the cafe console.
- `CAFE_SESSION_SECRET`: secret used to sign cafe console session cookies.
- `SUPABASE_URL`: Supabase project URL for cafe-owner Auth.
- `SUPABASE_PUBLISHABLE_KEY`: Supabase publishable browser-safe key, used server-side by Perch for password sign-in. `SUPABASE_ANON_KEY` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are also supported for Vercel's Supabase integration.
- `SUPABASE_SECRET_KEY`: Supabase secret key for server-side account creation. `SUPABASE_SERVICE_ROLE_KEY` is also supported. Never expose this to the browser.
- `STRIPE_SECRET_KEY`: Stripe platform secret key.
- `STRIPE_WEBHOOK_SECRET_CONNECT`: Stripe Connect webhook signing secret.
- `STRIPE_CONNECT_CLIENT_ID`: Connect client ID if using OAuth-style flows.
- `STRIPE_MOCK_CHECKOUT`: set `true` for local mock checkout URLs.
- `DEMO_TOOLS_ENABLED`: enables local/staging-only demo reset and mock checkout completion routes.
- `HOSTED_PREVIEW_DEMO_ENABLED`: optional fallback for static hosted previews. Leave `false` for editable cafe consoles.
- `PUBLIC_SIGNUP_ENABLED`: defaults to off in production. Leave off for an invitation-only launch.
- `APP_MAC_PEPPER`: HMAC secret for per-shop MAC identity hashes.
- `FIELD_ENCRYPTION_KEY`: 32-byte base64 or hex key for encrypted MACs and UniFi API keys.
- `VOUCHER_CODE_SECRET`: HMAC secret for staff voucher codes.
- `NETWORK_PROVIDER_MODE`: `mock` or `unifi`.
- `WORKER_POLL_INTERVAL_SECONDS`: defaults to `5`.

Do not commit `.env`, Stripe keys, database URLs, UniFi API keys, encryption keys, or MAC pepper values.

## Database Setup

Create a Postgres database, set `DATABASE_URL`, then run:

```bash
npm run db:migrate:deploy
npm run seed
```

`db:push` remains available for disposable local demo databases. Production schema changes use the committed
Prisma migrations.

The seed creates `Demo Cafe`, a mock UniFi integration, and two price plans:

- `2 more hours`, 120 minutes, `$5`
- `All day`, 720 minutes, `$8`

## Mock Mode

Set:

```bash
NETWORK_PROVIDER_MODE="mock"
STRIPE_MOCK_CHECKOUT="true"
```

Mock mode returns a deterministic UniFi client, authorizes grants successfully, and uses a local checkout return URL instead of calling Stripe.

## Demo Environment

Use the demo environment before pointing Perch at real cafe hardware. It runs with mock UniFi, mock Stripe Checkout, demo-only reset controls, and a local Postgres database.

One-time setup with Docker:

```bash
npm run demo:setup
```

This creates an ignored `.env.demo.local`, starts Postgres through `docker-compose.demo.yml`, resets the demo database, and seeds Demo Cafe.

One-time setup with local Postgres, useful when Docker is not installed:

```bash
npm run demo:setup:local-pg
```

The local Postgres helper looks for PostgreSQL CLI tools in `POSTGRES_BIN`, Postgres.app, Homebrew, and standard system paths. It creates data under `~/.perch-demo/postgres-data`, listens on port `54329`, and can be stopped with `npm run demo:pg:stop`. If you already have another Postgres database, run `npm run demo:env`, edit `.env.demo.local` with that `DATABASE_URL`, then run `npm run demo:reset`.

Start the demo app:

```bash
npm run demo:dev
```

Open:

```text
http://localhost:3000/demo
```

Demo platform admin and cafe-owner credentials:

```text
demo@perch.local / perch-demo
```

The demo console includes:

- Reset demo data.
- Primary device captive portal link.
- Fresh device captive portal link.
- Cafe back office link.
- Admin dashboard links.
- Staff voucher screen link.
- Recent mock order status.

Cafe back office:

```text
http://localhost:3000/cafe
```

The cafe panel redirects to a Perch login screen instead of the browser-native Basic Auth prompt. In demo mode, sign in with:

```text
demo@perch.local / perch-demo
```

The cafe panel includes cafe settings, paid-pass transactions, paid plan setup, staff code creation, and an owner-only emergency switch that makes allowed guest Wi-Fi free until the cafe's local midnight.

Platform admin:

```text
http://localhost:3000/admin
```

The platform admin panel redirects to `/admin/login`. In demo mode, sign in with:

```text
demo@perch.local / perch-demo
```

The platform panel includes global shop health, revenue, failed network actions, platform-admin account creation, shop settings, Stripe/UniFi configuration, price plans, cafe accounts, vouchers, and the same emergency free-until-midnight switch.

## Supabase Cafe Accounts

Perch can use Supabase Auth as the credential backend for cafe console accounts. Set:

```bash
SUPABASE_URL="https://your-project-ref.supabase.co"
SUPABASE_PUBLISHABLE_KEY="sb_publishable_..."
SUPABASE_SECRET_KEY="sb_secret_..."
CAFE_SESSION_SECRET="replace_with_a_random_session_secret"
```

If the project is connected through Vercel's Supabase integration, the app can use the integration's aliases instead:

```bash
POSTGRES_PRISMA_URL="postgresql://..."
SUPABASE_URL="https://your-project-ref.supabase.co"
SUPABASE_ANON_KEY="..."
SUPABASE_SERVICE_ROLE_KEY="..."
```

The login form posts to Perch, Perch validates the email/password with Supabase Auth, then Perch checks its local `User` and `ShopMember` tables to decide which cafe console the user can access. Authorization does not rely on user-editable Supabase metadata.

Create or link a cafe member through:

```text
POST /api/admin/shops/{shopId}/members
```

Example body:

```json
{
  "email": "owner@example.com",
  "name": "Cafe Owner",
  "role": "SHOP_OWNER",
  "password": "temporary-password",
  "createSupabaseUser": true
}
```

If `SUPABASE_SECRET_KEY` is configured, this creates a Supabase Auth user and links the returned Supabase user ID to Perch. If the Supabase user already exists, create or invite them in Supabase, then create the local `User`/`ShopMember` entry with `createSupabaseUser: false`.

## Supabase Platform Admins

Perch can also use Supabase Auth for platform admins. Set `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY`, and `PLATFORM_SESSION_SECRET`, then create platform admins from `/admin` or:

```text
POST /api/admin/platform-users
```

Example body:

```json
{
  "email": "admin@example.com",
  "name": "Perch Admin",
  "password": "temporary-password",
  "createSupabaseUser": true
}
```

The login form validates credentials with Supabase Auth, then checks Perch's `User` and `PlatformUser` tables for `PLATFORM_ADMIN`. Supabase metadata is not trusted for authorization.

Paid-pass testing in demo mode:

1. Reset demo data.
2. Open the primary device once for free access.
3. Return to the demo console and click `Simulate free hour ended`.
4. Click a paid plan.
5. On the return page, click `Complete mock Stripe payment`.
6. The demo route simulates `checkout.session.completed`, stores the webhook event idempotently, and creates a `PAID` grant through the mock network provider.

Worker testing:

```bash
npm run demo:worker
```

The mock provider exposes an unauthorized `DemoGuest` client. The worker should grant free access once, then leave that device alone after the daily allowance exists.

Demo captive portal URL:

```text
/p/demo-cafe?id=AA:BB:CC:DD:EE:FF&ap=11:22:33:44:55:66&ssid=DemoGuest&url=https%3A%2F%2Fwww.google.com
```

Expected behavior:

1. First visit today silently creates the device, daily allowance, and `FREE_PORTAL_FAST_PATH` grant, then redirects.
2. Second visit today shows the paywall.
3. A visit on the next local day grants another free hour.

## Worker

Run the silent free access poller:

```bash
npm run worker
```

The worker scans active shops every `WORKER_POLL_INTERVAL_SECONDS`, lists guest clients, filters allowed SSIDs, and grants either the active emergency-free override or the normal daily-free allowance. The unique daily allowance constraint keeps portal and worker races from duplicating daily grants.

## Stripe Notes

Perch uses Stripe Checkout with Connect direct charges:

- Checkout Sessions are created on the connected account.
- `application_fee_amount` captures Perch revenue share.
- New cafe connected accounts are created with the cafe account as the Stripe fee payer for direct charges.
- Stripe processing fees come out of the cafe's connected-account balance; Perch's application fee is additional.
- `checkout.session.completed` is the source of truth.
- `WebhookEvent` stores Stripe event IDs idempotently.
- A 5-minute `CHECKOUT_GRACE` grant is attempted before redirecting to Stripe.

Stripe only lets the fee payer be set when the connected account is created. If a cafe was connected before this policy, create a fresh connected account before launch or verify the account's fee-payer behavior in Stripe.

Configure the Connect webhook endpoint:

```text
POST /api/webhooks/stripe-connect
```

Use a real `STRIPE_WEBHOOK_SECRET_CONNECT` outside mock mode.

## UniFi Notes

UniFi redirects unauthorized guests to:

```text
https://your-domain.com/p/{shopSlug}?id={clientMac}&ap={apMac}&ssid={ssid}&url={originalUrl}
```

Perch normalizes the client MAC, stores only an HMAC hash for identity, encrypts the raw MAC for server-side UniFi calls, and never exposes UniFi API keys to browser code.

Production UniFi calls use:

- `GET /v1/sites`
- `GET /v1/sites/{siteId}/clients`
- `GET /v1/sites/{siteId}/clients?filter=macAddress.eq('{MAC}')`
- `POST /v1/sites/{siteId}/clients/{clientId}/actions`

The authorize action is `AUTHORIZE_GUEST_ACCESS` with UniFi enforcing the time limit.

## Admin And Staff

- `/admin/login`: platform admin login.
- `/admin`: platform dashboard with shop health, revenue, active grants, failed network actions, recent orders, and platform-admin account creation.
- `/admin/shops`: shop list and shop creation.
- `/admin/shops/{shopId}`: shop reporting, settings, emergency free access, cafe accounts, UniFi settings, Stripe connect, price plans, vouchers, and recent activity.
- `/cafe/shops/{shopId}`: cafe-owner console with reporting, settings, staff codes, and the emergency free-until-midnight control.
- `/staff/shops/{shopId}/vouchers`: mobile-friendly voucher creation and recent redemptions.

Platform admin routes use signed `perch_platform_session` cookies. Cafe/staff routes use signed `perch_cafe_session` cookies. HTTP Basic Auth remains as a technical fallback for protected admin and staff APIs.

## Branches And Deployment

- `dev` is the integration branch. Pushes should create preview deployments.
- `main` is the production branch. Only fast-forward it after CI and manual portal/payment smoke tests pass on `dev`.
- Vercel should track `main` as the Production Branch.

The complete launch checklist, environment matrix, database adoption steps, and rollback process are in
[`docs/production.md`](docs/production.md).

## Known Limitations

- MVP is UniFi only.
- No customer accounts, mobile app, POS integration, email marketing, DNS logging, browsing history collection, or packet inspection.
- Device identity is MAC-based; private address rotation can create extra free grants.
- Checkout mock mode requires the demo payment-completion button or a real webhook-like event to mark orders paid.
- The worker uses simple polling and should later be optimized for business hours and larger deployments.
- Prisma is pinned to v6 for stable schema support; Prisma v7 migration can be handled later.
- Next build is configured with `next build --webpack` and separate `tsc --noEmit` because this macOS runtime cannot load signed native SWC/Turbopack bindings reliably.
