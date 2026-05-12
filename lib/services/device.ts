import type { Shop } from "@prisma/client";
import { encryptSecret } from "@/lib/crypto/field-encryption";
import { hashMac, hashOpaqueValue, normalizeMac } from "@/lib/crypto/mac";
import { getPrisma } from "@/lib/db";

export async function findOrCreateDevice(input: {
  shop: Pick<Shop, "id">;
  clientMac: string;
  ssid?: string | null;
  apMac?: string | null;
}) {
  const normalizedMac = normalizeMac(input.clientMac);
  const clientMacHash = hashMac(input.shop.id, normalizedMac);
  const clientMacEncrypted = encryptSecret(normalizedMac);
  const now = new Date();

  return getPrisma().device.upsert({
    where: {
      shopId_clientMacHash: {
        shopId: input.shop.id,
        clientMacHash,
      },
    },
    create: {
      shopId: input.shop.id,
      clientMacHash,
      clientMacEncrypted,
      firstSeenAt: now,
      lastSeenAt: now,
      lastSsid: input.ssid,
      lastApMacHash: input.apMac ? hashOpaqueValue(input.apMac) : undefined,
    },
    update: {
      lastSeenAt: now,
      lastSsid: input.ssid,
      lastApMacHash: input.apMac ? hashOpaqueValue(input.apMac) : undefined,
    },
  });
}
