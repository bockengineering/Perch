import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { getShopLocalDate } from "@/lib/utils/time";

type GrantType = "FREE" | "VOUCHER" | "PAID" | "CHECKOUT_GRACE";

class InMemoryPerchFlow {
  allowances = new Set<string>();
  grants: Array<{ type: GrantType; status: "AUTHORIZED" | "FAILED"; key?: string }> = [];
  vouchers = new Map<string, { durationMinutes: number; remaining: number }>();
  webhookEvents = new Set<string>();
  networkLogs: Array<{ status: "SUCCESS" | "FAILED"; error?: string }> = [];
  authorizeSucceeds = true;
  emergencyFreeUntil: Date | null = null;

  private allowanceKey(deviceId: string, now: Date) {
    return `${deviceId}:${getShopLocalDate({ timezone: "America/Los_Angeles", freeResetHour: 0 }, now)}`;
  }

  portalVisit(deviceId: string, now: Date) {
    if (this.emergencyFreeUntil && this.emergencyFreeUntil > now) {
      return this.authorize("FREE", `emergency:${deviceId}`);
    }

    const key = this.allowanceKey(deviceId, now);
    if (this.allowances.has(key)) {
      return "PAYWALL";
    }
    this.allowances.add(key);
    return this.authorize("FREE", key);
  }

  workerTick(clients: Array<{ deviceId: string; guest: boolean; authorized: boolean }>, now: Date) {
    for (const client of clients) {
      if (client.guest && !client.authorized) {
        this.portalVisit(client.deviceId, now);
      }
    }
  }

  createVoucher(code: string, durationMinutes: number, maxRedemptions: number) {
    this.vouchers.set(code, { durationMinutes, remaining: maxRedemptions });
  }

  redeemVoucher(code: string) {
    const voucher = this.vouchers.get(code);
    if (!voucher || voucher.remaining <= 0) {
      return "INVALID";
    }
    voucher.remaining -= 1;
    return this.authorize("VOUCHER");
  }

  stripeWebhook(eventId: string) {
    if (this.webhookEvents.has(eventId)) {
      return "DUPLICATE";
    }
    this.webhookEvents.add(eventId);
    return this.authorize("PAID");
  }

  checkoutGrace(countToday: number, max: number) {
    if (countToday >= max) {
      return "LIMITED";
    }
    return this.authorize("CHECKOUT_GRACE");
  }

  private authorize(type: GrantType, key?: string) {
    if (!this.authorizeSucceeds) {
      this.grants.push({ type, status: "FAILED", key });
      this.networkLogs.push({ status: "FAILED", error: "UniFi authorization failed" });
      return "FAILED";
    }

    this.grants.push({ type, status: "AUTHORIZED", key });
    this.networkLogs.push({ status: "SUCCESS" });
    return "AUTHORIZED";
  }
}

describe("mock captive portal flows", () => {
  it("grants first same-day portal visit and shows paywall on second visit", () => {
    const flow = new InMemoryPerchFlow();
    const now = new Date("2026-05-12T20:00:00.000Z");
    assert.equal(flow.portalVisit("device-1", now), "AUTHORIZED");
    assert.equal(flow.portalVisit("device-1", now), "PAYWALL");
    assert.equal(flow.grants.filter((grant) => grant.type === "FREE").length, 1);
  });

  it("grants free access again on the next local day", () => {
    const flow = new InMemoryPerchFlow();
    assert.equal(flow.portalVisit("device-1", new Date("2026-05-12T20:00:00.000Z")), "AUTHORIZED");
    assert.equal(flow.portalVisit("device-1", new Date("2026-05-13T16:00:00.000Z")), "AUTHORIZED");
    assert.equal(flow.grants.filter((grant) => grant.type === "FREE").length, 2);
  });

  it("worker grants free access to eligible unauthorized guest clients", () => {
    const flow = new InMemoryPerchFlow();
    flow.workerTick([{ deviceId: "device-1", guest: true, authorized: false }], new Date("2026-05-12T20:00:00.000Z"));
    assert.deepEqual(flow.grants, [{ type: "FREE", status: "AUTHORIZED", key: "device-1:2026-05-12" }]);
  });

  it("worker and portal race cannot duplicate the daily free allowance", () => {
    const flow = new InMemoryPerchFlow();
    const now = new Date("2026-05-12T20:00:00.000Z");
    assert.equal(flow.portalVisit("device-1", now), "AUTHORIZED");
    flow.workerTick([{ deviceId: "device-1", guest: true, authorized: false }], now);
    assert.equal(flow.allowances.size, 1);
    assert.equal(flow.grants.filter((grant) => grant.type === "FREE").length, 1);
  });

  it("emergency free access bypasses the paywall only until midnight", () => {
    const flow = new InMemoryPerchFlow();
    flow.emergencyFreeUntil = new Date("2026-05-13T07:00:00.000Z");
    assert.equal(flow.portalVisit("device-1", new Date("2026-05-12T20:00:00.000Z")), "AUTHORIZED");
    assert.equal(flow.portalVisit("device-1", new Date("2026-05-12T21:00:00.000Z")), "AUTHORIZED");
    assert.equal(flow.allowances.size, 0);

    assert.equal(flow.portalVisit("device-1", new Date("2026-05-13T07:00:00.000Z")), "AUTHORIZED");
    assert.equal(flow.portalVisit("device-1", new Date("2026-05-13T08:00:00.000Z")), "PAYWALL");
  });
});

describe("paid and voucher flows", () => {
  it("redeems a voucher and creates an authorized grant", () => {
    const flow = new InMemoryPerchFlow();
    flow.createVoucher("STAFF123", 120, 1);
    assert.equal(flow.redeemVoucher("STAFF123"), "AUTHORIZED");
    assert.equal(flow.redeemVoucher("STAFF123"), "INVALID");
    assert.equal(flow.grants.filter((grant) => grant.type === "VOUCHER").length, 1);
  });

  it("enforces checkout grace max count", () => {
    const flow = new InMemoryPerchFlow();
    assert.equal(flow.checkoutGrace(0, 2), "AUTHORIZED");
    assert.equal(flow.checkoutGrace(2, 2), "LIMITED");
  });

  it("stripe webhook creates one paid access grant and ignores duplicates", () => {
    const flow = new InMemoryPerchFlow();
    assert.equal(flow.stripeWebhook("evt_paid"), "AUTHORIZED");
    assert.equal(flow.stripeWebhook("evt_paid"), "DUPLICATE");
    assert.equal(flow.grants.filter((grant) => grant.type === "PAID").length, 1);
  });

  it("authorization failure marks grant failed and logs the network error", () => {
    const flow = new InMemoryPerchFlow();
    flow.authorizeSucceeds = false;
    assert.equal(flow.portalVisit("device-1", new Date("2026-05-12T20:00:00.000Z")), "FAILED");
    assert.equal(flow.grants[0].status, "FAILED");
    assert.equal(flow.networkLogs[0].status, "FAILED");
  });
});
