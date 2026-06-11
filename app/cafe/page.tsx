import Link from "next/link";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { BrandWordmark } from "@/components/BrandWordmark";
import { CAFE_SESSION_COOKIE_NAME, verifyCafeSessionCookie } from "@/lib/auth/cafe-session";
import { hostedPreviewDemoEnabled, hostedPreviewShopId } from "@/lib/auth/hosted-preview";
import { getPrisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function CafeHomePage() {
  const session = await verifyCafeSessionCookie((await cookies()).get(CAFE_SESSION_COOKIE_NAME)?.value);
  if (!session) {
    redirect("/cafe/login?next=/cafe");
  }

  let shops: Array<{ id: string; name: string; status: string }> = [];
  if (hostedPreviewDemoEnabled() && session.shopIds?.includes(hostedPreviewShopId)) {
    shops = [{ id: hostedPreviewShopId, name: "Demo Cafe", status: "ACTIVE" }];
  } else {
    shops = await getPrisma().shop.findMany({
      where: { id: { in: session.shopIds ?? [] } },
      orderBy: { name: "asc" },
      select: { id: true, name: true, status: true },
    });
  }

  if (shops.length === 1) {
    redirect(`/cafe/shops/${shops[0].id}`);
  }

  if (shops.length === 0 && session.role === "SHOP_OWNER") {
    redirect("/cafe/onboarding");
  }

  return (
    <main className="mx-auto grid max-w-3xl gap-6 px-5 py-10">
      <section className="surface p-6">
        <BrandWordmark className="app-wordmark" width={104} height={46} priority />
        <h1 className="mt-3 text-3xl font-semibold">
          {shops.length === 0 ? "No cafes are assigned to this account." : "Choose a cafe."}
        </h1>
        {shops.length === 0 ? (
          <p className="mt-3 text-sm text-[var(--muted)]">Ask a platform admin to add this account to a cafe.</p>
        ) : (
          <div className="mt-6 grid gap-3">
            {shops.map((shop) => (
              <Link key={shop.id} href={`/cafe/shops/${shop.id}`} className="surface flex items-center justify-between p-4">
                <span className="font-semibold">{shop.name}</span>
                <span className="text-sm text-[var(--muted)]">{shop.status}</span>
              </Link>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
