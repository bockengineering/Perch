import { NextResponse } from "next/server";
import { z } from "zod";
import { actorFromRequest } from "@/lib/auth/basic";
import {
  cafeActorFromSession,
  cafeSessionCanAccessShop,
  getCafeSessionFromRequest,
} from "@/lib/auth/cafe-authorization";
import { getPrisma } from "@/lib/db";
import { logAudit } from "@/lib/services/audit";
import { parsePlanPriceToCents } from "@/lib/services/price-plans";

export const dynamic = "force-dynamic";

const schema = z.object({
  label: z.string().min(2),
  durationMinutes: z.number().int().min(1),
  amountCents: z.number().int().min(50).optional(),
  price: z.union([z.string(), z.number()]).optional(),
  currency: z.string().min(3).default("usd"),
});

type RouteContext = {
  params: Promise<{ shopId: string }>;
};

export async function GET(request: Request, context: RouteContext) {
  const { shopId } = await context.params;
  const cafeSession = await getCafeSessionFromRequest(request);
  if (cafeSession && !cafeSessionCanAccessShop(cafeSession, shopId)) {
    return NextResponse.json({ error: "Not authorized for this shop." }, { status: 403 });
  }
  const pricePlans = await getPrisma().pricePlan.findMany({
    where: { shopId },
    orderBy: { sortOrder: "asc" },
  });
  return NextResponse.json({ pricePlans });
}

export async function POST(request: Request, context: RouteContext) {
  const { shopId } = await context.params;
  const cafeSession = await getCafeSessionFromRequest(request);
  if (cafeSession && !cafeSessionCanAccessShop(cafeSession, shopId, true)) {
    return NextResponse.json({ error: "Not authorized for this shop." }, { status: 403 });
  }
  const actor = cafeSession ? cafeActorFromSession(cafeSession) : actorFromRequest(request);
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid price plan payload." }, { status: 400 });
  }
  const amountCents =
    parsed.data.price === undefined ? (parsed.data.amountCents ?? null) : parsePlanPriceToCents(parsed.data.price);
  if (amountCents === null) {
    return NextResponse.json({ error: "Invalid price plan payload." }, { status: 400 });
  }

  const sortOrder = await getPrisma().pricePlan.count({ where: { shopId } });
  const pricePlan = await getPrisma().pricePlan.create({
    data: {
      shopId,
      label: parsed.data.label,
      durationMinutes: parsed.data.durationMinutes,
      amountCents,
      currency: parsed.data.currency.toLowerCase(),
      sortOrder: sortOrder + 1,
    },
  });
  await logAudit({ actor, shopId, action: "price_plan.create", entityType: "PricePlan", entityId: pricePlan.id });

  return NextResponse.json({ pricePlan });
}
