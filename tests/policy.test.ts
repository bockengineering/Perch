import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildDemoPortalUrl } from "@/lib/services/demo-environment";
import { canCreateCheckoutGrace, isDailyFreeEligible } from "@/lib/services/portal-policy";
import { isDuplicateWebhook } from "@/lib/services/webhooks";

describe("portal policy", () => {
  it("allows a daily free claim only when there is no active grant or same-day allowance", () => {
    assert.equal(isDailyFreeEligible(null, null), true);
    assert.equal(isDailyFreeEligible({ id: "grant" }, null), false);
    assert.equal(isDailyFreeEligible(null, { id: "allowance" }), false);
  });

  it("limits checkout grace grants per local day", () => {
    assert.equal(canCreateCheckoutGrace(0, 2), true);
    assert.equal(canCreateCheckoutGrace(1, 2), true);
    assert.equal(canCreateCheckoutGrace(2, 2), false);
  });

  it("treats duplicate webhook event IDs idempotently", () => {
    const seen = new Set<string>();
    assert.equal(isDuplicateWebhook(seen, "evt_1"), false);
    assert.equal(isDuplicateWebhook(seen, "evt_1"), true);
  });
});

describe("demo environment", () => {
  it("builds a mock captive portal URL that returns to the demo console", () => {
    const url = buildDemoPortalUrl({
      appUrl: "http://localhost:3000",
      successPath: "/demo/connected",
      mac: "AA:BB:CC:DD:EE:FF",
    });

    assert.equal(url.startsWith("/p/demo-cafe?"), true);
    assert.equal(url.includes("ssid=DemoGuest"), true);
    assert.equal(url.includes("url=http%3A%2F%2Flocalhost%3A3000%2Fdemo%2Fconnected"), true);
  });
});
