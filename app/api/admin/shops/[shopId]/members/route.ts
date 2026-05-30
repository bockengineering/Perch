import { NextResponse } from "next/server";
import { z } from "zod";
import { actorFromRequest } from "@/lib/auth/basic";
import {
  cafeActorFromSession,
  cafeSessionCanAccessShop,
  getCafeSessionFromRequest,
} from "@/lib/auth/cafe-authorization";
import { createCafeMemberAccount } from "@/lib/auth/cafe-account";
import { createSupabaseCafeUser, isSupabaseAdminConfigured } from "@/lib/auth/supabase";
import { getPrisma } from "@/lib/db";
import { logAudit } from "@/lib/services/audit";

export const dynamic = "force-dynamic";

const createMemberSchema = z
  .object({
    email: z.string().email(),
    name: z.string().min(1).nullable().optional(),
    role: z.enum(["SHOP_OWNER", "STAFF"]).default("STAFF"),
    password: z.string().min(8).optional(),
    createSupabaseUser: z.boolean().default(true),
  })
  .refine((value) => !value.createSupabaseUser || Boolean(value.password), {
    message: "A password is required when creating a Supabase user.",
    path: ["password"],
  });

type RouteContext = {
  params: Promise<{ shopId: string }>;
};

export async function GET(request: Request, context: RouteContext) {
  const { shopId } = await context.params;
  const cafeSession = await getCafeSessionFromRequest(request);
  if (cafeSession && !cafeSessionCanAccessShop(cafeSession, shopId, true)) {
    return NextResponse.json({ error: "Not authorized for this shop." }, { status: 403 });
  }

  const members = await getPrisma().shopMember.findMany({
    where: { shopId },
    include: { user: { select: { id: true, email: true, name: true, supabaseUserId: true, lastLoginAt: true } } },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ members });
}

export async function POST(request: Request, context: RouteContext) {
  const { shopId } = await context.params;
  const cafeSession = await getCafeSessionFromRequest(request);
  if (cafeSession && !cafeSessionCanAccessShop(cafeSession, shopId, true)) {
    return NextResponse.json({ error: "Not authorized for this shop." }, { status: 403 });
  }
  const actor = cafeSession ? cafeActorFromSession(cafeSession) : actorFromRequest(request);
  const parsed = createMemberSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid member payload." }, { status: 400 });
  }

  let supabaseUserId: string | null = null;
  if (parsed.data.createSupabaseUser && isSupabaseAdminConfigured()) {
    const supabaseUser = await createSupabaseCafeUser({
      email: parsed.data.email,
      password: parsed.data.password,
      name: parsed.data.name,
    });
    supabaseUserId = supabaseUser.id;
  }

  const user = await createCafeMemberAccount({
    shopId,
    email: parsed.data.email,
    name: parsed.data.name,
    role: parsed.data.role,
    supabaseUserId,
  });

  await logAudit({
    actor,
    shopId,
    action: "shop_member.create",
    entityType: "User",
    entityId: user.id,
    metadata: { role: parsed.data.role, supabaseLinked: Boolean(supabaseUserId) },
  });

  return NextResponse.json({
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      supabaseLinked: Boolean(supabaseUserId ?? user.supabaseUserId),
    },
  });
}
