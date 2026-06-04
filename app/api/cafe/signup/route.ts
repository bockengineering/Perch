import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import {
  CAFE_SESSION_COOKIE_NAME,
  CAFE_SESSION_MAX_AGE_SECONDS,
  createCafeSessionCookie,
} from "@/lib/auth/cafe-session";
import { createSupabaseCafeUser, isSupabaseAdminConfigured } from "@/lib/auth/supabase";
import { getPrisma } from "@/lib/db";
import { logAudit } from "@/lib/services/audit";
import { createCafeSignupAccount } from "@/lib/services/cafe-signup";
import { checkRateLimit } from "@/lib/utils/rate-limit";

export const dynamic = "force-dynamic";

const signupSchema = z.object({
  ownerName: z.string().trim().min(2).max(120),
  ownerEmail: z.string().trim().email().max(180),
  password: z.string().min(8).max(128),
});

function clientIp(request: NextRequest) {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown"
  );
}

export async function POST(request: NextRequest) {
  const rateLimit = checkRateLimit(`cafe-signup:${clientIp(request)}`, 5, 60 * 60 * 1000);
  if (!rateLimit.allowed) {
    return NextResponse.json({ error: "Too many signup attempts. Try again later." }, { status: 429 });
  }

  const parsed = signupSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Enter valid account details." }, { status: 400 });
  }

  const data = parsed.data;
  const normalizedEmail = data.ownerEmail.trim().toLowerCase();
  let supabaseUserId: string | null = null;

  try {
    if (isSupabaseAdminConfigured()) {
      const supabaseUser = await createSupabaseCafeUser({
        email: normalizedEmail,
        password: data.password,
        name: data.ownerName,
      });
      supabaseUserId = supabaseUser.id;
    }

    const prisma = getPrisma();
    const result = await prisma.$transaction((tx) =>
      createCafeSignupAccount(tx, {
        ownerName: data.ownerName,
        ownerEmail: normalizedEmail,
        supabaseUserId,
      }),
    );

    await logAudit({
      action: "cafe.signup",
      entityType: "User",
      entityId: result.id,
      metadata: { supabaseLinked: Boolean(supabaseUserId) },
    });

    const response = NextResponse.json({
      userId: result.id,
      redirectTo: "/cafe/onboarding",
      supabaseLinked: Boolean(supabaseUserId),
    });
    response.cookies.set({
      name: CAFE_SESSION_COOKIE_NAME,
      value: await createCafeSessionCookie({
        email: result.email,
        userId: result.id,
        role: "SHOP_OWNER",
        shopIds: [],
      }),
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: CAFE_SESSION_MAX_AGE_SECONDS,
    });

    return response;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Cafe signup failed.";
    const duplicateAccount = message.toLowerCase().includes("already") || message.toLowerCase().includes("registered");
    return NextResponse.json(
      {
        error: duplicateAccount
          ? "That email already has an account. Sign in or ask Perch support to add this cafe."
          : "We could not create the cafe account yet. Try again or contact Perch support.",
      },
      { status: duplicateAccount ? 409 : 500 },
    );
  }
}
