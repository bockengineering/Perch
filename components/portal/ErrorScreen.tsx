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
    <main className="portal-page" style={shopAccentStyle(shop?.brandPrimaryColor)}>
      <section className="portal-card surface">
        <div className="portal-card-top">
          {shop ? <PortalBrand shop={shop} /> : <span className="portal-brand-name">Perch</span>}
          <span className="portal-state-pill">Connection issue</span>
        </div>
        <p className="portal-eyebrow">Guest Wi-Fi</p>
        <h1 className="portal-title">We had trouble connecting you.</h1>
        <p className="portal-copy">Try again first. If it still does not connect, ask staff for help.</p>
        <div className="portal-error-actions">
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
