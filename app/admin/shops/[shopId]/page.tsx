import Link from "next/link";
import { notFound } from "next/navigation";
import { CreditCard, Ticket, Wifi } from "lucide-react";
import { PricePlanForm } from "@/components/admin/PricePlanForm";
import { UnifiSettingsForm } from "@/components/admin/UnifiSettingsForm";
import { getPrisma } from "@/lib/db";
import { startOfTodayUtc } from "@/lib/utils/time";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ shopId: string }>;
};

function StatusCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="surface p-4">
      <p className="text-sm text-[var(--muted)]">{label}</p>
      <p className="mt-2 font-semibold">{value}</p>
    </div>
  );
}

export default async function ShopDetailPage({ params }: PageProps) {
  const { shopId } = await params;
  const prisma = getPrisma();
  const shop = await prisma.shop.findUnique({
    where: { id: shopId },
    include: {
      unifiIntegration: true,
      pricePlans: { orderBy: { sortOrder: "asc" } },
    },
  });

  if (!shop) {
    notFound();
  }

  const today = startOfTodayUtc();
  const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
  const [portalVisits, freeGrants, paidPasses, revenue, vouchers, failures, thirtyDayRevenue, thirtyDayFree] =
    await Promise.all([
      prisma.portalSession.count({ where: { shopId: shop.id, createdAt: { gte: today } } }),
      prisma.accessGrant.count({
        where: {
          shopId: shop.id,
          createdAt: { gte: today },
          type: { in: ["FREE_AUTO_WORKER", "FREE_PORTAL_FAST_PATH"] },
        },
      }),
      prisma.order.count({ where: { shopId: shop.id, paidAt: { gte: today } } }),
      prisma.order.aggregate({
        where: { shopId: shop.id, paidAt: { gte: today }, status: { in: ["PAID", "AUTHORIZED"] } },
        _sum: { amountCents: true, platformFeeCents: true },
      }),
      prisma.voucherRedemption.count({ where: { shopId: shop.id, redeemedAt: { gte: today } } }),
      prisma.accessGrant.count({ where: { shopId: shop.id, status: "FAILED", createdAt: { gte: today } } }),
      prisma.order.aggregate({
        where: {
          shopId: shop.id,
          paidAt: { gte: thirtyDaysAgo },
          status: { in: ["PAID", "AUTHORIZED"] },
        },
        _sum: { amountCents: true },
      }),
      prisma.accessGrant.count({
        where: {
          shopId: shop.id,
          createdAt: { gte: thirtyDaysAgo },
          type: { in: ["FREE_AUTO_WORKER", "FREE_PORTAL_FAST_PATH"] },
        },
      }),
    ]);

  const gross = revenue._sum.amountCents ?? 0;
  const platformFee = revenue._sum.platformFeeCents ?? 0;
  const cafeShare = gross - platformFee;

  return (
    <main className="mx-auto grid max-w-6xl gap-6 px-6 py-8">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border)] pb-5">
        <div>
          <p className="text-sm font-semibold text-[var(--accent)]">Shop</p>
          <h1 className="text-3xl font-semibold">{shop.name}</h1>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Device-based free access is useful, but private address rotation can create extra grants.
          </p>
        </div>
        <div className="flex gap-2">
          <Link href={`/staff/shops/${shop.id}/vouchers`} className="rounded-md border border-[var(--border)] px-4 py-2 text-sm font-semibold">
            Staff vouchers
          </Link>
          <Link href={`/p/${shop.slug}`} className="rounded-md bg-[var(--foreground)] px-4 py-2 text-sm font-semibold text-white">
            Portal
          </Link>
        </div>
      </header>

      <section className="grid gap-4 md:grid-cols-4">
        <StatusCard label="Shop status" value={shop.status} />
        <StatusCard label="UniFi" value={shop.unifiIntegration?.connectionStatus ?? "UNTESTED"} />
        <StatusCard label="Stripe" value={shop.stripeChargesEnabled ? "CONNECTED" : "INCOMPLETE"} />
        <StatusCard label="Free policy" value={`${shop.freeMinutesPerDay} min daily`} />
      </section>

      <section className="grid gap-4 md:grid-cols-4">
        <StatusCard label="Portal visits today" value={String(portalVisits)} />
        <StatusCard label="Free grants today" value={String(freeGrants)} />
        <StatusCard label="Paid passes today" value={String(paidPasses)} />
        <StatusCard label="Voucher redemptions" value={String(vouchers)} />
        <StatusCard label="Gross revenue today" value={`$${(gross / 100).toFixed(0)}`} />
        <StatusCard label="Cafe share today" value={`$${(cafeShare / 100).toFixed(0)}`} />
        <StatusCard label="Platform fee today" value={`$${(platformFee / 100).toFixed(0)}`} />
        <StatusCard label="Failed authorizations" value={String(failures)} />
        <StatusCard label="30-day revenue" value={`$${((thirtyDayRevenue._sum.amountCents ?? 0) / 100).toFixed(0)}`} />
        <StatusCard label="30-day free grants" value={String(thirtyDayFree)} />
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="surface grid gap-4 p-4">
          <div className="flex items-center gap-2">
            <Wifi size={18} />
            <h2 className="text-xl font-semibold">UniFi integration</h2>
          </div>
          <UnifiSettingsForm
            shopId={shop.id}
            defaults={{
              apiBaseUrl: shop.unifiIntegration?.apiBaseUrl,
              siteId: shop.unifiIntegration?.siteId,
              allowedSsids: shop.unifiIntegration?.allowedSsids,
            }}
          />
        </div>

        <div className="surface grid gap-4 p-4">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <CreditCard size={18} />
              <h2 className="text-xl font-semibold">Stripe</h2>
            </div>
            <form action={`/api/admin/shops/${shop.id}/stripe/connect/start`} method="post">
              <button className="rounded-md bg-[var(--foreground)] px-3 py-2 text-sm font-semibold text-white">
                Connect
              </button>
            </form>
          </div>
          <p className="text-sm text-[var(--muted)]">{shop.stripeConnectedAccountId ?? "No connected account yet."}</p>
        </div>
      </section>

      <section className="surface grid gap-4 p-4">
        <div className="flex items-center gap-2">
          <Ticket size={18} />
          <h2 className="text-xl font-semibold">Price plans</h2>
        </div>
        <PricePlanForm shopId={shop.id} plans={shop.pricePlans} />
      </section>
    </main>
  );
}
