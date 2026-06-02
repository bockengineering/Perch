import Link from "next/link";
import { AlertTriangle, CreditCard, Store, Wifi } from "lucide-react";
import { BrandWordmark } from "@/components/BrandWordmark";
import { getPrisma } from "@/lib/db";
import { startOfTodayUtc } from "@/lib/utils/time";

export const dynamic = "force-dynamic";

function MetricCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="surface p-4">
      <p className="text-sm text-[var(--muted)]">{label}</p>
      <p className="metric mt-2 text-3xl font-semibold">{value}</p>
    </div>
  );
}

export default async function AdminDashboardPage() {
  const prisma = getPrisma();
  const today = startOfTodayUtc();
  const [activeShops, brokenUniFi, brokenStripe, paidToday, platformRevenue, failedAuths, webhookFailures] =
    await Promise.all([
      prisma.shop.count({ where: { status: "ACTIVE" } }),
      prisma.shop.count({
        where: {
          status: "ACTIVE",
          unifiIntegration: { connectionStatus: "FAILED" },
        },
      }),
      prisma.shop.count({
        where: {
          status: "ACTIVE",
          OR: [{ stripeChargesEnabled: false }, { stripePayoutsEnabled: false }],
        },
      }),
      prisma.order.count({ where: { paidAt: { gte: today } } }),
      prisma.order.aggregate({
        where: { paidAt: { gte: today }, status: { in: ["PAID", "AUTHORIZED"] } },
        _sum: { platformFeeCents: true },
      }),
      prisma.accessGrant.count({ where: { status: "FAILED", createdAt: { gte: today } } }),
      prisma.webhookEvent.count({ where: { error: { not: null }, createdAt: { gte: today } } }),
    ]);

  return (
    <main className="mx-auto grid max-w-6xl gap-6 px-6 py-8">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border)] pb-5">
        <div>
          <BrandWordmark className="app-wordmark" width={104} height={46} priority />
          <h1 className="text-3xl font-semibold">Platform dashboard</h1>
        </div>
        <Link className="rounded-md bg-[var(--foreground)] px-4 py-2 text-sm font-semibold text-white" href="/admin/shops">
          Shops
        </Link>
      </header>

      <section className="grid gap-4 md:grid-cols-4">
        <MetricCard label="Active shops" value={activeShops} />
        <MetricCard label="Payments today" value={paidToday} />
        <MetricCard label="Platform revenue today" value={`$${((platformRevenue._sum.platformFeeCents ?? 0) / 100).toFixed(0)}`} />
        <MetricCard label="Failed authorizations" value={failedAuths} />
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <div className="surface flex items-start gap-3 p-4">
          <Wifi className="mt-1 text-[var(--accent)]" size={20} />
          <div>
            <p className="font-semibold">UniFi</p>
            <p className="text-sm text-[var(--muted)]">{brokenUniFi} active shops need attention.</p>
          </div>
        </div>
        <div className="surface flex items-start gap-3 p-4">
          <CreditCard className="mt-1 text-[var(--accent)]" size={20} />
          <div>
            <p className="font-semibold">Stripe</p>
            <p className="text-sm text-[var(--muted)]">{brokenStripe} active shops have incomplete Stripe status.</p>
          </div>
        </div>
        <div className="surface flex items-start gap-3 p-4">
          <AlertTriangle className="mt-1 text-[var(--warning)]" size={20} />
          <div>
            <p className="font-semibold">Webhooks</p>
            <p className="text-sm text-[var(--muted)]">{webhookFailures} webhook failures today.</p>
          </div>
        </div>
      </section>

      <Link href="/admin/shops" className="surface flex items-center gap-3 p-4">
        <Store size={20} />
        <span className="font-semibold">Manage shops</span>
      </Link>
    </main>
  );
}
