"use client";

import { Eye, EyeOff, Loader2 } from "lucide-react";
import { useState } from "react";

export type RecentVoucher = {
  id: string;
  label: string;
  status: string;
  durationMinutes: number;
  redeemedCount: number;
  maxRedemptions: number;
  codeAvailable: boolean;
};

type VoucherRevealState = {
  code?: string;
  error?: string;
  loading?: boolean;
  visible?: boolean;
};

export function RecentVouchersList({
  shopId,
  vouchers,
  table = false,
}: {
  shopId: string;
  vouchers: RecentVoucher[];
  table?: boolean;
}) {
  const [reveals, setReveals] = useState<Record<string, VoucherRevealState>>({});

  async function revealCode(voucher: RecentVoucher) {
    const current = reveals[voucher.id];
    if (current?.code) {
      setReveals((previous) => ({
        ...previous,
        [voucher.id]: { ...current, visible: !current.visible },
      }));
      return;
    }

    setReveals((previous) => ({
      ...previous,
      [voucher.id]: { loading: true, visible: true },
    }));

    const response = await fetch(`/api/staff/shops/${shopId}/vouchers/${voucher.id}/reveal`, {
      method: "GET",
      headers: { Accept: "application/json" },
    });
    const payload = (await response.json().catch(() => ({}))) as { plaintextCode?: string; error?: string };

    setReveals((previous) => ({
      ...previous,
      [voucher.id]: response.ok && payload.plaintextCode
        ? { code: payload.plaintextCode, visible: true }
        : { error: payload.error ?? "Code could not be shown.", visible: true },
    }));
  }

  if (vouchers.length === 0) {
    return <p className="text-sm text-[var(--muted)]">No vouchers created yet.</p>;
  }

  if (table) {
    return (
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-left text-sm">
          <thead className="bg-[var(--panel-strong)]">
            <tr>
              <th className="p-3 font-semibold">Label</th>
              <th className="p-3 font-semibold">Status</th>
              <th className="p-3 font-semibold">Uses</th>
              <th className="p-3 font-semibold">Minutes</th>
              <th className="p-3 font-semibold">Code</th>
            </tr>
          </thead>
          <tbody>
            {vouchers.map((voucher) => (
              <tr key={voucher.id} className="border-t border-[var(--border)] align-top">
                <td className="p-3 font-semibold">{voucher.label}</td>
                <td className="p-3">{voucher.status}</td>
                <td className="p-3">
                  {voucher.redeemedCount}/{voucher.maxRedemptions}
                </td>
                <td className="p-3">{voucher.durationMinutes}</td>
                <td className="p-3">
                  <VoucherCodeAction
                    voucher={voucher}
                    reveal={reveals[voucher.id]}
                    onReveal={() => void revealCode(voucher)}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <div className="mt-2 grid gap-2">
      {vouchers.map((voucher) => (
        <div key={voucher.id} className="border-b border-[var(--border)] py-2 text-sm last:border-0">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span>
              <strong>{voucher.label}</strong>
              <span className="text-[var(--muted)]"> / {voucher.durationMinutes} min</span>
            </span>
            <span className="text-[var(--muted)]">
              {voucher.redeemedCount}/{voucher.maxRedemptions}
            </span>
          </div>
          <div className="mt-2">
            <VoucherCodeAction
              voucher={voucher}
              reveal={reveals[voucher.id]}
              onReveal={() => void revealCode(voucher)}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function VoucherCodeAction({
  voucher,
  reveal,
  onReveal,
}: {
  voucher: RecentVoucher;
  reveal?: VoucherRevealState;
  onReveal: () => void;
}) {
  const canReveal = voucher.codeAvailable;
  const buttonLabel = reveal?.loading
    ? "Showing..."
    : reveal?.code && reveal.visible
      ? "Hide code"
      : "Show code";
  const Icon = reveal?.loading ? Loader2 : reveal?.code && reveal.visible ? EyeOff : Eye;

  return (
    <div className="grid gap-2">
      <button
        type="button"
        className="inline-flex w-fit items-center justify-center gap-2 rounded-md border border-[var(--border)] px-3 py-1.5 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-55"
        onClick={onReveal}
        disabled={!canReveal || reveal?.loading}
      >
        <Icon className={reveal?.loading ? "animate-spin" : ""} size={14} />
        {canReveal ? buttonLabel : "Code unavailable"}
      </button>
      {reveal?.code && reveal.visible ? (
        <p className="w-fit rounded-md bg-[var(--panel-strong)] px-3 py-2 font-mono text-base font-semibold tracking-[0.08em]">
          {reveal.code}
        </p>
      ) : null}
      {reveal?.error ? <p className="text-xs text-[var(--danger)]">{reveal.error}</p> : null}
      {!canReveal ? <p className="text-xs text-[var(--muted)]">This older voucher was created before code reveal was saved.</p> : null}
    </div>
  );
}
