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
    platformFeeBps?: number;
    supportEmail: string | null;
    brandLogoUrl: string | null;
    brandPrimaryColor: string | null;
  };
  allowPlatformFee?: boolean;
};

export function CafeSettingsForm({ shop, allowPlatformFee = false }: CafeSettingsFormProps) {
  const [message, setMessage] = useState<string | null>(null);

  async function submit(formData: FormData) {
    setMessage(null);
    const requestBody = {
      name: formData.get("name"),
      timezone: formData.get("timezone"),
      status: formData.get("status"),
      freeMinutesPerDay: Number(formData.get("freeMinutesPerDay")),
      checkoutGraceMinutes: Number(formData.get("checkoutGraceMinutes")),
      maxCheckoutGracePerDay: Number(formData.get("maxCheckoutGracePerDay")),
      supportEmail: formData.get("supportEmail") || null,
      brandLogoUrl: formData.get("brandLogoUrl") || null,
      brandPrimaryColor: formData.get("brandPrimaryColor") || null,
      ...(allowPlatformFee ? { platformFeeBps: Number(formData.get("platformFeeBps")) } : {}),
    };
    const response = await fetch(`/api/admin/shops/${shop.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestBody),
    });

    const responsePayload = (await response.json().catch(() => ({}))) as { error?: string };
    if (!response.ok) {
      setMessage(responsePayload.error ?? "Settings could not be saved.");
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

      {allowPlatformFee ? (
        <label className="grid gap-1 text-sm font-medium">
          Platform fee bps
          <input
            name="platformFeeBps"
            type="number"
            min="0"
            max="10000"
            defaultValue={shop.platformFeeBps ?? 5000}
            className="rounded-md border border-[var(--border)] px-3 py-2 font-normal"
            required
          />
        </label>
      ) : null}

      <label className="grid gap-1 text-sm font-medium">
        Support email
        <input
          name="supportEmail"
          type="email"
          defaultValue={shop.supportEmail ?? ""}
          className="rounded-md border border-[var(--border)] px-3 py-2 font-normal"
        />
      </label>

      <div className="grid gap-3 md:grid-cols-[1fr_180px]">
        <label className="grid gap-1 text-sm font-medium">
          Cafe logo URL
          <input
            name="brandLogoUrl"
            type="url"
            defaultValue={shop.brandLogoUrl ?? ""}
            placeholder="https://example.com/logo.svg"
            className="rounded-md border border-[var(--border)] px-3 py-2 font-normal"
          />
        </label>
        <label className="grid gap-1 text-sm font-medium">
          Portal color
          <input
            name="brandPrimaryColor"
            type="color"
            defaultValue={shop.brandPrimaryColor ?? "#080808"}
            className="brand-color-input rounded-md border border-[var(--border)] px-3 py-2 font-normal"
          />
        </label>
      </div>

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
