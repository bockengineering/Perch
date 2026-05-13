import crypto from "node:crypto";
import { existsSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const target = resolve(process.cwd(), ".env.demo.local");

function randomHex(bytes: number) {
  return crypto.randomBytes(bytes).toString("hex");
}

if (existsSync(target)) {
  console.log(".env.demo.local already exists");
  process.exit(0);
}

const fieldEncryptionKey = crypto.randomBytes(32).toString("base64");

const content = `DATABASE_URL="postgresql://perch_demo:perch_demo@localhost:54329/perch_demo?schema=public"
APP_URL="http://localhost:3000"
NEXTAUTH_SECRET="${randomHex(32)}"
ADMIN_BASIC_USERNAME="demo@perch.local"
ADMIN_BASIC_PASSWORD="perch-demo"

STRIPE_SECRET_KEY="sk_test_placeholder"
STRIPE_WEBHOOK_SECRET_CONNECT="whsec_placeholder"
STRIPE_CONNECT_CLIENT_ID="ca_placeholder"
STRIPE_MOCK_CHECKOUT="true"
DEMO_TOOLS_ENABLED="true"

APP_MAC_PEPPER="${randomHex(32)}"
FIELD_ENCRYPTION_KEY="${fieldEncryptionKey}"
VOUCHER_CODE_SECRET="${randomHex(32)}"

NETWORK_PROVIDER_MODE="mock"
WORKER_POLL_INTERVAL_SECONDS="5"
`;

writeFileSync(target, content, { mode: 0o600 });
console.log("Created .env.demo.local for local-only demo mode");
