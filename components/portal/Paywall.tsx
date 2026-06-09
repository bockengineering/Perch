import type { PricePlan, Shop } from "@prisma/client";
import { PortalBrand, shopAccentStyle } from "./PortalBrand";
import { PaywallActions } from "./PaywallActions";

export function Paywall({
  shop,
  portalSessionId,
  plans,
}: {
  shop: Pick<Shop, "name" | "brandLogoUrl" | "brandPrimaryColor">;
  portalSessionId: string;
  plans: PricePlan[];
}) {
  return (
    <main className="portal-page" style={shopAccentStyle(shop.brandPrimaryColor)}>
      <section className="portal-card surface">
        <div className="portal-card-top">
          <PortalBrand shop={shop} />
          <span className="portal-state-pill">Free hour used</span>
        </div>
        <p className="portal-eyebrow">Guest Wi-Fi</p>
        <h1 className="portal-title">Your free Wi-Fi hour for today has ended.</h1>
        <p className="portal-copy">Need more time? Choose a pass or enter a staff code from the counter.</p>
        <PaywallActions
          portalSessionId={portalSessionId}
          plans={plans.map((plan) => ({
            id: plan.id,
            label: plan.label,
            amountCents: plan.amountCents,
            currency: plan.currency,
          }))}
        />
      </section>
    </main>
  );
}
