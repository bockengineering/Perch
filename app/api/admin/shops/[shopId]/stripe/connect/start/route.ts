import { NextResponse } from "next/server";
import { cafeSessionCanAccessShop, getCafeSessionFromRequest } from "@/lib/auth/cafe-authorization";
import { startStripeConnectOnboarding } from "@/lib/services/payments";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ shopId: string }>;
};

export async function POST(request: Request, context: RouteContext) {
  const { shopId } = await context.params;
  const cafeSession = await getCafeSessionFromRequest(request);
  if (cafeSession && !cafeSessionCanAccessShop(cafeSession, shopId, true)) {
    return NextResponse.json({ error: "Not authorized for this shop." }, { status: 403 });
  }
  const url = await startStripeConnectOnboarding(shopId);
  return NextResponse.redirect(url);
}
