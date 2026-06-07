import { Activity, ReceiptText, Store } from "lucide-react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { AdminLoginForm } from "@/components/admin/AdminLoginForm";
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

        <AdminLoginForm
          nextPath={nextPath}
          error={params.error}
          helpText={
            localFallback
              ? `Local demo: ${localCredentials.email} / ${localCredentials.password}`
              : "Use the platform admin credentials configured for this deployment."
          }
        />
      </section>
    </main>
  );
}
