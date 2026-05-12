import Link from "next/link";
import { ShopCreateForm } from "@/components/admin/ShopCreateForm";
import { getPrisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function ShopsPage() {
  const shops = await getPrisma().shop.findMany({
    orderBy: { createdAt: "desc" },
    include: { unifiIntegration: true },
  });

  return (
    <main className="mx-auto grid max-w-6xl gap-6 px-6 py-8">
      <header className="flex items-center justify-between border-b border-[var(--border)] pb-5">
        <div>
          <p className="text-sm font-semibold text-[var(--accent)]">Admin</p>
          <h1 className="text-3xl font-semibold">Shops</h1>
        </div>
        <Link href="/admin" className="rounded-md border border-[var(--border)] px-4 py-2 text-sm font-semibold">
          Dashboard
        </Link>
      </header>

      <section className="grid gap-4 lg:grid-cols-[1fr_360px]">
        <div className="surface overflow-hidden">
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
              {shops.map((shop) => (
                <tr key={shop.id} className="border-t border-[var(--border)]">
                  <td className="p-3">
                    <Link href={`/admin/shops/${shop.id}`} className="font-semibold">
                      {shop.name}
                    </Link>
                    <p className="text-xs text-[var(--muted)]">/p/{shop.slug}</p>
                  </td>
                  <td className="p-3">{shop.status}</td>
                  <td className="p-3">{shop.unifiIntegration?.connectionStatus ?? "UNTESTED"}</td>
                  <td className="p-3">{shop.stripeChargesEnabled ? "CONNECTED" : "INCOMPLETE"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <ShopCreateForm />
      </section>
    </main>
  );
}
