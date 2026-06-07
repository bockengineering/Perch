import { NextResponse } from "next/server";
import { z } from "zod";
import { actorFromRequest } from "@/lib/auth/basic";
import { createPlatformAdminAccount } from "@/lib/auth/platform-account";
import { createSupabaseAuthUser, isSupabaseAdminConfigured } from "@/lib/auth/supabase";
import { getPrisma } from "@/lib/db";
import { logAudit } from "@/lib/services/audit";

export const dynamic = "force-dynamic";

const createPlatformUserSchema = z
  .object({
    email: z.string().email(),
    name: z.string().min(1).nullable().optional(),
    password: z.string().min(8).optional(),
    createSupabaseUser: z.boolean().default(true),
  })
  .refine((value) => !value.createSupabaseUser || Boolean(value.password), {
    message: "A password is required when creating a Supabase user.",
    path: ["password"],
  });

export async function GET() {
  const platformUsers = await getPrisma().platformUser.findMany({
    include: { user: { select: { id: true, email: true, name: true, supabaseUserId: true, lastLoginAt: true } } },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ platformUsers });
}

export async function POST(request: Request) {
  const actor = actorFromRequest(request);
  const parsed = createPlatformUserSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid platform admin payload." }, { status: 400 });
  }

  let supabaseUserId: string | null = null;
  if (parsed.data.createSupabaseUser && isSupabaseAdminConfigured()) {
    const supabaseUser = await createSupabaseAuthUser({
      email: parsed.data.email,
      password: parsed.data.password,
      name: parsed.data.name,
      appMetadata: { perch_role: "platform_admin" },
    });
    supabaseUserId = supabaseUser.id;
  }

  const user = await createPlatformAdminAccount({
    email: parsed.data.email,
    name: parsed.data.name,
    supabaseUserId,
  });

  await logAudit({
    actor,
    action: "platform_user.create",
    entityType: "User",
    entityId: user.userId,
    metadata: { role: "PLATFORM_ADMIN", supabaseLinked: Boolean(supabaseUserId) },
  });

  return NextResponse.json({
    user: {
      id: user.userId,
      email: user.email,
      name: user.name,
      supabaseLinked: Boolean(supabaseUserId),
    },
  });
}
