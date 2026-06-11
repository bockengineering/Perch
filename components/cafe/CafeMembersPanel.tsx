"use client";

import { Plus, ShieldCheck } from "lucide-react";
import { useState } from "react";

type CafeMember = {
  id: string;
  role: "SHOP_OWNER" | "STAFF";
  user: {
    id: string;
    email: string;
    name: string | null;
    loginReady: boolean;
    lastLoginAt: string | null;
  };
};

type CafeMembersPanelProps = {
  shopId: string;
  members: CafeMember[];
  accountProvisioningConfigured: boolean;
};

export function CafeMembersPanel({ shopId, members, accountProvisioningConfigured }: CafeMembersPanelProps) {
  const [message, setMessage] = useState<string | null>(null);

  async function submit(formData: FormData) {
    setMessage(null);
    const createPortalLogin = formData.get("createPortalLogin") === "on";
    const response = await fetch(`/api/admin/shops/${shopId}/members`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: formData.get("email"),
        name: formData.get("name") || null,
        role: formData.get("role"),
        password: formData.get("password") || undefined,
        createPortalLogin,
      }),
    });

    const payload = (await response.json().catch(() => ({}))) as { error?: string };
    if (!response.ok) {
      setMessage(payload.error ?? "Account could not be created.");
      return;
    }

    window.location.reload();
  }

  return (
    <div className="surface grid gap-4 p-4">
      <div className="flex items-center gap-2">
        <ShieldCheck size={18} />
        <div>
          <h2 className="text-xl font-semibold">Cafe accounts</h2>
          <p className="text-sm text-[var(--muted)]">Manage who can access this cafe console.</p>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-left text-sm">
          <thead className="bg-[var(--panel-strong)]">
            <tr>
              <th className="p-3 font-semibold">User</th>
              <th className="p-3 font-semibold">Role</th>
              <th className="p-3 font-semibold">Login</th>
              <th className="p-3 font-semibold">Last login</th>
            </tr>
          </thead>
          <tbody>
            {members.map((member) => (
              <tr key={member.id} className="border-t border-[var(--border)]">
                <td className="p-3">
                  <p className="font-semibold">{member.user.name ?? member.user.email}</p>
                  <p className="text-[var(--muted)]">{member.user.email}</p>
                </td>
                <td className="p-3">{member.role}</td>
                <td className="p-3">{member.user.loginReady ? "READY" : "LOCAL ONLY"}</td>
                <td className="p-3 text-[var(--muted)]">
                  {member.user.lastLoginAt ? new Date(member.user.lastLoginAt).toLocaleString() : "Never"}
                </td>
              </tr>
            ))}
            {members.length === 0 ? (
              <tr>
                <td className="p-3 text-[var(--muted)]" colSpan={4}>
                  No cafe accounts have been assigned yet.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      <form action={submit} className="grid gap-3 border-t border-[var(--border)] pt-4">
        <div className="grid gap-3 md:grid-cols-3">
          <label className="grid gap-1 text-sm font-medium">
            Email
            <input
              name="email"
              type="email"
              className="rounded-md border border-[var(--border)] px-3 py-2 font-normal"
              required
            />
          </label>
          <label className="grid gap-1 text-sm font-medium">
            Name
            <input name="name" className="rounded-md border border-[var(--border)] px-3 py-2 font-normal" />
          </label>
          <label className="grid gap-1 text-sm font-medium">
            Role
            <select
              name="role"
              defaultValue="STAFF"
              className="rounded-md border border-[var(--border)] bg-white px-3 py-2 font-normal"
            >
              <option value="SHOP_OWNER">Shop owner</option>
              <option value="STAFF">Staff</option>
            </select>
          </label>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <label className="grid gap-1 text-sm font-medium">
            Temporary password
            <input
              name="password"
              type="password"
              minLength={8}
              className="rounded-md border border-[var(--border)] px-3 py-2 font-normal"
              placeholder={accountProvisioningConfigured ? "Required for new portal logins" : "Local review mode only"}
            />
          </label>
          <label className="flex items-center gap-2 text-sm font-medium">
            <input
              name="createPortalLogin"
              type="checkbox"
              defaultChecked={accountProvisioningConfigured}
              disabled={!accountProvisioningConfigured}
              className="account-checkbox"
            />
            Create portal login
          </label>
        </div>

        {!accountProvisioningConfigured ? (
          <p className="text-sm text-[var(--warning)]">
            Account provisioning is not configured. Accounts created here are local-only for backend review.
          </p>
        ) : null}

        <div className="flex flex-wrap items-center gap-3">
          <button className="inline-flex items-center justify-center gap-2 rounded-md bg-[var(--foreground)] px-4 py-2 text-sm font-semibold text-white">
            <Plus size={16} />
            Add account
          </button>
          {message ? <p className="text-sm text-[var(--danger)]">{message}</p> : null}
        </div>
      </form>
    </div>
  );
}
