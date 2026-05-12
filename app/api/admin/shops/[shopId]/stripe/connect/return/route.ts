import { NextResponse } from "next/server";
import { getPrisma } from "@/lib/db";
import { hasRealStripeSecret, getStripe } from "@/lib/stripe/client";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ shopId: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const { shopId } = await context.params;
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

  return NextResponse.redirect(new URL(`/admin/shops/${shopId}`, process.env.APP_URL ?? "http://localhost:3000"));
}
