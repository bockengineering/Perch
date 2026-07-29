"use client";

import { ArrowRight, CheckCircle2, MailPlus } from "lucide-react";
import { useRef, useState } from "react";

type SubmissionState =
  | { status: "idle"; message: null }
  | { status: "error" | "success"; message: string };

export function InviteRequestForm() {
  const [formVisible, setFormVisible] = useState(false);
  const [busy, setBusy] = useState(false);
  const [submission, setSubmission] = useState<SubmissionState>({
    status: "idle",
    message: null,
  });
  const nameInputRef = useRef<HTMLInputElement>(null);

  function showForm() {
    setFormVisible(true);
    window.requestAnimationFrame(() => nameInputRef.current?.focus());
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setSubmission({ status: "idle", message: null });

    const form = event.currentTarget;
    const formData = new FormData(form);

    try {
      const response = await fetch("/api/cafe/invite-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.get("name"),
          email: formData.get("email"),
          shopName: formData.get("shopName"),
          website: formData.get("website"),
        }),
      });
      const payload = (await response.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
      };

      if (!response.ok || !payload.ok) {
        setSubmission({
          status: "error",
          message: payload.error ?? "We could not send your request. Please try again.",
        });
        return;
      }

      form.reset();
      setSubmission({
        status: "success",
        message: "Your request is in. We’ll reach out soon.",
      });
    } catch {
      setSubmission({
        status: "error",
        message: "We could not send your request. Check your connection and try again.",
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="cafe-signup-form" aria-labelledby="signup-invite-heading">
      <div className="login-form-heading">
        <MailPlus size={20} />
        <div>
          <p className="eyebrow">Early access</p>
          <h2 id="signup-invite-heading">Cafe accounts are invitation-only.</h2>
        </div>
      </div>
      <p className="signup-lede">
        Tell us a little about you and your cafe. We’ll follow up personally to help you get Perch ready for guests.
      </p>

      {submission.status === "success" ? (
        <div className="invite-request-success" role="status">
          <CheckCircle2 size={22} aria-hidden="true" />
          <div>
            <strong>Thanks for your interest.</strong>
            <p>{submission.message}</p>
          </div>
        </div>
      ) : (
        <>
          {!formVisible ? (
            <div className="invite-request-actions">
              <button
                className="primary-action"
                type="button"
                aria-expanded="false"
                aria-controls="invite-request-fields"
                onClick={showForm}
              >
                Request an invite
                <ArrowRight size={16} aria-hidden="true" />
              </button>
              <a className="login-inline-link" href="/cafe/login">
                Already have an account? Sign in
              </a>
            </div>
          ) : (
            <form id="invite-request-fields" className="invite-request-form" onSubmit={submit}>
              {submission.status === "error" ? (
                <p className="login-error" role="alert">
                  {submission.message}
                </p>
              ) : null}

              <div className="signup-field-grid">
                <label className="form-field">
                  <span>Your name</span>
                  <input
                    ref={nameInputRef}
                    name="name"
                    autoComplete="name"
                    required
                    minLength={2}
                    maxLength={120}
                    placeholder="Alex Rivera"
                  />
                </label>
                <label className="form-field">
                  <span>Work email</span>
                  <input
                    name="email"
                    type="email"
                    inputMode="email"
                    autoComplete="email"
                    required
                    maxLength={180}
                    placeholder="owner@example.com"
                  />
                </label>
              </div>

              <label className="form-field">
                <span>Shop name</span>
                <input
                  name="shopName"
                  autoComplete="organization"
                  required
                  minLength={2}
                  maxLength={160}
                  placeholder="Juniper Coffee"
                />
              </label>

              <label className="invite-request-honeypot" aria-hidden="true">
                Website
                <input name="website" tabIndex={-1} autoComplete="off" />
              </label>

              <button className="primary-action" type="submit" disabled={busy}>
                {busy ? "Sending request..." : "Send request"}
                <ArrowRight size={16} aria-hidden="true" />
              </button>
              <p className="login-help">
                We’ll only use these details to follow up about your Perch invite.
              </p>
              <a className="login-inline-link" href="/cafe/login">
                Already have an account? Sign in
              </a>
            </form>
          )}
        </>
      )}
    </section>
  );
}
