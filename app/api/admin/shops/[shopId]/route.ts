import { NextResponse } from "next/server";
import { actorFromRequest } from "@/lib/auth/basic";
import {
  cafeActorFromSession,
  cafeSessionCanAccessShop,
  getCafeSessionFromRequest,
} from "@/lib/auth/cafe-authorization";
import { getPrisma } from "@/lib/db";
import { logAudit } from "@/lib/services/audit";
import { parseShopUpdatePayload } from "@/lib/services/shop-settings";

export const dynamic = "force-dynamic";

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
  const parsed = parseShopUpdatePayload(await request.json().catch(() => null));
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
