import { AccessGrantStatus, AccessGrantType, Prisma, type AccessGrant, type Shop } from "@prisma/client";
import { decryptSecret } from "@/lib/crypto/field-encryption";
import { getPrisma } from "@/lib/db";
import { getNetworkProvider } from "@/lib/network/provider-factory";
import { getNextLocalMidnight } from "@/lib/utils/time";

type EmergencyGrantSource = "WORKER" | "PORTAL_FAST_PATH";

type EmergencyFreeShop = Pick<Shop, "emergencyFreeUntil">;

export type EmergencyFreeGrantResult =
  | { status: "AUTHORIZED"; grant: AccessGrant; redirectOk: true }
  | { status: "ALREADY_AUTHORIZED"; grant: AccessGrant; redirectOk: true }
  | { status: "NOT_ACTIVE"; redirectOk: false }
  | { status: "FAILED"; reason: string; grant?: AccessGrant; redirectOk: false };

function asJson(value: unknown) {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

function sourceLabel(source: EmergencyGrantSource) {
  return source === "WORKER" ? "EMERGENCY_FREE_WORKER" : "EMERGENCY_FREE_PORTAL_FAST_PATH";
}

export function isEmergencyFreeActive(shop: EmergencyFreeShop, now = new Date()) {
  return Boolean(shop.emergencyFreeUntil && shop.emergencyFreeUntil > now);
}

export function emergencyFreeMinutesRemaining(shop: EmergencyFreeShop, now = new Date()) {
  if (!shop.emergencyFreeUntil || shop.emergencyFreeUntil <= now) {
    return 0;
  }

  return Math.max(1, Math.ceil((shop.emergencyFreeUntil.getTime() - now.getTime()) / 60_000));
}

export async function activateEmergencyFreeUntilMidnight(shopId: string, now = new Date()) {
  const prisma = getPrisma();
  const shop = await prisma.shop.findUnique({
    where: { id: shopId },
    select: { id: true, timezone: true },
  });

  if (!shop) {
    return null;
  }

  const emergencyFreeUntil = getNextLocalMidnight(shop.timezone, now);
  return prisma.shop.update({
    where: { id: shop.id },
    data: { emergencyFreeUntil },
  });
}

export async function disableEmergencyFree(shopId: string) {
  const prisma = getPrisma();
  const shop = await prisma.shop.findUnique({
    where: { id: shopId },
    select: { id: true },
  });

  if (!shop) {
    return null;
  }

  return prisma.shop.update({
    where: { id: shop.id },
    data: { emergencyFreeUntil: null },
  });
}

export async function grantEmergencyFreeAccessIfActive(input: {
  shopId: string;
  deviceId: string;
  source: EmergencyGrantSource;
  unifiClientId?: string | null;
  now?: Date;
}): Promise<EmergencyFreeGrantResult> {
  const prisma = getPrisma();
  const now = input.now ?? new Date();
  const shop = await prisma.shop.findUnique({
    where: { id: input.shopId },
    include: { unifiIntegration: true },
  });

  if (!shop || !isEmergencyFreeActive(shop, now)) {
    return { status: "NOT_ACTIVE", redirectOk: false };
  }

  if (!shop.unifiIntegration) {
    return { status: "FAILED", reason: "Missing UniFi integration", redirectOk: false };
  }

  const emergencyFreeUntil = shop.emergencyFreeUntil;
  if (!emergencyFreeUntil) {
    return { status: "NOT_ACTIVE", redirectOk: false };
  }

  const requestedMinutes = emergencyFreeMinutesRemaining(shop, now);

  const claim = await prisma.$transaction(async (tx) => {
    const activeGrant = await tx.accessGrant.findFirst({
      where: {
        shopId: input.shopId,
        deviceId: input.deviceId,
        status: AccessGrantStatus.AUTHORIZED,
        expiresAt: { gt: now },
      },
      orderBy: { expiresAt: "desc" },
    });

    if (activeGrant?.expiresAt && activeGrant.expiresAt >= emergencyFreeUntil) {
      return { kind: "ACTIVE" as const, grant: activeGrant };
    }

    const grant = await tx.accessGrant.create({
      data: {
        shopId: input.shopId,
        deviceId: input.deviceId,
        type: AccessGrantType.EMERGENCY_FREE,
        status: AccessGrantStatus.PENDING,
        requestedMinutes,
        unifiClientId: input.unifiClientId ?? undefined,
        source: sourceLabel(input.source),
      },
    });

    return { kind: "CREATED" as const, grant };
  });

  if (claim.kind === "ACTIVE") {
    return { status: "ALREADY_AUTHORIZED", grant: claim.grant, redirectOk: true };
  }

  const device = await prisma.device.findUnique({ where: { id: input.deviceId } });
  if (!device) {
    return { status: "FAILED", reason: "Missing device", grant: claim.grant, redirectOk: false };
  }

  const provider = getNetworkProvider();
  const rawMac = decryptSecret(device.clientMacEncrypted);
  const client = input.unifiClientId
    ? { clientId: input.unifiClientId }
    : await provider.findClientByMac(shop.unifiIntegration, rawMac);

  if (!client) {
    const reason = "UniFi client not found";
    const failedGrant = await prisma.accessGrant.update({
      where: { id: claim.grant.id },
      data: {
        status: AccessGrantStatus.FAILED,
        failureReason: reason,
        unifiActionStatus: "CLIENT_NOT_FOUND",
      },
    });

    return { status: "FAILED", reason, grant: failedGrant, redirectOk: false };
  }

  const authorization = await provider.authorizeGuest(
    shop.unifiIntegration,
    client.clientId,
    { timeLimitMinutes: requestedMinutes },
    { shopId: shop.id, deviceId: device.id, grantId: claim.grant.id },
  );

  if (!authorization.ok) {
    const failedGrant = await prisma.accessGrant.update({
      where: { id: claim.grant.id },
      data: {
        status: AccessGrantStatus.FAILED,
        failureReason: authorization.error ?? "UniFi authorization failed",
        unifiClientId: client.clientId,
        unifiActionStatus: "FAILED",
        unifiResponseJson: asJson(authorization.response),
      },
    });

    return {
      status: "FAILED",
      reason: authorization.error ?? "UniFi authorization failed",
      grant: failedGrant,
      redirectOk: false,
    };
  }

  const authorizedGrant = await prisma.accessGrant.update({
    where: { id: claim.grant.id },
    data: {
      status: AccessGrantStatus.AUTHORIZED,
      authorizedAt: now,
      expiresAt: emergencyFreeUntil,
      unifiClientId: client.clientId,
      unifiActionStatus: "AUTHORIZED",
      unifiResponseJson: asJson(authorization.response),
    },
  });

  return { status: "AUTHORIZED", grant: authorizedGrant, redirectOk: true };
}
