import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { ErrorScreen } from "@/components/portal/ErrorScreen";
import { Paywall } from "@/components/portal/Paywall";
import { getPrisma } from "@/lib/db";
import { findOrCreateDevice } from "@/lib/services/device";
import { grantEmergencyFreeAccessIfActive } from "@/lib/services/emergency-free";
import { grantDailyFreeAccessIfEligible } from "@/lib/services/free-access";
import { isAllowedSsid, shopCanServePortal } from "@/lib/services/portal-policy";
import { createPortalSession, parseUniFiPortalParams } from "@/lib/services/portal-session";
import { safeRedirectUrl } from "@/lib/utils/redirect";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ shopSlug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function CaptivePortalPage({ params, searchParams }: PageProps) {
  const { shopSlug } = await params;
  const query = await searchParams;
  const prisma = getPrisma();
  const shop = await prisma.shop.findUnique({
    where: { slug: shopSlug },
    include: {
      unifiIntegration: true,
      pricePlans: {
        where: { active: true },
        orderBy: { sortOrder: "asc" },
      },
    },
  });

  if (!shop) {
    notFound();
  }

  const sessionId = Array.isArray(query.session) ? query.session[0] : query.session;
  if (sessionId && !query.id) {
    const session = await prisma.portalSession.findUnique({ where: { id: sessionId } });
    if (!session || session.shopId !== shop.id) {
      return <ErrorScreen retryHref={`/p/${shop.slug}`} supportEmail={shop.supportEmail} shop={shop} />;
    }

    return <Paywall shop={shop} portalSessionId={session.id} plans={shop.pricePlans} />;
  }

  let portalParams;
  try {
    portalParams = parseUniFiPortalParams(query);
  } catch {
    return <ErrorScreen retryHref={`/p/${shop.slug}`} supportEmail={shop.supportEmail} shop={shop} />;
  }

  const requestHeaders = await headers();
  const ip =
    requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    requestHeaders.get("x-real-ip") ??
    null;
  const userAgent = requestHeaders.get("user-agent");

  const device = await findOrCreateDevice({
    shop,
    clientMac: portalParams.clientMac,
    ssid: portalParams.ssid,
    apMac: portalParams.apMac,
  });
  const portalSession = await createPortalSession({
    shop,
    deviceId: device.id,
    params: portalParams,
    ip,
    userAgent,
  });

  if (shop.status !== "ACTIVE" || !isAllowedSsid(shop.unifiIntegration, portalParams.ssid)) {
    await prisma.portalSession.update({
      where: { id: portalSession.id },
      data: { status: "PAYWALL" },
    });
    return <Paywall shop={shop} portalSessionId={portalSession.id} plans={shop.pricePlans} />;
  }

  /*
   * Captive portal redirects are not ordinary page views. This GET route may
   * authorize UniFi access as a side effect so eligible guests and emergency
   * override guests never see a "Start Wi-Fi" interstitial. The grant services
   * keep retries, refreshes, and worker races safe.
   */
  const emergencyGrant = await grantEmergencyFreeAccessIfActive({
    shopId: shop.id,
    deviceId: device.id,
    source: "PORTAL_FAST_PATH",
  });

  if (emergencyGrant.status === "AUTHORIZED" || emergencyGrant.status === "ALREADY_AUTHORIZED") {
    await prisma.portalSession.update({
      where: { id: portalSession.id },
      data: { status: "AUTHORIZED" },
    });
    redirect(safeRedirectUrl(portalParams.originalUrl));
  }

  if (emergencyGrant.status === "FAILED") {
    await prisma.portalSession.update({
      where: { id: portalSession.id },
      data: { status: "ERROR" },
    });
    return <ErrorScreen retryHref={`/p/${shop.slug}?${new URLSearchParams(portalParams.raw)}`} supportEmail={shop.supportEmail} shop={shop} />;
  }

  if (!shopCanServePortal(shop)) {
    await prisma.portalSession.update({
      where: { id: portalSession.id },
      data: { status: "PAYWALL" },
    });
    return <Paywall shop={shop} portalSessionId={portalSession.id} plans={shop.pricePlans} />;
  }

  const freeGrant = await grantDailyFreeAccessIfEligible({
    shopId: shop.id,
    deviceId: device.id,
    source: "PORTAL_FAST_PATH",
  });

  if (freeGrant.status === "AUTHORIZED" || freeGrant.status === "ALREADY_AUTHORIZED") {
    await prisma.portalSession.update({
      where: { id: portalSession.id },
      data: { status: "AUTHORIZED" },
    });
    redirect(safeRedirectUrl(portalParams.originalUrl));
  }

  if (freeGrant.status === "FAILED") {
    await prisma.portalSession.update({
      where: { id: portalSession.id },
      data: { status: "ERROR" },
    });
    return <ErrorScreen retryHref={`/p/${shop.slug}?${new URLSearchParams(portalParams.raw)}`} supportEmail={shop.supportEmail} shop={shop} />;
  }

  await prisma.portalSession.update({
    where: { id: portalSession.id },
    data: { status: "PAYWALL" },
  });

  return <Paywall shop={shop} portalSessionId={portalSession.id} plans={shop.pricePlans} />;
}
