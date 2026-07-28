import { ListChecks, LockKeyhole, UserPlus, Wifi } from "lucide-react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { BrandWordmark } from "@/components/BrandWordmark";
import { CafeSignupForm } from "@/components/cafe/CafeSignupForm";
import {
  CAFE_SESSION_COOKIE_NAME,
  verifyCafeSessionCookie,
} from "@/lib/auth/cafe-session";
import { publicSignupEnabled } from "@/lib/env";

export const dynamic = "force-dynamic";

export default async function CafeSignupPage() {
  const session = await verifyCafeSessionCookie((await cookies()).get(CAFE_SESSION_COOKIE_NAME)?.value);
  if (session) {
    redirect("/cafe");
  }

  return (
    <main className="cafe-login-page cafe-signup-page">
      <section className="cafe-signup-shell">
        <div className="cafe-signup-copy">
          <div className="brand-lockup">
            <BrandWordmark className="brand-lockup-wordmark" width={132} height={58} priority />
          </div>
          <div>
            <p className="eyebrow">Cafe owner signup</p>
            <h1>Create your Perch account.</h1>
            <p className="signup-lede">
              Sign up first. Then Perch will walk you through creating the cafe console, setting the default Wi-Fi
              policy, and preparing Stripe and UniFi before launch.
            </p>
          </div>
          <div className="signup-proof-grid">
            <div>
              <UserPlus size={18} />
              <span>Create an owner account for the cafe.</span>
            </div>
            <div>
              <ListChecks size={18} />
              <span>Start with a guided console setup screen.</span>
            </div>
            <div>
              <Wifi size={18} />
              <span>Connect UniFi only when you are ready to test hardware.</span>
            </div>
            <div>
              <LockKeyhole size={18} />
              <span>The cafe console stays private until you sign in.</span>
            </div>
          </div>
        </div>
        {publicSignupEnabled() ? (
          <CafeSignupForm />
        ) : (
          <section className="cafe-signup-form" aria-labelledby="signup-invite-heading">
            <p className="eyebrow">Early access</p>
            <h2 id="signup-invite-heading">Cafe accounts are invitation-only.</h2>
            <p className="signup-lede">
              Perch is onboarding its first cafes directly so each UniFi and Stripe setup can be verified before
              guests use it. Contact the Perch team for access, or sign in if your account is ready.
            </p>
            <a className="btn btn--primary" href="/cafe/login">
              Sign in
            </a>
          </section>
        )}
      </section>
    </main>
  );
}
