import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { normalizeMac, hashMac } from "@/lib/crypto/mac";
import { safeRedirectUrl } from "@/lib/utils/redirect";
import { getShopLocalDate } from "@/lib/utils/time";
import { hashVoucherCode, normalizeVoucherCode } from "@/lib/services/vouchers";
import { applyDatabaseUrlAlias, databaseUrl } from "@/lib/env";
import {
  createCafeSessionCookie,
  isCafeLoginValid,
  safeCafeRedirectPath,
  verifyCafeSessionCookie,
} from "@/lib/auth/cafe-session";
import { isDemoCafeLogin } from "@/lib/auth/hosted-preview";
import { isSupabaseAdminConfigured, isSupabaseAuthConfigured } from "@/lib/auth/supabase";

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
