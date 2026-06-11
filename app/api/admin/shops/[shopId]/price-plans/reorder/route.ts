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

const schema = z.object({
  pricePlanIds: z.array(z.string().min(1)).min(1),
});

type RouteContext = {
  params: Promise<{ shopId: string }>;
};

export async function POST(request: Request, context: RouteContext) {
  const { shopId } = await context.params;
  const cafeSession = await getCafeSessionFromRequest(request);
  if (cafeSession && !cafeSessionCanAccessShop(cafeSession, shopId, true)) {
    return NextResponse.json({ error: "Not authorized for this shop." }, { status: 403 });
  }
  const actor = cafeSession ? cafeActorFromSession(cafeSession) : actorFromRequest(request);
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success || new Set(parsed.data.pricePlanIds).size !== parsed.data.pricePlanIds.length) {
    return NextResponse.json({ error: "Invalid price plan order." }, { status: 400 });
  }

  const prisma = getPrisma();
  const currentPlans = await prisma.pricePlan.findMany({
    where: { shopId },
    select: { id: true },
  });
  const currentIds = new Set(currentPlans.map((plan) => plan.id));
  if (
    parsed.data.pricePlanIds.length !== currentIds.size ||
    parsed.data.pricePlanIds.some((id) => !currentIds.has(id))
  ) {
    return NextResponse.json({ error: "Invalid price plan order." }, { status: 400 });
  }

  await prisma.$transaction(
    parsed.data.pricePlanIds.map((id, index) =>
      prisma.pricePlan.updateMany({
        where: { id, shopId },
        data: { sortOrder: (index + 1) * 10 },
      }),
    ),
  );
  await logAudit({
    actor,
    shopId,
    action: "price_plan.reorder",
    entityType: "PricePlan",
    metadata: { pricePlanIds: parsed.data.pricePlanIds },
  });

  return NextResponse.json({ ok: true });
}
