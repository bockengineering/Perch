import type { PortalSession, Prisma, Shop } from "@prisma/client";
import { getPrisma } from "@/lib/db";
import { hashOpaqueValue, normalizeMac } from "@/lib/crypto/mac";
import { addMinutes } from "@/lib/utils/time";

export type UniFiPortalParams = {
  clientMac: string;
  apMac?: string;
  ssid?: string;
  originalUrl?: string;
  raw: Record<string, string>;
};

const sensitivePortalQueryKeys = new Set(["id", "ap", "url"]);

export function sanitizePortalRawQuery(raw: Record<string, string>) {
  return Object.fromEntries(
    Object.entries(raw).filter(([key]) => !sensitivePortalQueryKeys.has(key.toLowerCase())),
  );
}

function firstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export function parseUniFiPortalParams(params: Record<string, string | string[] | undefined>): UniFiPortalParams {
  const id = firstValue(params.id);
  if (!id) {
    throw new Error("Missing UniFi client id parameter");
  }

  const raw: Record<string, string> = {};
  for (const [key, value] of Object.entries(params)) {
    const current = firstValue(value);
    if (current !== undefined) {
      raw[key] = current;
    }
  }

  return {
    clientMac: normalizeMac(id),
    apMac: firstValue(params.ap),
    ssid: firstValue(params.ssid),
    originalUrl: firstValue(params.url),
    raw,
  };
}

export async function createPortalSession(input: {
  shop: Pick<Shop, "id">;
  deviceId?: string | null;
  params: UniFiPortalParams;
  ip?: string | null;
  userAgent?: string | null;
  status?: PortalSession["status"];
}) {
  const apMacHash = input.params.apMac ? hashOpaqueValue(input.params.apMac) : undefined;
  const expiresAt = addMinutes(new Date(), 20);

  return getPrisma().portalSession.create({
    data: {
      shopId: input.shop.id,
      deviceId: input.deviceId ?? undefined,
      rawQueryJson: sanitizePortalRawQuery(input.params.raw) as Prisma.InputJsonValue,
      ssid: input.params.ssid,
      apMacHash,
      ipHash: input.ip ? hashOpaqueValue(input.ip) : undefined,
      userAgentHash: input.userAgent ? hashOpaqueValue(input.userAgent) : undefined,
      status: input.status ?? "OPEN",
      expiresAt,
    },
  });
}
