import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import {
  CAFE_SESSION_COOKIE_NAME,
  CAFE_SESSION_MAX_AGE_SECONDS,
  createCafeSessionCookie,
} from "@/lib/auth/cafe-session";
import { getCafeSessionFromRequest } from "@/lib/auth/cafe-authorization";
import { getPrisma } from "@/lib/db";
import { logAudit } from "@/lib/services/audit";
import { createCafeConsoleForOwner, slugifyCafeName } from "@/lib/services/cafe-signup";
import { checkRateLimit } from "@/lib/utils/rate-limit";

export const dynamic = "force-dynamic";

const createConsoleSchema = z.object({
  cafeName: z.string().trim().min(2).max(120),
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
  const session = await getCafeSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ error: "Sign in before creating a cafe console." }, { status: 401 });
  }

  const rateLimit = checkRateLimit(`cafe-console:${session.userId ?? session.email}:${clientIp(request)}`, 6, 60 * 60 * 1000);
  if (!rateLimit.allowed) {
    return NextResponse.json({ error: "Too many console setup attempts. Try again later." }, { status: 429 });
  }

  const parsed = createConsoleSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Enter valid cafe details." }, { status: 400 });
  }

  const prisma = getPrisma();
  const owner = await prisma.user.findFirst({
    where: {
      OR: [
        ...(session.userId ? [{ id: session.userId }] : []),
        { email: session.email },
      ],
    },
    select: { id: true, email: true },
  });

  if (!owner) {
    return NextResponse.json({ error: "Cafe owner account was not found." }, { status: 404 });
  }

  const data = parsed.data;
  try {
    const result = await prisma.$transaction((tx) =>
      createCafeConsoleForOwner(tx, {
        cafeName: data.cafeName,
        ownerUserId: owner.id,
        ownerEmail: owner.email,
        timezone: data.timezone,
        supportEmail: data.supportEmail || owner.email,
        brandPrimaryColor: data.brandPrimaryColor || "#35684e",
        preferredSlug: data.preferredSlug || slugifyCafeName(data.cafeName),
      }),
    );

    const memberships = await prisma.shopMember.findMany({
      where: { userId: owner.id },
      select: { shopId: true },
      orderBy: { createdAt: "asc" },
    });

    await logAudit({
      shopId: result.shop.id,
      action: "cafe.console.create",
      entityType: "Shop",
      entityId: result.shop.id,
    });

    const response = NextResponse.json({
      shopId: result.shop.id,
      redirectTo: `/cafe/shops/${result.shop.id}`,
    });
    response.cookies.set({
      name: CAFE_SESSION_COOKIE_NAME,
      value: await createCafeSessionCookie({
        email: owner.email,
        userId: owner.id,
        role: "SHOP_OWNER",
        shopIds: memberships.map((membership) => membership.shopId),
      }),
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: CAFE_SESSION_MAX_AGE_SECONDS,
    });

    return response;
  } catch {
    return NextResponse.json(
      { error: "We could not create the cafe console yet. Try again or contact Perch support." },
      { status: 500 },
    );
  }
}
