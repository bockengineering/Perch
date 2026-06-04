"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Power, ShieldCheck } from "lucide-react";

type EmergencyFreeAccessControlProps = {
  shopId: string;
  emergencyFreeUntil: string | null;
  timezone: string;
};

function formatUntil(value: string | null, timezone: string) {
  if (!value) {
    return null;
  }

  return new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  }).format(new Date(value));
}

export function EmergencyFreeAccessControl({
  shopId,
  emergencyFreeUntil,
  timezone,
}: EmergencyFreeAccessControlProps) {
  const router = useRouter();
  const [pendingAction, setPendingAction] = useState<"enable" | "disable" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const isActive = emergencyFreeUntil ? new Date(emergencyFreeUntil) > new Date() : false;
  const untilText = useMemo(() => formatUntil(emergencyFreeUntil, timezone), [emergencyFreeUntil, timezone]);

  async function setEmergencyFree(enabled: boolean) {
    setPendingAction(enabled ? "enable" : "disable");
    setError(null);

    try {
      const response = await fetch(`/api/cafe/shops/${shopId}/emergency-free`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled }),
      });
      const payload = (await response.json().catch(() => null)) as { error?: string } | null;

      if (!response.ok) {
        throw new Error(payload?.error ?? "Emergency free access could not be updated.");
      }

      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Emergency free access could not be updated.");
    } finally {
      setPendingAction(null);
    }
  }

  return (
    <div className="grid gap-4 rounded-md border border-[var(--border)] bg-white p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className="rounded-md border border-[var(--border)] p-2">
            {isActive ? <ShieldCheck size={18} /> : <AlertTriangle size={18} />}
          </span>
          <div>
            <p className="font-semibold">{isActive ? "Free access is on" : "Emergency free access is off"}</p>
            <p className="mt-1 text-sm text-[var(--muted)]">
              {isActive && untilText
                ? `Guests on allowed SSIDs are free until ${untilText}.`
                : "Use this if payments, Stripe, or guest support are blocking the line."}
            </p>
          </div>
        </div>
        <span className={`status-pill ${isActive ? "status-ok" : "status-warning"}`}>
          {isActive ? "On" : "Off"}
        </span>
      </div>

      {error ? <p className="text-sm font-semibold text-red-700">{error}</p> : null}

      <div className="flex flex-wrap gap-2">
        {isActive ? (
          <button
            type="button"
            onClick={() => void setEmergencyFree(false)}
            disabled={pendingAction !== null}
            className="inline-flex items-center justify-center gap-2 rounded-md border border-[var(--border)] px-4 py-2 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Power size={16} />
            {pendingAction === "disable" ? "Turning off..." : "Turn off"}
          </button>
        ) : (
          <button
            type="button"
            onClick={() => void setEmergencyFree(true)}
            disabled={pendingAction !== null}
            className="inline-flex items-center justify-center gap-2 rounded-md bg-[var(--foreground)] px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
          >
            <ShieldCheck size={16} />
            {pendingAction === "enable" ? "Turning on..." : "Make Wi-Fi free until midnight"}
          </button>
        )}
      </div>
    </div>
  );
}
