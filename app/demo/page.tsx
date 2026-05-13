import Link from "next/link";
import { DemoResetButton } from "@/components/demo/DemoResetButton";
import { appUrl, demoToolsEnabled } from "@/lib/env";
import { getPrisma } from "@/lib/db";
import { buildDemoPortalUrl, demoDevices } from "@/lib/services/demo-environment";
import { demoPrimaryMac, demoShopSlug } from "@/lib/services/demo-seed";

export const dynamic = "force-dynamic";

function SetupBlock() {
  return (
    <main className="mx-auto grid max-w-3xl gap-6 px-5 py-10">
      <section className="surface p-6">
        <p className="text-sm font-semibold text-[var(--accent)]">Perch demo</p>
        <h1 className="mt-3 text-3xl font-semibold">Demo tools are disabled.</h1>
        <p className="mt-2 text-sm text-[var(--muted)]">
          Run the local demo environment or set `DEMO_TOOLS_ENABLED=true` in a non-production environment.
        </p>
        <pre className="mt-6 rounded-md border border-[var(--border)] bg-[var(--panel-strong)] p-4 text-sm">
{`npm run demo:setup
npm run demo:dev`}
        </pre>
      </section>
    </main>
  );
}

export default async function DemoPage() {
  if (!demoToolsEnabled()) {
    return <SetupBlock />;
  }

  let data:
    | {
        shopId: string;
        portalVisits: number;
        freeGrants: number;
        paidGrants: number;
        voucherGrants: number;
        failedGrants: number;
        orders: Array<{ id: string; status: string; amountCents: number; createdAt: Date }>;
      }
    | null = null;
  let dbError: string | null = null;

  try {
    const prisma = getPrisma();
    const shop = await prisma.shop.findUnique({ where: { slug: demoShopSlug } });
    if (shop) {
      const [portalVisits, freeGrants, paidGrants, voucherGrants, failedGrants, orders] = await Promise.all([
        prisma.portalSession.count({ where: { shopId: shop.id } }),
        prisma.accessGrant.count({
          where: { shopId: shop.id, type: { in: ["FREE_AUTO_WORKER", "FREE_PORTAL_FAST_PATH"] } },
        }),
        prisma.accessGrant.count({ where: { shopId: shop.id, type: "PAID" } }),
        prisma.accessGrant.count({ where: { shopId: shop.id, type: "VOUCHER" } }),
        prisma.accessGrant.count({ where: { shopId: shop.id, status: "FAILED" } }),
        prisma.order.findMany({
          where: { shopId: shop.id },
          orderBy: { createdAt: "desc" },
          take: 5,
          select: { id: true, status: true, amountCents: true, createdAt: true },
        }),
      ]);
      data = { shopId: shop.id, portalVisits, freeGrants, paidGrants, voucherGrants, failedGrants, orders };
    }
  } catch (error) {
    dbError = error instanceof Error ? error.message : "Database is not reachable.";
  }

  const primaryPortalUrl = buildDemoPortalUrl({ appUrl: appUrl(), successPath: "/demo/connected" });

  return (
    <main className="mx-auto grid max-w-6xl gap-6 px-6 py-8">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border)] pb-5">
        <div>
          <p className="text-sm font-semibold text-[var(--accent)]">Perch demo</p>
          <h1 className="text-3xl font-semibold">Safe mock environment</h1>
          <p className="mt-2 text-sm text-[var(--muted)]">
            Mock UniFi, mock Stripe, demo-only reset controls, and no customer hardware.
          </p>
        </div>
        <DemoResetButton />
      </header>

      {dbError ? (
        <section className="surface p-6">
          <h2 className="text-xl font-semibold">Database setup needed</h2>
          <p className="mt-2 text-sm text-[var(--muted)]">{dbError}</p>
          <pre className="mt-4 rounded-md border border-[var(--border)] bg-[var(--panel-strong)] p-4 text-sm">
{`npm run demo:setup
npm run demo:dev`}
          </pre>
        </section>
      ) : null}

      <section className="grid gap-4 md:grid-cols-4">
        <div className="surface p-4">
          <p className="text-sm text-[var(--muted)]">Portal visits</p>
          <p className="metric mt-2 text-3xl font-semibold">{data?.portalVisits ?? 0}</p>
        </div>
        <div className="surface p-4">
          <p className="text-sm text-[var(--muted)]">Free grants</p>
          <p className="metric mt-2 text-3xl font-semibold">{data?.freeGrants ?? 0}</p>
        </div>
        <div className="surface p-4">
          <p className="text-sm text-[var(--muted)]">Paid grants</p>
          <p className="metric mt-2 text-3xl font-semibold">{data?.paidGrants ?? 0}</p>
        </div>
        <div className="surface p-4">
          <p className="text-sm text-[var(--muted)]">Voucher grants</p>
          <p className="metric mt-2 text-3xl font-semibold">{data?.voucherGrants ?? 0}</p>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="surface grid gap-4 p-4">
          <h2 className="text-xl font-semibold">Portal flow</h2>
          <p className="text-sm text-[var(--muted)]">
            Open the primary device once for silent free access. Open it again on the same local day for the
            paywall.
          </p>
          <div className="grid gap-2">
            {demoDevices().map((device) => (
              <Link
                key={device.mac}
                href={device.mac === demoPrimaryMac ? primaryPortalUrl : device.portalUrl}
                className="rounded-md border border-[var(--border)] px-4 py-2 text-sm font-semibold"
              >
                {device.label}: {device.mac}
              </Link>
            ))}
          </div>
        </div>

        <div className="surface grid gap-4 p-4">
          <h2 className="text-xl font-semibold">Admin and staff</h2>
          <p className="text-sm text-[var(--muted)]">
            Basic auth in the generated demo env is `demo@perch.local` / `perch-demo`.
          </p>
          <div className="grid gap-2">
            <Link href="/admin" className="rounded-md border border-[var(--border)] px-4 py-2 text-sm font-semibold">
              Platform dashboard
            </Link>
            {data?.shopId ? (
              <>
                <Link
                  href={`/admin/shops/${data.shopId}`}
                  className="rounded-md border border-[var(--border)] px-4 py-2 text-sm font-semibold"
                >
                  Demo Cafe settings
                </Link>
                <Link
                  href={`/staff/shops/${data.shopId}/vouchers`}
                  className="rounded-md border border-[var(--border)] px-4 py-2 text-sm font-semibold"
                >
                  Staff voucher screen
                </Link>
              </>
            ) : null}
          </div>
        </div>
      </section>

      <section className="surface p-4">
        <h2 className="text-xl font-semibold">Recent demo orders</h2>
        <div className="mt-3 grid gap-2">
          {data?.orders.length ? (
            data.orders.map((order) => (
              <div key={order.id} className="flex justify-between border-b border-[var(--border)] py-2 text-sm last:border-0">
                <span>{order.id}</span>
                <span>
                  {order.status} / ${(order.amountCents / 100).toFixed(0)}
                </span>
              </div>
            ))
          ) : (
            <p className="text-sm text-[var(--muted)]">No paid pass attempts yet.</p>
          )}
        </div>
      </section>
    </main>
  );
}
