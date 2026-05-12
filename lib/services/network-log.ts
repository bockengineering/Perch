import { NetworkActionStatus, NetworkProviderType } from "@prisma/client";
import { getPrisma } from "@/lib/db";

type NetworkLogInput = {
  shopId: string;
  deviceId?: string | null;
  grantId?: string | null;
  provider: NetworkProviderType;
  action: string;
  requestJson?: unknown;
  responseJson?: unknown;
  status: NetworkActionStatus;
  error?: string | null;
};

export async function logNetworkAction(input: NetworkLogInput) {
  try {
    await getPrisma().networkActionLog.create({
      data: {
        shopId: input.shopId,
        deviceId: input.deviceId ?? undefined,
        grantId: input.grantId ?? undefined,
        provider: input.provider,
        action: input.action,
        requestJson: input.requestJson === undefined ? undefined : JSON.parse(JSON.stringify(input.requestJson)),
        responseJson:
          input.responseJson === undefined ? undefined : JSON.parse(JSON.stringify(input.responseJson)),
        status: input.status,
        error: input.error ?? undefined,
      },
    });
  } catch {
    // Network logs are useful, but should never mask the primary captive portal flow.
  }
}
