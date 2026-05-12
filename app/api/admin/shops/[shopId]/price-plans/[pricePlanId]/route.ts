import { NextResponse } from "next/server";
import { z } from "zod";
import { actorFromRequest } from "@/lib/auth/basic";
import { getPrisma } from "@/lib/db";
import { logAudit } from "@/lib/services/audit";

export const dynamic = "force-dynamic";

const schema = z.object({
  label: z.string().min(2).optional(),
  durationMinutes: z.number().int().min(1).optional(),
  amountCents: z.number().int().min(50).optional(),
  currency: z.string().min(3).optional(),
  active: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
});

type RouteContext = {
  params: Promise<{ shopId: string; pricePlanId: string }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  const actor = actorFromRequest(request);
  const { shopId, pricePlanId } = await context.params;
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid price plan payload." }, { status: 400 });
  }

  const pricePlan = await getPrisma().pricePlan.update({
    where: { id: pricePlanId, shopId },
    data: {
      ...parsed.data,
      currency: parsed.data.currency?.toLowerCase(),
    },
  });
  await logAudit({ actor, shopId, action: "price_plan.update", entityType: "PricePlan", entityId: pricePlan.id });

  return NextResponse.json({ pricePlan });
}
