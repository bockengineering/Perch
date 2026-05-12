import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { normalizeMac, hashMac } from "@/lib/crypto/mac";
import { safeRedirectUrl } from "@/lib/utils/redirect";
import { getShopLocalDate } from "@/lib/utils/time";
import { hashVoucherCode, normalizeVoucherCode } from "@/lib/services/vouchers";

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
