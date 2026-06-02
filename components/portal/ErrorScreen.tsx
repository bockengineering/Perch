import Link from "next/link";
import { PortalBrand, type PortalBrandShop, shopAccentStyle } from "./PortalBrand";

export function ErrorScreen({
  retryHref,
  supportEmail,
  shop,
}: {
  retryHref: string;
  supportEmail?: string | null;
  shop?: PortalBrandShop;
}) {
  return (
    <main className="flex min-h-screen items-center justify-center px-5 py-10" style={shopAccentStyle(shop?.brandPrimaryColor)}>
      <section className="surface w-full max-w-md p-6">
        {shop ? <PortalBrand shop={shop} /> : null}
        <h1 className={shop ? "mt-3 text-2xl font-semibold" : "text-2xl font-semibold"}>We had trouble connecting you.</h1>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href={retryHref}
            className="portal-primary-action rounded-md px-4 py-2 text-sm font-semibold text-white"
          >
            Try again
          </Link>
          <a
            href={supportEmail ? `mailto:${supportEmail}` : "#"}
            className="rounded-md border border-[var(--border)] px-4 py-2 text-sm font-semibold"
          >
            Ask staff
          </a>
        </div>
      </section>
    </main>
  );
}
