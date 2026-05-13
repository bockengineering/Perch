"use client";

import { CheckCircle2 } from "lucide-react";
import { useState } from "react";

export function DemoCompleteCheckoutButton({ orderId }: { orderId: string }) {
  const [status, setStatus] = useState<string | null>(null);

  async function completeCheckout() {
    setStatus("Completing mock payment...");
    const response = await fetch("/api/demo/complete-checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderId }),
    });
    const payload = (await response.json().catch(() => ({}))) as { error?: string };

    if (!response.ok) {
      setStatus(payload.error ?? "Mock payment failed.");
      return;
    }

    setStatus("Mock payment complete.");
    window.location.reload();
  }

  return (
    <div className="mt-6 grid gap-2">
      <button
        type="button"
        onClick={() => void completeCheckout()}
        className="inline-flex items-center justify-center gap-2 rounded-md bg-[var(--foreground)] px-4 py-2 text-sm font-semibold text-white"
      >
        <CheckCircle2 size={16} />
        Complete mock Stripe payment
      </button>
      {status ? <p className="text-sm text-[var(--muted)]">{status}</p> : null}
    </div>
  );
}
