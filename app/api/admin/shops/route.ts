import { NextResponse } from "next/server";
import { z } from "zod";
import { actorFromRequest } from "@/lib/auth/basic";
import { getPrisma } from "@/lib/db";
import { logAudit } from "@/lib/services/audit";

export const dynamic = "force-dynamic";

const createShopSchema = z.object({
  name: z.string().min(2),
  slug: z.string().min(2).regex(/^[a-z0-9-]+$/),
  timezone: z.string().min(3).default("America/Los_Angeles"),
});

export async function GET() {
  const shops = await getPrisma().shop.findMany({ orderBy: { createdAt: "desc" } });
  return NextResponse.json({ shops });
}

export async function POST(request: Request) {
  const actor = actorFromRequest(request);
  const parsed = createShopSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid shop payload." }, { status: 400 });
  }

  const shop = await getPrisma().shop.create({
    data: {
      name: parsed.data.name,
      slug: parsed.data.slug,
      timezone: parsed.data.timezone,
      status: "DRAFT",
    },
  });
  await logAudit({ actor, shopId: shop.id, action: "shop.create", entityType: "Shop", entityId: shop.id });

  return NextResponse.json({ shopId: shop.id });
}
