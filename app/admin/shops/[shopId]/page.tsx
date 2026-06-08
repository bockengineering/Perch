import Link from "next/link";
import { notFound } from "next/navigation";
import { Activity, AlertTriangle, CreditCard, Settings, ShieldCheck, Ticket, Users, Wifi } from "lucide-react";
import { BrandWordmark } from "@/components/BrandWordmark";
import { PricePlanForm } from "@/components/admin/PricePlanForm";
import { UnifiSettingsForm } from "@/components/admin/UnifiSettingsForm";
import { CafeAnalyticsChart } from "@/components/cafe/CafeAnalyticsChart";
import { CafeMembersPanel } from "@/components/cafe/CafeMembersPanel";
import { CafeSettingsForm } from "@/components/cafe/CafeSettingsForm";
import { EmergencyFreeAccessControl } from "@/components/cafe/EmergencyFreeAccessControl";
import { VoucherCreateForm } from "@/components/staff/VoucherCreateForm";
import { getPrisma } from "@/lib/db";
import { getShopAnalytics } from "@/lib/services/shop-analytics";
import { isSupabaseAdminConfigured } from "@/lib/auth/supabase";
import { startOfTodayUtc } from "@/lib/utils/time";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ shopId: string }>;
};

function money(cents: number) {
  return `$${(cents / 100).toFixed(0)}`;
}

function StatusCard({ label, value, detail }: { label: string; value: string | number; detail?: string }) {
  return (
    <div className="surface p-4">
      <p className="text-sm text-[var(--muted)]">{label}</p>
      <p className="metric mt-2 text-2xl font-semibold">{value}</p>
      {detail ? <p className="mt-1 text-xs text-[var(--muted)]">{detail}</p> : null}
    </div>
  );
}

function SectionTitle({
  icon: Icon,
  title,
  detail,
}: {
  icon: typeof Settings;
  title: string;
  detail?: string;
}) {
  return (
    <div className="flex items-start gap-2">
      <Icon className="mt-1" size={18} />
      <div>
        <h2 className="text-xl font-semibold">{title}</h2>
        {detail ? <p className="text-sm text-[var(--muted)]">{detail}</p> : null}
      </div>
    </div>
  );
}

function StatusPill({ value }: { value: string }) {
  const normalized = value.toUpperCase();
  const statusClass =
    normalized.includes("CONNECTED") ||
    normalized.includes("ACTIVE") ||
    normalized.includes("AUTHORIZED") ||
    normalized.includes("PAID")
      ? "status-ok"
      : normalized.includes("FAILED") || normalized.includes("DISABLED") || normalized.includes("INCOMPLETE")
        ? "status-danger"
        : "status-warning";
  return <span className={`status-pill ${statusClass}`}>{value}</span>;
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
  const [
    portalVisits,
    freeGrants,
    paidPasses,
    revenue,
    vouchers,
    failures,
    thirtyDayRevenue,
    thirtyDayFree,
    activeGrants,
    members,
    recentOrders,
    recentGrants,
    recentFailures,
    recentVouchers,
    analytics,
  ] = await Promise.all([
    prisma.portalSession.count({ where: { shopId: shop.id, createdAt: { gte: today } } }),
    prisma.accessGrant.count({
      where: {
        shopId: shop.id,
        createdAt: { gte: today },
        type: { in: ["FREE_AUTO_WORKER", "FREE_PORTAL_FAST_PATH", "EMERGENCY_FREE"] },
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
      _sum: { amountCents: true, platformFeeCents: true },
    }),
    prisma.accessGrant.count({
      where: {
        shopId: shop.id,
        createdAt: { gte: thirtyDaysAgo },
        type: { in: ["FREE_AUTO_WORKER", "FREE_PORTAL_FAST_PATH", "EMERGENCY_FREE"] },
      },
    }),
    prisma.accessGrant.count({
      where: { shopId: shop.id, status: "AUTHORIZED", expiresAt: { gt: new Date() } },
    }),
    prisma.shopMember.findMany({
      where: { shopId: shop.id },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            supabaseUserId: true,
            lastLoginAt: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.order.findMany({
      where: { shopId: shop.id },
      include: { pricePlan: { select: { label: true } } },
      orderBy: { createdAt: "desc" },
      take: 8,
    }),
    prisma.accessGrant.findMany({
      where: { shopId: shop.id },
      orderBy: { createdAt: "desc" },
      take: 8,
    }),
    prisma.networkActionLog.findMany({
      where: { shopId: shop.id, status: "FAILED" },
      orderBy: { createdAt: "desc" },
      take: 8,
    }),
    prisma.voucher.findMany({
      where: { shopId: shop.id },
      orderBy: { createdAt: "desc" },
      take: 8,
    }),
    getShopAnalytics({ id: shop.id, timezone: shop.timezone }),
  ]);

  const gross = revenue._sum.amountCents ?? 0;
  const platformFee = revenue._sum.platformFeeCents ?? 0;
  const cafeShare = gross - platformFee;
  const thirtyDayGross = thirtyDayRevenue._sum.amountCents ?? 0;
  const thirtyDayPlatformFee = thirtyDayRevenue._sum.platformFeeCents ?? 0;
  const emergencyFreeActive = Boolean(shop.emergencyFreeUntil && shop.emergencyFreeUntil > new Date());
  const stripeStatus = shop.stripeChargesEnabled && shop.stripePayoutsEnabled ? "CONNECTED" : "INCOMPLETE";
  const unifiStatus = shop.unifiIntegration?.connectionStatus ?? "UNTESTED";

  return (
    <main className="mx-auto grid max-w-6xl gap-6 px-6 py-8">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border)] pb-5">
        <div>
          <BrandWordmark className="app-wordmark" width={104} height={46} priority />
          <p className="mt-3 text-sm font-semibold text-[var(--accent)]">Platform admin</p>
          <h1 className="text-3xl font-semibold">{shop.name}</h1>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Device-based free access is useful, but private address rotation can create extra grants.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <StatusPill value={shop.status} />
            <StatusPill value={`UniFi ${unifiStatus}`} />
            <StatusPill value={`Stripe ${stripeStatus}`} />
            {emergencyFreeActive ? <StatusPill value="Free until midnight" /> : null}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/admin" className="rounded-md border border-[var(--border)] px-4 py-2 text-sm font-semibold">
            Dashboard
          </Link>
          <Link href="/admin/shops" className="rounded-md border border-[var(--border)] px-4 py-2 text-sm font-semibold">
            Shops
          </Link>
          <Link href={`/p/${shop.slug}`} className="rounded-md bg-[var(--foreground)] px-4 py-2 text-sm font-semibold text-white">
            Portal
          </Link>
        </div>
      </header>

      <section className="grid gap-4 md:grid-cols-4">
        <StatusCard label="Shop status" value={shop.status} detail={shop.slug} />
        <StatusCard label="UniFi" value={unifiStatus} detail={shop.unifiIntegration?.siteName ?? "No site selected"} />
        <StatusCard label="Stripe" value={stripeStatus} detail={shop.stripeConnectedAccountId ?? "No account"} />
        <StatusCard label="Free policy" value={`${shop.freeMinutesPerDay} min`} detail={`${shop.timezone} daily reset`} />
      </section>

      <section className="grid gap-4 md:grid-cols-4">
        <StatusCard label="Portal visits today" value={portalVisits} />
        <StatusCard label="Free grants today" value={freeGrants} detail={`${thirtyDayFree} in 30 days`} />
        <StatusCard label="Active guest grants" value={activeGrants} />
        <StatusCard label="Voucher redemptions" value={vouchers} />
        <StatusCard label="Paid passes today" value={paidPasses} />
        <StatusCard label="Gross today" value={money(gross)} detail={`${money(thirtyDayGross)} in 30 days`} />
        <StatusCard label="Cafe share today" value={money(cafeShare)} />
        <StatusCard label="Platform fee today" value={money(platformFee)} detail={`${money(thirtyDayPlatformFee)} in 30 days`} />
        <StatusCard label="Failed auths today" value={failures} />
      </section>

      <section className="surface grid gap-4 p-4">
        <SectionTitle
          icon={Activity}
          title="Cafe analytics"
          detail="Toggle between daily and monthly views for portal traffic, grants, payments, staff codes, and failed authorizations."
        />
        <CafeAnalyticsChart analytics={analytics} />
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="surface grid gap-4 p-4">
          <SectionTitle
            icon={ShieldCheck}
            title="Emergency free access"
            detail="If payments, Stripe, or guest support are blocking the counter, make every allowed guest free until the cafe's local midnight."
          />
          <EmergencyFreeAccessControl
            shopId={shop.id}
            emergencyFreeUntil={shop.emergencyFreeUntil?.toISOString() ?? null}
            timezone={shop.timezone}
          />
        </div>

        <div className="surface grid gap-4 p-4">
          <SectionTitle icon={Settings} title="Cafe settings" detail="Change the policy and support details guests experience." />
          <CafeSettingsForm
            shop={{
              id: shop.id,
              name: shop.name,
              timezone: shop.timezone,
              status: shop.status,
              freeMinutesPerDay: shop.freeMinutesPerDay,
              checkoutGraceMinutes: shop.checkoutGraceMinutes,
              maxCheckoutGracePerDay: shop.maxCheckoutGracePerDay,
              platformFeeBps: shop.platformFeeBps,
              supportEmail: shop.supportEmail,
              brandLogoUrl: shop.brandLogoUrl,
              brandPrimaryColor: shop.brandPrimaryColor,
            }}
            allowPlatformFee
          />
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="surface grid gap-4 p-4">
          <SectionTitle icon={Wifi} title="UniFi integration" detail="Test and save UniFi controller details without exposing the API key to browsers." />
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
          <SectionTitle
            icon={CreditCard}
            title="Stripe"
            detail="The cafe receives direct charges, pays Stripe processing fees, and Perch collects the configured application fee."
          />
          <div className="grid gap-3 text-sm">
            <div className="flex items-center justify-between border-b border-[var(--border)] pb-2">
              <span className="text-[var(--muted)]">Connected account</span>
              <strong>{shop.stripeConnectedAccountId ?? "Not connected"}</strong>
            </div>
            <div className="flex items-center justify-between border-b border-[var(--border)] pb-2">
              <span className="text-[var(--muted)]">Charges</span>
              <StatusPill value={shop.stripeChargesEnabled ? "Enabled" : "Incomplete"} />
            </div>
            <div className="flex items-center justify-between border-b border-[var(--border)] pb-2">
              <span className="text-[var(--muted)]">Payouts</span>
              <StatusPill value={shop.stripePayoutsEnabled ? "Enabled" : "Incomplete"} />
            </div>
            <div className="flex items-center justify-between border-b border-[var(--border)] pb-2">
              <span className="text-[var(--muted)]">Platform fee</span>
              <strong>{shop.platformFeeBps / 100}%</strong>
            </div>
            <form action={`/api/admin/shops/${shop.id}/stripe/connect/start`} method="post">
              <button className="rounded-md bg-[var(--foreground)] px-4 py-2 text-sm font-semibold text-white">
                Connect or refresh Stripe
              </button>
            </form>
          </div>
        </div>
      </section>

      <section className="surface grid gap-4 p-4">
        <SectionTitle icon={Ticket} title="Price plans" detail="Plans shown after the daily free hour has ended." />
        <PricePlanForm shopId={shop.id} plans={shop.pricePlans} />
      </section>

      <CafeMembersPanel
        shopId={shop.id}
        supabaseAdminConfigured={isSupabaseAdminConfigured()}
        members={members.map((member) => ({
          id: member.id,
          role: member.role,
          user: {
            ...member.user,
            lastLoginAt: member.user.lastLoginAt?.toISOString() ?? null,
          },
        }))}
      />

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="surface grid gap-4 p-4">
          <SectionTitle icon={Users} title="Create voucher" detail="Generate a staff code. The plaintext code is shown once, then only a hash is stored." />
          <VoucherCreateForm shopId={shop.id} framed={false} />
        </div>

        <div className="surface overflow-hidden">
          <div className="p-4">
            <SectionTitle icon={Activity} title="Recent orders" detail="Latest paid-pass attempts and completed purchases." />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-sm">
              <thead className="bg-[var(--panel-strong)]">
                <tr>
                  <th className="p-3 font-semibold">Created</th>
                  <th className="p-3 font-semibold">Plan</th>
                  <th className="p-3 font-semibold">Status</th>
                  <th className="p-3 font-semibold">Gross</th>
                  <th className="p-3 font-semibold">Fee</th>
                </tr>
              </thead>
              <tbody>
                {recentOrders.map((order) => (
                  <tr key={order.id} className="border-t border-[var(--border)]">
                    <td className="p-3 text-[var(--muted)]">{order.createdAt.toLocaleString()}</td>
                    <td className="p-3 font-semibold">{order.pricePlan.label}</td>
                    <td className="p-3">{order.status}</td>
                    <td className="p-3">{money(order.amountCents)}</td>
                    <td className="p-3">{money(order.platformFeeCents)}</td>
                  </tr>
                ))}
                {recentOrders.length === 0 ? (
                  <tr>
                    <td className="p-3 text-[var(--muted)]" colSpan={5}>
                      No paid pass attempts yet.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>

        <div className="surface overflow-hidden">
          <div className="p-4">
            <SectionTitle icon={AlertTriangle} title="Network failures" detail="Recent failed UniFi or mock-provider actions." />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-sm">
              <thead className="bg-[var(--panel-strong)]">
                <tr>
                  <th className="p-3 font-semibold">Created</th>
                  <th className="p-3 font-semibold">Action</th>
                  <th className="p-3 font-semibold">Error</th>
                </tr>
              </thead>
              <tbody>
                {recentFailures.map((failure) => (
                  <tr key={failure.id} className="border-t border-[var(--border)]">
                    <td className="p-3 text-[var(--muted)]">{failure.createdAt.toLocaleString()}</td>
                    <td className="p-3 font-semibold">{failure.action}</td>
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
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="surface overflow-hidden">
          <div className="p-4">
            <SectionTitle icon={Activity} title="Recent access grants" detail="Latest guest authorization attempts for this cafe." />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-sm">
              <thead className="bg-[var(--panel-strong)]">
                <tr>
                  <th className="p-3 font-semibold">Type</th>
                  <th className="p-3 font-semibold">Status</th>
                  <th className="p-3 font-semibold">Minutes</th>
                  <th className="p-3 font-semibold">Created</th>
                </tr>
              </thead>
              <tbody>
                {recentGrants.map((grant) => (
                  <tr key={grant.id} className="border-t border-[var(--border)]">
                    <td className="p-3 font-semibold">{grant.type.replaceAll("_", " ")}</td>
                    <td className="p-3">{grant.status}</td>
                    <td className="p-3">{grant.requestedMinutes}</td>
                    <td className="p-3 text-[var(--muted)]">{grant.createdAt.toLocaleString()}</td>
                  </tr>
                ))}
                {recentGrants.length === 0 ? (
                  <tr>
                    <td className="p-3 text-[var(--muted)]" colSpan={4}>
                      No access grants yet.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>

        <div className="surface overflow-hidden">
          <div className="p-4">
            <SectionTitle icon={Users} title="Recent vouchers" detail="Codes are stored as hashes; plaintext appears only at creation." />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-sm">
              <thead className="bg-[var(--panel-strong)]">
                <tr>
                  <th className="p-3 font-semibold">Label</th>
                  <th className="p-3 font-semibold">Status</th>
                  <th className="p-3 font-semibold">Uses</th>
                  <th className="p-3 font-semibold">Minutes</th>
                </tr>
              </thead>
              <tbody>
                {recentVouchers.map((voucher) => (
                  <tr key={voucher.id} className="border-t border-[var(--border)]">
                    <td className="p-3 font-semibold">{voucher.label}</td>
                    <td className="p-3">{voucher.status}</td>
                    <td className="p-3">
                      {voucher.redeemedCount}/{voucher.maxRedemptions}
                    </td>
                    <td className="p-3">{voucher.durationMinutes}</td>
                  </tr>
                ))}
                {recentVouchers.length === 0 ? (
                  <tr>
                    <td className="p-3 text-[var(--muted)]" colSpan={4}>
                      No vouchers created yet.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </main>
  );
}
