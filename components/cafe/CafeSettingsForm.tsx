"use client";

import { ExternalLink, Save } from "lucide-react";
import type { CSSProperties, ChangeEvent } from "react";
import { useState } from "react";

const logoFileTypes = new Set(["image/png", "image/jpeg", "image/webp"]);
const maxLogoFileBytes = 256 * 1024;
const usTimezoneOptions = [
  { value: "America/New_York", label: "Eastern time" },
  { value: "America/Chicago", label: "Central time" },
  { value: "America/Denver", label: "Mountain time" },
  { value: "America/Phoenix", label: "Arizona time" },
  { value: "America/Los_Angeles", label: "Pacific time" },
  { value: "America/Anchorage", label: "Alaska time" },
  { value: "Pacific/Honolulu", label: "Hawaii time" },
];

type CafeSettingsFormProps = {
  shop: {
    id: string;
    name: string;
    slug: string;
    timezone: string;
    status: string;
    freeMinutesPerDay: number;
    platformFeeBps?: number;
    supportEmail: string | null;
    brandLogoUrl: string | null;
    brandPrimaryColor: string | null;
  };
  allowPlatformFee?: boolean;
};

function logoBackgroundStyle(url: string): CSSProperties {
  return {
    backgroundImage: `url(${JSON.stringify(url)})`,
  };
}

function readLogoFile(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener("load", () => resolve(String(reader.result ?? "")));
    reader.addEventListener("error", () => reject(new Error("Logo could not be read.")));
    reader.readAsDataURL(file);
  });
}

function isEmbeddedLogo(url: string | null) {
  return Boolean(url?.startsWith("data:image/"));
}

function logoFileError(file: File) {
  if (!logoFileTypes.has(file.type)) {
    return "Upload a PNG, JPG, or WebP logo.";
  }
  if (file.size > maxLogoFileBytes) {
    return "Logo file must be 256 KB or smaller.";
  }
  return null;
}

export function CafeSettingsForm({ shop, allowPlatformFee = false }: CafeSettingsFormProps) {
  const [message, setMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [logoValue, setLogoValue] = useState(shop.brandLogoUrl ?? "");
  const [logoUrlInput, setLogoUrlInput] = useState(isEmbeddedLogo(shop.brandLogoUrl) ? "" : (shop.brandLogoUrl ?? ""));
  const [logoInputKey, setLogoInputKey] = useState(0);

  async function handleLogoUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }
    const validationError = logoFileError(file);
    if (validationError) {
      setMessage(validationError);
      event.target.value = "";
      return;
    }

    try {
      const dataUrl = await readLogoFile(file);
      setLogoValue(dataUrl);
      setLogoUrlInput("");
      setMessage(`${file.name} selected.`);
    } catch {
      setMessage("Logo could not be uploaded.");
      event.target.value = "";
    }
  }

  function handleLogoUrlChange(value: string) {
    setLogoUrlInput(value);
    setLogoValue(value.trim());
    setLogoInputKey((current) => current + 1);
  }

  function clearLogo() {
    setLogoValue("");
    setLogoUrlInput("");
    setLogoInputKey((current) => current + 1);
  }

  async function submit(formData: FormData) {
    if (isSaving) {
      return;
    }

    setIsSaving(true);
    setMessage("Saving settings...");
    let nextLogoValue = logoValue;
    const logoFile = formData.get("brandLogoFile");
    if (logoFile instanceof File && logoFile.size > 0) {
      const validationError = logoFileError(logoFile);
      if (validationError) {
        setMessage(validationError);
        setIsSaving(false);
        return;
      }

      try {
        nextLogoValue = await readLogoFile(logoFile);
      } catch {
        setMessage("Logo could not be uploaded.");
        setIsSaving(false);
        return;
      }
    }

    const requestBody = {
      name: formData.get("name"),
      timezone: formData.get("timezone"),
      status: formData.get("status"),
      freeMinutesPerDay: Number(formData.get("freeMinutesPerDay")),
      supportEmail: formData.get("supportEmail") || null,
      brandLogoUrl: nextLogoValue || null,
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
      setIsSaving(false);
      return;
    }

    setMessage("Settings saved. Refreshing...");
    window.setTimeout(() => window.location.reload(), 900);
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
          <select
            name="timezone"
            defaultValue={shop.timezone}
            className="rounded-md border border-[var(--border)] bg-white px-3 py-2 font-normal"
            required
          >
            {usTimezoneOptions.some((option) => option.value === shop.timezone) ? null : (
              <option value={shop.timezone}>{shop.timezone}</option>
            )}
            {usTimezoneOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
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
        <div className="grid gap-2">
          <label className="grid gap-1 text-sm font-medium">
            Cafe logo
            <input
              key={logoInputKey}
              name="brandLogoFile"
              type="file"
              accept="image/png,image/jpeg,image/webp"
              onChange={handleLogoUpload}
              className="rounded-md border border-[var(--border)] px-3 py-2 font-normal"
            />
          </label>
          <label className="grid gap-1 text-sm font-medium">
            Logo URL
            <input
              name="brandLogoUrl"
              type="url"
              value={logoUrlInput}
              onChange={(event) => handleLogoUrlChange(event.target.value)}
              placeholder="https://example.com/logo.svg"
              className="rounded-md border border-[var(--border)] px-3 py-2 font-normal"
            />
          </label>
          {logoValue ? (
            <div className="flex flex-wrap items-center gap-3">
              <span
                className="portal-brand-logo"
                role="img"
                aria-label={`${shop.name} logo preview`}
                style={logoBackgroundStyle(logoValue)}
              />
              <button
                type="button"
                className="rounded-md border border-[var(--border)] bg-white px-3 py-2 text-sm font-semibold"
                onClick={clearLogo}
              >
                Clear logo
              </button>
            </div>
          ) : null}
        </div>
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
        <button
          className="inline-flex items-center justify-center gap-2 rounded-md bg-[var(--foreground)] px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
          disabled={isSaving}
        >
          <Save size={16} />
          {isSaving ? "Saving..." : "Save settings"}
        </button>
        <a
          href={`/p/${shop.slug}?preview=payment`}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center justify-center gap-2 rounded-md border border-[var(--border)] bg-white px-4 py-2 text-sm font-semibold"
        >
          <ExternalLink size={16} />
          View payment portal
        </a>
        {message ? <p className="text-sm text-[var(--muted)]">{message}</p> : null}
      </div>
    </form>
  );
}
