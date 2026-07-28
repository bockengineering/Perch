"use client";

import { Plus, ShieldCheck } from "lucide-react";
import { useState } from "react";

type PlatformUser = {
  id: string;
  role: "PLATFORM_ADMIN";
  createdAt: Date | string;
  user: {
    id: string;
    email: string;
    name: string | null;
    supabaseUserId: string | null;
    lastLoginAt: Date | string | null;
  };
};

type PlatformAdminCreateFormProps = {
  platformUsers: PlatformUser[];
  supabaseAdminConfigured: boolean;
};

export function PlatformAdminCreateForm({
  platformUsers,
  supabaseAdminConfigured,
}: PlatformAdminCreateFormProps) {
  const [message, setMessage] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);

  async function submit(formData: FormData) {
    if (isAdding) {
      return;
    }

    setMessage(null);
    setIsAdding(true);
    const createSupabaseUser = formData.get("createSupabaseUser") === "on";
    try {
      const response = await fetch("/api/admin/platform-users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: formData.get("email"),
          name: formData.get("name") || null,
          password: formData.get("password") || undefined,
          createSupabaseUser,
        }),
      });

      const payload = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) {
        setMessage(payload.error ?? "Platform admin could not be created.");
        setIsAdding(false);
        return;
      }

      window.location.reload();
    } catch {
      setMessage("Platform admin could not be created. Check your connection and try again.");
      setIsAdding(false);
    }
  }

  return (
    <section className="surface grid gap-4 p-4">
      <div className="flex items-center gap-2">
        <ShieldCheck size={18} />
        <div>
          <h2 className="text-xl font-semibold">Platform admins</h2>
          <p className="text-sm text-[var(--muted)]">Create and review accounts that can operate all Perch shops.</p>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-left text-sm">
          <thead className="bg-[var(--panel-strong)]">
            <tr>
              <th className="p-3 font-semibold">User</th>
              <th className="p-3 font-semibold">Supabase</th>
              <th className="p-3 font-semibold">Last login</th>
            </tr>
          </thead>
          <tbody>
            {platformUsers.map((platformUser) => (
              <tr key={platformUser.id} className="border-t border-[var(--border)]">
                <td className="p-3">
                  <p className="font-semibold">{platformUser.user.name ?? platformUser.user.email}</p>
                  <p className="text-[var(--muted)]">{platformUser.user.email}</p>
                </td>
                <td className="p-3">{platformUser.user.supabaseUserId ? "Ready" : "Local only"}</td>
                <td className="p-3 text-[var(--muted)]">
                  {platformUser.user.lastLoginAt
                    ? new Date(platformUser.user.lastLoginAt).toLocaleString()
                    : "Never"}
                </td>
              </tr>
            ))}
            {platformUsers.length === 0 ? (
              <tr>
                <td className="p-3 text-[var(--muted)]" colSpan={3}>
                  No platform admins have been created yet.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      <form action={submit} className="grid gap-3 border-t border-[var(--border)] pt-4">
        <div className="grid gap-3 md:grid-cols-2">
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
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <label className="grid gap-1 text-sm font-medium">
            Temporary password
            <input
              name="password"
              type="password"
              minLength={8}
              className="rounded-md border border-[var(--border)] px-3 py-2 font-normal"
              placeholder={supabaseAdminConfigured ? "Required for new Supabase users" : "Local review mode only"}
            />
          </label>
          <label className="flex items-center gap-2 text-sm font-medium">
            <input
              name="createSupabaseUser"
              type="checkbox"
              defaultChecked={supabaseAdminConfigured}
              disabled={!supabaseAdminConfigured}
              className="account-checkbox"
            />
            Create Supabase Auth user
          </label>
        </div>

        {!supabaseAdminConfigured ? (
          <p className="text-sm text-[var(--warning)]">
            Supabase admin key is not configured. Accounts created here are local-only until linked to Supabase Auth.
          </p>
        ) : null}

        <div className="flex flex-wrap items-center gap-3">
          <button
            className="inline-flex items-center justify-center gap-2 rounded-md bg-[var(--foreground)] px-4 py-2 text-sm font-semibold text-white"
            disabled={isAdding}
            aria-busy={isAdding}
          >
            <Plus size={16} />
            {isAdding ? "Adding admin..." : "Add platform admin"}
          </button>
          {message ? <p className="text-sm text-[var(--danger)]" role="alert">{message}</p> : null}
        </div>
      </form>
    </section>
  );
}
