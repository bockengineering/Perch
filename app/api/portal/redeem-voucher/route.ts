import { NextResponse } from "next/server";
import { z } from "zod";
import { getPrisma } from "@/lib/db";
import { redeemVoucher } from "@/lib/services/vouchers";
import { safeRedirectUrl } from "@/lib/utils/redirect";
import { checkRateLimit } from "@/lib/utils/rate-limit";

export const dynamic = "force-dynamic";

const schema = z.object({
  portalSessionId: z.string().min(1),
  code: z.string().min(3),
});

export async function POST(request: Request) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const rate = checkRateLimit(`voucher:${ip}`, 12, 60_000);
  if (!rate.allowed) {
    return NextResponse.json({ error: "Too many staff code attempts." }, { status: 429 });
  }

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid staff code request." }, { status: 400 });
  }

  const portalSession = await getPrisma().portalSession.findUnique({
    where: { id: parsed.data.portalSessionId },
    include: { shop: true, device: true },
  });
  if (!portalSession?.device || portalSession.shop.status !== "ACTIVE") {
    return NextResponse.json({ error: "Portal session is not available." }, { status: 400 });
  }

  const result = await redeemVoucher({
    shopId: portalSession.shopId,
    deviceId: portalSession.device.id,
    code: parsed.data.code,
  });

  if (!result.ok) {
    const error = "reason" in result ? result.reason : "Staff code could not be redeemed.";
    return NextResponse.json({ error }, { status: 400 });
  }

  return NextResponse.json({
    ok: true,
    redirectUrl: safeRedirectUrl(portalSession.originalUrl),
  });
}
