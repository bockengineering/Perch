import Link from "next/link";
import { cookies } from "next/headers";
import { AlertTriangle, CreditCard, LogOut, ReceiptText, ShieldCheck, Store, Ticket, Wifi } from "lucide-react";
import { BrandWordmark } from "@/components/BrandWordmark";
import { PlatformAdminCreateForm } from "@/components/admin/PlatformAdminCreateForm";
import { getPrisma } from "@/lib/db";
import { startOfTodayUtc } from "@/lib/utils/time";
import { PLATFORM_SESSION_COOKIE_NAME, verifyPlatformSessionCookie } from "@/lib/auth/platform-session";
import { isSupabaseAdminConfigured } from "@/lib/auth/supabase";

export const dynamic = "force-dynamic";

function MetricCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="surface p-4">
      <p className="text-sm text-[var(--muted)]">{label}</p>
      <p className="metric mt-2 text-3xl font-semibold">{value}</p>
    </div>
  );
}

function money(cents: number) {
  return `$${(cents / 100).toFixed(0)}`;
}

export default async function AdminDashboardPage() {
  const prisma = getPrisma();
  const today = startOfTodayUtc();
  const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
  const session = await verifyPlatformSessionCookie((await cookies()).get(PLATFORM_SESSION_COOKIE_NAME)?.value);
  const [
    totalShops,
    activeShops,
    draftShops,
    brokenUniFi,
    brokenStripe,
    paidToday,
    revenueToday,
    revenueThirtyDays,
    freeGrantsToday,
    voucherRedemptionsToday,
    activeGrants,
    failedAuths,
    webhookFailures,
    unhealthyShops,
    recentOrders,
    recentFailures,
    platformUsers,
  ] = await Promise.all([
      prisma.shop.count(),
      prisma.shop.count({ where: { status: "ACTIVE" } }),
      prisma.shop.count({ where: { status: "DRAFT" } }),
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
        _sum: { amountCents: true, platformFeeCents: true },
      }),
      prisma.order.aggregate({
        where: { paidAt: { gte: thirtyDaysAgo }, status: { in: ["PAID", "AUTHORIZED"] } },
        _sum: { amountCents: true, platformFeeCents: true },
      }),
      prisma.accessGrant.count({
        where: {
          createdAt: { gte: today },
          status: "AUTHORIZED",
          type: { in: ["FREE_AUTO_WORKER", "FREE_PORTAL_FAST_PATH", "EMERGENCY_FREE"] },
        },
      }),
      prisma.voucherRedemption.count({ where: { redeemedAt: { gte: today } } }),
      prisma.accessGrant.count({ where: { status: "AUTHORIZED", expiresAt: { gt: new Date() } } }),
      prisma.accessGrant.count({ where: { status: "FAILED", createdAt: { gte: today } } }),
      prisma.webhookEvent.count({ where: { error: { not: null }, createdAt: { gte: today } } }),
      prisma.shop.findMany({
        where: {
          OR: [
            { status: { in: ["DRAFT", "PAUSED", "DISABLED"] } },
            { unifiIntegration: { connectionStatus: "FAILED" } },
            { stripeChargesEnabled: false },
            { stripePayoutsEnabled: false },
          ],
        },
        include: { unifiIntegration: true },
        orderBy: { updatedAt: "desc" },
        take: 8,
      }),
      prisma.order.findMany({
        include: {
          shop: { select: { id: true, name: true } },
          pricePlan: { select: { label: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 8,
      }),
      prisma.networkActionLog.findMany({
        where: { status: "FAILED" },
        include: { shop: { select: { id: true, name: true } } },
        orderBy: { createdAt: "desc" },
        take: 8,
      }),
      prisma.platformUser.findMany({
        include: { user: { select: { id: true, email: true, name: true, supabaseUserId: true, lastLoginAt: true } } },
        orderBy: { createdAt: "desc" },
      }),
    ]);
  const grossToday = revenueToday._sum.amountCents ?? 0;
  const platformFeeToday = revenueToday._sum.platformFeeCents ?? 0;
  const cafeShareToday = grossToday - platformFeeToday;
  const grossThirtyDays = revenueThirtyDays._sum.amountCents ?? 0;
  const platformFeeThirtyDays = revenueThirtyDays._sum.platformFeeCents ?? 0;

  return (
    <main className="mx-auto grid max-w-6xl gap-6 px-6 py-8">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border)] pb-5">
        <div>
          <BrandWordmark className="app-wordmark" width={104} height={46} priority />
          <h1 className="text-3xl font-semibold">Platform dashboard</h1>
          <p className="mt-1 text-sm text-[var(--muted)]">
            {session?.email ?? "Platform admin"} can manage shops, accounts, payments, and access health.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link className="rounded-md bg-[var(--foreground)] px-4 py-2 text-sm font-semibold text-white" href="/admin/shops">
            Shops
          </Link>
          <form action="/api/admin/logout" method="post">
            <button className="inline-flex items-center justify-center gap-2 rounded-md border border-[var(--border)] bg-white px-4 py-2 text-sm font-semibold">
              <LogOut size={16} />
              Sign out
            </button>
          </form>
        </div>
      </header>

      <section className="grid gap-4 md:grid-cols-4">
        <MetricCard label="Total shops" value={totalShops} />
        <MetricCard label="Active shops" value={activeShops} />
        <MetricCard label="Draft shops" value={draftShops} />
        <MetricCard label="Payments today" value={paidToday} />
      </section>

      <section className="grid gap-4 md:grid-cols-4">
        <MetricCard label="Gross today" value={money(grossToday)} />
        <MetricCard label="Cafe share today" value={money(cafeShareToday)} />
        <MetricCard label="Platform fee today" value={money(platformFeeToday)} />
        <MetricCard label="30-day platform fee" value={money(platformFeeThirtyDays)} />
      </section>

      <section className="grid gap-4 md:grid-cols-4">
        <MetricCard label="Free grants today" value={freeGrantsToday} />
        <MetricCard label="Voucher redemptions" value={voucherRedemptionsToday} />
        <MetricCard label="Active grants now" value={activeGrants} />
        <MetricCard label="Failed auths today" value={failedAuths} />
        <MetricCard label="30-day gross" value={money(grossThirtyDays)} />
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

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="surface overflow-hidden">
          <div className="flex items-center gap-2 p-4">
            <Store size={18} />
            <h2 className="text-xl font-semibold">Shops needing attention</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-sm">
              <thead className="bg-[var(--panel-strong)]">
                <tr>
                  <th className="p-3 font-semibold">Shop</th>
                  <th className="p-3 font-semibold">Status</th>
                  <th className="p-3 font-semibold">UniFi</th>
                  <th className="p-3 font-semibold">Stripe</th>
                </tr>
              </thead>
              <tbody>
                {unhealthyShops.map((shop) => (
                  <tr key={shop.id} className="border-t border-[var(--border)]">
                    <td className="p-3">
                      <Link href={`/admin/shops/${shop.id}`} className="font-semibold">
                        {shop.name}
                      </Link>
                    </td>
                    <td className="p-3">{shop.status}</td>
                    <td className="p-3">{shop.unifiIntegration?.connectionStatus ?? "UNTESTED"}</td>
                    <td className="p-3">{shop.stripeChargesEnabled && shop.stripePayoutsEnabled ? "READY" : "INCOMPLETE"}</td>
                  </tr>
                ))}
                {unhealthyShops.length === 0 ? (
                  <tr>
                    <td className="p-3 text-[var(--muted)]" colSpan={4}>
                      No shop issues are currently flagged.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>

        <div className="surface overflow-hidden">
          <div className="flex items-center gap-2 p-4">
            <ReceiptText size={18} />
            <h2 className="text-xl font-semibold">Recent orders</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-sm">
              <thead className="bg-[var(--panel-strong)]">
                <tr>
                  <th className="p-3 font-semibold">Shop</th>
                  <th className="p-3 font-semibold">Plan</th>
                  <th className="p-3 font-semibold">Status</th>
                  <th className="p-3 font-semibold">Amount</th>
                </tr>
              </thead>
              <tbody>
                {recentOrders.map((order) => (
                  <tr key={order.id} className="border-t border-[var(--border)]">
                    <td className="p-3">
                      <Link href={`/admin/shops/${order.shop.id}`} className="font-semibold">
                        {order.shop.name}
                      </Link>
                    </td>
                    <td className="p-3">{order.pricePlan.label}</td>
                    <td className="p-3">{order.status}</td>
                    <td className="p-3">{money(order.amountCents)}</td>
                  </tr>
                ))}
                {recentOrders.length === 0 ? (
                  <tr>
                    <td className="p-3 text-[var(--muted)]" colSpan={4}>
                      No orders have been created yet.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="surface overflow-hidden">
          <div className="flex items-center gap-2 p-4">
            <AlertTriangle size={18} />
            <h2 className="text-xl font-semibold">Recent network failures</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-sm">
              <thead className="bg-[var(--panel-strong)]">
                <tr>
                  <th className="p-3 font-semibold">Shop</th>
                  <th className="p-3 font-semibold">Action</th>
                  <th className="p-3 font-semibold">Error</th>
                </tr>
              </thead>
              <tbody>
                {recentFailures.map((failure) => (
                  <tr key={failure.id} className="border-t border-[var(--border)]">
                    <td className="p-3">
                      <Link href={`/admin/shops/${failure.shop.id}`} className="font-semibold">
                        {failure.shop.name}
                      </Link>
                    </td>
                    <td className="p-3">{failure.action}</td>
                    <td className="p-3 text-[var(--muted)]">{failure.error ?? "No error text"}</td>
                  </tr>
                ))}
                {recentFailures.length === 0 ? (
                  <tr>
                    <td className="p-3 text-[var(--muted)]" colSpan={3}>
                      No recent network failures.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>

        <div className="surface grid gap-3 p-4">
          <div className="flex items-center gap-2">
            <Ticket size={18} />
            <h2 className="text-xl font-semibold">Quick actions</h2>
          </div>
          <Link href="/admin/shops" className="surface flex items-center justify-between gap-3 p-4">
            <span className="font-semibold">Create or edit shops</span>
            <Store size={18} />
          </Link>
          <Link href="/cafe/login" className="surface flex items-center justify-between gap-3 p-4">
            <span className="font-semibold">Open cafe-owner login</span>
            <ShieldCheck size={18} />
          </Link>
        </div>
      </section>

      <PlatformAdminCreateForm
        platformUsers={platformUsers.map((platformUser) => ({
          id: platformUser.id,
          role: platformUser.role,
          createdAt: platformUser.createdAt.toISOString(),
          user: {
            ...platformUser.user,
            lastLoginAt: platformUser.user.lastLoginAt?.toISOString() ?? null,
          },
        }))}
        supabaseAdminConfigured={isSupabaseAdminConfigured()}
      />
    </main>
  );
}
