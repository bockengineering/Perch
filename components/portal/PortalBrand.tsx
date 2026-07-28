import type { CSSProperties } from "react";
import { perchWordmarkHref } from "@/components/BrandWordmark";

export type PortalBrandShop = {
  name: string;
  brandLogoUrl: string | null;
  brandPrimaryColor: string | null;
};

export function shopAccentStyle(color: string | null | undefined): CSSProperties {
  return {
    "--shop-accent": color ?? "var(--foreground)",
  } as CSSProperties;
}

const fallbackLogoUrl = perchWordmarkHref;

function logoBackgroundStyle(url: string): CSSProperties {
  return {
    backgroundImage: `url(${JSON.stringify(url)})`,
  };
}

export function PortalBrand({ shop }: { shop?: PortalBrandShop | null }) {
  const logoUrl = shop?.brandLogoUrl ?? fallbackLogoUrl;
  const label = shop?.brandLogoUrl ? `${shop.name} logo` : "Perch logo";

  return (
    <div className="portal-brand">
      <span
        className={`portal-brand-logo${shop?.brandLogoUrl ? "" : " portal-brand-logo-fallback"}`}
        role="img"
        aria-label={label}
        style={logoBackgroundStyle(logoUrl)}
      />
      {!shop?.brandLogoUrl && shop?.name ? (
        <span className="portal-brand-cafe-name">{shop.name}</span>
      ) : null}
    </div>
  );
}
