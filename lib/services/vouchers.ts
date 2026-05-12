import crypto from "node:crypto";
import {
  AccessGrantStatus,
  AccessGrantType,
  Prisma,
  VoucherStatus,
  type Voucher,
  type VoucherRedemption,
} from "@prisma/client";
import { decryptSecret } from "@/lib/crypto/field-encryption";
import { getPrisma } from "@/lib/db";
import { getNetworkProvider } from "@/lib/network/provider-factory";
import { addMinutes } from "@/lib/utils/time";

function voucherSecret() {
  const configured = process.env.VOUCHER_CODE_SECRET ?? process.env.APP_MAC_PEPPER;
  if (configured && !configured.includes("replace_with")) {
    return configured;
  }

  if (process.env.NODE_ENV === "production") {
    throw new Error("VOUCHER_CODE_SECRET or APP_MAC_PEPPER must be configured in production");
  }

  return "perch-development-voucher-secret";
}

function asJson(value: unknown) {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

export function normalizeVoucherCode(code: string) {
  return code.trim().toUpperCase().replace(/\s+/g, "").replace(/-/g, "");
}

export function hashVoucherCode(code: string) {
  return crypto.createHmac("sha256", voucherSecret()).update(normalizeVoucherCode(code)).digest("hex");
}

export function generateVoucherCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = crypto.randomBytes(10);
  let code = "PERCH";
  for (let index = 0; index < 8; index += 1) {
    code += alphabet[bytes[index] % alphabet.length];
  }

  return `${code.slice(0, 5)}-${code.slice(5, 9)}-${code.slice(9)}`;
}

export async function createVoucher(input: {
  shopId: string;
  label: string;
  durationMinutes: number;
  maxRedemptions: number;
  expiresAt?: Date | null;
  createdByUserId?: string | null;
}) {
  const plaintextCode = generateVoucherCode();
  const voucher = await getPrisma().voucher.create({
    data: {
      shopId: input.shopId,
      label: input.label,
      codeHash: hashVoucherCode(plaintextCode),
      durationMinutes: input.durationMinutes,
      maxRedemptions: input.maxRedemptions,
      expiresAt: input.expiresAt ?? undefined,
      createdByUserId: input.createdByUserId ?? undefined,
      status: VoucherStatus.ACTIVE,
    },
  });

  return { voucher, plaintextCode };
}

function voucherCanBeRedeemed(voucher: Voucher, now: Date) {
  if (voucher.status !== VoucherStatus.ACTIVE) {
    return { ok: false, reason: "Voucher is not active" };
  }
  if (voucher.startsAt && voucher.startsAt > now) {
    return { ok: false, reason: "Voucher has not started" };
  }
  if (voucher.expiresAt && voucher.expiresAt <= now) {
    return { ok: false, reason: "Voucher has expired" };
  }
  if (voucher.redeemedCount >= voucher.maxRedemptions) {
    return { ok: false, reason: "Voucher has been fully redeemed" };
  }

  return { ok: true };
}

export async function redeemVoucher(input: {
  shopId: string;
  deviceId: string;
  code: string;
}) {
  const prisma = getPrisma();
  const now = new Date();
  const codeHash = hashVoucherCode(input.code);
  const voucher = await prisma.voucher.findUnique({
    where: {
      shopId_codeHash: {
        shopId: input.shopId,
        codeHash,
      },
    },
  });

  if (!voucher) {
    return { ok: false, reason: "Invalid staff code" };
  }

  const validation = voucherCanBeRedeemed(voucher, now);
  if (!validation.ok) {
    return validation;
  }

  const redemption = await prisma.$transaction(async (tx) => {
    const updated = await tx.voucher.updateMany({
      where: {
        id: voucher.id,
        status: VoucherStatus.ACTIVE,
        redeemedCount: { lt: voucher.maxRedemptions },
      },
      data: {
        redeemedCount: { increment: 1 },
      },
    });

    if (updated.count !== 1) {
      throw new Error("Voucher redemption limit reached");
    }

    const created = await tx.voucherRedemption.create({
      data: {
        voucherId: voucher.id,
        shopId: input.shopId,
        deviceId: input.deviceId,
      },
    });

    if (voucher.redeemedCount + 1 >= voucher.maxRedemptions) {
      await tx.voucher.update({
        where: { id: voucher.id },
        data: { status: VoucherStatus.DEPLETED },
      });
    }

    return created;
  });

  const grant = await grantVoucherAccess(redemption.id);
  return grant.ok ? { ok: true, redemption, grant: grant.grant } : grant;
}

export async function grantVoucherAccess(voucherRedemptionId: string) {
  const prisma = getPrisma();
  const redemption = await prisma.voucherRedemption.findUnique({
    where: { id: voucherRedemptionId },
    include: {
      voucher: true,
      device: true,
    },
  });

  if (!redemption) {
    return { ok: false, reason: "Voucher redemption not found" };
  }

  const shop = await prisma.shop.findUnique({
    where: { id: redemption.shopId },
    include: { unifiIntegration: true },
  });

  if (!shop?.unifiIntegration) {
    return { ok: false, reason: "Missing UniFi integration" };
  }

  const now = new Date();
  const grant = await prisma.accessGrant.create({
    data: {
      shopId: redemption.shopId,
      deviceId: redemption.deviceId,
      voucherRedemptionId: redemption.id,
      type: AccessGrantType.VOUCHER,
      status: AccessGrantStatus.PENDING,
      requestedMinutes: redemption.voucher.durationMinutes,
      source: "STAFF_CODE",
    },
  });

  const rawMac = decryptSecret(redemption.device.clientMacEncrypted);
  const provider = getNetworkProvider();
  const client = await provider.findClientByMac(shop.unifiIntegration, rawMac);

  if (!client) {
    const failedGrant = await prisma.accessGrant.update({
      where: { id: grant.id },
      data: {
        status: AccessGrantStatus.FAILED,
        failureReason: "UniFi client not found",
      },
    });
    return { ok: false, reason: "UniFi client not found", grant: failedGrant };
  }

  const authorization = await provider.authorizeGuest(
    shop.unifiIntegration,
    client.clientId,
    { timeLimitMinutes: redemption.voucher.durationMinutes },
    { shopId: shop.id, deviceId: redemption.deviceId, grantId: grant.id },
  );

  if (!authorization.ok) {
    const failedGrant = await prisma.accessGrant.update({
      where: { id: grant.id },
      data: {
        status: AccessGrantStatus.FAILED,
        failureReason: authorization.error ?? "Voucher authorization failed",
        unifiClientId: client.clientId,
        unifiActionStatus: "FAILED",
        unifiResponseJson: asJson(authorization.response),
      },
    });
    return { ok: false, reason: authorization.error ?? "Voucher authorization failed", grant: failedGrant };
  }

  const authorizedGrant = await prisma.accessGrant.update({
    where: { id: grant.id },
    data: {
      status: AccessGrantStatus.AUTHORIZED,
      authorizedAt: now,
      expiresAt: addMinutes(now, redemption.voucher.durationMinutes),
      unifiClientId: client.clientId,
      unifiActionStatus: "AUTHORIZED",
      unifiResponseJson: asJson(authorization.response),
    },
  });

  await prisma.voucherRedemption.update({
    where: { id: redemption.id },
    data: { grantId: authorizedGrant.id },
  });

  return { ok: true, redemption: redemption as VoucherRedemption, grant: authorizedGrant };
}
