import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { cookies } from "next/headers";
import {
  Activity,
  AlertTriangle,
  CreditCard,
  ExternalLink,
  KeyRound,
  LifeBuoy,
  PlugZap,
  ReceiptText,
  Settings,
  ShieldCheck,
  Ticket,
  Wifi,
} from "lucide-react";
import { BrandWordmark } from "@/components/BrandWordmark";
import { CafeSettingsForm } from "@/components/cafe/CafeSettingsForm";
import { EmergencyFreeAccessControl } from "@/components/cafe/EmergencyFreeAccessControl";
import { CafeMembersPanel } from "@/components/cafe/CafeMembersPanel";
import { PricePlanForm } from "@/components/admin/PricePlanForm";
import { UnifiSettingsForm } from "@/components/admin/UnifiSettingsForm";
import { VoucherCreateForm } from "@/components/staff/VoucherCreateForm";
import {
  CAFE_SESSION_COOKIE_NAME,
  verifyCafeSessionCookie,
} from "@/lib/auth/cafe-session";
import { hostedPreviewDemoEnabled, hostedPreviewShopId } from "@/lib/auth/hosted-preview";
import { isSupabaseAdminConfigured } from "@/lib/auth/supabase";
import { getPrisma } from "@/lib/db";
import { startOfTodayUtc } from "@/lib/utils/time";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ shopId: string }>;
};

function MetricCard({ label, value, detail }: { label: string; value: string | number; detail?: string }) {
  return (
    <div className="surface p-4">
      <p className="text-sm text-[var(--muted)]">{label}</p>
      <p className="metric mt-2 text-3xl font-semibold">{value}</p>
      {detail ? <p className="mt-2 text-xs text-[var(--muted)]">{detail}</p> : null}
    </div>
  );
}

function money(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

function formatTimeInZone(date: Date, timezone: string) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  }).format(date);
}

function statusTone(status: string | boolean | null | undefined) {
  if (status === true || status === "ACTIVE" || status === "CONNECTED" || status === "AUTHORIZED" || status === "PAID") {
    return "status-ok";
  }
  if (status === "FAILED" || status === "DISABLED" || status === false) {
    return "status-danger";
  }
  return "status-warning";
}

function StatusPill({ children, status }: { children: string; status?: string | boolean | null }) {
  return (
    <span className={`status-pill ${statusTone(status ?? children)}`}>
      {children}
    </span>
  );
}

function SectionTitle({
  icon: Icon,
  title,
  detail,
}: {
  icon: typeof Activity;
  title: string;
  detail?: string;
}) {
  return (
    <div className="flex items-start gap-2">
      <Icon size={18} className="mt-1 shrink-0" />
      <div>
        <h2 className="text-xl font-semibold">{title}</h2>
        {detail ? <p className="mt-1 text-sm text-[var(--muted)]">{detail}</p> : null}
      </div>
    </div>
  );
}

function HostedPreviewCafeConsole() {
  return (
    <main className="mx-auto grid max-w-6xl gap-6 px-6 py-8">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border)] pb-5">
        <div>
          <BrandWordmark className="app-wordmark" width={104} height={46} priority />
          <p className="mt-3 text-sm font-semibold text-[var(--accent)]">Cafe back office</p>
          <h1 className="text-3xl font-semibold">Demo Cafe</h1>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Preview console with mock cafe settings, transactions, and staff-code controls.
          </p>
        </div>
        <form action="/api/cafe/logout" method="post">
          <button className="rounded-md border border-[var(--border)] bg-white px-4 py-2 text-sm font-semibold" type="submit">
            Sign out
          </button>
        </form>
      </header>

      <section className="surface border-l-4 border-l-[var(--foreground)] p-4">
        <h2 className="text-lg font-semibold">Hosted preview mode</h2>
        <p className="mt-2 text-sm text-[var(--muted)]">
          This deployment is not connected to the live Postgres runtime yet, so forms are shown as a safe preview.
          Once Vercel has `DATABASE_URL` and the Supabase server keys, this same screen becomes fully live.
        </p>
      </section>

      <section className="grid gap-4 md:grid-cols-4">
        <MetricCard label="Paid passes today" value={9} />
        <MetricCard label="Gross today" value="$48.00" />
        <MetricCard label="Cafe share today" value="$24.00" />
        <MetricCard label="Voucher uses today" value={14} />
        <MetricCard label="30-day gross" value="$1,280.00" />
        <MetricCard label="30-day cafe share" value="$640.00" />
        <MetricCard label="UniFi status" value="CONNECTED" />
        <MetricCard label="Failed auths today" value={0} />
      </section>

      <section className="grid gap-4 lg:grid-cols-[1fr_380px]">
        <div className="surface grid gap-4 p-4">
          <div className="flex items-center gap-2">
            <ReceiptText size={18} />
            <h2 className="text-xl font-semibold">Transactions</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-sm">
              <thead className="bg-[var(--panel-strong)]">
                <tr>
                  <th className="p-3 font-semibold">Created</th>
                  <th className="p-3 font-semibold">Plan</th>
                  <th className="p-3 font-semibold">Status</th>
                  <th className="p-3 font-semibold">Gross</th>
                  <th className="p-3 font-semibold">Cafe share</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ["Today, 9:18 AM", "2 more hours", "AUTHORIZED", "$5.00", "$2.50"],
                  ["Today, 10:42 AM", "All day", "AUTHORIZED", "$8.00", "$4.00"],
                  ["Today, 12:05 PM", "2 more hours", "PAID", "$5.00", "$2.50"],
                ].map((row, rowIndex) => (
                  <tr key={row.join("-")} className="border-t border-[var(--border)]">
                    {row.map((cell, index) => (
                      <td key={`${rowIndex}-${index}`} className={index === 1 ? "p-3 font-semibold" : "p-3"}>
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="surface grid gap-4 p-4">
          <div className="flex items-center gap-2">
            <Ticket size={18} />
            <h2 className="text-xl font-semibold">Staff codes</h2>
          </div>
          <div className="grid gap-3 text-sm">
            <div className="rounded-md border border-[var(--border)] p-3">
              <p className="font-semibold">Receipt code</p>
              <p className="mt-1 text-[var(--muted)]">2 hours, max 1 redemption, expires tonight.</p>
            </div>
            <div className="rounded-md border border-[var(--border)] p-3">
              <p className="font-semibold">Manager override</p>
              <p className="mt-1 text-[var(--muted)]">All day comp for regular customers or support recovery.</p>
            </div>
            <div className="rounded-md bg-[var(--foreground)] px-4 py-2 text-center text-sm font-semibold text-white">
              Create code in live mode
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="surface grid gap-4 p-4">
          <div className="flex items-center gap-2">
            <Settings size={18} />
            <h2 className="text-xl font-semibold">Cafe settings</h2>
          </div>
          <div className="grid gap-3 text-sm">
            <div className="flex justify-between border-b border-[var(--border)] pb-2">
              <span className="text-[var(--muted)]">Daily free access</span>
              <strong>60 minutes</strong>
            </div>
            <div className="flex justify-between border-b border-[var(--border)] pb-2">
              <span className="text-[var(--muted)]">Timezone</span>
              <strong>America/Los_Angeles</strong>
            </div>
            <div className="flex justify-between border-b border-[var(--border)] pb-2">
              <span className="text-[var(--muted)]">Allowed SSID</span>
              <strong>DemoGuest</strong>
            </div>
            <div className="flex justify-between">
              <span className="text-[var(--muted)]">Checkout grace</span>
              <strong>5 minutes</strong>
            </div>
          </div>
        </div>

        <div className="surface grid gap-4 p-4">
          <div className="flex items-center gap-2">
            <CreditCard size={18} />
            <h2 className="text-xl font-semibold">Paid plans</h2>
          </div>
          <div className="grid gap-2 text-sm">
            <div className="flex items-center justify-between border-b border-[var(--border)] py-2">
              <span className="font-semibold">2 more hours</span>
              <span>$5.00 / 120 min</span>
            </div>
            <div className="flex items-center justify-between border-b border-[var(--border)] py-2">
              <span className="font-semibold">All day</span>
              <span>$8.00 / 720 min</span>
            </div>
          </div>
        </div>
      </section>

      <section className="surface grid gap-3 p-4">
        <div className="flex items-center gap-2">
          <Wifi size={18} />
          <h2 className="text-xl font-semibold">Network status</h2>
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          <div>
            <p className="text-sm text-[var(--muted)]">UniFi</p>
            <p className="mt-2 font-semibold">Mock integration connected</p>
          </div>
          <div>
            <p className="text-sm text-[var(--muted)]">Stripe</p>
            <p className="mt-2 font-semibold">Preview account incomplete</p>
          </div>
          <div>
            <p className="text-sm text-[var(--muted)]">Free reset</p>
            <p className="mt-2 font-semibold">Daily at local midnight</p>
          </div>
        </div>
      </section>
    </main>
  );
}

export default async function CafeShopPage({ params }: PageProps) {
  const { shopId } = await params;
  const session = await verifyCafeSessionCookie((await cookies()).get(CAFE_SESSION_COOKIE_NAME)?.value);
  if (!session) {
    redirect(`/cafe/login?next=/cafe/shops/${shopId}`);
  }
  if (!session.shopIds?.includes(shopId)) {
    notFound();
  }

  if (hostedPreviewDemoEnabled() && shopId === hostedPreviewShopId) {
    return <HostedPreviewCafeConsole />;
  }

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

  const isOwner = session.role === "SHOP_OWNER";
  const now = new Date();
  const today = startOfTodayUtc();
  const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
  const [
    portalVisitsToday,
    freeGrantsToday,
    activeGrants,
    devicesSeenToday,
    checkoutGraceToday,
    paidToday,
    revenueToday,
    voucherRedemptions,
    failedAuths,
    thirtyDayRevenue,
    thirtyDayFreeGrants,
    transactions,
    recentGrants,
    recentVouchers,
    recentRedemptions,
    recentNetworkFailures,
    members,
  ] = await Promise.all([
    prisma.portalSession.count({ where: { shopId: shop.id, createdAt: { gte: today } } }),
    prisma.accessGrant.count({
      where: {
        shopId: shop.id,
        createdAt: { gte: today },
        type: { in: ["FREE_AUTO_WORKER", "FREE_PORTAL_FAST_PATH", "EMERGENCY_FREE"] },
      },
    }),
    prisma.accessGrant.count({
      where: {
        shopId: shop.id,
        status: "AUTHORIZED",
        expiresAt: { gt: now },
      },
    }),
    prisma.device.count({ where: { shopId: shop.id, lastSeenAt: { gte: today } } }),
    prisma.accessGrant.count({ where: { shopId: shop.id, type: "CHECKOUT_GRACE", createdAt: { gte: today } } }),
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
    prisma.order.findMany({
      where: { shopId: shop.id },
      include: { pricePlan: true },
      orderBy: { createdAt: "desc" },
      take: 12,
    }),
    prisma.accessGrant.findMany({
      where: { shopId: shop.id },
      orderBy: { createdAt: "desc" },
      take: 10,
      select: {
        id: true,
        type: true,
        status: true,
        requestedMinutes: true,
        createdAt: true,
        expiresAt: true,
        failureReason: true,
        source: true,
      },
    }),
    prisma.voucher.findMany({
      where: { shopId: shop.id },
      orderBy: { createdAt: "desc" },
      take: 8,
    }),
    prisma.voucherRedemption.findMany({
      where: { shopId: shop.id },
      include: { voucher: true },
      orderBy: { redeemedAt: "desc" },
      take: 8,
    }),
    prisma.networkActionLog.findMany({
      where: { shopId: shop.id, status: "FAILED" },
      orderBy: { createdAt: "desc" },
      take: 5,
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
  ]);

  const grossToday = revenueToday._sum.amountCents ?? 0;
  const platformFeeToday = revenueToday._sum.platformFeeCents ?? 0;
  const cafeShareToday = grossToday - platformFeeToday;
  const thirtyDayGross = thirtyDayRevenue._sum.amountCents ?? 0;
  const thirtyDayShare = thirtyDayGross - (thirtyDayRevenue._sum.platformFeeCents ?? 0);
  const ownerCount = members.filter((member) => member.role === "SHOP_OWNER").length;
  const staffCount = members.filter((member) => member.role === "STAFF").length;
  const stripeStatus = shop.stripeChargesEnabled && shop.stripePayoutsEnabled ? "CONNECTED" : "INCOMPLETE";
  const unifiStatus = shop.unifiIntegration?.connectionStatus ?? "UNTESTED";
  const emergencyFreeActive = Boolean(shop.emergencyFreeUntil && shop.emergencyFreeUntil > now);
  const setupItems = [
    { label: "Cafe is active", complete: shop.status === "ACTIVE", detail: shop.status },
    { label: "UniFi connected", complete: unifiStatus === "CONNECTED", detail: unifiStatus },
    { label: "Stripe payouts ready", complete: stripeStatus === "CONNECTED", detail: stripeStatus },
    { label: "Paid plans configured", complete: shop.pricePlans.some((plan) => plan.active), detail: `${shop.pricePlans.length} plans` },
    { label: "Support email set", complete: Boolean(shop.supportEmail), detail: shop.supportEmail ?? "Missing" },
    { label: "Staff access ready", complete: members.length > 0, detail: `${ownerCount} owner / ${staffCount} staff` },
  ];

  return (
    <main className="mx-auto grid max-w-6xl gap-6 px-6 py-8">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border)] pb-5">
        <div>
          <BrandWordmark className="app-wordmark" width={104} height={46} priority />
          <p className="mt-3 text-sm font-semibold text-[var(--accent)]">Cafe console</p>
          <h1 className="text-3xl font-semibold">{shop.name}</h1>
          <div className="mt-3 flex flex-wrap gap-2">
            <StatusPill status={shop.status}>{shop.status}</StatusPill>
            <StatusPill status={unifiStatus}>{`UniFi ${unifiStatus}`}</StatusPill>
            <StatusPill status={stripeStatus}>{`Stripe ${stripeStatus}`}</StatusPill>
            {emergencyFreeActive ? <StatusPill status="ACTIVE">Free until midnight</StatusPill> : null}
            <StatusPill status={isOwner ? "ACTIVE" : "PAUSED"}>{isOwner ? "Owner" : "Staff"}</StatusPill>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href={`/staff/shops/${shop.id}/vouchers`}
            className="rounded-md border border-[var(--border)] px-4 py-2 text-sm font-semibold"
          >
            Staff codes
          </Link>
          <Link
            href={`/p/${shop.slug}`}
            className="rounded-md bg-[var(--foreground)] px-4 py-2 text-sm font-semibold text-white"
          >
            Portal
          </Link>
          <form action="/api/cafe/logout" method="post">
            <button className="rounded-md border border-[var(--border)] bg-white px-4 py-2 text-sm font-semibold" type="submit">
              Sign out
            </button>
          </form>
        </div>
      </header>

      <section className="grid gap-4 md:grid-cols-4">
        <MetricCard label="Portal visits today" value={portalVisitsToday} detail="Captive portal opens" />
        <MetricCard label="Free grants today" value={freeGrantsToday} detail={`${thirtyDayFreeGrants} in 30 days`} />
        <MetricCard label="Active guest grants" value={activeGrants} detail="Currently authorized" />
        <MetricCard label="Devices seen today" value={devicesSeenToday} detail="Hashed device identity" />
        {isOwner ? (
          <>
            <MetricCard
              label="Emergency free"
              value={emergencyFreeActive ? "On" : "Off"}
              detail={emergencyFreeActive && shop.emergencyFreeUntil ? `Until ${formatTimeInZone(shop.emergencyFreeUntil, shop.timezone)}` : "Owner-controlled override"}
            />
            <MetricCard label="Paid passes today" value={paidToday} detail={`${transactions.length} recent orders loaded`} />
            <MetricCard label="Gross today" value={money(grossToday)} detail={`${money(thirtyDayGross)} in 30 days`} />
            <MetricCard label="Cafe share today" value={money(cafeShareToday)} detail={`${money(thirtyDayShare)} in 30 days`} />
            <MetricCard label="Checkout grace" value={checkoutGraceToday} detail="Temporary Stripe access grants" />
          </>
        ) : null}
        <MetricCard label="Voucher uses today" value={voucherRedemptions} detail="Staff-code redemptions" />
        <MetricCard label="Failed auths today" value={failedAuths} detail="Needs staff attention" />
      </section>

      {isOwner ? (
        <div className="grid gap-4 lg:grid-cols-[1fr_380px]">
          <section className="surface grid gap-4 p-4">
            <SectionTitle icon={ShieldCheck} title="Launch checklist" detail="The items a cafe owner should verify before sending real guests through Perch." />
            <div className="grid gap-3 md:grid-cols-2">
              {setupItems.map((item) => (
                <div key={item.label} className="rounded-md border border-[var(--border)] p-3">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-semibold">{item.label}</p>
                    <StatusPill status={item.complete}>{item.complete ? "Ready" : "Needs setup"}</StatusPill>
                  </div>
                  <p className="mt-2 text-sm text-[var(--muted)]">{item.detail}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="surface grid gap-4 p-4">
            <SectionTitle
              icon={AlertTriangle}
              title="Emergency free access"
              detail="If payments or guest support break, make every allowed guest free until this cafe's local midnight."
            />
            <EmergencyFreeAccessControl
              shopId={shop.id}
              emergencyFreeUntil={shop.emergencyFreeUntil?.toISOString() ?? null}
              timezone={shop.timezone}
            />
          </section>
        </div>
      ) : (
        <section className="surface p-4">
          <SectionTitle
            icon={KeyRound}
            title="Staff workspace"
            detail="Staff can create and review voucher codes. Pricing, integrations, and account management stay with cafe owners."
          />
        </section>
      )}

      <section className="grid gap-4 lg:grid-cols-[1fr_380px]">
        {isOwner ? (
          <div className="surface grid gap-4 p-4">
            <SectionTitle icon={ReceiptText} title="Transactions" detail="Recent paid Wi-Fi pass activity from Stripe Checkout." />
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-sm">
                <thead className="bg-[var(--panel-strong)]">
                  <tr>
                    <th className="p-3 font-semibold">Created</th>
                    <th className="p-3 font-semibold">Plan</th>
                    <th className="p-3 font-semibold">Status</th>
                    <th className="p-3 font-semibold">Gross</th>
                    <th className="p-3 font-semibold">Cafe share</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((order) => (
                    <tr key={order.id} className="border-t border-[var(--border)]">
                      <td className="p-3 text-[var(--muted)]">{order.createdAt.toLocaleString()}</td>
                      <td className="p-3 font-semibold">{order.pricePlan.label}</td>
                      <td className="p-3">
                        <StatusPill status={order.status}>{order.status}</StatusPill>
                      </td>
                      <td className="p-3">{money(order.amountCents)}</td>
                      <td className="p-3">{money(order.amountCents - order.platformFeeCents)}</td>
                    </tr>
                  ))}
                  {transactions.length === 0 ? (
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
        ) : (
          <div className="surface grid gap-4 p-4">
            <SectionTitle icon={Ticket} title="Recent redemptions" detail="Voucher codes used by guests at this cafe." />
            <div className="grid gap-2">
              {recentRedemptions.map((redemption) => (
                <div key={redemption.id} className="flex justify-between border-b border-[var(--border)] py-2 text-sm last:border-0">
                  <span className="font-semibold">{redemption.voucher.label}</span>
                  <span className="text-[var(--muted)]">{redemption.redeemedAt.toLocaleString()}</span>
                </div>
              ))}
              {recentRedemptions.length === 0 ? <p className="text-sm text-[var(--muted)]">No redemptions yet.</p> : null}
            </div>
          </div>
        )}

        <div className="surface grid gap-4 p-4">
          <SectionTitle icon={Ticket} title="Create staff code" detail="Show the generated plaintext code once, then hand it to the guest." />
          <VoucherCreateForm shopId={shop.id} framed={false} />
        </div>
      </section>

      {isOwner ? (
        <>
          <section className="grid gap-4 lg:grid-cols-2">
            <div className="surface grid gap-4 p-4">
              <SectionTitle icon={PlugZap} title="UniFi integration" detail="Connect the cafe controller, choose a site, and restrict Perch to guest SSIDs." />
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
              <SectionTitle icon={CreditCard} title="Stripe payments" detail="The cafe receives direct charges, pays Stripe processing fees, and Perch collects the configured application fee." />
              <div className="grid gap-3 text-sm">
                <div className="flex items-center justify-between border-b border-[var(--border)] pb-2">
                  <span className="text-[var(--muted)]">Connected account</span>
                  <strong>{shop.stripeConnectedAccountId ?? "Not connected"}</strong>
                </div>
                <div className="flex items-center justify-between border-b border-[var(--border)] pb-2">
                  <span className="text-[var(--muted)]">Charges</span>
                  <StatusPill status={shop.stripeChargesEnabled}>{shop.stripeChargesEnabled ? "Enabled" : "Incomplete"}</StatusPill>
                </div>
                <div className="flex items-center justify-between border-b border-[var(--border)] pb-2">
                  <span className="text-[var(--muted)]">Payouts</span>
                  <StatusPill status={shop.stripePayoutsEnabled}>{shop.stripePayoutsEnabled ? "Enabled" : "Incomplete"}</StatusPill>
                </div>
                <form action={`/api/admin/shops/${shop.id}/stripe/connect/start`} method="post">
                  <button className="inline-flex items-center justify-center gap-2 rounded-md bg-[var(--foreground)] px-4 py-2 text-sm font-semibold text-white">
                    <ExternalLink size={16} />
                    Connect or refresh Stripe
                  </button>
                </form>
              </div>
            </div>
          </section>

          <section className="grid gap-4 lg:grid-cols-2">
            <div className="surface grid gap-4 p-4">
              <SectionTitle icon={Settings} title="Cafe settings" detail="Control the public policy guests experience at this location." />
              <CafeSettingsForm
                shop={{
                  id: shop.id,
                  name: shop.name,
                  timezone: shop.timezone,
                  status: shop.status,
                  freeMinutesPerDay: shop.freeMinutesPerDay,
                  checkoutGraceMinutes: shop.checkoutGraceMinutes,
                  maxCheckoutGracePerDay: shop.maxCheckoutGracePerDay,
                  supportEmail: shop.supportEmail,
                  brandLogoUrl: shop.brandLogoUrl,
                  brandPrimaryColor: shop.brandPrimaryColor,
                }}
              />
              <p className="text-sm text-[var(--muted)]">
                Free access is device-based. Private address rotation can create extra free grants, which is expected for the MVP.
              </p>
            </div>

            <div className="surface grid gap-4 p-4">
              <SectionTitle icon={CreditCard} title="Paid plans" detail="Plans shown on the paywall after the daily free hour ends." />
              {shop.pricePlans.length === 0 ? <p className="text-sm text-[var(--muted)]">No paid plans configured yet.</p> : null}
              <PricePlanForm shopId={shop.id} plans={shop.pricePlans} />
            </div>
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
              <SectionTitle icon={Activity} title="Recent access activity" detail="Latest grants issued by the portal, worker, checkout grace, payments, and vouchers." />
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left text-sm">
                  <thead className="bg-[var(--panel-strong)]">
                    <tr>
                      <th className="p-3 font-semibold">Created</th>
                      <th className="p-3 font-semibold">Type</th>
                      <th className="p-3 font-semibold">Status</th>
                      <th className="p-3 font-semibold">Minutes</th>
                      <th className="p-3 font-semibold">Expires</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentGrants.map((grant) => (
                      <tr key={grant.id} className="border-t border-[var(--border)]">
                        <td className="p-3 text-[var(--muted)]">{grant.createdAt.toLocaleString()}</td>
                        <td className="p-3 font-semibold">{grant.type.replaceAll("_", " ")}</td>
                        <td className="p-3">
                          <StatusPill status={grant.status}>{grant.status}</StatusPill>
                        </td>
                        <td className="p-3">{grant.requestedMinutes}</td>
                        <td className="p-3 text-[var(--muted)]">{grant.expiresAt ? grant.expiresAt.toLocaleString() : "Pending"}</td>
                      </tr>
                    ))}
                    {recentGrants.length === 0 ? (
                      <tr>
                        <td className="p-3 text-[var(--muted)]" colSpan={5}>
                          No access grants yet.
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="surface grid gap-4 p-4">
              <SectionTitle icon={AlertTriangle} title="Attention queue" detail="Failed network actions and recent voucher inventory." />
              <div className="grid gap-4">
                <div>
                  <h3 className="font-semibold">Failed network actions</h3>
                  <div className="mt-2 grid gap-2">
                    {recentNetworkFailures.map((failure) => (
                      <div key={failure.id} className="rounded-md border border-[var(--border)] p-3 text-sm">
                        <p className="font-semibold">{failure.action}</p>
                        <p className="mt-1 text-[var(--muted)]">{failure.error ?? "No error detail saved."}</p>
                        <p className="mt-1 text-xs text-[var(--muted)]">{failure.createdAt.toLocaleString()}</p>
                      </div>
                    ))}
                    {recentNetworkFailures.length === 0 ? <p className="text-sm text-[var(--muted)]">No failed UniFi actions.</p> : null}
                  </div>
                </div>
                <div>
                  <h3 className="font-semibold">Recent vouchers</h3>
                  <div className="mt-2 grid gap-2">
                    {recentVouchers.map((voucher) => (
                      <div key={voucher.id} className="flex items-center justify-between border-b border-[var(--border)] py-2 text-sm last:border-0">
                        <span>
                          <strong>{voucher.label}</strong>
                          <span className="text-[var(--muted)]"> / {voucher.durationMinutes} min</span>
                        </span>
                        <span className="text-[var(--muted)]">
                          {voucher.redeemedCount}/{voucher.maxRedemptions}
                        </span>
                      </div>
                    ))}
                    {recentVouchers.length === 0 ? <p className="text-sm text-[var(--muted)]">No vouchers created yet.</p> : null}
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="surface grid gap-3 p-4">
            <SectionTitle icon={LifeBuoy} title="Support snapshot" detail="What staff should check first if a guest says Wi-Fi is not connecting." />
            <div className="grid gap-3 md:grid-cols-3">
              <div>
                <p className="text-sm text-[var(--muted)]">Allowed SSIDs</p>
                <p className="mt-2 font-semibold">{shop.unifiIntegration?.allowedSsids.join(", ") || "All guest SSIDs"}</p>
              </div>
              <div>
                <p className="text-sm text-[var(--muted)]">Free reset</p>
                <p className="mt-2 font-semibold">{shop.freeMinutesPerDay} min daily in {shop.timezone}</p>
              </div>
              <div>
                <p className="text-sm text-[var(--muted)]">Support email</p>
                <p className="mt-2 font-semibold">{shop.supportEmail ?? "Not set"}</p>
              </div>
            </div>
          </section>
        </>
      ) : null}
    </main>
  );
}
