import { NextResponse } from "next/server";
import { z } from "zod";
import { actorFromRequest } from "@/lib/auth/basic";
import {
  cafeActorFromSession,
  cafeSessionCanAccessShop,
  getCafeSessionFromRequest,
} from "@/lib/auth/cafe-authorization";
import { createVoucher } from "@/lib/services/vouchers";
import { logAudit } from "@/lib/services/audit";

export const dynamic = "force-dynamic";

const schema = z.object({
  label: z.string().min(2),
  durationMinutes: z.number().int().min(1),
  maxRedemptions: z.number().int().min(1),
  expiresAt: z.string().nullable().optional(),
});

type RouteContext = {
  params: Promise<{ shopId: string }>;
};

export async function POST(request: Request, context: RouteContext) {
  const { shopId } = await context.params;
  const cafeSession = await getCafeSessionFromRequest(request);
  if (cafeSession && !cafeSessionCanAccessShop(cafeSession, shopId)) {
    return NextResponse.json({ error: "Not authorized for this shop." }, { status: 403 });
  }
  const actor = cafeSession ? cafeActorFromSession(cafeSession) : actorFromRequest(request);
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid voucher payload." }, { status: 400 });
  }

  const expiresAt = parsed.data.expiresAt ? new Date(parsed.data.expiresAt) : null;
  const result = await createVoucher({
    shopId,
    label: parsed.data.label,
    durationMinutes: parsed.data.durationMinutes,
    maxRedemptions: parsed.data.maxRedemptions,
    expiresAt,
  });
  await logAudit({ actor, shopId, action: "voucher.create", entityType: "Voucher", entityId: result.voucher.id });

  return NextResponse.json({
    voucherId: result.voucher.id,
    plaintextCode: result.plaintextCode,
  });
}
