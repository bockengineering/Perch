import { Activity, LockKeyhole, ReceiptText, Store } from "lucide-react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { BrandWordmark } from "@/components/BrandWordmark";
import {
  getPlatformLoginCredentials,
  PLATFORM_SESSION_COOKIE_NAME,
  platformFallbackLoginConfigured,
  safeAdminRedirectPath,
  verifyPlatformSessionCookie,
} from "@/lib/auth/platform-session";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams?: Promise<{ error?: string; next?: string }>;
};

export default async function AdminLoginPage({ searchParams }: PageProps) {
  const params = (await searchParams) ?? {};
  const nextPath = safeAdminRedirectPath(params.next);
  const session = await verifyPlatformSessionCookie((await cookies()).get(PLATFORM_SESSION_COOKIE_NAME)?.value);

  if (session) {
    redirect(nextPath);
  }

  const localFallback = process.env.NODE_ENV !== "production" && platformFallbackLoginConfigured();
  const localCredentials = getPlatformLoginCredentials();

  return (
    <main className="cafe-login-page">
      <section className="cafe-login-shell">
        <div className="cafe-login-copy">
          <div className="brand-lockup">
            <BrandWordmark className="brand-lockup-wordmark" width={132} height={58} priority />
          </div>
          <p className="eyebrow">Platform admin</p>
          <h1>Operate shops, revenue, and access health from one console.</h1>
          <div className="login-proof-grid">
            <div>
              <Store size={18} />
              <span>Manage cafe settings and integrations.</span>
            </div>
            <div>
              <ReceiptText size={18} />
              <span>Review paid passes, fees, and cafe share.</span>
            </div>
            <div>
              <Activity size={18} />
              <span>Track failed authorizations and webhook issues.</span>
            </div>
          </div>
        </div>

        <form className="cafe-login-form" action="/api/admin/login" method="post">
          <input type="hidden" name="next" value={nextPath} />
          <div className="login-form-heading">
            <LockKeyhole size={20} />
            <div>
              <h2>Admin login</h2>
              <p>Use your Perch platform admin account.</p>
            </div>
          </div>

          {params.error === "invalid" ? (
            <p className="login-error" role="alert">
              The email or password was not recognized, or this account is not a platform admin.
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
          <button className="primary-action" type="submit">
            Sign in
          </button>
          <p className="login-help">
            {localFallback
              ? `Local demo: ${localCredentials.email} / ${localCredentials.password}`
              : "Platform admins are assigned from the admin dashboard or directly in Supabase-backed user records."}
          </p>
        </form>
      </section>
    </main>
  );
}
