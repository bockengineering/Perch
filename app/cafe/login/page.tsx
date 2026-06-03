import { Coffee, LockKeyhole, ReceiptText, Ticket } from "lucide-react";
import { cookies } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
import { BrandWordmark } from "@/components/BrandWordmark";
import {
  CAFE_SESSION_COOKIE_NAME,
  safeCafeRedirectPath,
  verifyCafeSessionCookie,
} from "@/lib/auth/cafe-session";
import { hostedPreviewCafeCredentials, hostedPreviewDemoEnabled } from "@/lib/auth/hosted-preview";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams?: Promise<{ error?: string; next?: string }>;
};

export default async function CafeLoginPage({ searchParams }: PageProps) {
  const params = (await searchParams) ?? {};
  const nextPath = safeCafeRedirectPath(params.next);
  const session = await verifyCafeSessionCookie((await cookies()).get(CAFE_SESSION_COOKIE_NAME)?.value);

  if (session) {
    redirect(nextPath);
  }
  const previewDemo = hostedPreviewDemoEnabled();

  return (
    <main className="cafe-login-page">
      <section className="cafe-login-shell">
        <div className="cafe-login-copy">
          <div className="brand-lockup">
            <BrandWordmark className="brand-lockup-wordmark" width={132} height={58} priority />
          </div>
          <p className="eyebrow">Cafe console</p>
          <h1>Sign in to manage Wi-Fi revenue, settings, and staff codes.</h1>
          <div className="login-proof-grid">
            <div>
              <ReceiptText size={18} />
              <span>View paid passes and cafe share.</span>
            </div>
            <div>
              <Ticket size={18} />
              <span>Create staff codes from the counter.</span>
            </div>
            <div>
              <Coffee size={18} />
              <span>Adjust free access and support details.</span>
            </div>
          </div>
        </div>

        <form className="cafe-login-form" action="/api/cafe/login" method="post">
          <input type="hidden" name="next" value={nextPath} />
          <div className="login-form-heading">
            <LockKeyhole size={20} />
            <div>
              <h2>Cafe login</h2>
              <p>Use the credentials assigned to this cafe.</p>
            </div>
          </div>

          {params.error === "invalid" ? (
            <p className="login-error" role="alert">
              The email or password was not recognized, or this account is not assigned to a cafe.
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
          <button className="primary-action" type="submit">
            Sign in
          </button>
          <p className="login-help">
            {previewDemo
              ? `Preview demo: ${hostedPreviewCafeCredentials.email} / ${hostedPreviewCafeCredentials.password}`
              : "Use the cafe owner or staff account assigned to this cafe."}
          </p>
          <p className="login-help">
            New cafe? <Link className="login-inline-link" href="/cafe/signup">Create a cafe console</Link>.
          </p>
        </form>
      </section>
    </main>
  );
}
