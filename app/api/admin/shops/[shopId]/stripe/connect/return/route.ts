import { NextResponse } from "next/server";
import { getPrisma } from "@/lib/db";
import { hasRealStripeSecret, getStripe } from "@/lib/stripe/client";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ shopId: string }>;
};

export async function GET(request: Request, context: RouteContext) {
  const { shopId } = await context.params;
  const requestUrl = new URL(request.url);
  const destination = requestUrl.searchParams.get("destination") === "cafe" ? "cafe" : "admin";
  const prisma = getPrisma();
  const shop = await prisma.shop.findUnique({ where: { id: shopId } });

  if (shop?.stripeConnectedAccountId && hasRealStripeSecret()) {
    const account = await getStripe().accounts.retrieve(shop.stripeConnectedAccountId);
    await prisma.shop.update({
      where: { id: shop.id },
      data: {
        stripeChargesEnabled: Boolean(account.charges_enabled),
        stripePayoutsEnabled: Boolean(account.payouts_enabled),
      },
    });
  }

  const path = destination === "cafe" ? `/cafe/shops/${shopId}` : `/admin/shops/${shopId}`;
  return NextResponse.redirect(new URL(`${path}?stripe=returned`, request.url));
}
