"use client";

import { Clock3 } from "lucide-react";
import { useState } from "react";

export function DemoExpireAccessButton({ portalUrl }: { portalUrl: string }) {
  const [status, setStatus] = useState<string | null>(null);

  async function expireAccess() {
    setStatus("Ending the mock access grant...");
    const response = await fetch("/api/demo/expire-access", { method: "POST" });
    const payload = (await response.json().catch(() => ({}))) as {
      error?: string;
      expiredGrants?: number;
    };

    if (!response.ok) {
      setStatus(payload.error ?? "Could not end the mock access grant.");
      return;
    }

    if (!payload.expiredGrants) {
      setStatus("Open the primary device once first, then end the mock free hour.");
      return;
    }

    setStatus("Opening the paywall...");
    window.location.assign(portalUrl);
  }

  return (
    <div className="grid gap-2">
      <button
        type="button"
        onClick={() => void expireAccess()}
        className="inline-flex items-center justify-center gap-2 rounded-md border border-[var(--border)] px-4 py-2 text-sm font-semibold"
      >
        <Clock3 size={16} />
        Simulate free hour ended
      </button>
      {status ? <p className="text-sm text-[var(--muted)]">{status}</p> : null}
    </div>
  );
}
