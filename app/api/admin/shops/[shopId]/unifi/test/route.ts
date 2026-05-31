import { NextResponse } from "next/server";
import { IntegrationStatus, type UniFiIntegration } from "@prisma/client";
import { z } from "zod";
import { cafeSessionCanAccessShop, getCafeSessionFromRequest } from "@/lib/auth/cafe-authorization";
import { encryptSecret } from "@/lib/crypto/field-encryption";
import { networkProviderMode } from "@/lib/env";
import { MockNetworkProvider } from "@/lib/network/mock-provider";
import { UniFiProvider } from "@/lib/network/unifi-provider";

export const dynamic = "force-dynamic";

const schema = z.object({
  apiBaseUrl: z.string().url(),
  apiKey: z.string().min(1),
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

  const integration = {
    id: "test",
    shopId,
    apiBaseUrl: parsed.data.apiBaseUrl,
    apiKeyEncrypted: encryptSecret(parsed.data.apiKey),
    siteId: "test",
    siteName: "test",
    allowedSsids: [],
    connectionStatus: IntegrationStatus.UNTESTED,
    lastTestAt: null,
    lastError: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  } satisfies UniFiIntegration;

  const provider = networkProviderMode() === "mock" ? new MockNetworkProvider() : new UniFiProvider();
  const result = await provider.testConnection(integration);
  if (!result.ok) {
    const error = "error" in result ? result.error : undefined;
    return NextResponse.json({ error: error ?? "UniFi connection failed." }, { status: 400 });
  }

  return NextResponse.json({ sites: result.sites });
}
