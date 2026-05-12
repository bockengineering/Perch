import { NextResponse } from "next/server";
import { startStripeConnectOnboarding } from "@/lib/services/payments";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ shopId: string }>;
};

export async function POST(_request: Request, context: RouteContext) {
  const { shopId } = await context.params;
  const url = await startStripeConnectOnboarding(shopId);
  return NextResponse.redirect(url);
}
