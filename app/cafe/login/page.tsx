import { Coffee, ReceiptText, Ticket } from "lucide-react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { BrandWordmark } from "@/components/BrandWordmark";
import { CafeLoginForm } from "@/components/cafe/CafeLoginForm";
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

        <CafeLoginForm
          nextPath={nextPath}
          error={params.error}
          helpText={
            previewDemo
              ? `Preview demo: ${hostedPreviewCafeCredentials.email} / ${hostedPreviewCafeCredentials.password}`
              : "New owners continue to the setup walkthrough after login."
          }
        />
      </section>
    </main>
  );
}
