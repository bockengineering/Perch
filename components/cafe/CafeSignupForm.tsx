"use client";

import { ArrowRight, UserPlus } from "lucide-react";
import { useState } from "react";

export function CafeSignupForm() {
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage(null);

    const formData = new FormData(event.currentTarget);
    const response = await fetch("/api/cafe/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ownerName: formData.get("ownerName"),
        ownerEmail: formData.get("ownerEmail"),
        password: formData.get("password"),
      }),
    });
    const payload = (await response.json().catch(() => ({}))) as { redirectTo?: string; error?: string };

    if (!response.ok || !payload.redirectTo) {
      setBusy(false);
      setMessage(payload.error ?? "Cafe signup failed.");
      return;
    }

    window.location.href = payload.redirectTo;
  }

  return (
    <form className="cafe-signup-form" onSubmit={submit}>
      <div className="login-form-heading">
        <UserPlus size={20} />
        <div>
          <h2>Sign up</h2>
          <p>Create your Perch account. You will set up the cafe console next.</p>
        </div>
      </div>

      {message ? (
        <p className="login-error" role="alert">
          {message}
        </p>
      ) : null}

      <div className="signup-field-grid">
        <label className="form-field">
          <span>Your name</span>
          <input name="ownerName" required minLength={2} maxLength={120} placeholder="Alex Rivera" />
        </label>
        <label className="form-field">
          <span>Work email</span>
          <input name="ownerEmail" type="email" autoComplete="email" required placeholder="owner@example.com" />
        </label>
      </div>

      <label className="form-field">
        <span>Password</span>
        <input
          name="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          placeholder="At least 8 characters"
        />
      </label>

      <button className="primary-action" type="submit" disabled={busy}>
        {busy ? "Creating account..." : "Sign up"}
        <ArrowRight size={16} />
      </button>
      <p className="login-help">
        After signup, we will walk you through creating the cafe console, pricing, Stripe, and UniFi setup.
      </p>
    </form>
  );
}
