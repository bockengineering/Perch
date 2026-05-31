import { NextResponse } from "next/server";
import { z } from "zod";
import { actorFromRequest } from "@/lib/auth/basic";
import {
  cafeActorFromSession,
  cafeSessionCanAccessShop,
  getCafeSessionFromRequest,
} from "@/lib/auth/cafe-authorization";
import { encryptSecret } from "@/lib/crypto/field-encryption";
import { getPrisma } from "@/lib/db";
import { logAudit } from "@/lib/services/audit";

export const dynamic = "force-dynamic";

const schema = z.object({
  apiBaseUrl: z.string().url(),
  apiKey: z.preprocess(
    (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
    z.string().min(1).optional(),
  ),
  siteId: z.string().min(1),
  siteName: z.string().min(1).optional(),
  allowedSsids: z.array(z.string()).default([]),
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
  const actor = cafeSession ? cafeActorFromSession(cafeSession) : actorFromRequest(request);
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid UniFi settings payload." }, { status: 400 });
  }

  const prisma = getPrisma();
  const existingIntegration = await prisma.uniFiIntegration.findUnique({ where: { shopId } });
  if (!parsed.data.apiKey && !existingIntegration) {
    return NextResponse.json({ error: "An API key is required before UniFi settings can be saved." }, { status: 400 });
  }

  const apiKeyEncrypted = parsed.data.apiKey
    ? encryptSecret(parsed.data.apiKey)
    : existingIntegration?.apiKeyEncrypted;

  const integration = await prisma.uniFiIntegration.upsert({
    where: { shopId },
    update: {
      apiBaseUrl: parsed.data.apiBaseUrl,
      apiKeyEncrypted,
      siteId: parsed.data.siteId,
      siteName: parsed.data.siteName ?? parsed.data.siteId,
      allowedSsids: parsed.data.allowedSsids,
      connectionStatus: "CONNECTED",
      lastTestAt: new Date(),
      lastError: null,
    },
    create: {
      shopId,
      apiBaseUrl: parsed.data.apiBaseUrl,
      apiKeyEncrypted: apiKeyEncrypted!,
      siteId: parsed.data.siteId,
      siteName: parsed.data.siteName ?? parsed.data.siteId,
      allowedSsids: parsed.data.allowedSsids,
      connectionStatus: "CONNECTED",
      lastTestAt: new Date(),
    },
  });
  await logAudit({
    actor,
    shopId,
    action: "unifi.save",
    entityType: "UniFiIntegration",
    entityId: integration.id,
  });

  return NextResponse.json({ integrationId: integration.id });
}
