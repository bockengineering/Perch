import type { PricePlan, Shop } from "@prisma/client";
import { PaywallActions } from "./PaywallActions";

export function Paywall({
  shop,
  portalSessionId,
  plans,
}: {
  shop: Pick<Shop, "name" | "brandPrimaryColor">;
  portalSessionId: string;
  plans: PricePlan[];
}) {
  return (
    <main className="flex min-h-screen items-center justify-center px-5 py-10">
      <section className="surface w-full max-w-md p-6">
        <p className="text-sm font-semibold text-[var(--accent)]">{shop.name}</p>
        <h1 className="mt-3 text-2xl font-semibold">Your free Wi-Fi hour for today has ended.</h1>
        <p className="mt-2 text-sm text-[var(--muted)]">Need more time?</p>
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
