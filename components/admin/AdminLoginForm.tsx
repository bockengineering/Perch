"use client";

import { LockKeyhole } from "lucide-react";
import { useEffect, useState } from "react";

type AdminLoginFormProps = {
  nextPath: string;
  error?: string;
  helpText: string;
};

function errorMessage(error?: string) {
  if (error === "server") {
    return "We could not complete the login request. Refresh the shared Vercel link, then try again.";
  }
  if (error === "invalid") {
    return "The email or password was not recognized, or this account is not a platform admin.";
  }
  return null;
}

export function AdminLoginForm({ nextPath, error, helpText }: AdminLoginFormProps) {
  const [pending, setPending] = useState(false);
  const [stalled, setStalled] = useState(false);
  const serverError = errorMessage(error);

  useEffect(() => {
    if (!pending) {
      return;
    }

    const timeout = window.setTimeout(() => setStalled(true), 8000);
    return () => window.clearTimeout(timeout);
  }, [pending]);

  return (
    <form className="cafe-login-form" action="/api/admin/login" method="post" onSubmit={() => setPending(true)}>
      <input type="hidden" name="next" value={nextPath} />
      <div className="login-form-heading">
        <LockKeyhole size={20} />
        <div>
          <h2>Admin login</h2>
          <p>Use your Perch platform admin account.</p>
        </div>
      </div>

      {serverError ? (
        <p className="login-error" role="alert">
          {serverError}
        </p>
      ) : null}

      {stalled ? (
        <p className="login-error" role="alert">
          The login request is taking too long. Refresh the Vercel share link and try again.
        </p>
      ) : null}

      <label className="form-field">
        <span>Email</span>
        <input name="email" type="email" autoComplete="email" required placeholder="admin@example.com" />
      </label>
      <label className="form-field">
        <span>Password</span>
        <input name="password" type="password" autoComplete="current-password" required placeholder="Password" />
      </label>
      <button className="primary-action" type="submit" disabled={pending}>
        {pending ? "Signing in..." : "Sign in"}
      </button>
      <p className="login-help">{helpText}</p>
    </form>
  );
}
