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
          UniFi web address
        </label>
        <input
          id="apiBaseUrl"
          name="apiBaseUrl"
          aria-describedby="apiBaseUrl-help"
          defaultValue={defaults.apiBaseUrl}
          className="rounded-md border border-[var(--border)] px-3 py-2 text-sm"
          placeholder="https://unifi.example.com"
          required
        />
        <p id="apiBaseUrl-help" className="text-xs text-[var(--muted)]">
          This is the web address for the cafe&apos;s UniFi Network app.
        </p>
      </div>
      <div className="grid gap-1">
        <label className="text-sm font-medium" htmlFor="apiKey">
          UniFi access key
        </label>
        <input
          id="apiKey"
          name="apiKey"
          type="password"
          aria-describedby="apiKey-help"
          placeholder={defaults.apiBaseUrl ? "Leave blank to keep the saved key" : "Paste UniFi access key"}
          className="rounded-md border border-[var(--border)] px-3 py-2 text-sm"
        />
        <p id="apiKey-help" className="text-xs text-[var(--muted)]">
          Perch uses this to approve guests on the Wi-Fi network.
        </p>
      </div>
      <div className="grid gap-1">
        <label className="text-sm font-medium" htmlFor="siteId">
          UniFi site
        </label>
        <input
          id="siteId"
          name="siteId"
          aria-describedby="siteId-help"
          defaultValue={defaults.siteId}
          className="rounded-md border border-[var(--border)] px-3 py-2 text-sm"
          placeholder="default"
          required
        />
        <p id="siteId-help" className="text-xs text-[var(--muted)]">
          Use the site for this cafe. Many UniFi accounts use default.
        </p>
      </div>
      <input name="siteName" type="hidden" defaultValue={sites[0]?.name ?? defaults.siteId} />
      <div className="grid gap-1">
        <label className="text-sm font-medium" htmlFor="allowedSsids">
          Guest Wi-Fi names
        </label>
        <input
          id="allowedSsids"
          name="allowedSsids"
          aria-describedby="allowedSsids-help"
          defaultValue={(defaults.allowedSsids ?? []).join(", ")}
          className="rounded-md border border-[var(--border)] px-3 py-2 text-sm"
          placeholder="Guest WiFi, Patio WiFi"
        />
        <p id="allowedSsids-help" className="text-xs text-[var(--muted)]">
          Enter the network names customers see. Use commas for more than one.
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={(event) => void test(new FormData(event.currentTarget.form ?? undefined))}
          className="inline-flex items-center gap-2 rounded-md border border-[var(--border)] px-3 py-2 text-sm font-semibold"
        >
          <Wifi size={16} />
          Check connection
        </button>
        <button
          type="button"
          onClick={(event) => void save(new FormData(event.currentTarget.form ?? undefined))}
          className="rounded-md bg-[var(--foreground)] px-3 py-2 text-sm font-semibold text-white"
        >
          Save
        </button>
      </div>
      {message ? <p className="text-sm text-[var(--muted)]" role="status">{message}</p> : null}
    </form>
  );
}
