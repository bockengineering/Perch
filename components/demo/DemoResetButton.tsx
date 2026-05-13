"use client";

import { RotateCcw } from "lucide-react";
import { useState } from "react";

export function DemoResetButton() {
  const [status, setStatus] = useState<string | null>(null);

  async function resetDemo() {
    setStatus("Resetting...");
    const response = await fetch("/api/demo/reset", { method: "POST" });
    const payload = (await response.json().catch(() => ({}))) as { error?: string };

    if (!response.ok) {
      setStatus(payload.error ?? "Reset failed.");
      return;
    }

    setStatus("Demo reset.");
    window.location.reload();
  }

  return (
    <div className="grid gap-2">
      <button
        type="button"
        onClick={() => void resetDemo()}
        className="inline-flex items-center justify-center gap-2 rounded-md bg-[var(--foreground)] px-4 py-2 text-sm font-semibold text-white"
      >
        <RotateCcw size={16} />
        Reset demo data
      </button>
      {status ? <p className="text-sm text-[var(--muted)]">{status}</p> : null}
    </div>
  );
}
