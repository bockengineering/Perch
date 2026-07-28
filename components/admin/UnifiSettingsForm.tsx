"use client";

import { Wifi } from "lucide-react";
import { useState } from "react";

type UniFiSite = {
  id: string;
  name: string;
};

export function UnifiSettingsForm({
  shopId,
  defaults,
}: {
  shopId: string;
  defaults: {
    apiBaseUrl?: string;
    siteId?: string;
    siteName?: string;
    allowedSsids?: string[];
  };
}) {
  const [message, setMessage] = useState<string | null>(null);
  const [messageIsError, setMessageIsError] = useState(false);
  const [pendingAction, setPendingAction] = useState<"test" | "save" | null>(null);
  const [sites, setSites] = useState<UniFiSite[]>(
    defaults.siteId ? [{ id: defaults.siteId, name: defaults.siteName ?? defaults.siteId }] : [],
  );
  const [selectedSiteId, setSelectedSiteId] = useState(defaults.siteId ?? "");
  const selectedSite = sites.find((site) => site.id === selectedSiteId);

  async function test(formData: FormData) {
    if (pendingAction) {
      return;
    }

    setMessage(null);
    setMessageIsError(false);
    setPendingAction("test");

    try {
      const response = await fetch(`/api/admin/shops/${shopId}/unifi/test`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          apiBaseUrl: formData.get("apiBaseUrl"),
          apiKey: formData.get("apiKey"),
        }),
      });
      const payload = (await response.json().catch(() => ({}))) as {
        sites?: Array<{ id: string; name: string }>;
        error?: string;
      };
      if (!response.ok) {
        setMessageIsError(true);
        setMessage(payload.error ?? "Connection failed.");
        return;
      }
      const nextSites = (payload.sites ?? []).filter((site) => site.id);
      setSites(nextSites);

      if (nextSites.length === 1) {
        setSelectedSiteId(nextSites[0].id);
        setMessage(`Connection worked. Perch matched this cafe to ${nextSites[0].name}.`);
        return;
      }

      const matchingSavedSite = nextSites.find((site) => site.id === selectedSiteId);
      setSelectedSiteId(matchingSavedSite?.id ?? "");
      setMessage(
        nextSites.length > 1
          ? "Connection worked. Choose the cafe location in UniFi, then save."
          : "Connection worked, but UniFi did not return a cafe location.",
      );
      setMessageIsError(nextSites.length === 0);
    } catch {
      setMessageIsError(true);
      setMessage("Perch could not reach UniFi. Check your connection and try again.");
    } finally {
      setPendingAction(null);
    }
  }

  async function save(formData: FormData) {
    if (pendingAction) {
      return;
    }

    setMessage(null);
    setMessageIsError(false);
    const siteId = String(formData.get("siteId") ?? "").trim();
    if (!siteId) {
      setMessageIsError(true);
      setMessage("Check the connection first so Perch can match this cafe to its UniFi location.");
      return;
    }
    setPendingAction("save");

    try {
      const response = await fetch(`/api/admin/shops/${shopId}/unifi/save`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          apiBaseUrl: formData.get("apiBaseUrl"),
          apiKey: formData.get("apiKey"),
          siteId,
          siteName: formData.get("siteName") || siteId,
          allowedSsids: String(formData.get("allowedSsids") ?? "")
            .split(",")
            .map((value) => value.trim())
            .filter(Boolean),
        }),
      });
      const payload = (await response.json().catch(() => ({}))) as { error?: string };
      setMessageIsError(!response.ok);
      setMessage(response.ok ? "UniFi settings saved." : payload.error ?? "UniFi settings could not be saved.");
    } catch {
      setMessageIsError(true);
      setMessage("UniFi settings could not be saved. Check your connection and try again.");
    } finally {
      setPendingAction(null);
    }
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
      {sites.length > 1 ? (
        <div className="grid gap-1">
          <label className="text-sm font-medium" htmlFor="siteId">
            Cafe location in UniFi
          </label>
          <select
            id="siteId"
            name="siteId"
            aria-describedby="siteId-help"
            value={selectedSiteId}
            onChange={(event) => setSelectedSiteId(event.target.value)}
            className="rounded-md border border-[var(--border)] px-3 py-2 text-sm"
            required
          >
            <option value="" disabled>
              Choose the cafe location
            </option>
            {sites.map((site) => (
              <option key={site.id} value={site.id}>
                {site.name}
              </option>
            ))}
          </select>
          <p id="siteId-help" className="text-xs text-[var(--muted)]">
            Pick the UniFi location that matches this cafe.
          </p>
        </div>
      ) : (
        <>
          <input name="siteId" type="hidden" value={selectedSiteId} readOnly />
          <div className="rounded-md border border-[var(--border)] bg-[var(--panel-strong)] px-3 py-2">
            <p className="text-sm font-medium">Cafe location in UniFi</p>
            <p className="text-sm text-[var(--muted)]">
              {selectedSite ? selectedSite.name : "Perch will fill this in when you check the connection."}
            </p>
          </div>
        </>
      )}
      <input name="siteName" type="hidden" value={selectedSite?.name ?? selectedSiteId} readOnly />
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
          disabled={pendingAction !== null}
          aria-busy={pendingAction === "test"}
          className="inline-flex items-center gap-2 rounded-md border border-[var(--border)] px-3 py-2 text-sm font-semibold"
        >
          <Wifi size={16} />
          {pendingAction === "test" ? "Checking..." : "Check connection"}
        </button>
        <button
          type="button"
          onClick={(event) => void save(new FormData(event.currentTarget.form ?? undefined))}
          disabled={pendingAction !== null}
          aria-busy={pendingAction === "save"}
          className="rounded-md bg-[var(--foreground)] px-3 py-2 text-sm font-semibold text-white"
        >
          {pendingAction === "save" ? "Saving..." : "Save"}
        </button>
      </div>
      {message ? (
        <p
          className={`text-sm ${messageIsError ? "text-[var(--danger)]" : "text-[var(--muted)]"}`}
          role={messageIsError ? "alert" : "status"}
        >
          {message}
        </p>
      ) : null}
    </form>
  );
}
