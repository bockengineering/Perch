"use client";

import { useState } from "react";

type Plan = {
  id: string;
  label: string;
  amountCents: number;
  currency: string;
};

function planButtonLabel(plan: Plan) {
  const price = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: plan.currency.toUpperCase(),
    maximumFractionDigits: 0,
  }).format(plan.amountCents / 100);

  return `${price}, ${plan.label}`;
}

export function PaywallActions({
  portalSessionId,
  plans,
}: {
  portalSessionId: string;
  plans: Plan[];
}) {
  const [voucherCode, setVoucherCode] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState<string | null>(null);

  async function startCheckout(pricePlanId: string) {
    setLoading(pricePlanId);
    setMessage(null);
    const response = await fetch("/api/portal/create-checkout-session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ portalSessionId, pricePlanId }),
    });
    const payload = (await response.json()) as { checkoutUrl?: string; error?: string };
    setLoading(null);

    if (!response.ok || !payload.checkoutUrl) {
      setMessage(payload.error ?? "Payment could not start.");
      return;
    }

    window.location.assign(payload.checkoutUrl);
  }

  async function redeemVoucher() {
    if (!voucherCode.trim()) {
      setMessage("Enter a staff code.");
      return;
    }

    setLoading("voucher");
    setMessage(null);
    const response = await fetch("/api/portal/redeem-voucher", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ portalSessionId, code: voucherCode }),
    });
    const payload = (await response.json()) as { redirectUrl?: string; error?: string };
    setLoading(null);

    if (!response.ok || !payload.redirectUrl) {
      setMessage(payload.error ?? "Staff code could not be redeemed.");
      return;
    }

    window.location.assign(payload.redirectUrl);
  }

  return (
    <div className="mt-6 grid gap-3">
      {plans.map((plan) => (
        <button
          key={plan.id}
          type="button"
          onClick={() => void startCheckout(plan.id)}
          disabled={Boolean(loading)}
          className="portal-primary-action w-full rounded-md px-4 py-3 text-left text-sm font-semibold text-white disabled:opacity-60"
        >
          {loading === plan.id ? "Connecting..." : planButtonLabel(plan)}
        </button>
      ))}

      <div className="mt-2 grid gap-2">
        <label className="text-sm font-medium" htmlFor="voucher-code">
          Enter staff code
        </label>
        <div className="flex gap-2">
          <input
            id="voucher-code"
            value={voucherCode}
            onChange={(event) => setVoucherCode(event.target.value)}
            className="min-w-0 flex-1 rounded-md border border-[var(--border)] bg-white px-3 py-2 text-sm"
            autoComplete="one-time-code"
          />
          <button
            type="button"
            onClick={() => void redeemVoucher()}
            disabled={Boolean(loading)}
            className="rounded-md border border-[var(--border)] px-4 py-2 text-sm font-semibold disabled:opacity-60"
          >
            {loading === "voucher" ? "Checking..." : "Apply"}
          </button>
        </div>
      </div>

      {message ? <p className="text-sm text-[var(--danger)]">{message}</p> : null}
    </div>
  );
}
