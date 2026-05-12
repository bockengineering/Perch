import {
  AccessGrantStatus,
  AccessGrantType,
  DailyFreeAllowanceStatus,
  Prisma,
  type AccessGrant,
} from "@prisma/client";
import { decryptSecret } from "@/lib/crypto/field-encryption";
import { getPrisma } from "@/lib/db";
import { getNetworkProvider } from "@/lib/network/provider-factory";
import { addMinutes, getShopLocalDate } from "@/lib/utils/time";

type FreeGrantSource = "WORKER" | "PORTAL_FAST_PATH";

export type DailyFreeGrantResult =
  | { status: "AUTHORIZED"; grant: AccessGrant; redirectOk: true }
  | { status: "ALREADY_AUTHORIZED"; grant: AccessGrant; redirectOk: true }
  | { status: "NOT_ELIGIBLE"; reason: string; redirectOk: false }
  | { status: "FAILED"; reason: string; grant?: AccessGrant; redirectOk: false };

function accessGrantTypeForSource(source: FreeGrantSource) {
  return source === "WORKER" ? AccessGrantType.FREE_AUTO_WORKER : AccessGrantType.FREE_PORTAL_FAST_PATH;
}

function asJson(value: unknown) {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

export async function grantDailyFreeAccessIfEligible(input: {
  shopId: string;
  deviceId: string;
  source: FreeGrantSource;
  unifiClientId?: string | null;
  now?: Date;
}): Promise<DailyFreeGrantResult> {
  const prisma = getPrisma();
  const now = input.now ?? new Date();
  const shop = await prisma.shop.findUnique({
    where: { id: input.shopId },
    include: { unifiIntegration: true },
  });

  if (!shop || !shop.unifiIntegration) {
    return { status: "FAILED", reason: "Missing shop or UniFi integration", redirectOk: false };
  }

  if (shop.freeResetType !== "DAILY") {
    return { status: "FAILED", reason: "MVP supports DAILY reset only", redirectOk: false };
  }

  const localDate = getShopLocalDate(shop, now);
  const expiresAt = addMinutes(now, shop.freeMinutesPerDay);
  const type = accessGrantTypeForSource(input.source);

  let claim:
    | { kind: "ACTIVE"; grant: AccessGrant }
    | { kind: "CLAIMED"; grant: AccessGrant; allowanceId: string }
    | { kind: "NOT_ELIGIBLE"; reason: string };

  try {
    claim = await prisma.$transaction(async (tx) => {
      const activeGrant = await tx.accessGrant.findFirst({
        where: {
          shopId: input.shopId,
          deviceId: input.deviceId,
          status: AccessGrantStatus.AUTHORIZED,
          expiresAt: { gt: now },
        },
        orderBy: { expiresAt: "desc" },
      });

      if (activeGrant) {
        return { kind: "ACTIVE", grant: activeGrant };
      }

      const existingAllowance = await tx.dailyFreeAllowance.findUnique({
        where: {
          shopId_deviceId_localDate: {
            shopId: input.shopId,
            deviceId: input.deviceId,
            localDate,
          },
        },
      });

      if (existingAllowance) {
        return { kind: "NOT_ELIGIBLE", reason: "Daily free allowance already used" };
      }

      const grant = await tx.accessGrant.create({
        data: {
          shopId: input.shopId,
          deviceId: input.deviceId,
          type,
          status: AccessGrantStatus.PENDING,
          requestedMinutes: shop.freeMinutesPerDay,
          unifiClientId: input.unifiClientId ?? undefined,
          source: input.source,
        },
      });

      const allowance = await tx.dailyFreeAllowance.create({
        data: {
          shopId: input.shopId,
          deviceId: input.deviceId,
          localDate,
          timezone: shop.timezone,
          status: DailyFreeAllowanceStatus.CLAIMED,
          grantId: grant.id,
          claimedAt: now,
          expiresAt,
        },
      });

      const linkedGrant = await tx.accessGrant.update({
        where: { id: grant.id },
        data: { dailyFreeAllowanceId: allowance.id },
      });

      return { kind: "CLAIMED", grant: linkedGrant, allowanceId: allowance.id };
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return { status: "NOT_ELIGIBLE", reason: "Daily free allowance already used", redirectOk: false };
    }

    throw error;
  }

  if (claim.kind === "ACTIVE") {
    return { status: "ALREADY_AUTHORIZED", grant: claim.grant, redirectOk: true };
  }

  if (claim.kind === "NOT_ELIGIBLE") {
    return { status: "NOT_ELIGIBLE", reason: claim.reason, redirectOk: false };
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
    await prisma.dailyFreeAllowance.update({
      where: { id: claim.allowanceId },
      data: { status: DailyFreeAllowanceStatus.FAILED },
    });

    return { status: "FAILED", reason, grant: failedGrant, redirectOk: false };
  }

  const authorization = await provider.authorizeGuest(
    shop.unifiIntegration,
    client.clientId,
    { timeLimitMinutes: shop.freeMinutesPerDay },
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
    await prisma.dailyFreeAllowance.update({
      where: { id: claim.allowanceId },
      data: { status: DailyFreeAllowanceStatus.FAILED },
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
      expiresAt,
      unifiClientId: client.clientId,
      unifiActionStatus: "AUTHORIZED",
      unifiResponseJson: asJson(authorization.response),
    },
  });
  await prisma.dailyFreeAllowance.update({
    where: { id: claim.allowanceId },
    data: {
      status: DailyFreeAllowanceStatus.AUTHORIZED,
      expiresAt,
    },
  });

  return { status: "AUTHORIZED", grant: authorizedGrant, redirectOk: true };
}
