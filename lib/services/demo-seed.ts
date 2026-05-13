import { IntegrationStatus, PlatformRole, ShopRole, ShopStatus, type PrismaClient } from "@prisma/client";
import { encryptSecret } from "../crypto/field-encryption";

export const demoShopSlug = "demo-cafe";
export const demoPrimaryMac = "AA:BB:CC:DD:EE:FF";
export const demoSecondaryMac = "AA:BB:CC:DD:EE:01";
export const demoApMac = "11:22:33:44:55:66";
export const demoSsid = "DemoGuest";

export async function seedDemoData(prisma: PrismaClient) {
  const admin = await prisma.user.upsert({
    where: { email: "admin@perch.local" },
    update: {},
    create: {
      email: "admin@perch.local",
      name: "Perch Admin",
    },
  });

  await prisma.platformUser.upsert({
    where: {
      userId_role: {
        userId: admin.id,
        role: PlatformRole.PLATFORM_ADMIN,
      },
    },
    update: {},
    create: {
      userId: admin.id,
      role: PlatformRole.PLATFORM_ADMIN,
    },
  });

  const shop = await prisma.shop.upsert({
    where: { slug: demoShopSlug },
    update: {
      name: "Demo Cafe",
      status: ShopStatus.ACTIVE,
      timezone: "America/Los_Angeles",
      freeMinutesPerDay: 60,
      freeResetHour: 0,
      checkoutGraceMinutes: 5,
      maxCheckoutGracePerDay: 2,
      platformFeeBps: 5000,
      stripeConnectedAccountId: "acct_mock_demo",
      stripeChargesEnabled: true,
      stripePayoutsEnabled: true,
      supportEmail: "staff@demo-cafe.local",
    },
    create: {
      name: "Demo Cafe",
      slug: demoShopSlug,
      status: ShopStatus.ACTIVE,
      timezone: "America/Los_Angeles",
      freeMinutesPerDay: 60,
      freeResetHour: 0,
      checkoutGraceMinutes: 5,
      maxCheckoutGracePerDay: 2,
      platformFeeBps: 5000,
      stripeConnectedAccountId: "acct_mock_demo",
      stripeChargesEnabled: true,
      stripePayoutsEnabled: true,
      supportEmail: "staff@demo-cafe.local",
    },
  });

  await prisma.shopMember.upsert({
    where: {
      shopId_userId: {
        shopId: shop.id,
        userId: admin.id,
      },
    },
    update: { role: ShopRole.SHOP_OWNER },
    create: {
      shopId: shop.id,
      userId: admin.id,
      role: ShopRole.SHOP_OWNER,
    },
  });

  await prisma.uniFiIntegration.upsert({
    where: { shopId: shop.id },
    update: {
      apiBaseUrl: "https://mock-unifi.local",
      apiKeyEncrypted: encryptSecret("mock-api-key"),
      siteId: "mock-site",
      siteName: "Mock UniFi Site",
      allowedSsids: [demoSsid],
      connectionStatus: IntegrationStatus.CONNECTED,
      lastTestAt: new Date(),
      lastError: null,
    },
    create: {
      shopId: shop.id,
      apiBaseUrl: "https://mock-unifi.local",
      apiKeyEncrypted: encryptSecret("mock-api-key"),
      siteId: "mock-site",
      siteName: "Mock UniFi Site",
      allowedSsids: [demoSsid],
      connectionStatus: IntegrationStatus.CONNECTED,
      lastTestAt: new Date(),
    },
  });

  await prisma.pricePlan.deleteMany({ where: { shopId: shop.id } });
  await prisma.pricePlan.createMany({
    data: [
      {
        shopId: shop.id,
        label: "2 more hours",
        durationMinutes: 120,
        amountCents: 500,
        currency: "usd",
        active: true,
        sortOrder: 1,
      },
      {
        shopId: shop.id,
        label: "All day",
        durationMinutes: 720,
        amountCents: 800,
        currency: "usd",
        active: true,
        sortOrder: 2,
      },
    ],
  });

  return shop;
}
