"use client";

import { ChevronDown, ChevronUp, Plus, Save } from "lucide-react";
import { useState } from "react";
import { formatPlanPriceInput, parsePlanPriceToCents } from "@/lib/services/price-plans";

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
  isFirst,
  isLast,
  isReordering,
  onMove,
}: {
  shopId: string;
  plan: EditablePricePlan;
  isFirst: boolean;
  isLast: boolean;
  isReordering: boolean;
  onMove: (planId: string, direction: "up" | "down") => void;
}) {
  const [message, setMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  async function submit(formData: FormData) {
    if (isSaving) {
      return;
    }

    setMessage(null);
    const amountCents = parsePlanPriceToCents(formData.get("price"));
    if (amountCents === null) {
      setMessage("Enter a price like 4 or 4.50.");
      return;
    }

    setIsSaving(true);
    try {
      const response = await fetch(`/api/admin/shops/${shopId}/price-plans/${plan.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          label: formData.get("label"),
          durationMinutes: Number(formData.get("durationMinutes")),
          price: formData.get("price"),
          currency: formData.get("currency") || "usd",
          active: formData.get("active") === "on",
        }),
      });

      const payload = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) {
        setMessage(payload.error ?? "Price plan could not be updated.");
        setIsSaving(false);
        return;
      }

      window.location.reload();
    } catch {
      setMessage("Price plan could not be updated. Check your connection and try again.");
      setIsSaving(false);
    }
  }

  return (
    <form action={submit} className="price-plan-row">
      <input
        name="label"
        aria-label={`${plan.label} plan label`}
        defaultValue={plan.label}
        className="rounded-md border border-[var(--border)] px-3 py-2 text-sm"
        required
      />
      <input
        name="durationMinutes"
        aria-label={`${plan.label} duration in minutes`}
        type="number"
        min="1"
        defaultValue={plan.durationMinutes}
        className="rounded-md border border-[var(--border)] px-3 py-2 text-sm"
        required
      />
      <input
        name="price"
        aria-label={`${plan.label} price`}
        type="number"
        min="0.50"
        step="0.01"
        inputMode="decimal"
        defaultValue={formatPlanPriceInput(plan.amountCents)}
        className="rounded-md border border-[var(--border)] px-3 py-2 text-sm"
        required
      />
      <input
        name="currency"
        aria-label={`${plan.label} currency`}
        defaultValue={plan.currency}
        className="rounded-md border border-[var(--border)] px-3 py-2 text-sm"
        required
      />
      <div className="price-plan-move-controls flex items-center gap-2">
        <button
          type="button"
          aria-label={`Move ${plan.label} up`}
          title="Move up"
          className="price-plan-move-button inline-flex items-center justify-center rounded-md border border-[var(--border)]"
          disabled={isFirst || isReordering || isSaving}
          onClick={() => onMove(plan.id, "up")}
        >
          <ChevronUp size={16} />
        </button>
        <button
          type="button"
          aria-label={`Move ${plan.label} down`}
          title="Move down"
          className="price-plan-move-button inline-flex items-center justify-center rounded-md border border-[var(--border)]"
          disabled={isLast || isReordering || isSaving}
          onClick={() => onMove(plan.id, "down")}
        >
          <ChevronDown size={16} />
        </button>
      </div>
      <div className="price-plan-actions flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2 text-sm font-medium">
          <input
            name="active"
            type="checkbox"
            defaultChecked={plan.active}
            disabled={isSaving}
            className="account-checkbox"
          />
          Active
        </label>
        <button
          className="inline-flex items-center justify-center gap-2 rounded-md border border-[var(--border)] px-3 py-2 text-sm font-semibold"
          disabled={isSaving}
          aria-busy={isSaving}
        >
          <Save size={16} />
          {isSaving ? "Saving..." : "Save"}
        </button>
      </div>
      {message ? (
        <p className="price-plan-message text-sm text-[var(--danger)]" role="alert">
          {message}
        </p>
      ) : null}
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
  const [reorderingPlanId, setReorderingPlanId] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);

  async function submit(formData: FormData) {
    if (isAdding || reorderingPlanId) {
      return;
    }

    setMessage(null);
    const amountCents = parsePlanPriceToCents(formData.get("price"));
    if (amountCents === null) {
      setMessage("Enter a price like 4 or 4.50.");
      return;
    }

    setIsAdding(true);
    try {
      const response = await fetch(`/api/admin/shops/${shopId}/price-plans`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          label: formData.get("label"),
          durationMinutes: Number(formData.get("durationMinutes")),
          price: formData.get("price"),
          currency: formData.get("currency") || "usd",
        }),
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => ({}))) as { error?: string };
        setMessage(payload.error ?? "Price plan could not be saved.");
        setIsAdding(false);
        return;
      }

      window.location.reload();
    } catch {
      setMessage("Price plan could not be saved. Check your connection and try again.");
      setIsAdding(false);
    }
  }

  async function movePlan(planId: string, direction: "up" | "down") {
    if (reorderingPlanId || isAdding) {
      return;
    }

    setMessage(null);
    const index = plans.findIndex((plan) => plan.id === planId);
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (index === -1 || targetIndex < 0 || targetIndex >= plans.length) {
      return;
    }

    const nextPlans = [...plans];
    [nextPlans[index], nextPlans[targetIndex]] = [nextPlans[targetIndex], nextPlans[index]];
    setReorderingPlanId(planId);

    try {
      const response = await fetch(`/api/admin/shops/${shopId}/price-plans/reorder`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pricePlanIds: nextPlans.map((plan) => plan.id),
        }),
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => ({}))) as { error?: string };
        setMessage(payload.error ?? "Plan order could not be updated.");
        setReorderingPlanId(null);
        return;
      }

      window.location.reload();
    } catch {
      setMessage("Plan order could not be updated. Check your connection and try again.");
      setReorderingPlanId(null);
    }
  }

  return (
    <div className="grid gap-4">
      {plans.length ? (
        <div className="price-plan-table">
          <div className="price-plan-header text-xs font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">
            <span>Plan</span>
            <span>Minutes</span>
            <span>Price</span>
            <span>Currency</span>
            <span>Move</span>
            <span>Status</span>
          </div>
          {plans.map((plan, index) => (
            <PricePlanRow
              key={plan.id}
              shopId={shopId}
              plan={plan}
              isFirst={index === 0}
              isLast={index === plans.length - 1}
              isReordering={reorderingPlanId !== null}
              onMove={movePlan}
            />
          ))}
        </div>
      ) : null}

      <form action={submit} className="price-plan-add-row">
        <input
          name="label"
          aria-label="New plan label"
          placeholder="Plan label"
          className="rounded-md border border-[var(--border)] px-3 py-2 text-sm"
          required
        />
        <input
          name="durationMinutes"
          aria-label="New plan duration in minutes"
          type="number"
          min="1"
          placeholder="Minutes"
          className="rounded-md border border-[var(--border)] px-3 py-2 text-sm"
          required
        />
        <input
          name="price"
          aria-label="New plan price"
          type="number"
          min="0.50"
          step="0.01"
          inputMode="decimal"
          placeholder="Price"
          className="rounded-md border border-[var(--border)] px-3 py-2 text-sm"
          required
        />
        <input
          name="currency"
          aria-label="New plan currency"
          defaultValue="usd"
          className="rounded-md border border-[var(--border)] px-3 py-2 text-sm"
          required
        />
        <button
          className="inline-flex items-center justify-center gap-2 rounded-md border border-[var(--border)] px-3 py-2 text-sm font-semibold"
          disabled={isAdding || reorderingPlanId !== null}
          aria-busy={isAdding}
        >
          <Plus size={16} />
          {isAdding ? "Adding..." : "Add plan"}
        </button>
        {message ? (
          <p className="price-plan-message text-sm text-[var(--danger)]" role="alert">
            {message}
          </p>
        ) : null}
      </form>
    </div>
  );
}
