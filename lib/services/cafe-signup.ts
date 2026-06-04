import { Prisma, ShopRole, type ShopStatus } from "@prisma/client";

const reservedSlugs = new Set(["admin", "api", "cafe", "demo", "p", "staff"]);

export type CafeSignupInput = {
  ownerName: string;
  ownerEmail: string;
  supabaseUserId?: string | null;
};

export type CafeConsoleInput = {
  cafeName: string;
  ownerUserId: string;
  ownerEmail: string;
  timezone: string;
  supportEmail?: string | null;
  brandPrimaryColor?: string | null;
  preferredSlug?: string | null;
  status?: ShopStatus;
};

export function slugifyCafeName(value: string) {
  const slug = value
    .trim()
    .toLowerCase()
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48)
    .replace(/-+$/g, "");

  if (!slug || reservedSlugs.has(slug)) {
    return "cafe";
  }

  return slug;
}

export function defaultPricePlanCreateData() {
  return [
    {
      label: "2 more hours",
      durationMinutes: 120,
      amountCents: 500,
      currency: "usd",
      active: true,
      sortOrder: 10,
    },
    {
      label: "All day",
      durationMinutes: 720,
      amountCents: 800,
      currency: "usd",
      active: true,
      sortOrder: 20,
    },
  ];
}

export async function buildUniqueShopSlug(
  prisma: Pick<Prisma.TransactionClient, "shop">,
  preferredValue: string,
) {
  const base = slugifyCafeName(preferredValue);
  let candidate = base;
  let suffix = 2;

  while (await prisma.shop.findUnique({ where: { slug: candidate }, select: { id: true } })) {
    candidate = `${base}-${suffix}`;
    suffix += 1;
  }

  return candidate;
}

export async function createCafeSignupAccount(
  prisma: Prisma.TransactionClient,
  input: CafeSignupInput,
) {
  const normalizedEmail = input.ownerEmail.trim().toLowerCase();
  return prisma.user.upsert({
    where: { email: normalizedEmail },
    update: {
      name: input.ownerName.trim(),
      supabaseUserId: input.supabaseUserId ?? undefined,
    },
    create: {
      email: normalizedEmail,
      name: input.ownerName.trim(),
      supabaseUserId: input.supabaseUserId ?? undefined,
    },
  });
}

export async function createCafeConsoleForOwner(
  prisma: Prisma.TransactionClient,
  input: CafeConsoleInput,
) {
  const normalizedEmail = input.ownerEmail.trim().toLowerCase();
  const slug = await buildUniqueShopSlug(prisma, input.preferredSlug || input.cafeName);

  const owner = await prisma.user.findFirst({
    where: {
      OR: [{ id: input.ownerUserId }, { email: normalizedEmail }],
    },
    select: { id: true, email: true, name: true },
  });

  if (!owner) {
    throw new Error("Cafe owner account was not found.");
  }

  const shop = await prisma.shop.create({
    data: {
      name: input.cafeName.trim(),
      slug,
      timezone: input.timezone,
      supportEmail: input.supportEmail?.trim() || normalizedEmail,
      brandPrimaryColor: input.brandPrimaryColor || "#35684e",
      status: input.status ?? "DRAFT",
      pricePlans: {
        create: defaultPricePlanCreateData(),
      },
    },
  });

  await prisma.shopMember.upsert({
    where: {
      shopId_userId: {
        shopId: shop.id,
        userId: owner.id,
      },
    },
    update: { role: ShopRole.SHOP_OWNER },
    create: {
      shopId: shop.id,
      userId: owner.id,
      role: ShopRole.SHOP_OWNER,
    },
  });

  return { shop, user: owner };
}
