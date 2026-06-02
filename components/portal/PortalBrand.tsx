import type { CSSProperties } from "react";

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

function logoBackgroundStyle(url: string): CSSProperties {
  return {
    backgroundImage: `url(${JSON.stringify(url)})`,
  };
}

export function PortalBrand({ shop }: { shop: PortalBrandShop }) {
  return (
    <div className="portal-brand">
      {shop.brandLogoUrl ? (
        <span
          className="portal-brand-logo"
          role="img"
          aria-label={`${shop.name} logo`}
          style={logoBackgroundStyle(shop.brandLogoUrl)}
        />
      ) : (
        <span className="portal-brand-dot" aria-hidden="true" />
      )}
      <span className="portal-brand-name">{shop.name}</span>
    </div>
  );
}
