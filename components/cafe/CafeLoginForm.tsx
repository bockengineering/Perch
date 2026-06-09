"use client";

import { LockKeyhole } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

type CafeLoginFormProps = {
  nextPath: string;
  error?: string;
  helpText: string;
};

function errorMessage(error?: string) {
  if (error === "invalid") {
    return "The email or password was not recognized, or this account is not assigned to a cafe.";
  }
  return null;
}

export function CafeLoginForm({ nextPath, error, helpText }: CafeLoginFormProps) {
  const [pending, setPending] = useState(false);
  const [stalled, setStalled] = useState(false);
  const [requestError, setRequestError] = useState<string | null>(null);
  const serverError = errorMessage(error);

  useEffect(() => {
    if (!pending) {
      return;
    }

    const timeout = window.setTimeout(() => setStalled(true), 8000);
    return () => window.clearTimeout(timeout);
  }, [pending]);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;

    setPending(true);
    setStalled(false);
    setRequestError(null);

    try {
      const response = await fetch(form.action, {
        method: form.method,
        body: new FormData(form),
      });

      window.location.assign(response.url || nextPath);
    } catch {
      setPending(false);
      setRequestError("We could not complete the login request. Check your connection and try again.");
    }
  }

  return (
    <form className="cafe-login-form" action="/api/cafe/login" method="post" onSubmit={submit}>
      <input type="hidden" name="next" value={nextPath} />
      <div className="login-form-heading">
        <LockKeyhole size={20} />
        <div>
          <h2>Cafe login</h2>
          <p>Use your Perch cafe owner or staff account.</p>
        </div>
      </div>

      {serverError ? (
        <p className="login-error" role="alert">
          {serverError}
        </p>
      ) : null}

      {requestError ? (
        <p className="login-error" role="alert">
          {requestError}
        </p>
      ) : null}

      {stalled ? (
        <p className="login-error" role="alert">
          The login request is taking longer than expected. Keep this page open or try again.
        </p>
      ) : null}

      <label className="form-field">
        <span>Email</span>
        <input name="email" type="email" autoComplete="email" required placeholder="owner@example.com" />
      </label>
      <label className="form-field">
        <span>Password</span>
        <input name="password" type="password" autoComplete="current-password" required placeholder="Password" />
      </label>
      <button className="primary-action" type="submit" disabled={pending} aria-busy={pending}>
        {pending ? "Signing in..." : "Sign in"}
      </button>
      <p className="login-help">{helpText}</p>
      <p className="login-help">
        New cafe?{" "}
        <Link className="login-inline-link" href="/cafe/signup">
          Sign up
        </Link>
        .
      </p>
    </form>
  );
}
