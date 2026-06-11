import Link from "next/link";
import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import { ArrowLeft } from "lucide-react";
import { BrandWordmark } from "@/components/BrandWordmark";
import { VoucherCreateForm } from "@/components/staff/VoucherCreateForm";
import { cafeSessionCanAccessShop } from "@/lib/auth/cafe-authorization";
import { CAFE_SESSION_COOKIE_NAME, verifyCafeSessionCookie } from "@/lib/auth/cafe-session";
import { getPrisma } from "@/lib/db";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ shopId: string }>;
};

export default async function StaffVouchersPage({ params }: PageProps) {
  const { shopId } = await params;
  const session = await verifyCafeSessionCookie((await cookies()).get(CAFE_SESSION_COOKIE_NAME)?.value);
  if (!cafeSessionCanAccessShop(session, shopId)) {
    notFound();
  }
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
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-[var(--border)] pb-4">
        <div>
          <Link href={`/cafe/shops/${shop.id}`} aria-label="Back to dashboard">
            <BrandWordmark className="app-wordmark" width={104} height={46} priority />
          </Link>
          <p className="text-sm font-semibold text-[var(--accent)]">{shop.name}</p>
          <h1 className="text-2xl font-semibold">Staff codes</h1>
        </div>
        <Link
          href={`/cafe/shops/${shop.id}`}
          className="inline-flex items-center justify-center gap-2 rounded-md border border-[var(--border)] px-3 py-2 text-sm font-semibold"
        >
          <ArrowLeft size={16} />
          Back to dashboard
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
