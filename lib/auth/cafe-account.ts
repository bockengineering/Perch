import { ShopRole, type User } from "@prisma/client";
import { getPrisma } from "@/lib/db";
import { demoToolsEnabled } from "@/lib/env";

export type CafeAccount = {
  userId: string;
  email: string;
  name: string | null;
  role: "SHOP_OWNER" | "STAFF";
  shopIds: string[];
};

type UserWithMemberships = User & {
  shopMemberships: Array<{
    shopId: string;
    role: ShopRole;
  }>;
};

function toCafeAccount(user: UserWithMemberships): CafeAccount | null {
  const shopMemberships = user.shopMemberships.filter(
    (membership) => membership.role === ShopRole.SHOP_OWNER || membership.role === ShopRole.STAFF,
  );
  if (shopMemberships.length === 0) {
    return null;
  }

  const ownsShop = shopMemberships.some((membership) => membership.role === ShopRole.SHOP_OWNER);
  return {
    userId: user.id,
    email: user.email,
    name: user.name,
    role: ownsShop ? "SHOP_OWNER" : "STAFF",
    shopIds: shopMemberships.map((membership) => membership.shopId),
  };
}

export async function resolveCafeAccountForSupabaseUser(input: {
  supabaseUserId: string;
  email: string;
  name?: string | null;
}) {
  const prisma = getPrisma();
  const normalizedEmail = input.email.trim().toLowerCase();
  const existing = await prisma.user.findFirst({
    where: {
      OR: [{ supabaseUserId: input.supabaseUserId }, { email: normalizedEmail }],
    },
    include: { shopMemberships: true },
  });

  if (!existing) {
    return null;
  }

  const user = await prisma.user.update({
    where: { id: existing.id },
    data: {
      email: normalizedEmail,
      name: existing.name ?? input.name ?? undefined,
      supabaseUserId: input.supabaseUserId,
      lastLoginAt: new Date(),
    },
    include: { shopMemberships: true },
  });

  return toCafeAccount(user);
}

export async function resolveCafeAccountForLocalDemo(email: string) {
  const prisma = getPrisma();
  const normalizedEmail = email.trim().toLowerCase();
  let user = await prisma.user.findUnique({
    where: { email: normalizedEmail },
    include: { shopMemberships: true },
  });

  if (!user && demoToolsEnabled()) {
    const shop = await prisma.shop.findFirst({ orderBy: { createdAt: "asc" }, select: { id: true } });
    if (!shop) {
      return null;
    }
    user = await prisma.user.create({
      data: {
        email: normalizedEmail,
        name: "Demo Cafe Owner",
        shopMemberships: {
          create: {
            shopId: shop.id,
            role: ShopRole.SHOP_OWNER,
          },
        },
      },
      include: { shopMemberships: true },
    });
  }

  if (!user) {
    return null;
  }

  await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
  return toCafeAccount(user);
}

export async function createCafeMemberAccount(input: {
  shopId: string;
  email: string;
  name?: string | null;
  role: "SHOP_OWNER" | "STAFF";
  supabaseUserId?: string | null;
}) {
  const normalizedEmail = input.email.trim().toLowerCase();
  const prisma = getPrisma();
  const user = await prisma.user.upsert({
    where: { email: normalizedEmail },
    update: {
      name: input.name ?? undefined,
      supabaseUserId: input.supabaseUserId ?? undefined,
    },
    create: {
      email: normalizedEmail,
      name: input.name ?? undefined,
      supabaseUserId: input.supabaseUserId ?? undefined,
    },
  });

  await prisma.shopMember.upsert({
    where: {
      shopId_userId: {
        shopId: input.shopId,
        userId: user.id,
      },
    },
    update: { role: input.role },
    create: {
      shopId: input.shopId,
      userId: user.id,
      role: input.role,
    },
  });

  return user;
}
