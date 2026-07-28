"use client";

import { Plus } from "lucide-react";
import { useState } from "react";

export function ShopCreateForm() {
  const [message, setMessage] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  async function submit(formData: FormData) {
    if (isCreating) {
      return;
    }

    setMessage(null);
    setIsCreating(true);

    try {
      const response = await fetch("/api/admin/shops", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.get("name"),
          slug: formData.get("slug"),
          timezone: formData.get("timezone"),
        }),
      });
      const payload = (await response.json().catch(() => ({}))) as { shopId?: string; error?: string };
      if (!response.ok || !payload.shopId) {
        setMessage(payload.error ?? "Shop could not be created.");
        setIsCreating(false);
        return;
      }
      window.location.href = `/admin/shops/${payload.shopId}`;
    } catch {
      setMessage("Shop could not be created. Check your connection and try again.");
      setIsCreating(false);
    }
  }

  return (
    <form action={submit} className="surface grid gap-3 p-4">
      <div className="grid gap-1">
        <label className="text-sm font-medium" htmlFor="name">
          Shop name
        </label>
        <input
          id="name"
          name="name"
          autoComplete="organization"
          className="rounded-md border border-[var(--border)] px-3 py-2"
          required
        />
      </div>
      <div className="grid gap-1">
        <label className="text-sm font-medium" htmlFor="slug">
          Portal slug
        </label>
        <input
          id="slug"
          name="slug"
          aria-describedby="slug-help"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
          placeholder="mockingbird-coffee"
          className="rounded-md border border-[var(--border)] px-3 py-2"
          required
        />
        <p id="slug-help" className="text-xs text-[var(--muted)]">
          Used in the guest portal address. Use lowercase letters, numbers, and hyphens.
        </p>
      </div>
      <div className="grid gap-1">
        <label className="text-sm font-medium" htmlFor="timezone">
          Timezone
        </label>
        <input
          id="timezone"
          name="timezone"
          defaultValue="America/Los_Angeles"
          className="rounded-md border border-[var(--border)] px-3 py-2"
          required
        />
      </div>
      <button
        className="inline-flex items-center justify-center gap-2 rounded-md bg-[var(--foreground)] px-4 py-2 text-sm font-semibold text-white"
        disabled={isCreating}
        aria-busy={isCreating}
      >
        <Plus size={16} />
        {isCreating ? "Creating shop..." : "Create shop"}
      </button>
      {message ? <p className="text-sm text-[var(--danger)]" role="alert">{message}</p> : null}
    </form>
  );
}
