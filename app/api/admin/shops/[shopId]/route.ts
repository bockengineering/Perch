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

export const dynamic = "force-dynamic";

const updateShopSchema = z.object({
  name: z.string().min(2).optional(),
  timezone: z.string().min(3).optional(),
  status: z.enum(["DRAFT", "ACTIVE", "PAUSED", "DISABLED"]).optional(),
  freeMinutesPerDay: z.number().int().min(0).optional(),
  checkoutGraceMinutes: z.number().int().min(1).optional(),
  maxCheckoutGracePerDay: z.number().int().min(0).optional(),
  platformFeeBps: z.number().int().min(0).max(10000).optional(),
  supportEmail: z.string().email().nullable().optional(),
});

type RouteContext = {
  params: Promise<{ shopId: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const { shopId } = await context.params;
  const cafeSession = await getCafeSessionFromRequest(_request);
  if (cafeSession && !cafeSessionCanAccessShop(cafeSession, shopId)) {
    return NextResponse.json({ error: "Not authorized for this shop." }, { status: 403 });
  }
  const shop = await getPrisma().shop.findUnique({
    where: { id: shopId },
    include: { unifiIntegration: true, pricePlans: true },
  });
  if (!shop) {
    return NextResponse.json({ error: "Shop not found." }, { status: 404 });
  }

  return NextResponse.json({ shop });
}

export async function PATCH(request: Request, context: RouteContext) {
  const { shopId } = await context.params;
  const cafeSession = await getCafeSessionFromRequest(request);
  if (cafeSession && !cafeSessionCanAccessShop(cafeSession, shopId, true)) {
    return NextResponse.json({ error: "Not authorized for this shop." }, { status: 403 });
  }
  const actor = cafeSession ? cafeActorFromSession(cafeSession) : actorFromRequest(request);
  const parsed = updateShopSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid shop payload." }, { status: 400 });
  }

  const shop = await getPrisma().shop.update({
    where: { id: shopId },
    data: parsed.data,
  });
  await logAudit({ actor, shopId: shop.id, action: "shop.update", entityType: "Shop", entityId: shop.id });

  return NextResponse.json({ shop });
}
