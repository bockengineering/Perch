import { OrderStatus, Prisma } from "@prisma/client";
import type Stripe from "stripe";
import { getPrisma } from "@/lib/db";
import { grantPaidAccess } from "./payments";

function asJson(value: unknown) {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

export function isDuplicateWebhook(processedEventIds: Set<string>, eventId: string) {
  if (processedEventIds.has(eventId)) {
    return true;
  }
  processedEventIds.add(eventId);
  return false;
}

export function assertPaidAccessGranted(result: { ok: boolean; error?: string; reason?: string }) {
  if (!result.ok) {
    throw new Error(result.error ?? result.reason ?? "Paid access authorization failed");
  }
}

export function stripeWebhookHttpStatus(result: { ok: boolean }) {
  return result.ok ? 200 : 500;
}

export async function storeWebhookEvent(event: Stripe.Event) {
  const prisma = getPrisma();

  try {
    return {
      duplicate: false,
      event: await prisma.webhookEvent.create({
        data: {
          provider: "stripe",
          eventId: event.id,
          eventType: event.type,
          accountId: event.account ?? undefined,
          livemode: event.livemode,
          payloadJson: asJson(event),
        },
      }),
    };
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      const existing = await prisma.webhookEvent.findUnique({
        where: {
          provider_eventId: {
            provider: "stripe",
            eventId: event.id,
          },
        },
      });

      return { duplicate: Boolean(existing?.processedAt), event: existing };
    }

    throw error;
  }
}

export async function processStripeConnectEvent(event: Stripe.Event) {
  const prisma = getPrisma();
  const stored = await storeWebhookEvent(event);

  if (stored.duplicate) {
    return { ok: true, duplicate: true };
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const metadata = session.metadata ?? {};
        const orderId = metadata.orderId;
        if (!orderId) {
          throw new Error("Missing orderId metadata");
        }

        const order = await prisma.order.findUnique({
          where: { id: orderId },
          include: { shop: true },
        });
        if (!order) {
          throw new Error("Order not found");
        }
        if (event.account && order.shop.stripeConnectedAccountId !== event.account) {
          throw new Error("Connected account mismatch");
        }

        if (order.status !== OrderStatus.AUTHORIZED) {
          await prisma.order.update({
            where: { id: order.id },
            data: {
              status: OrderStatus.PAID,
              paidAt: new Date(),
              stripeCheckoutSessionId: session.id,
              stripePaymentIntentId:
                typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent?.id,
            },
          });
          assertPaidAccessGranted(await grantPaidAccess(order.id));
        }
        break;
      }
      case "charge.refunded": {
        const charge = event.data.object as Stripe.Charge;
        const paymentIntentId =
          typeof charge.payment_intent === "string" ? charge.payment_intent : charge.payment_intent?.id;
        if (paymentIntentId) {
          await prisma.order.updateMany({
            where: { stripePaymentIntentId: paymentIntentId },
            data: {
              status: OrderStatus.REFUNDED,
              refundedAt: new Date(),
              stripeChargeId: charge.id,
            },
          });
        }
        break;
      }
      case "charge.dispute.created": {
        break;
      }
      case "account.updated": {
        const account = event.data.object as Stripe.Account;
        await prisma.shop.updateMany({
          where: { stripeConnectedAccountId: account.id },
          data: {
            stripeChargesEnabled: Boolean(account.charges_enabled),
            stripePayoutsEnabled: Boolean(account.payouts_enabled),
          },
        });
        break;
      }
      case "account.application.deauthorized": {
        const accountId = event.account ?? (event.data.object as { id?: string }).id;
        if (accountId) {
          await prisma.shop.updateMany({
            where: { stripeConnectedAccountId: accountId },
            data: {
              stripeConnectedAccountId: null,
              stripeChargesEnabled: false,
              stripePayoutsEnabled: false,
            },
          });
        }
        break;
      }
      default:
        break;
    }

    await prisma.webhookEvent.update({
      where: {
        provider_eventId: {
          provider: "stripe",
          eventId: event.id,
        },
      },
      data: {
        processedAt: new Date(),
        error: null,
      },
    });

    return { ok: true, duplicate: false };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown webhook error";
    await prisma.webhookEvent.update({
      where: {
        provider_eventId: {
          provider: "stripe",
          eventId: event.id,
        },
      },
      data: { error: message },
    });
    return { ok: false, error: message };
  }
}
