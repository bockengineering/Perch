"use client";

import { Plus } from "lucide-react";
import { useState } from "react";

export function ShopCreateForm() {
  const [message, setMessage] = useState<string | null>(null);

  async function submit(formData: FormData) {
    setMessage(null);
    const response = await fetch("/api/admin/shops", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: formData.get("name"),
        slug: formData.get("slug"),
        timezone: formData.get("timezone"),
      }),
    });
    const payload = (await response.json()) as { shopId?: string; error?: string };
    if (!response.ok || !payload.shopId) {
      setMessage(payload.error ?? "Shop could not be created.");
      return;
    }
    window.location.href = `/admin/shops/${payload.shopId}`;
  }

  return (
    <form action={submit} className="surface grid gap-3 p-4">
      <div className="grid gap-1">
        <label className="text-sm font-medium" htmlFor="name">
          Shop name
        </label>
        <input id="name" name="name" className="rounded-md border border-[var(--border)] px-3 py-2" required />
      </div>
      <div className="grid gap-1">
        <label className="text-sm font-medium" htmlFor="slug">
          Portal slug
        </label>
        <input id="slug" name="slug" className="rounded-md border border-[var(--border)] px-3 py-2" required />
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
      <button className="inline-flex items-center justify-center gap-2 rounded-md bg-[var(--foreground)] px-4 py-2 text-sm font-semibold text-white">
        <Plus size={16} />
        Create shop
      </button>
      {message ? <p className="text-sm text-[var(--danger)]">{message}</p> : null}
    </form>
  );
}
