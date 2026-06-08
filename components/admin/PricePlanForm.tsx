"use client";

import { Plus, Save } from "lucide-react";
import { useState } from "react";

type EditablePricePlan = {
  id: string;
  label: string;
  durationMinutes: number;
  amountCents: number;
  currency: string;
  active: boolean;
  sortOrder: number;
};

function PricePlanRow({
  shopId,
  plan,
}: {
  shopId: string;
  plan: EditablePricePlan;
}) {
  const [message, setMessage] = useState<string | null>(null);

  async function submit(formData: FormData) {
    setMessage(null);
    const response = await fetch(`/api/admin/shops/${shopId}/price-plans/${plan.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        label: formData.get("label"),
        durationMinutes: Number(formData.get("durationMinutes")),
        amountCents: Number(formData.get("amountCents")),
        currency: formData.get("currency") || "usd",
        sortOrder: Number(formData.get("sortOrder")),
        active: formData.get("active") === "on",
      }),
    });

    const payload = (await response.json().catch(() => ({}))) as { error?: string };
    if (!response.ok) {
      setMessage(payload.error ?? "Price plan could not be updated.");
      return;
    }

    window.location.reload();
  }

  return (
    <form action={submit} className="price-plan-row">
      <input
        name="label"
        defaultValue={plan.label}
        className="rounded-md border border-[var(--border)] px-3 py-2 text-sm"
        required
      />
      <input
        name="durationMinutes"
        type="number"
        min="1"
        defaultValue={plan.durationMinutes}
        className="rounded-md border border-[var(--border)] px-3 py-2 text-sm"
        required
      />
      <input
        name="amountCents"
        type="number"
        min="50"
        defaultValue={plan.amountCents}
        className="rounded-md border border-[var(--border)] px-3 py-2 text-sm"
        required
      />
      <input
        name="currency"
        defaultValue={plan.currency}
        className="rounded-md border border-[var(--border)] px-3 py-2 text-sm"
        required
      />
      <input
        name="sortOrder"
        type="number"
        defaultValue={plan.sortOrder}
        className="rounded-md border border-[var(--border)] px-3 py-2 text-sm"
        required
      />
      <div className="price-plan-actions flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2 text-sm font-medium">
          <input name="active" type="checkbox" defaultChecked={plan.active} className="account-checkbox" />
          Active
        </label>
        <button className="inline-flex items-center justify-center gap-2 rounded-md border border-[var(--border)] px-3 py-2 text-sm font-semibold">
          <Save size={16} />
          Save
        </button>
      </div>
      {message ? <p className="price-plan-message text-sm text-[var(--danger)]">{message}</p> : null}
    </form>
  );
}

export function PricePlanForm({
  shopId,
  plans = [],
}: {
  shopId: string;
  plans?: EditablePricePlan[];
}) {
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
    <div className="grid gap-4">
      {plans.length ? (
        <div className="price-plan-table">
          <div className="price-plan-header text-xs font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">
            <span>Plan</span>
            <span>Minutes</span>
            <span>Cents</span>
            <span>Currency</span>
            <span>Order</span>
            <span>Status</span>
          </div>
          {plans.map((plan) => (
            <PricePlanRow key={plan.id} shopId={shopId} plan={plan} />
          ))}
        </div>
      ) : null}

      <form action={submit} className="price-plan-add-row">
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
        {message ? <p className="price-plan-message text-sm text-[var(--danger)]">{message}</p> : null}
      </form>
    </div>
  );
}
