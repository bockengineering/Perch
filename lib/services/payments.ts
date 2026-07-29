import {
  AccessGrantStatus,
  AccessGrantType,
  OrderStatus,
  Prisma,
  type Order,
  type PricePlan,
  type Shop,
} from "@prisma/client";
import type Stripe from "stripe";
import { decryptSecret } from "@/lib/crypto/field-encryption";
import { appUrl } from "@/lib/env";
import { getPrisma } from "@/lib/db";
import { getNetworkProvider } from "@/lib/network/provider-factory";
import { hasRealStripeSecret, getStripe } from "@/lib/stripe/client";
import { addMinutes, getShopLocalDate } from "@/lib/utils/time";
import { calculatePlatformFeeCents, canCreateCheckoutGrace } from "./portal-policy";

function asJson(value: unknown) {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

export function stripeConnectedAccountController(): NonNullable<Stripe.AccountCreateParams["controller"]> {
  return {
    // Cafes are the merchant for direct charges, so their connected account pays
    // Stripe processing fees. Perch still collects its revenue share through
    // payment_intent_data.application_fee_amount on each Checkout Session.
    // Stripe requires a full Dashboard account for this fee and loss-liability
    // combination; Express accounts require the platform to assume both.
    fees: { payer: "account" },
    losses: { payments: "stripe" },
    requirement_collection: "stripe",
    stripe_dashboard: { type: "full" },
  };
}

export async function createCheckoutGraceGrant(input: {
  shop: Shop;
  deviceId: string;
  unifiClientId?: string | null;
}) {
  const prisma = getPrisma();
  const now = new Date();
  const localDate = getShopLocalDate(input.shop, now);
  const source = `CHECKOUT_GRACE:${localDate}`;
  const todayGraceCount = await prisma.accessGrant.count({
    where: {
      shopId: input.shop.id,
      deviceId: input.deviceId,
      type: AccessGrantType.CHECKOUT_GRACE,
      source,
    },
  });

  if (!canCreateCheckoutGrace(todayGraceCount, input.shop.maxCheckoutGracePerDay)) {
    return { granted: false, reason: "Checkout grace limit reached" };
  }

  const grant = await prisma.accessGrant.create({
    data: {
      shopId: input.shop.id,
      deviceId: input.deviceId,
      type: AccessGrantType.CHECKOUT_GRACE,
      status: AccessGrantStatus.PENDING,
      requestedMinutes: input.shop.checkoutGraceMinutes,
      source,
    },
  });

  const shop = await prisma.shop.findUnique({
    where: { id: input.shop.id },
    include: { unifiIntegration: true },
  });
  const device = await prisma.device.findUnique({ where: { id: input.deviceId } });

  if (!shop?.unifiIntegration || !device) {
    await prisma.accessGrant.update({
      where: { id: grant.id },
      data: { status: AccessGrantStatus.FAILED, failureReason: "Missing integration or device" },
    });
    return { granted: false, reason: "Missing integration or device" };
  }

  const provider = getNetworkProvider();
  const rawMac = decryptSecret(device.clientMacEncrypted);
  const client = input.unifiClientId
    ? { clientId: input.unifiClientId }
    : await provider.findClientByMac(shop.unifiIntegration, rawMac);

  if (!client) {
    await prisma.accessGrant.update({
      where: { id: grant.id },
      data: { status: AccessGrantStatus.FAILED, failureReason: "UniFi client not found" },
    });
    return { granted: false, reason: "UniFi client not found" };
  }

  const authorization = await provider.authorizeGuest(
    shop.unifiIntegration,
    client.clientId,
    { timeLimitMinutes: input.shop.checkoutGraceMinutes },
    { shopId: shop.id, deviceId: input.deviceId, grantId: grant.id },
  );

  if (!authorization.ok) {
    await prisma.accessGrant.update({
      where: { id: grant.id },
      data: {
        status: AccessGrantStatus.FAILED,
        failureReason: authorization.error ?? "Checkout grace authorization failed",
        unifiClientId: client.clientId,
        unifiActionStatus: "FAILED",
        unifiResponseJson: asJson(authorization.response),
      },
    });
    return { granted: false, reason: authorization.error ?? "Checkout grace authorization failed" };
  }

  const authorizedGrant = await prisma.accessGrant.update({
    where: { id: grant.id },
    data: {
      status: AccessGrantStatus.AUTHORIZED,
      authorizedAt: now,
      expiresAt: addMinutes(now, input.shop.checkoutGraceMinutes),
      unifiClientId: client.clientId,
      unifiActionStatus: "AUTHORIZED",
      unifiResponseJson: asJson(authorization.response),
    },
  });

  return { granted: true, grant: authorizedGrant };
}

export async function createOrderForPlan(input: {
  shop: Shop;
  deviceId: string;
  pricePlan: PricePlan;
}) {
  const platformFeeCents = calculatePlatformFeeCents(input.pricePlan.amountCents, input.shop.platformFeeBps);

  return getPrisma().order.create({
    data: {
      shopId: input.shop.id,
      deviceId: input.deviceId,
      pricePlanId: input.pricePlan.id,
      status: OrderStatus.CREATED,
      amountCents: input.pricePlan.amountCents,
      currency: input.pricePlan.currency,
      platformFeeCents,
      stripeConnectedAccountId: input.shop.stripeConnectedAccountId,
    },
  });
}

export async function createStripeCheckoutSession(input: {
  order: Order;
  shop: Shop;
  pricePlan: PricePlan;
  portalSessionId: string;
}) {
  const successUrl = `${appUrl()}/p/${input.shop.slug}/payment-return?orderId=${input.order.id}`;
  const cancelUrl = `${appUrl()}/p/${input.shop.slug}?session=${input.portalSessionId}`;

  if (!hasRealStripeSecret() || process.env.STRIPE_MOCK_CHECKOUT === "true") {
    const sessionId = `mock_cs_${input.order.id}`;
    await getPrisma().order.update({
      where: { id: input.order.id },
      data: {
        status: OrderStatus.CHECKOUT_STARTED,
        stripeCheckoutSessionId: sessionId,
      },
    });
    return {
      checkoutUrl: successUrl,
      sessionId,
      mock: true,
    };
  }

  if (!input.shop.stripeConnectedAccountId) {
    throw new Error("Shop does not have a connected Stripe account");
  }

  const stripe = getStripe();
  const session = await stripe.checkout.sessions.create(
    {
      mode: "payment",
      line_items: [
        {
          price_data: {
            currency: input.pricePlan.currency,
            unit_amount: input.pricePlan.amountCents,
            product_data: {
              name: `${input.shop.name} Wi-Fi: ${input.pricePlan.label}`,
            },
          },
          quantity: 1,
        },
      ],
      success_url: successUrl,
      cancel_url: cancelUrl,
      payment_intent_data: {
        application_fee_amount: input.order.platformFeeCents,
      },
      metadata: {
        orderId: input.order.id,
        shopId: input.shop.id,
        deviceId: input.order.deviceId,
        pricePlanId: input.pricePlan.id,
      },
    },
    {
      stripeAccount: input.shop.stripeConnectedAccountId,
    },
  );

  await getPrisma().order.update({
    where: { id: input.order.id },
    data: {
      status: OrderStatus.CHECKOUT_STARTED,
      stripeCheckoutSessionId: session.id,
    },
  });

  return { checkoutUrl: session.url, sessionId: session.id, mock: false };
}

export async function grantPaidAccess(orderId: string) {
  const prisma = getPrisma();
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      shop: { include: { unifiIntegration: true } },
      device: true,
      pricePlan: true,
    },
  });

  if (!order || order.status !== OrderStatus.PAID) {
    return { ok: false, reason: "Order is not paid" };
  }

  if (!order.shop.unifiIntegration) {
    return { ok: false, reason: "Missing UniFi integration" };
  }

  const existingGrant = await prisma.accessGrant.findFirst({
    where: {
      orderId: order.id,
      type: AccessGrantType.PAID,
      status: { in: [AccessGrantStatus.PENDING, AccessGrantStatus.AUTHORIZED] },
    },
    orderBy: { createdAt: "desc" },
  });

  if (existingGrant) {
    return { ok: true, grant: existingGrant, idempotent: true };
  }

  const now = new Date();
  const grant = await prisma.accessGrant.create({
    data: {
      shopId: order.shopId,
      deviceId: order.deviceId,
      orderId: order.id,
      type: AccessGrantType.PAID,
      status: AccessGrantStatus.PENDING,
      requestedMinutes: order.pricePlan.durationMinutes,
      source: "STRIPE_CHECKOUT",
    },
  });

  const provider = getNetworkProvider();
  const rawMac = decryptSecret(order.device.clientMacEncrypted);
  const client = await provider.findClientByMac(order.shop.unifiIntegration, rawMac);

  if (!client) {
    await prisma.accessGrant.update({
      where: { id: grant.id },
      data: {
        status: AccessGrantStatus.FAILED,
        failureReason: "UniFi client not found",
        retryCount: { increment: 1 },
      },
    });
    return { ok: false, reason: "UniFi client not found" };
  }

  const authorization = await provider.authorizeGuest(
    order.shop.unifiIntegration,
    client.clientId,
    { timeLimitMinutes: order.pricePlan.durationMinutes },
    { shopId: order.shopId, deviceId: order.deviceId, grantId: grant.id },
  );

  if (!authorization.ok) {
    await prisma.accessGrant.update({
      where: { id: grant.id },
      data: {
        status: AccessGrantStatus.FAILED,
        failureReason: authorization.error ?? "Paid authorization failed",
        unifiClientId: client.clientId,
        unifiActionStatus: "FAILED",
        unifiResponseJson: asJson(authorization.response),
        retryCount: { increment: 1 },
      },
    });
    return { ok: false, reason: authorization.error ?? "Paid authorization failed" };
  }

  await prisma.accessGrant.update({
    where: { id: grant.id },
    data: {
      status: AccessGrantStatus.AUTHORIZED,
      authorizedAt: now,
      expiresAt: addMinutes(now, order.pricePlan.durationMinutes),
      unifiClientId: client.clientId,
      unifiActionStatus: "AUTHORIZED",
      unifiResponseJson: asJson(authorization.response),
    },
  });

  await prisma.order.update({
    where: { id: order.id },
    data: { status: OrderStatus.AUTHORIZED },
  });

  return { ok: true };
}

export async function startStripeConnectOnboarding(
  shopId: string,
  options: { returnPath?: "admin" | "cafe" } = {},
) {
  const prisma = getPrisma();
  const shop = await prisma.shop.findUnique({ where: { id: shopId } });

  if (!shop) {
    throw new Error("Shop not found");
  }

  const returnPath = options.returnPath ?? "admin";
  const returnTarget = returnPath === "cafe" ? `/cafe/shops/${shop.id}` : `/admin/shops/${shop.id}`;

  if (!hasRealStripeSecret() || process.env.STRIPE_MOCK_CHECKOUT === "true") {
    await prisma.shop.update({
      where: { id: shop.id },
      data: {
        stripeConnectedAccountId: shop.stripeConnectedAccountId ?? `acct_mock_${shop.id.slice(-8)}`,
        stripeChargesEnabled: true,
        stripePayoutsEnabled: true,
      },
    });
    return `${appUrl()}${returnTarget}?stripe=mock-connected`;
  }

  const stripe = getStripe();
  let accountId = shop.stripeConnectedAccountId;

  if (!accountId) {
    const account = await stripe.accounts.create({
      country: "US",
      email: shop.supportEmail ?? undefined,
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true },
      },
      controller: stripeConnectedAccountController(),
    } as Stripe.AccountCreateParams);
    accountId = account.id;
    await prisma.shop.update({
      where: { id: shop.id },
      data: { stripeConnectedAccountId: accountId },
    });
  }

  const accountLink = await stripe.accountLinks.create({
    account: accountId,
    refresh_url: `${appUrl()}${returnTarget}?stripe=refresh`,
    return_url: `${appUrl()}/api/admin/shops/${shop.id}/stripe/connect/return?destination=${returnPath}`,
    type: "account_onboarding",
  });

  return accountLink.url;
}
