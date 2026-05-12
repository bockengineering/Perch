"use client";

import { Wifi } from "lucide-react";
import { useState } from "react";

export function UnifiSettingsForm({
  shopId,
  defaults,
}: {
  shopId: string;
  defaults: {
    apiBaseUrl?: string;
    siteId?: string;
    allowedSsids?: string[];
  };
}) {
  const [message, setMessage] = useState<string | null>(null);
  const [sites, setSites] = useState<Array<{ id: string; name: string }>>([]);

  async function test(formData: FormData) {
    setMessage(null);
    const response = await fetch(`/api/admin/shops/${shopId}/unifi/test`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        apiBaseUrl: formData.get("apiBaseUrl"),
        apiKey: formData.get("apiKey"),
      }),
    });
    const payload = (await response.json()) as { sites?: Array<{ id: string; name: string }>; error?: string };
    if (!response.ok) {
      setMessage(payload.error ?? "Connection failed.");
      return;
    }
    setSites(payload.sites ?? []);
    setMessage("Connection test passed.");
  }

  async function save(formData: FormData) {
    setMessage(null);
    const response = await fetch(`/api/admin/shops/${shopId}/unifi/save`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        apiBaseUrl: formData.get("apiBaseUrl"),
        apiKey: formData.get("apiKey"),
        siteId: formData.get("siteId"),
        siteName: formData.get("siteName") || formData.get("siteId"),
        allowedSsids: String(formData.get("allowedSsids") ?? "")
          .split(",")
          .map((value) => value.trim())
          .filter(Boolean),
      }),
    });
    const payload = (await response.json()) as { error?: string };
    setMessage(response.ok ? "UniFi settings saved." : payload.error ?? "UniFi settings could not be saved.");
  }

  return (
    <form className="grid gap-3">
      <div className="grid gap-1">
        <label className="text-sm font-medium" htmlFor="apiBaseUrl">
          API base URL
        </label>
        <input
          id="apiBaseUrl"
          name="apiBaseUrl"
          defaultValue={defaults.apiBaseUrl}
          className="rounded-md border border-[var(--border)] px-3 py-2 text-sm"
          required
        />
      </div>
      <div className="grid gap-1">
        <label className="text-sm font-medium" htmlFor="apiKey">
          API key
        </label>
        <input
          id="apiKey"
          name="apiKey"
          type="password"
          placeholder="Paste new key to test or save"
          className="rounded-md border border-[var(--border)] px-3 py-2 text-sm"
        />
      </div>
      <div className="grid gap-1">
        <label className="text-sm font-medium" htmlFor="siteId">
          Site ID
        </label>
        <input
          id="siteId"
          name="siteId"
          defaultValue={defaults.siteId}
          className="rounded-md border border-[var(--border)] px-3 py-2 text-sm"
          required
        />
      </div>
      <input name="siteName" type="hidden" defaultValue={sites[0]?.name ?? defaults.siteId} />
      <div className="grid gap-1">
        <label className="text-sm font-medium" htmlFor="allowedSsids">
          Allowed guest SSIDs
        </label>
        <input
          id="allowedSsids"
          name="allowedSsids"
          defaultValue={(defaults.allowedSsids ?? []).join(", ")}
          className="rounded-md border border-[var(--border)] px-3 py-2 text-sm"
        />
      </div>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={(event) => void test(new FormData(event.currentTarget.form ?? undefined))}
          className="inline-flex items-center gap-2 rounded-md border border-[var(--border)] px-3 py-2 text-sm font-semibold"
        >
          <Wifi size={16} />
          Test
        </button>
        <button
          type="button"
          onClick={(event) => void save(new FormData(event.currentTarget.form ?? undefined))}
          className="rounded-md bg-[var(--foreground)] px-3 py-2 text-sm font-semibold text-white"
        >
          Save
        </button>
      </div>
      {message ? <p className="text-sm text-[var(--muted)]">{message}</p> : null}
    </form>
  );
}
