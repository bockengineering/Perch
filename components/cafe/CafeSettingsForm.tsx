"use client";

import { Save } from "lucide-react";
import { useState } from "react";

type CafeSettingsFormProps = {
  shop: {
    id: string;
    name: string;
    timezone: string;
    status: string;
    freeMinutesPerDay: number;
    checkoutGraceMinutes: number;
    maxCheckoutGracePerDay: number;
    supportEmail: string | null;
  };
};

export function CafeSettingsForm({ shop }: CafeSettingsFormProps) {
  const [message, setMessage] = useState<string | null>(null);

  async function submit(formData: FormData) {
    setMessage(null);
    const response = await fetch(`/api/admin/shops/${shop.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: formData.get("name"),
        timezone: formData.get("timezone"),
        status: formData.get("status"),
        freeMinutesPerDay: Number(formData.get("freeMinutesPerDay")),
        checkoutGraceMinutes: Number(formData.get("checkoutGraceMinutes")),
        maxCheckoutGracePerDay: Number(formData.get("maxCheckoutGracePerDay")),
        supportEmail: formData.get("supportEmail") || null,
      }),
    });

    const payload = (await response.json().catch(() => ({}))) as { error?: string };
    if (!response.ok) {
      setMessage(payload.error ?? "Settings could not be saved.");
      return;
    }

    setMessage("Settings saved.");
    window.location.reload();
  }

  return (
    <form action={submit} className="grid gap-3">
      <div className="grid gap-3 md:grid-cols-2">
        <label className="grid gap-1 text-sm font-medium">
          Shop name
          <input
            name="name"
            defaultValue={shop.name}
            className="rounded-md border border-[var(--border)] px-3 py-2 font-normal"
            required
          />
        </label>
        <label className="grid gap-1 text-sm font-medium">
          Timezone
          <input
            name="timezone"
            defaultValue={shop.timezone}
            className="rounded-md border border-[var(--border)] px-3 py-2 font-normal"
            required
          />
        </label>
      </div>

      <div className="grid gap-3 md:grid-cols-4">
        <label className="grid gap-1 text-sm font-medium">
          Status
          <select
            name="status"
            defaultValue={shop.status}
            className="rounded-md border border-[var(--border)] bg-white px-3 py-2 font-normal"
          >
            <option value="ACTIVE">Active</option>
            <option value="PAUSED">Paused</option>
            <option value="DRAFT">Draft</option>
            <option value="DISABLED">Disabled</option>
          </select>
        </label>
        <label className="grid gap-1 text-sm font-medium">
          Free minutes
          <input
            name="freeMinutesPerDay"
            type="number"
            min="0"
            defaultValue={shop.freeMinutesPerDay}
            className="rounded-md border border-[var(--border)] px-3 py-2 font-normal"
            required
          />
        </label>
        <label className="grid gap-1 text-sm font-medium">
          Checkout grace
          <input
            name="checkoutGraceMinutes"
            type="number"
            min="1"
            defaultValue={shop.checkoutGraceMinutes}
            className="rounded-md border border-[var(--border)] px-3 py-2 font-normal"
            required
          />
        </label>
        <label className="grid gap-1 text-sm font-medium">
          Grace uses
          <input
            name="maxCheckoutGracePerDay"
            type="number"
            min="0"
            defaultValue={shop.maxCheckoutGracePerDay}
            className="rounded-md border border-[var(--border)] px-3 py-2 font-normal"
            required
          />
        </label>
      </div>

      <label className="grid gap-1 text-sm font-medium">
        Support email
        <input
          name="supportEmail"
          type="email"
          defaultValue={shop.supportEmail ?? ""}
          className="rounded-md border border-[var(--border)] px-3 py-2 font-normal"
        />
      </label>

      <div className="flex flex-wrap items-center gap-3">
        <button className="inline-flex items-center justify-center gap-2 rounded-md bg-[var(--foreground)] px-4 py-2 text-sm font-semibold text-white">
          <Save size={16} />
          Save settings
        </button>
        {message ? <p className="text-sm text-[var(--muted)]">{message}</p> : null}
      </div>
    </form>
  );
}
