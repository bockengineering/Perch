import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { cookies } from "next/headers";
import { CreditCard, ReceiptText, Settings, Ticket, Wifi } from "lucide-react";
import { CafeSettingsForm } from "@/components/cafe/CafeSettingsForm";
import { CafeMembersPanel } from "@/components/cafe/CafeMembersPanel";
import { PricePlanForm } from "@/components/admin/PricePlanForm";
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

function MetricCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="surface p-4">
      <p className="text-sm text-[var(--muted)]">{label}</p>
      <p className="metric mt-2 text-3xl font-semibold">{value}</p>
    </div>
  );
}

function money(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

function HostedPreviewCafeConsole() {
  return (
    <main className="mx-auto grid max-w-6xl gap-6 px-6 py-8">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border)] pb-5">
        <div>
          <p className="text-sm font-semibold text-[var(--accent)]">Cafe back office</p>
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

  const today = startOfTodayUtc();
  const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
  const [paidToday, revenueToday, voucherRedemptions, failedAuths, thirtyDayRevenue, transactions, members] =
    await Promise.all([
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
      prisma.order.findMany({
        where: { shopId: shop.id },
        include: { pricePlan: true },
        orderBy: { createdAt: "desc" },
        take: 12,
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

  return (
    <main className="mx-auto grid max-w-6xl gap-6 px-6 py-8">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border)] pb-5">
        <div>
          <p className="text-sm font-semibold text-[var(--accent)]">Cafe back office</p>
          <h1 className="text-3xl font-semibold">{shop.name}</h1>
          <p className="mt-1 text-sm text-[var(--muted)]">Settings, payments, and staff access codes.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href={`/staff/shops/${shop.id}/vouchers`} className="rounded-md border border-[var(--border)] px-4 py-2 text-sm font-semibold">
            Staff codes
          </Link>
          <Link href={`/admin/shops/${shop.id}`} className="rounded-md border border-[var(--border)] px-4 py-2 text-sm font-semibold">
            Advanced
          </Link>
          <Link href={`/p/${shop.slug}`} className="rounded-md bg-[var(--foreground)] px-4 py-2 text-sm font-semibold text-white">
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
        <MetricCard label="Paid passes today" value={paidToday} />
        <MetricCard label="Gross today" value={money(grossToday)} />
        <MetricCard label="Cafe share today" value={money(cafeShareToday)} />
        <MetricCard label="Voucher uses today" value={voucherRedemptions} />
        <MetricCard label="30-day gross" value={money(thirtyDayGross)} />
        <MetricCard label="30-day cafe share" value={money(thirtyDayShare)} />
        <MetricCard label="UniFi status" value={shop.unifiIntegration?.connectionStatus ?? "UNTESTED"} />
        <MetricCard label="Failed auths today" value={failedAuths} />
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
                {transactions.map((order) => (
                  <tr key={order.id} className="border-t border-[var(--border)]">
                    <td className="p-3 text-[var(--muted)]">{order.createdAt.toLocaleString()}</td>
                    <td className="p-3 font-semibold">{order.pricePlan.label}</td>
                    <td className="p-3">{order.status}</td>
                    <td className="p-3">{money(order.amountCents)}</td>
                    <td className="p-3">{money(order.amountCents - order.platformFeeCents)}</td>
                  </tr>
                ))}
                {transactions.length === 0 ? (
                  <tr>
                    <td className="p-3 text-[var(--muted)]" colSpan={5}>
                      No transactions yet.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>

        <div className="surface grid gap-4 p-4">
          <div className="flex items-center gap-2">
            <Ticket size={18} />
            <h2 className="text-xl font-semibold">Staff codes</h2>
          </div>
          <VoucherCreateForm shopId={shop.id} framed={false} />
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="surface grid gap-4 p-4">
          <div className="flex items-center gap-2">
            <Settings size={18} />
            <h2 className="text-xl font-semibold">Cafe settings</h2>
          </div>
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
            }}
          />
        </div>

        <div className="surface grid gap-4 p-4">
          <div className="flex items-center gap-2">
            <CreditCard size={18} />
            <h2 className="text-xl font-semibold">Paid plans</h2>
          </div>
          <div className="grid gap-2">
            {shop.pricePlans.map((plan) => (
              <div key={plan.id} className="flex items-center justify-between border-b border-[var(--border)] py-2 text-sm last:border-0">
                <span className="font-semibold">{plan.label}</span>
                <span>
                  {money(plan.amountCents)} / {plan.durationMinutes} min
                </span>
              </div>
            ))}
          </div>
          <PricePlanForm shopId={shop.id} />
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

      <section className="surface grid gap-3 p-4">
        <div className="flex items-center gap-2">
          <Wifi size={18} />
          <h2 className="text-xl font-semibold">Network status</h2>
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          <div>
            <p className="text-sm text-[var(--muted)]">Allowed SSIDs</p>
            <p className="mt-2 font-semibold">{shop.unifiIntegration?.allowedSsids.join(", ") || "All"}</p>
          </div>
          <div>
            <p className="text-sm text-[var(--muted)]">Stripe</p>
            <p className="mt-2 font-semibold">{shop.stripeChargesEnabled ? "CONNECTED" : "INCOMPLETE"}</p>
          </div>
          <div>
            <p className="text-sm text-[var(--muted)]">Free reset</p>
            <p className="mt-2 font-semibold">{shop.freeMinutesPerDay} min daily</p>
          </div>
        </div>
      </section>
    </main>
  );
}
