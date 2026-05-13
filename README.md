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

- `DATABASE_URL`: Postgres connection string.
- `APP_URL`: public app URL, for example `http://localhost:3000`.
- `NEXTAUTH_SECRET`: auth/session secret placeholder for future auth expansion.
- `ADMIN_BASIC_USERNAME` / `ADMIN_BASIC_PASSWORD`: basic admin/staff gate.
- `STRIPE_SECRET_KEY`: Stripe platform secret key.
- `STRIPE_WEBHOOK_SECRET_CONNECT`: Stripe Connect webhook signing secret.
- `STRIPE_CONNECT_CLIENT_ID`: Connect client ID if using OAuth-style flows.
- `STRIPE_MOCK_CHECKOUT`: set `true` for local mock checkout URLs.
- `DEMO_TOOLS_ENABLED`: enables local/staging-only demo reset and mock checkout completion routes.
- `APP_MAC_PEPPER`: HMAC secret for per-shop MAC identity hashes.
- `FIELD_ENCRYPTION_KEY`: 32-byte base64 or hex key for encrypted MACs and UniFi API keys.
- `VOUCHER_CODE_SECRET`: HMAC secret for staff voucher codes.
- `NETWORK_PROVIDER_MODE`: `mock` or `unifi`.
- `WORKER_POLL_INTERVAL_SECONDS`: defaults to `5`.

Do not commit `.env`, Stripe keys, database URLs, UniFi API keys, encryption keys, or MAC pepper values.

## Database Setup

Create a Postgres database, set `DATABASE_URL`, then run:

```bash
npm run db:push
npm run seed
```

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

Demo admin credentials:

```text
demo@perch.local / perch-demo
```

The demo console includes:

- Reset demo data.
- Primary device captive portal link.
- Fresh device captive portal link.
- Admin dashboard links.
- Staff voucher screen link.
- Recent mock order status.

Paid-pass testing in demo mode:

1. Reset demo data.
2. Open the primary device once for free access.
3. Open the same primary device again to see the paywall.
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

The worker scans active shops every `WORKER_POLL_INTERVAL_SECONDS`, lists guest clients, filters allowed SSIDs, and calls the same daily-free grant service used by the portal fast path. The unique daily allowance constraint keeps portal and worker races from duplicating grants.

## Stripe Notes

Perch uses Stripe Checkout with Connect direct charges:

- Checkout Sessions are created on the connected account.
- `application_fee_amount` captures Perch revenue share.
- `checkout.session.completed` is the source of truth.
- `WebhookEvent` stores Stripe event IDs idempotently.
- A 5-minute `CHECKOUT_GRACE` grant is attempted before redirecting to Stripe.

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

- `/admin`: platform dashboard.
- `/admin/shops`: shop list and shop creation.
- `/admin/shops/{shopId}`: shop reporting, UniFi settings, Stripe connect, price plans.
- `/staff/shops/{shopId}/vouchers`: mobile-friendly voucher creation and recent redemptions.

Admin and staff routes are protected by HTTP Basic Auth through `proxy.ts`.

## Deployment Notes

1. Provision Postgres and set `DATABASE_URL`.
2. Set all secrets in the deployment environment.
3. Run `npm run db:push` or convert the schema to migrations before production launch.
4. Seed only demo or initial admin data where appropriate.
5. Configure UniFi captive portal URLs per shop.
6. Configure Stripe Connect onboarding and the Connect webhook endpoint.
7. Run the worker as a separate process or scheduled/background service.

## Known Limitations

- MVP is UniFi only.
- No customer accounts, mobile app, POS integration, email marketing, DNS logging, browsing history collection, or packet inspection.
- Device identity is MAC-based; private address rotation can create extra free grants.
- Checkout mock mode requires the demo payment-completion button or a real webhook-like event to mark orders paid.
- The worker uses simple polling and should later be optimized for business hours and larger deployments.
- Prisma is pinned to v6 for stable schema support; Prisma v7 migration can be handled later.
- Next build is configured with `next build --webpack` and separate `tsc --noEmit` because this macOS runtime cannot load signed native SWC/Turbopack bindings reliably.
