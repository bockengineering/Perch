import Link from "next/link";
import { redirect } from "next/navigation";
import { getPrisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function CafeHomePage() {
  const shop = await getPrisma().shop.findFirst({
    orderBy: { createdAt: "asc" },
    select: { id: true },
  });

  if (shop) {
    redirect(`/cafe/shops/${shop.id}`);
  }

  return (
    <main className="mx-auto grid max-w-3xl gap-6 px-5 py-10">
      <section className="surface p-6">
        <p className="text-sm font-semibold text-[var(--accent)]">Perch</p>
        <h1 className="mt-3 text-3xl font-semibold">No cafe is set up yet.</h1>
        <Link
          href="/admin/shops"
          className="mt-6 inline-flex rounded-md bg-[var(--foreground)] px-4 py-2 text-sm font-semibold text-white"
        >
          Add shop
        </Link>
      </section>
    </main>
  );
}
