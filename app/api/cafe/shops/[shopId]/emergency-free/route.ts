import { NextResponse } from "next/server";
import { z } from "zod";
import {
  cafeActorFromSession,
  cafeSessionCanAccessShop,
  getCafeSessionFromRequest,
} from "@/lib/auth/cafe-authorization";
import {
  getPlatformSessionFromRequest,
  platformActorFromSession,
} from "@/lib/auth/platform-authorization";
import { logAudit } from "@/lib/services/audit";
import {
  activateEmergencyFreeUntilMidnight,
  disableEmergencyFree,
} from "@/lib/services/emergency-free";

export const dynamic = "force-dynamic";

const emergencyFreeSchema = z.object({
  enabled: z.boolean(),
});

type RouteContext = {
  params: Promise<{ shopId: string }>;
};

export async function POST(request: Request, context: RouteContext) {
  const { shopId } = await context.params;
  const session = await getCafeSessionFromRequest(request);
  const platformSession = await getPlatformSessionFromRequest(request);

  if (!session && !platformSession) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  if (session && !cafeSessionCanAccessShop(session, shopId, true)) {
    return NextResponse.json({ error: "Cafe owner access required." }, { status: 403 });
  }

  const parsed = emergencyFreeSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid emergency free access payload." }, { status: 400 });
  }

  const shop = parsed.data.enabled
    ? await activateEmergencyFreeUntilMidnight(shopId)
    : await disableEmergencyFree(shopId);

  if (!shop) {
    return NextResponse.json({ error: "Shop not found." }, { status: 404 });
  }

  await logAudit({
    actor: platformSession ? platformActorFromSession(platformSession) : cafeActorFromSession(session!),
    shopId: shop.id,
    action: parsed.data.enabled ? "shop.emergency_free.enable" : "shop.emergency_free.disable",
    entityType: "Shop",
    entityId: shop.id,
    metadata: {
      emergencyFreeUntil: shop.emergencyFreeUntil?.toISOString() ?? null,
    },
  });

  return NextResponse.json({
    shop: {
      id: shop.id,
      emergencyFreeUntil: shop.emergencyFreeUntil?.toISOString() ?? null,
    },
  });
}
