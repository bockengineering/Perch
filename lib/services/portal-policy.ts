import type { AccessGrant, DailyFreeAllowance, PricePlan, Shop, UniFiIntegration } from "@prisma/client";

export function isAllowedSsid(integration: UniFiIntegration | null | undefined, ssid?: string | null) {
  if (!integration || integration.allowedSsids.length === 0) {
    return true;
  }

  if (!ssid) {
    return false;
  }

  return integration.allowedSsids.some((allowed) => allowed.toLowerCase() === ssid.toLowerCase());
}

export function isDailyFreeEligible(
  activeGrant: Pick<AccessGrant, "id"> | null,
  allowance: Pick<DailyFreeAllowance, "id"> | null,
) {
  return !activeGrant && !allowance;
}

export function canCreateCheckoutGrace(todayGraceCount: number, maxCheckoutGracePerDay: number) {
  return todayGraceCount < maxCheckoutGracePerDay;
}

export function calculatePlatformFeeCents(amountCents: number, platformFeeBps: number) {
  return Math.round((amountCents * platformFeeBps) / 10_000);
}

export function formatPlanPrice(plan: Pick<PricePlan, "amountCents" | "currency">) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: plan.currency.toUpperCase(),
    maximumFractionDigits: 0,
  }).format(plan.amountCents / 100);
}

export function shopCanServePortal(shop: Pick<Shop, "status" | "freeMinutesPerDay">) {
  return shop.status === "ACTIVE" && shop.freeMinutesPerDay > 0;
}
