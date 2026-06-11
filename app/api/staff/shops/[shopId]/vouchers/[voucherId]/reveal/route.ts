import { NextResponse } from "next/server";
import { actorFromRequest } from "@/lib/auth/basic";
import {
  cafeActorFromSession,
  cafeSessionCanAccessShop,
  getCafeSessionFromRequest,
} from "@/lib/auth/cafe-authorization";
import { logAudit } from "@/lib/services/audit";
import { revealVoucherCode } from "@/lib/services/vouchers";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ shopId: string; voucherId: string }>;
};

export async function GET(request: Request, context: RouteContext) {
  const { shopId, voucherId } = await context.params;
  const cafeSession = await getCafeSessionFromRequest(request);
  if (cafeSession && !cafeSessionCanAccessShop(cafeSession, shopId)) {
    return NextResponse.json({ error: "Not authorized for this shop." }, { status: 403 });
  }

  const actor = cafeSession ? cafeActorFromSession(cafeSession) : actorFromRequest(request);

  try {
    const result = await revealVoucherCode({ shopId, voucherId });
    if (!result.ok) {
      return NextResponse.json({ error: result.reason }, { status: result.reason === "Voucher not found." ? 404 : 409 });
    }

    await logAudit({ actor, shopId, action: "voucher.reveal", entityType: "Voucher", entityId: voucherId });
    return NextResponse.json({ plaintextCode: result.plaintextCode });
  } catch {
    return NextResponse.json({ error: "Voucher code could not be decrypted." }, { status: 500 });
  }
}
