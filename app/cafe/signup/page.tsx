import { BarChart3, CreditCard, Settings2, Wifi } from "lucide-react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { BrandWordmark } from "@/components/BrandWordmark";
import { CafeSignupForm } from "@/components/cafe/CafeSignupForm";
import {
  CAFE_SESSION_COOKIE_NAME,
  verifyCafeSessionCookie,
} from "@/lib/auth/cafe-session";

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
            <p className="eyebrow">Cafe onboarding</p>
            <h1>Open the console your cafe will run on.</h1>
            <p className="signup-lede">
              Create the cafe workspace, confirm your default Wi-Fi policy, then finish Stripe and UniFi setup from
              the launch checklist.
            </p>
          </div>
          <div className="signup-proof-grid">
            <div>
              <BarChart3 size={18} />
              <span>Revenue, paid passes, and failed authorization reporting.</span>
            </div>
            <div>
              <Settings2 size={18} />
              <span>Free access policy, portal branding, price plans, and staff accounts.</span>
            </div>
            <div>
              <CreditCard size={18} />
              <span>Stripe Connect onboarding for direct cafe charges.</span>
            </div>
            <div>
              <Wifi size={18} />
              <span>UniFi settings and allowed guest SSIDs before launch.</span>
            </div>
          </div>
        </div>
        <CafeSignupForm />
      </section>
    </main>
  );
}
