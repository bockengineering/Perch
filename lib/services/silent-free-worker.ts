import { ShopStatus } from "@prisma/client";
import { findOrCreateDevice } from "@/lib/services/device";
import { grantEmergencyFreeAccessIfActive } from "@/lib/services/emergency-free";
import { grantDailyFreeAccessIfEligible } from "@/lib/services/free-access";
import { isAllowedSsid } from "@/lib/services/portal-policy";
import { getPrisma } from "@/lib/db";
import { getNetworkProvider } from "@/lib/network/provider-factory";

export async function runSilentFreeAccessTick() {
  const prisma = getPrisma();
  const provider = getNetworkProvider();
  const shops = await prisma.shop.findMany({
    where: {
      status: ShopStatus.ACTIVE,
      unifiIntegration: {
        isNot: null,
      },
    },
    include: { unifiIntegration: true },
  });
  const results: Array<{ shopId: string; granted: number; failed: number }> = [];

  for (const shop of shops) {
    if (!shop.unifiIntegration) {
      continue;
    }

    let clients;
    try {
      clients = await provider.listClients(shop.unifiIntegration);
    } catch {
      results.push({ shopId: shop.id, granted: 0, failed: 1 });
      continue;
    }

    let granted = 0;
    let failed = 0;

    for (const client of clients) {
      if (!client.isGuest || client.authorized) {
        continue;
      }
      if (!isAllowedSsid(shop.unifiIntegration, client.ssid)) {
        continue;
      }

      const device = await findOrCreateDevice({
        shop,
        clientMac: client.macAddress,
        ssid: client.ssid,
        apMac: client.apMac,
      });
      const emergencyResult = await grantEmergencyFreeAccessIfActive({
        shopId: shop.id,
        deviceId: device.id,
        source: "WORKER",
        unifiClientId: client.clientId,
      });
      const result =
        emergencyResult.status !== "NOT_ACTIVE" || shop.freeMinutesPerDay <= 0
          ? emergencyResult
          : await grantDailyFreeAccessIfEligible({
              shopId: shop.id,
              deviceId: device.id,
              source: "WORKER",
              unifiClientId: client.clientId,
            });

      if (result.status === "AUTHORIZED" || result.status === "ALREADY_AUTHORIZED") {
        granted += 1;
      } else if (result.status === "FAILED") {
        failed += 1;
      }
    }

    results.push({ shopId: shop.id, granted, failed });
  }

  return results;
}
