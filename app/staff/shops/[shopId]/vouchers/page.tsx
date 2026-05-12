import Link from "next/link";
import { notFound } from "next/navigation";
import { VoucherCreateForm } from "@/components/staff/VoucherCreateForm";
import { getPrisma } from "@/lib/db";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ shopId: string }>;
};

export default async function StaffVouchersPage({ params }: PageProps) {
  const { shopId } = await params;
  const shop = await getPrisma().shop.findUnique({
    where: { id: shopId },
    include: {
      vouchers: {
        orderBy: { createdAt: "desc" },
        take: 12,
      },
    },
  });

  if (!shop) {
    notFound();
  }

  const redemptions = await getPrisma().voucherRedemption.findMany({
    where: { shopId: shop.id },
    include: { voucher: true },
    orderBy: { redeemedAt: "desc" },
    take: 12,
  });

  return (
    <main className="mx-auto grid max-w-3xl gap-6 px-5 py-6">
      <header className="flex items-center justify-between border-b border-[var(--border)] pb-4">
        <div>
          <p className="text-sm font-semibold text-[var(--accent)]">{shop.name}</p>
          <h1 className="text-2xl font-semibold">Staff codes</h1>
        </div>
        <Link href={`/admin/shops/${shop.id}`} className="rounded-md border border-[var(--border)] px-3 py-2 text-sm font-semibold">
          Admin
        </Link>
      </header>

      <VoucherCreateForm shopId={shop.id} />

      <section className="surface p-4">
        <h2 className="text-lg font-semibold">Recent redemptions</h2>
        <div className="mt-3 grid gap-2">
          {redemptions.map((redemption) => (
            <div key={redemption.id} className="flex justify-between border-b border-[var(--border)] py-2 text-sm last:border-0">
              <span>{redemption.voucher.label}</span>
              <span className="text-[var(--muted)]">{redemption.redeemedAt.toLocaleString()}</span>
            </div>
          ))}
          {redemptions.length === 0 ? <p className="text-sm text-[var(--muted)]">No redemptions yet.</p> : null}
        </div>
      </section>
    </main>
  );
}
