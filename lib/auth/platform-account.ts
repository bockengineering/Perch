import { PlatformRole, type User } from "@prisma/client";
import { getPrisma } from "@/lib/db";

export type PlatformAccount = {
  userId: string;
  email: string;
  name: string | null;
  role: "PLATFORM_ADMIN";
};

type UserWithPlatformRoles = User & {
  platformRoles: Array<{
    role: PlatformRole;
  }>;
};

function toPlatformAccount(user: UserWithPlatformRoles): PlatformAccount | null {
  const hasPlatformAdminRole = user.platformRoles.some((role) => role.role === PlatformRole.PLATFORM_ADMIN);
  if (!hasPlatformAdminRole) {
    return null;
  }

  return {
    userId: user.id,
    email: user.email,
    name: user.name,
    role: "PLATFORM_ADMIN",
  };
}

export async function resolvePlatformAccountForSupabaseUser(input: {
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
    include: { platformRoles: true },
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
    include: { platformRoles: true },
  });

  return toPlatformAccount(user);
}

export async function resolvePlatformAccountForFallbackLogin(email: string) {
  const normalizedEmail = email.trim().toLowerCase();
  const user = await createPlatformAdminAccount({
    email: normalizedEmail,
    name: normalizedEmail === "admin@perch.local" ? "Perch Admin" : undefined,
  });

  await getPrisma().user.update({ where: { id: user.userId }, data: { lastLoginAt: new Date() } });
  return user;
}

export async function createPlatformAdminAccount(input: {
  email: string;
  name?: string | null;
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

  await prisma.platformUser.upsert({
    where: {
      userId_role: {
        userId: user.id,
        role: PlatformRole.PLATFORM_ADMIN,
      },
    },
    update: {},
    create: {
      userId: user.id,
      role: PlatformRole.PLATFORM_ADMIN,
    },
  });

  return {
    userId: user.id,
    email: user.email,
    name: user.name,
    role: "PLATFORM_ADMIN",
  } satisfies PlatformAccount;
}
