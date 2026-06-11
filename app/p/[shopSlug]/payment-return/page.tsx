import { DemoCompleteCheckoutButton } from "@/components/demo/DemoCompleteCheckoutButton";
import { PortalBrand, shopAccentStyle } from "@/components/portal/PortalBrand";
import { PaymentReturnWatcher } from "@/components/portal/PaymentReturnWatcher";
import { redirect } from "next/navigation";
import { getPrisma } from "@/lib/db";
import { demoToolsEnabled } from "@/lib/env";
import { paymentSuccessRedirectUrl } from "@/lib/utils/redirect";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function PaymentReturnPage({ searchParams }: PageProps) {
  const query = await searchParams;
  const orderId = Array.isArray(query.orderId) ? query.orderId[0] : query.orderId;
  const order = orderId
    ? await getPrisma().order.findUnique({
        where: { id: orderId },
        include: {
          shop: {
            select: {
              name: true,
              brandLogoUrl: true,
              brandPrimaryColor: true,
            },
          },
        },
      })
    : null;
  const showDemoPaymentControl =
    demoToolsEnabled() && process.env.STRIPE_MOCK_CHECKOUT === "true" && order?.status === "CHECKOUT_STARTED";

  if (order?.status === "AUTHORIZED") {
    redirect(paymentSuccessRedirectUrl());
  }

  let title = "Payment processing...";
  let body = "We are waiting for Stripe to confirm your pass.";

  if (order?.status === "PAID") {
    title = "Connecting...";
    body = "Payment received. We are finishing your Wi-Fi connection.";
  } else if (order?.status === "FAILED") {
    title = "Payment received, but we had trouble connecting you.";
    body = "Ask staff for help and mention your order reference.";
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-5 py-10" style={shopAccentStyle(order?.shop.brandPrimaryColor)}>
      <section className="surface w-full max-w-md p-6">
        <PortalBrand shop={order?.shop} />
        <h1 className="mt-3 text-2xl font-semibold">{title}</h1>
        <p className="mt-2 text-sm text-[var(--muted)]">{body}</p>
        {order ? <PaymentReturnWatcher orderId={order.id} enabled={order.status !== "FAILED"} /> : null}
        {showDemoPaymentControl && order ? <DemoCompleteCheckoutButton orderId={order.id} /> : null}
        {order ? <p className="mt-5 text-xs text-[var(--muted)]">Order {order.id}</p> : null}
      </section>
    </main>
  );
}
