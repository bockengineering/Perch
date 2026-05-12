"use client";

import { Plus } from "lucide-react";
import { useState } from "react";

export function PricePlanForm({ shopId }: { shopId: string }) {
  const [message, setMessage] = useState<string | null>(null);

  async function submit(formData: FormData) {
    setMessage(null);
    const response = await fetch(`/api/admin/shops/${shopId}/price-plans`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        label: formData.get("label"),
        durationMinutes: Number(formData.get("durationMinutes")),
        amountCents: Number(formData.get("amountCents")),
        currency: formData.get("currency") || "usd",
      }),
    });

    if (!response.ok) {
      const payload = (await response.json()) as { error?: string };
      setMessage(payload.error ?? "Price plan could not be saved.");
      return;
    }

    window.location.reload();
  }

  return (
    <form action={submit} className="grid gap-3 md:grid-cols-[1fr_120px_120px_90px_auto]">
      <input
        name="label"
        placeholder="Plan label"
        className="rounded-md border border-[var(--border)] px-3 py-2 text-sm"
        required
      />
      <input
        name="durationMinutes"
        type="number"
        min="1"
        placeholder="Minutes"
        className="rounded-md border border-[var(--border)] px-3 py-2 text-sm"
        required
      />
      <input
        name="amountCents"
        type="number"
        min="50"
        placeholder="Cents"
        className="rounded-md border border-[var(--border)] px-3 py-2 text-sm"
        required
      />
      <input
        name="currency"
        defaultValue="usd"
        className="rounded-md border border-[var(--border)] px-3 py-2 text-sm"
        required
      />
      <button className="inline-flex items-center justify-center gap-2 rounded-md border border-[var(--border)] px-3 py-2 text-sm font-semibold">
        <Plus size={16} />
        Add
      </button>
      {message ? <p className="md:col-span-5 text-sm text-[var(--danger)]">{message}</p> : null}
    </form>
  );
}
