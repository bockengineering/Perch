import { CreditCard, ListChecks, Palette, Wifi } from "lucide-react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { BrandWordmark } from "@/components/BrandWordmark";
import { CafeConsoleSetupForm } from "@/components/cafe/CafeConsoleSetupForm";
import { CAFE_SESSION_COOKIE_NAME, verifyCafeSessionCookie } from "@/lib/auth/cafe-session";
import { getPrisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function CafeOnboardingPage() {
  const session = await verifyCafeSessionCookie((await cookies()).get(CAFE_SESSION_COOKIE_NAME)?.value);
  if (!session) {
    redirect("/cafe/login?next=/cafe/onboarding");
  }

  const prisma = getPrisma();
  const ownedShops = await prisma.shopMember.findMany({
    where: {
      role: "SHOP_OWNER",
      user: {
        OR: [
          ...(session.userId ? [{ id: session.userId }] : []),
          { email: session.email },
        ],
      },
    },
    select: { shopId: true },
    orderBy: { createdAt: "asc" },
  });

  if (ownedShops.length === 1) {
    redirect(`/cafe/shops/${ownedShops[0].shopId}`);
  }
  if (ownedShops.length > 1) {
    redirect("/cafe");
  }

  return (
    <main className="cafe-onboarding-page">
      <section className="cafe-onboarding-shell">
        <div className="cafe-onboarding-copy">
          <BrandWordmark className="brand-lockup-wordmark" width={132} height={58} priority />
          <div>
            <p className="eyebrow">Welcome to Perch</p>
            <h1>Let&apos;s build your cafe console.</h1>
            <p className="signup-lede">
              Your account is ready. The next few steps create the draft workspace your team will use to configure
              Wi-Fi access, payments, staff codes, and launch settings.
            </p>
          </div>
          <div className="onboarding-step-list">
            <div>
              <span className="onboarding-step-number">1</span>
              <div>
                <h2>Create the draft console</h2>
                <p>Name the cafe, choose the portal URL, timezone, support email, and brand color.</p>
              </div>
            </div>
            <div>
              <span className="onboarding-step-number">2</span>
              <div>
                <h2>Review default Wi-Fi policy</h2>
                <p>Perch starts with one free 60-minute grant per device per cafe per local day.</p>
              </div>
            </div>
            <div>
              <span className="onboarding-step-number">3</span>
              <div>
                <h2>Finish Stripe and UniFi</h2>
                <p>The launch checklist will guide you through payments, guest SSIDs, staff, and activation.</p>
              </div>
            </div>
          </div>
        </div>

        <div className="cafe-onboarding-panel">
          <div className="onboarding-capability-grid">
            <div>
              <Palette size={18} />
              <span>Portal branding</span>
            </div>
            <div>
              <CreditCard size={18} />
              <span>Paid Wi-Fi plans</span>
            </div>
            <div>
              <Wifi size={18} />
              <span>UniFi setup</span>
            </div>
            <div>
              <ListChecks size={18} />
              <span>Launch checklist</span>
            </div>
          </div>
          <CafeConsoleSetupForm ownerEmail={session.email} />
        </div>
      </section>
    </main>
  );
}
