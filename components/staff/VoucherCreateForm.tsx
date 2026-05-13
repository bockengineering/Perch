"use client";

import { Ticket } from "lucide-react";
import { useState } from "react";

export function VoucherCreateForm({ shopId, framed = true }: { shopId: string; framed?: boolean }) {
  const [code, setCode] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function submit(formData: FormData) {
    setMessage(null);
    setCode(null);
    const response = await fetch(`/api/staff/shops/${shopId}/vouchers`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        label: formData.get("label"),
        durationMinutes: Number(formData.get("durationMinutes")),
        maxRedemptions: Number(formData.get("maxRedemptions")),
        expiresAt: formData.get("expiresAt") || null,
      }),
    });
    const payload = (await response.json()) as { plaintextCode?: string; error?: string };
    if (!response.ok || !payload.plaintextCode) {
      setMessage(payload.error ?? "Voucher could not be created.");
      return;
    }
    setCode(payload.plaintextCode);
  }

  const className = framed ? "surface grid gap-3 p-4" : "grid gap-3";

  return (
    <form action={submit} className={className}>
      <div className="grid gap-1">
        <label className="text-sm font-medium" htmlFor="label">
          Label
        </label>
        <input
          id="label"
          name="label"
          defaultValue="Receipt code"
          className="rounded-md border border-[var(--border)] px-3 py-2"
          required
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="grid gap-1">
          <label className="text-sm font-medium" htmlFor="durationMinutes">
            Minutes
          </label>
          <input
            id="durationMinutes"
            name="durationMinutes"
            type="number"
            min="1"
            defaultValue="120"
            className="rounded-md border border-[var(--border)] px-3 py-2"
            required
          />
        </div>
        <div className="grid gap-1">
          <label className="text-sm font-medium" htmlFor="maxRedemptions">
            Uses
          </label>
          <input
            id="maxRedemptions"
            name="maxRedemptions"
            type="number"
            min="1"
            defaultValue="1"
            className="rounded-md border border-[var(--border)] px-3 py-2"
            required
          />
        </div>
      </div>
      <div className="grid gap-1">
        <label className="text-sm font-medium" htmlFor="expiresAt">
          Expires
        </label>
        <input
          id="expiresAt"
          name="expiresAt"
          type="datetime-local"
          className="rounded-md border border-[var(--border)] px-3 py-2"
        />
      </div>
      <button className="inline-flex items-center justify-center gap-2 rounded-md bg-[var(--foreground)] px-4 py-2 text-sm font-semibold text-white">
        <Ticket size={16} />
        Create voucher
      </button>
      {code ? (
        <div className="rounded-md border border-[var(--border)] bg-[var(--panel-strong)] p-3">
          <p className="text-xs font-medium uppercase tracking-[0.12em] text-[var(--muted)]">Code</p>
          <p className="mt-1 text-2xl font-semibold tracking-[0.08em]">{code}</p>
        </div>
      ) : null}
      {message ? <p className="text-sm text-[var(--danger)]">{message}</p> : null}
    </form>
  );
}
