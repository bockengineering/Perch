import { NextResponse } from "next/server";
import { getOptionalServerEnv } from "@/lib/env";
import { getStripe } from "@/lib/stripe/client";
import { processStripeConnectEvent, stripeWebhookHttpStatus } from "@/lib/services/webhooks";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const payload = await request.text();
  const signature = request.headers.get("stripe-signature");
  const webhookSecret = getOptionalServerEnv("STRIPE_WEBHOOK_SECRET_CONNECT");

  let event;
  try {
    if (webhookSecret) {
      if (!signature) {
        return NextResponse.json({ error: "Missing Stripe signature." }, { status: 400 });
      }
      event = getStripe().webhooks.constructEvent(payload, signature, webhookSecret);
    } else if (process.env.STRIPE_MOCK_CHECKOUT === "true") {
      event = JSON.parse(payload);
    } else {
      return NextResponse.json({ error: "Stripe webhook secret is not configured." }, { status: 500 });
    }
  } catch {
    return NextResponse.json({ error: "Invalid Stripe webhook signature." }, { status: 400 });
  }

  const result = await processStripeConnectEvent(event);
  return NextResponse.json(
    { received: true, ok: result.ok },
    { status: stripeWebhookHttpStatus(result) },
  );
}
