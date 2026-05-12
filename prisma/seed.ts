import { PrismaClient, ShopRole, ShopStatus, IntegrationStatus, PlatformRole } from "@prisma/client";
import { encryptSecret } from "../lib/crypto/field-encryption";

const prisma = new PrismaClient();

async function main() {
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
    where: { slug: "demo-cafe" },
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
      slug: "demo-cafe",
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
      allowedSsids: ["DemoGuest"],
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
      allowedSsids: ["DemoGuest"],
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

  console.log("Seeded Demo Cafe at /p/demo-cafe");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
