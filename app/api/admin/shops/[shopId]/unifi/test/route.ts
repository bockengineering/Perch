import { NextResponse } from "next/server";
import { IntegrationStatus, type UniFiIntegration } from "@prisma/client";
import { z } from "zod";
import { cafeSessionCanAccessShop, getCafeSessionFromRequest } from "@/lib/auth/cafe-authorization";
import { encryptSecret } from "@/lib/crypto/field-encryption";
import { getPrisma } from "@/lib/db";
import { networkProviderMode } from "@/lib/env";
import { MockNetworkProvider } from "@/lib/network/mock-provider";
import { UniFiProvider } from "@/lib/network/unifi-provider";

export const dynamic = "force-dynamic";

const schema = z.object({
  apiBaseUrl: z.string().url(),
  apiKey: z.preprocess(
    (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
    z.string().min(1).optional(),
  ),
});

type RouteContext = {
  params: Promise<{ shopId: string }>;
};

export async function POST(request: Request, context: RouteContext) {
  const { shopId } = await context.params;
  const cafeSession = await getCafeSessionFromRequest(request);
  if (cafeSession && !cafeSessionCanAccessShop(cafeSession, shopId, true)) {
    return NextResponse.json({ error: "Not authorized for this shop." }, { status: 403 });
  }
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid UniFi test payload." }, { status: 400 });
  }

  const existingIntegration = await getPrisma().uniFiIntegration.findUnique({ where: { shopId } });
  if (!parsed.data.apiKey && !existingIntegration) {
    return NextResponse.json(
      { error: "Enter a UniFi access key before checking the connection." },
      { status: 400 },
    );
  }

  const now = new Date();
  const integration = {
    id: existingIntegration?.id ?? "test",
    shopId,
    apiBaseUrl: parsed.data.apiBaseUrl,
    apiKeyEncrypted: parsed.data.apiKey
      ? encryptSecret(parsed.data.apiKey)
      : existingIntegration!.apiKeyEncrypted,
    siteId: existingIntegration?.siteId ?? "test",
    siteName: existingIntegration?.siteName ?? "Connection test",
    allowedSsids: existingIntegration?.allowedSsids ?? [],
    connectionStatus: existingIntegration?.connectionStatus ?? IntegrationStatus.UNTESTED,
    lastTestAt: existingIntegration?.lastTestAt ?? null,
    lastError: existingIntegration?.lastError ?? null,
    createdAt: existingIntegration?.createdAt ?? now,
    updatedAt: now,
  } satisfies UniFiIntegration;

  const provider = networkProviderMode() === "mock" ? new MockNetworkProvider() : new UniFiProvider();
  const result = await provider.testConnection(integration);
  if (!result.ok) {
    const error = "error" in result ? result.error : undefined;
    return NextResponse.json({ error: error ?? "UniFi connection failed." }, { status: 400 });
  }

  return NextResponse.json({ sites: result.sites });
}
