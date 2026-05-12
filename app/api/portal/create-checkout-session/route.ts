import { NextResponse } from "next/server";
import { z } from "zod";
import { getPrisma } from "@/lib/db";
import { createCheckoutGraceGrant, createOrderForPlan, createStripeCheckoutSession } from "@/lib/services/payments";
import { checkRateLimit } from "@/lib/utils/rate-limit";

export const dynamic = "force-dynamic";

const schema = z.object({
  portalSessionId: z.string().min(1),
  pricePlanId: z.string().min(1),
});

export async function POST(request: Request) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const rate = checkRateLimit(`checkout:${ip}`, 20, 60_000);
  if (!rate.allowed) {
    return NextResponse.json({ error: "Too many checkout attempts." }, { status: 429 });
  }

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid checkout request." }, { status: 400 });
  }

  const prisma = getPrisma();
  const portalSession = await prisma.portalSession.findUnique({
    where: { id: parsed.data.portalSessionId },
    include: { shop: true, device: true },
  });
  if (!portalSession?.device || portalSession.shop.status !== "ACTIVE") {
    return NextResponse.json({ error: "Portal session is not available." }, { status: 400 });
  }

  const pricePlan = await prisma.pricePlan.findFirst({
    where: {
      id: parsed.data.pricePlanId,
      shopId: portalSession.shopId,
      active: true,
    },
  });
  if (!pricePlan) {
    return NextResponse.json({ error: "Price plan is not available." }, { status: 400 });
  }

  const order = await createOrderForPlan({
    shop: portalSession.shop,
    deviceId: portalSession.device.id,
    pricePlan,
  });

  await createCheckoutGraceGrant({
    shop: portalSession.shop,
    deviceId: portalSession.device.id,
  });

  try {
    const checkout = await createStripeCheckoutSession({
      order,
      shop: portalSession.shop,
      pricePlan,
      portalSessionId: portalSession.id,
    });
    return NextResponse.json({ checkoutUrl: checkout.checkoutUrl, checkoutSessionId: checkout.sessionId });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Checkout could not be created." },
      { status: 500 },
    );
  }
}
