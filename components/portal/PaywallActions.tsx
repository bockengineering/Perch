"use client";

import { useState } from "react";

type Plan = {
  id: string;
  label: string;
  amountCents: number;
  currency: string;
};

function planButtonLabel(plan: Plan) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: plan.currency.toUpperCase(),
    maximumFractionDigits: 0,
  }).format(plan.amountCents / 100);
}

export function PaywallActions({
  portalSessionId,
  plans,
  preview = false,
}: {
  portalSessionId: string;
  plans: Plan[];
  preview?: boolean;
}) {
  const [voucherCode, setVoucherCode] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState<string | null>(null);

  async function startCheckout(pricePlanId: string) {
    if (preview) {
      setMessage("Preview only. Guests buy passes from the Wi-Fi sign-in screen.");
      return;
    }

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
    if (preview) {
      setMessage("Preview only. Staff codes work from the Wi-Fi sign-in screen.");
      return;
    }

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
    <div className="portal-actions">
      {plans.map((plan) => (
        <button
          key={plan.id}
          type="button"
          onClick={() => void startCheckout(plan.id)}
          disabled={Boolean(loading)}
          className="portal-plan-button"
        >
          <span>{loading === plan.id ? "Connecting..." : planButtonLabel(plan)}</span>
          <strong>{plan.label}</strong>
        </button>
      ))}

      <div className="portal-voucher-box">
        <label htmlFor="voucher-code">
          Enter staff code
        </label>
        <div className="flex gap-2">
          <input
            id="voucher-code"
            value={voucherCode}
            onChange={(event) => setVoucherCode(event.target.value)}
            className="min-w-0 flex-1 rounded-md border border-[var(--border)] bg-white px-3 py-2 text-sm"
            autoComplete="one-time-code"
            readOnly={preview}
          />
          <button
            type="button"
            onClick={() => void redeemVoucher()}
            disabled={Boolean(loading)}
            className="portal-secondary-action disabled:opacity-60"
          >
            {loading === "voucher" ? "Checking..." : "Apply"}
          </button>
        </div>
      </div>

      {message ? <p className="portal-message text-sm text-[var(--danger)]">{message}</p> : null}
    </div>
  );
}
