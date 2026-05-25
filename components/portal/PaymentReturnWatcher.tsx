"use client";

import { useEffect, useState } from "react";

type PaymentStatusPayload = {
  status?: string;
  redirectUrl?: string | null;
};

export function PaymentReturnWatcher({
  orderId,
  enabled,
}: {
  orderId: string;
  enabled: boolean;
}) {
  const [message, setMessage] = useState("We will send you to Google once your pass is active.");

  useEffect(() => {
    if (!enabled) {
      return;
    }

    let attempts = 0;
    let stopped = false;

    async function checkStatus() {
      attempts += 1;

      try {
        const response = await fetch(`/api/portal/payment-status?orderId=${encodeURIComponent(orderId)}`, {
          cache: "no-store",
        });

        if (!response.ok) {
          return;
        }

        const payload = (await response.json()) as PaymentStatusPayload;

        if (payload.status === "AUTHORIZED" && payload.redirectUrl) {
          window.location.replace(payload.redirectUrl);
          return;
        }

        if (payload.status === "FAILED") {
          window.location.reload();
          return;
        }

        if (attempts >= 8) {
          setMessage("Still waiting for the payment confirmation. This usually takes a few seconds.");
        }
      } catch {
        if (!stopped && attempts >= 8) {
          setMessage("Still checking your pass. Keep this page open for a moment.");
        }
      }
    }

    void checkStatus();
    const interval = window.setInterval(() => void checkStatus(), 2000);

    return () => {
      stopped = true;
      window.clearInterval(interval);
    };
  }, [enabled, orderId]);

  if (!enabled) {
    return null;
  }

  return <p className="mt-4 text-xs text-[var(--muted)]">{message}</p>;
}
