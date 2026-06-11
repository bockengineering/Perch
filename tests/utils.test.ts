import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { normalizeMac, hashMac } from "@/lib/crypto/mac";
import { decryptSecret, encryptSecret } from "@/lib/crypto/field-encryption";
import { safeRedirectUrl } from "@/lib/utils/redirect";
import { getNextLocalMidnight, getShopLocalDate } from "@/lib/utils/time";
import { hashVoucherCode, normalizeVoucherCode } from "@/lib/services/vouchers";
import { emergencyFreeMinutesRemaining, isEmergencyFreeActive } from "@/lib/services/emergency-free";
import { analyticsDayKey, analyticsMonthKey } from "@/lib/services/shop-analytics";
import { stripeConnectedAccountController } from "@/lib/services/payments";
import { applyDatabaseUrlAlias, databaseUrl } from "@/lib/env";
import { formatPlanPriceInput, parsePlanPriceToCents } from "@/lib/services/price-plans";
import {
  createCafeSessionCookie,
  isCafeLoginValid,
  safeCafeRedirectPath,
  verifyCafeSessionCookie,
} from "@/lib/auth/cafe-session";
import {
  createPlatformSessionCookie,
  isPlatformFallbackLoginValid,
  safeAdminRedirectPath,
  verifyPlatformSessionCookie,
} from "@/lib/auth/platform-session";
import { isDemoCafeLogin } from "@/lib/auth/hosted-preview";
import { isSupabaseAdminConfigured, isSupabaseAuthConfigured } from "@/lib/auth/supabase";
import { defaultPricePlanCreateData, slugifyCafeName } from "@/lib/services/cafe-signup";
import { parseShopUpdatePayload } from "@/lib/services/shop-settings";

describe("MAC utilities", () => {
  it("normalizes common MAC address formats", () => {
    assert.equal(normalizeMac("AA:BB:CC:DD:EE:FF"), "AA:BB:CC:DD:EE:FF");
    assert.equal(normalizeMac("aa-bb-cc-dd-ee-ff"), "AA:BB:CC:DD:EE:FF");
    assert.equal(normalizeMac("aabbccddeeff"), "AA:BB:CC:DD:EE:FF");
  });

  it("rejects invalid MAC addresses", () => {
    assert.throws(() => normalizeMac("nope"), /Invalid MAC address/);
  });

  it("hashes MAC addresses per shop", () => {
    process.env.APP_MAC_PEPPER = "test-pepper";
    assert.equal(hashMac("shop_a", "AA:BB:CC:DD:EE:FF"), hashMac("shop_a", "AA:BB:CC:DD:EE:FF"));
    assert.notEqual(hashMac("shop_a", "AA:BB:CC:DD:EE:FF"), hashMac("shop_b", "AA:BB:CC:DD:EE:FF"));
  });
});

describe("local day policy", () => {
  it("uses the shop timezone instead of a rolling 24-hour timer", () => {
    const shop = { timezone: "America/Los_Angeles", freeResetHour: 0 };
    assert.equal(getShopLocalDate(shop, new Date("2026-05-12T22:00:00.000Z")), "2026-05-12");
    assert.equal(getShopLocalDate(shop, new Date("2026-05-13T15:00:00.000Z")), "2026-05-13");
  });

  it("supports a non-midnight reset hour for future policy changes", () => {
    const shop = { timezone: "America/Los_Angeles", freeResetHour: 6 };
    assert.equal(getShopLocalDate(shop, new Date("2026-05-12T12:00:00.000Z")), "2026-05-11");
    assert.equal(getShopLocalDate(shop, new Date("2026-05-12T14:00:00.000Z")), "2026-05-12");
  });

  it("finds the next cafe-local midnight for emergency free access", () => {
    assert.equal(
      getNextLocalMidnight("America/Los_Angeles", new Date("2026-05-12T20:00:00.000Z")).toISOString(),
      "2026-05-13T07:00:00.000Z",
    );
    assert.equal(
      getNextLocalMidnight("America/Los_Angeles", new Date("2026-01-12T20:00:00.000Z")).toISOString(),
      "2026-01-13T08:00:00.000Z",
    );
  });

  it("treats emergency free access as active only before its cutoff", () => {
    const shop = { emergencyFreeUntil: new Date("2026-05-13T07:00:00.000Z") };
    const now = new Date("2026-05-13T06:15:00.000Z");
    assert.equal(isEmergencyFreeActive(shop, now), true);
    assert.equal(emergencyFreeMinutesRemaining(shop, now), 45);
    assert.equal(isEmergencyFreeActive(shop, new Date("2026-05-13T07:00:00.000Z")), false);
  });

  it("buckets analytics by the cafe local day and month", () => {
    const date = new Date("2026-06-01T06:30:00.000Z");
    assert.equal(analyticsDayKey("America/Los_Angeles", date), "2026-05-31");
    assert.equal(analyticsMonthKey("America/Los_Angeles", date), "2026-05");
    assert.equal(analyticsDayKey("America/New_York", date), "2026-06-01");
    assert.equal(analyticsMonthKey("America/New_York", date), "2026-06");
  });
});

describe("redirects and voucher hashing", () => {
  it("allows http and https captive portal destinations", () => {
    assert.equal(safeRedirectUrl("https://example.com/path"), "https://example.com/path");
    assert.equal(safeRedirectUrl("http://example.com/"), "http://example.com/");
  });

  it("rejects unsafe redirect schemes and credential URLs", () => {
    assert.equal(safeRedirectUrl("javascript:alert(1)"), "https://www.google.com");
    assert.equal(safeRedirectUrl("data:text/html,hi"), "https://www.google.com");
    assert.equal(safeRedirectUrl("https://user:pass@example.com"), "https://www.google.com");
  });

  it("normalizes and hashes voucher codes without storing plaintext", () => {
    process.env.VOUCHER_CODE_SECRET = "voucher-secret";
    assert.equal(normalizeVoucherCode(" perch-1234 "), "PERCH1234");
    assert.equal(hashVoucherCode("perch-1234"), hashVoucherCode("PERCH1234"));
    assert.equal(hashVoucherCode("perch-1234").includes("PERCH1234"), false);
  });

  it("encrypts saved voucher codes for repeat reveal", () => {
    const originalKey = process.env.FIELD_ENCRYPTION_KEY;
    process.env.FIELD_ENCRYPTION_KEY = "1".repeat(64);

    try {
      const code = "PERCH-2345-ABCD";
      const encrypted = encryptSecret(code);
      assert.equal(encrypted.includes(code), false);
      assert.equal(decryptSecret(encrypted), code);
    } finally {
      if (originalKey === undefined) {
        delete process.env.FIELD_ENCRYPTION_KEY;
      } else {
        process.env.FIELD_ENCRYPTION_KEY = originalKey;
      }
    }
  });
});

describe("cafe login session", () => {
  it("validates configured cafe credentials", () => {
    process.env.CAFE_LOGIN_EMAIL = "owner@demo.local";
    process.env.CAFE_LOGIN_PASSWORD = "secret-pass";
    assert.equal(isCafeLoginValid("OWNER@demo.local", "secret-pass"), true);
    assert.equal(isCafeLoginValid("owner@demo.local", "wrong"), false);
  });

  it("creates and verifies a signed cafe session cookie", async () => {
    process.env.CAFE_SESSION_SECRET = "test-cafe-session-secret";
    const now = new Date("2026-05-30T12:00:00.000Z");
    const cookie = await createCafeSessionCookie("owner@demo.local", now);
    const session = await verifyCafeSessionCookie(cookie, now);
    assert.equal(session?.email, "owner@demo.local");
    assert.equal(session?.role, "SHOP_OWNER");
    assert.equal(await verifyCafeSessionCookie(`${cookie}tampered`, now), null);
  });

  it("only allows internal cafe redirect destinations", () => {
    assert.equal(safeCafeRedirectPath("/cafe/shops/shop_123"), "/cafe/shops/shop_123");
    assert.equal(safeCafeRedirectPath("https://example.com"), "/cafe");
    assert.equal(safeCafeRedirectPath("//example.com"), "/cafe");
    assert.equal(safeCafeRedirectPath("/\\example.com"), "/cafe");
  });

  it("recognizes the seeded live demo cafe login", () => {
    assert.equal(isDemoCafeLogin("PERCH.DEMO.OWNER@gmail.com", "Perch-demo-2026!"), true);
    assert.equal(isDemoCafeLogin("perch.demo.owner@gmail.com", "wrong"), false);
  });
});

describe("platform admin session", () => {
  it("creates and verifies a signed platform admin session cookie", async () => {
    process.env.PLATFORM_SESSION_SECRET = "test-platform-session-secret";
    const now = new Date("2026-05-30T12:00:00.000Z");
    const cookie = await createPlatformSessionCookie({ email: "ADMIN@perch.local", userId: "user_123" }, now);
    const session = await verifyPlatformSessionCookie(cookie, now);
    assert.equal(session?.email, "admin@perch.local");
    assert.equal(session?.role, "PLATFORM_ADMIN");
    assert.equal(session?.userId, "user_123");
    assert.equal(await verifyPlatformSessionCookie(`${cookie}tampered`, now), null);
  });

  it("only allows internal admin redirect destinations", () => {
    assert.equal(safeAdminRedirectPath("/admin/shops/shop_123"), "/admin/shops/shop_123");
    assert.equal(safeAdminRedirectPath("/admin/login?next=/admin"), "/admin");
    assert.equal(safeAdminRedirectPath("/cafe"), "/admin");
    assert.equal(safeAdminRedirectPath("https://example.com"), "/admin");
    assert.equal(safeAdminRedirectPath("//example.com"), "/admin");
  });

  it("validates explicit local platform fallback credentials", () => {
    const originals = {
      PLATFORM_ADMIN_EMAIL: process.env.PLATFORM_ADMIN_EMAIL,
      PLATFORM_ADMIN_PASSWORD: process.env.PLATFORM_ADMIN_PASSWORD,
      ADMIN_BASIC_USERNAME: process.env.ADMIN_BASIC_USERNAME,
      ADMIN_BASIC_PASSWORD: process.env.ADMIN_BASIC_PASSWORD,
    };

    process.env.PLATFORM_ADMIN_EMAIL = "platform@perch.local";
    process.env.PLATFORM_ADMIN_PASSWORD = "platform-pass";
    delete process.env.ADMIN_BASIC_USERNAME;
    delete process.env.ADMIN_BASIC_PASSWORD;

    try {
      assert.equal(isPlatformFallbackLoginValid("PLATFORM@perch.local", "platform-pass"), true);
      assert.equal(isPlatformFallbackLoginValid("platform@perch.local", "wrong"), false);
    } finally {
      for (const [name, value] of Object.entries(originals)) {
        if (value === undefined) {
          delete process.env[name];
        } else {
          process.env[name] = value;
        }
      }
    }
  });
});

describe("deployment environment aliases", () => {
  it("uses Vercel Supabase Postgres aliases for Prisma", () => {
    const originalDatabaseUrl = process.env.DATABASE_URL;
    const originalPostgresPrismaUrl = process.env.POSTGRES_PRISMA_URL;
    delete process.env.DATABASE_URL;
    process.env.POSTGRES_PRISMA_URL = "postgresql://example";

    try {
      assert.equal(databaseUrl(), "postgresql://example");
      assert.equal(applyDatabaseUrlAlias(), "postgresql://example");
      assert.equal(process.env.DATABASE_URL, "postgresql://example");
    } finally {
      if (originalDatabaseUrl === undefined) {
        delete process.env.DATABASE_URL;
      } else {
        process.env.DATABASE_URL = originalDatabaseUrl;
      }
      if (originalPostgresPrismaUrl === undefined) {
        delete process.env.POSTGRES_PRISMA_URL;
      } else {
        process.env.POSTGRES_PRISMA_URL = originalPostgresPrismaUrl;
      }
    }
  });

  it("recognizes Vercel Supabase auth key aliases", () => {
    const originals = {
      SUPABASE_URL: process.env.SUPABASE_URL,
      SUPABASE_PUBLISHABLE_KEY: process.env.SUPABASE_PUBLISHABLE_KEY,
      SUPABASE_SECRET_KEY: process.env.SUPABASE_SECRET_KEY,
      SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY,
      SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    };

    process.env.SUPABASE_URL = "https://example.supabase.co";
    delete process.env.SUPABASE_PUBLISHABLE_KEY;
    delete process.env.SUPABASE_SECRET_KEY;
    process.env.SUPABASE_ANON_KEY = "anon-key";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role-key";

    try {
      assert.equal(isSupabaseAuthConfigured(), true);
      assert.equal(isSupabaseAdminConfigured(), true);
    } finally {
      for (const [name, value] of Object.entries(originals)) {
        if (value === undefined) {
          delete process.env[name];
        } else {
          process.env[name] = value;
        }
      }
    }
  });
});

describe("cafe signup helpers", () => {
  it("builds safe cafe portal slugs from cafe names", () => {
    assert.equal(slugifyCafeName("Mockingbird Coffee & Tea"), "mockingbird-coffee-tea");
    assert.equal(slugifyCafeName("  L'Atelier Café  "), "latelier-caf");
    assert.equal(slugifyCafeName("admin"), "cafe");
  });

  it("creates the default paid plans for new cafes", () => {
    assert.deepEqual(
      defaultPricePlanCreateData().map((plan) => ({
        label: plan.label,
        durationMinutes: plan.durationMinutes,
        amountCents: plan.amountCents,
      })),
      [
        { label: "2 more hours", durationMinutes: 120, amountCents: 500 },
        { label: "All day", durationMinutes: 720, amountCents: 800 },
      ],
    );
  });
});

describe("price plan helpers", () => {
  it("parses dollar price inputs into cents", () => {
    assert.equal(parsePlanPriceToCents("4"), 400);
    assert.equal(parsePlanPriceToCents("4.5"), 450);
    assert.equal(parsePlanPriceToCents("4.50"), 450);
    assert.equal(formatPlanPriceInput(450), "4.50");
  });

  it("rejects invalid or too-small plan prices", () => {
    assert.equal(parsePlanPriceToCents("4.567"), null);
    assert.equal(parsePlanPriceToCents("0.49"), null);
    assert.equal(parsePlanPriceToCents("free"), null);
  });
});

describe("shop settings", () => {
  it("accepts remote and uploaded logo values", () => {
    const uploadedLogo = `data:image/png;base64,${Buffer.from("logo").toString("base64")}`;

    assert.equal(parseShopUpdatePayload({ brandLogoUrl: "https://example.com/logo.svg" }).success, true);
    assert.equal(parseShopUpdatePayload({ brandLogoUrl: uploadedLogo }).success, true);
    assert.equal(parseShopUpdatePayload({ brandLogoUrl: null }).success, true);
  });

  it("rejects unsupported embedded logo types", () => {
    const svgLogo = `data:image/svg+xml;base64,${Buffer.from("<svg />").toString("base64")}`;

    assert.equal(parseShopUpdatePayload({ brandLogoUrl: svgLogo }).success, false);
  });
});

describe("Stripe Connect settings", () => {
  it("creates cafe connected accounts with cafe-paid direct charge processing fees", () => {
    const controller = stripeConnectedAccountController();
    assert.equal(controller.fees?.payer, "account");
    assert.equal(controller.losses?.payments, "stripe");
    assert.equal(controller.stripe_dashboard?.type, "express");
  });
});
