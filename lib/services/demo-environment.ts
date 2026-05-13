import type Stripe from "stripe";
import { demoToolsEnabled } from "@/lib/env";
import { getPrisma } from "@/lib/db";
import { processStripeConnectEvent } from "@/lib/services/webhooks";
import { demoApMac, demoPrimaryMac, demoSecondaryMac, demoShopSlug, demoSsid, seedDemoData } from "./demo-seed";

export const demoPrimaryLabel = "Primary demo device";
export const demoSecondaryLabel = "Fresh demo device";

export function assertDemoToolsEnabled() {
  if (!demoToolsEnabled()) {
    throw new Error("Demo tools are disabled. Set DEMO_TOOLS_ENABLED=true in a local or staging environment.");
  }
}

export function buildDemoPortalUrl(input?: {
  mac?: string;
  appUrl?: string;
  successPath?: string;
}) {
  const appUrl = input?.appUrl ?? process.env.APP_URL ?? "http://localhost:3000";
  const successUrl = new URL(input?.successPath ?? "/demo/connected", appUrl);
  const params = new URLSearchParams({
    id: input?.mac ?? demoPrimaryMac,
    ap: demoApMac,
    ssid: demoSsid,
    url: successUrl.toString(),
  });

  return `/p/${demoShopSlug}?${params.toString()}`;
}

export function demoDevices() {
  return [
    {
      label: demoPrimaryLabel,
      mac: demoPrimaryMac,
      portalUrl: buildDemoPortalUrl({ mac: demoPrimaryMac }),
    },
    {
      label: demoSecondaryLabel,
      mac: demoSecondaryMac,
      portalUrl: buildDemoPortalUrl({ mac: demoSecondaryMac }),
    },
  ];
}

export async function resetDemoData() {
  assertDemoToolsEnabled();
  const prisma = getPrisma();
  const shop = await prisma.shop.findUnique({ where: { slug: demoShopSlug } });

  if (shop) {
    await prisma.$transaction([
      prisma.networkActionLog.deleteMany({ where: { shopId: shop.id } }),
      prisma.auditLog.deleteMany({ where: { shopId: shop.id } }),
      prisma.webhookEvent.deleteMany({ where: { provider: "stripe" } }),
      prisma.voucherRedemption.deleteMany({ where: { shopId: shop.id } }),
      prisma.accessGrant.deleteMany({ where: { shopId: shop.id } }),
      prisma.dailyFreeAllowance.deleteMany({ where: { shopId: shop.id } }),
      prisma.portalSession.deleteMany({ where: { shopId: shop.id } }),
      prisma.order.deleteMany({ where: { shopId: shop.id } }),
      prisma.voucher.deleteMany({ where: { shopId: shop.id } }),
      prisma.device.deleteMany({ where: { shopId: shop.id } }),
      prisma.pricePlan.deleteMany({ where: { shopId: shop.id } }),
    ]);
  }

  return seedDemoData(prisma);
}

export async function completeDemoCheckout(orderId: string) {
  assertDemoToolsEnabled();

  if (process.env.STRIPE_MOCK_CHECKOUT !== "true") {
    throw new Error("Demo checkout completion is only available when STRIPE_MOCK_CHECKOUT=true.");
  }

  const prisma = getPrisma();
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { shop: true },
  });

  if (!order) {
    throw new Error("Order not found.");
  }

  const event = {
    id: `evt_demo_checkout_${order.id}`,
    object: "event",
    api_version: null,
    account: order.shop.stripeConnectedAccountId,
    created: Math.floor(Date.now() / 1000),
    data: {
      object: {
        id: order.stripeCheckoutSessionId ?? `mock_cs_${order.id}`,
        object: "checkout.session",
        metadata: {
          orderId: order.id,
          shopId: order.shopId,
          deviceId: order.deviceId,
          pricePlanId: order.pricePlanId,
        },
        payment_intent: `pi_demo_${order.id}`,
      },
    },
    livemode: false,
    pending_webhooks: 1,
    request: null,
    type: "checkout.session.completed",
  } as unknown as Stripe.Event;

  const result = await processStripeConnectEvent(event);
  const updatedOrder = await prisma.order.findUnique({ where: { id: order.id } });

  return { result, order: updatedOrder };
}
