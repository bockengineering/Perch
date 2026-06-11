"use client";

import { ArrowRight } from "lucide-react";
import { useState } from "react";

export function CafeConsoleSetupForm({ ownerEmail }: { ownerEmail: string }) {
  const [cafeName, setCafeName] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage(null);

    const formData = new FormData(event.currentTarget);
    const response = await fetch("/api/cafe/onboarding/create-console", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        cafeName: formData.get("cafeName"),
        timezone: formData.get("timezone"),
        supportEmail: formData.get("supportEmail"),
        brandPrimaryColor: formData.get("brandPrimaryColor"),
      }),
    });
    const payload = (await response.json().catch(() => ({}))) as { redirectTo?: string; error?: string };

    if (!response.ok || !payload.redirectTo) {
      setBusy(false);
      setMessage(payload.error ?? "Console setup failed.");
      return;
    }

    window.location.href = payload.redirectTo;
  }

  return (
    <form className="cafe-signup-form" onSubmit={submit}>
      <div className="login-form-heading">
        <div className="onboarding-step-number">1</div>
        <div>
          <h2>Create your cafe console</h2>
          <p>This creates a draft workspace. Guests will not see it until you activate the cafe.</p>
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
            onChange={(event) => setCafeName(event.target.value)}
            required
            minLength={2}
            maxLength={120}
            placeholder="Mockingbird Coffee"
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
          <input name="supportEmail" type="email" placeholder={ownerEmail} />
        </label>
      </div>

      <label className="form-field">
        <span>Portal color</span>
        <input name="brandPrimaryColor" type="color" defaultValue="#35684e" className="brand-color-input" />
      </label>

      <div className="signup-defaults">
        <p>Default policy</p>
        <div>
          <span>60 free minutes per local day</span>
          <span>$5 / 2 more hours</span>
          <span>$8 / all day</span>
          <span>Draft until you activate it</span>
        </div>
      </div>

      <button className="primary-action" type="submit" disabled={busy}>
        {busy ? "Creating console..." : "Create cafe console"}
        <ArrowRight size={16} />
      </button>
    </form>
  );
}
