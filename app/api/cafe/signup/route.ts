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
import { createCafeSignup, slugifyCafeName } from "@/lib/services/cafe-signup";
import { checkRateLimit } from "@/lib/utils/rate-limit";

export const dynamic = "force-dynamic";

const signupSchema = z.object({
  cafeName: z.string().trim().min(2).max(120),
  ownerName: z.string().trim().min(2).max(120),
  ownerEmail: z.string().trim().email().max(180),
  password: z.string().min(8).max(128),
  timezone: z.string().trim().min(3).max(80).default("America/Los_Angeles"),
  supportEmail: z.string().trim().email().max(180).optional().or(z.literal("")),
  brandPrimaryColor: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/)
    .optional()
    .or(z.literal("")),
  preferredSlug: z
    .string()
    .trim()
    .min(2)
    .max(60)
    .regex(/^[a-z0-9-]+$/)
    .optional()
    .or(z.literal("")),
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
    return NextResponse.json({ error: "Enter valid cafe and owner details." }, { status: 400 });
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
      createCafeSignup(tx, {
        cafeName: data.cafeName,
        ownerName: data.ownerName,
        ownerEmail: normalizedEmail,
        timezone: data.timezone,
        supportEmail: data.supportEmail || normalizedEmail,
        brandPrimaryColor: data.brandPrimaryColor || "#35684e",
        preferredSlug: data.preferredSlug || slugifyCafeName(data.cafeName),
        supabaseUserId,
      }),
    );

    await logAudit({
      shopId: result.shop.id,
      action: "cafe.signup",
      entityType: "Shop",
      entityId: result.shop.id,
      metadata: { supabaseLinked: Boolean(supabaseUserId) },
    });

    const response = NextResponse.json({
      shopId: result.shop.id,
      redirectTo: `/cafe/shops/${result.shop.id}`,
      supabaseLinked: Boolean(supabaseUserId),
    });
    response.cookies.set({
      name: CAFE_SESSION_COOKIE_NAME,
      value: await createCafeSessionCookie({
        email: result.user.email,
        userId: result.user.id,
        role: "SHOP_OWNER",
        shopIds: [result.shop.id],
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
