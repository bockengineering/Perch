"use client";

import { ArrowRight, CheckCircle2 } from "lucide-react";
import { useMemo, useState } from "react";

function slugifyPreview(value: string) {
  return (
    value
      .trim()
      .toLowerCase()
      .replace(/['"]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 48)
      .replace(/-+$/g, "") || "your-cafe"
  );
}

export function CafeSignupForm() {
  const [cafeName, setCafeName] = useState("");
  const [preferredSlug, setPreferredSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const portalSlug = useMemo(() => slugifyPreview(cafeName), [cafeName]);
  const visibleSlug = slugTouched ? preferredSlug : portalSlug;

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage(null);

    const formData = new FormData(event.currentTarget);
    const response = await fetch("/api/cafe/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        cafeName: formData.get("cafeName"),
        ownerName: formData.get("ownerName"),
        ownerEmail: formData.get("ownerEmail"),
        password: formData.get("password"),
        timezone: formData.get("timezone"),
        supportEmail: formData.get("supportEmail"),
        brandPrimaryColor: formData.get("brandPrimaryColor"),
        preferredSlug: formData.get("preferredSlug") || portalSlug,
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
        <CheckCircle2 size={20} />
        <div>
          <h2>Create cafe console</h2>
          <p>Start in draft mode, then connect Stripe and UniFi before going live.</p>
        </div>
      </div>

      {message ? (
        <p className="login-error" role="alert">
          {message}
        </p>
      ) : null}

      <div className="signup-field-grid">
        <label className="form-field">
          <span>Cafe name</span>
          <input
            name="cafeName"
            value={cafeName}
            onChange={(event) => {
              setCafeName(event.target.value);
              if (!slugTouched) {
                setPreferredSlug(slugifyPreview(event.target.value));
              }
            }}
            required
            minLength={2}
            maxLength={120}
            placeholder="Mockingbird Coffee"
          />
        </label>
        <label className="form-field">
          <span>Portal slug</span>
          <input
            name="preferredSlug"
            value={visibleSlug}
            onChange={(event) => {
              setSlugTouched(true);
              setPreferredSlug(slugifyPreview(event.target.value));
            }}
            placeholder={portalSlug}
            pattern="[a-z0-9-]+"
          />
        </label>
      </div>

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

      <div className="signup-field-grid">
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
        <label className="form-field">
          <span>Timezone</span>
          <select name="timezone" defaultValue="America/Los_Angeles" required>
            <option value="America/Los_Angeles">Pacific time</option>
            <option value="America/Denver">Mountain time</option>
            <option value="America/Chicago">Central time</option>
            <option value="America/New_York">Eastern time</option>
            <option value="America/Phoenix">Arizona time</option>
            <option value="Pacific/Honolulu">Hawaii time</option>
          </select>
        </label>
      </div>

      <div className="signup-field-grid">
        <label className="form-field">
          <span>Support email</span>
          <input name="supportEmail" type="email" placeholder="wifi@example.com" />
        </label>
        <label className="form-field">
          <span>Portal color</span>
          <input name="brandPrimaryColor" type="color" defaultValue="#35684e" className="brand-color-input" />
        </label>
      </div>

      <div className="signup-defaults">
        <p>Created automatically</p>
        <div>
          <span>60 free minutes per local day</span>
          <span>$5 / 2 more hours</span>
          <span>$8 / all day</span>
        </div>
      </div>

      <button className="primary-action" type="submit" disabled={busy}>
        {busy ? "Creating cafe..." : "Create cafe console"}
        <ArrowRight size={16} />
      </button>
      <p className="login-help">
        Your cafe starts in draft mode. Guests will not use it until you activate the shop and connect UniFi.
      </p>
    </form>
  );
}
