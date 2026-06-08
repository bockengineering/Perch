import { getPrisma } from "@/lib/db";

export type ShopAnalyticsPoint = {
  key: string;
  label: string;
  portalVisits: number;
  freeGrants: number;
  paidPasses: number;
  grossRevenueCents: number;
  cafeShareCents: number;
  platformFeeCents: number;
  voucherRedemptions: number;
  failedAuthorizations: number;
};

export type ShopAnalytics = {
  days: ShopAnalyticsPoint[];
  months: ShopAnalyticsPoint[];
};

type ShopAnalyticsInput = {
  id: string;
  timezone: string;
};

type LocalParts = {
  year: number;
  month: number;
  day: number;
};

const FREE_ACCESS_TYPES = ["FREE_AUTO_WORKER", "FREE_PORTAL_FAST_PATH", "EMERGENCY_FREE"] as const;
const PAID_ORDER_STATUSES = ["PAID", "AUTHORIZED"] as const;

function localParts(timezone: string, date: Date): LocalParts {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const value = (type: string) => Number(parts.find((part) => part.type === type)?.value ?? "0");

  return {
    year: value("year"),
    month: value("month"),
    day: value("day"),
  };
}

function pad(value: number) {
  return value.toString().padStart(2, "0");
}

export function analyticsDayKey(timezone: string, date: Date) {
  const parts = localParts(timezone, date);
  return `${parts.year}-${pad(parts.month)}-${pad(parts.day)}`;
}

export function analyticsMonthKey(timezone: string, date: Date) {
  const parts = localParts(timezone, date);
  return `${parts.year}-${pad(parts.month)}`;
}

function dayLabel(key: string) {
  const [, month, day] = key.split("-");
  return `${Number(month)}/${Number(day)}`;
}

function monthLabel(key: string) {
  const [year, month] = key.split("-").map(Number);
  return new Intl.DateTimeFormat("en-US", { month: "short", year: "2-digit", timeZone: "UTC" }).format(
    new Date(Date.UTC(year, month - 1, 1, 12)),
  );
}

function emptyPoint(key: string, label: string): ShopAnalyticsPoint {
  return {
    key,
    label,
    portalVisits: 0,
    freeGrants: 0,
    paidPasses: 0,
    grossRevenueCents: 0,
    cafeShareCents: 0,
    platformFeeCents: 0,
    voucherRedemptions: 0,
    failedAuthorizations: 0,
  };
}

function buildDayBuckets(timezone: string, now: Date) {
  const current = analyticsDayKey(timezone, now);
  const [year, month, day] = current.split("-").map(Number);

  return Array.from({ length: 30 }, (_, index) => {
    const offset = 29 - index;
    const date = new Date(Date.UTC(year, month - 1, day - offset, 12));
    const key = `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`;
    return emptyPoint(key, dayLabel(key));
  });
}

function buildMonthBuckets(timezone: string, now: Date) {
  const current = analyticsMonthKey(timezone, now);
  const [currentYear, currentMonth] = current.split("-").map(Number);

  return Array.from({ length: 12 }, (_, index) => {
    const offset = 11 - index;
    const monthIndex = currentYear * 12 + (currentMonth - 1) - offset;
    const year = Math.floor(monthIndex / 12);
    const month = (monthIndex % 12) + 1;
    const key = `${year}-${pad(month)}`;
    return emptyPoint(key, monthLabel(key));
  });
}

function addToBucket(
  buckets: Map<string, ShopAnalyticsPoint>,
  key: string,
  mutator: (point: ShopAnalyticsPoint) => void,
) {
  const bucket = buckets.get(key);
  if (bucket) {
    mutator(bucket);
  }
}

export async function getShopAnalytics(shop: ShopAnalyticsInput, now = new Date()): Promise<ShopAnalytics> {
  const prisma = getPrisma();
  const days = buildDayBuckets(shop.timezone, now);
  const months = buildMonthBuckets(shop.timezone, now);
  const dayBuckets = new Map(days.map((point) => [point.key, point]));
  const monthBuckets = new Map(months.map((point) => [point.key, point]));
  const windowStart = new Date(now.getTime() - 400 * 24 * 60 * 60 * 1000);

  const [portalSessions, accessGrants, paidOrders, voucherRedemptions] = await Promise.all([
    prisma.portalSession.findMany({
      where: { shopId: shop.id, createdAt: { gte: windowStart } },
      select: { createdAt: true },
    }),
    prisma.accessGrant.findMany({
      where: { shopId: shop.id, createdAt: { gte: windowStart } },
      select: { createdAt: true, type: true, status: true },
    }),
    prisma.order.findMany({
      where: {
        shopId: shop.id,
        paidAt: { gte: windowStart },
        status: { in: [...PAID_ORDER_STATUSES] },
      },
      select: { paidAt: true, amountCents: true, platformFeeCents: true },
    }),
    prisma.voucherRedemption.findMany({
      where: { shopId: shop.id, redeemedAt: { gte: windowStart } },
      select: { redeemedAt: true },
    }),
  ]);

  const applyDate = (date: Date, mutator: (point: ShopAnalyticsPoint) => void) => {
    addToBucket(dayBuckets, analyticsDayKey(shop.timezone, date), mutator);
    addToBucket(monthBuckets, analyticsMonthKey(shop.timezone, date), mutator);
  };

  for (const session of portalSessions) {
    applyDate(session.createdAt, (point) => {
      point.portalVisits += 1;
    });
  }

  for (const grant of accessGrants) {
    if (grant.status === "AUTHORIZED" && FREE_ACCESS_TYPES.includes(grant.type as (typeof FREE_ACCESS_TYPES)[number])) {
      applyDate(grant.createdAt, (point) => {
        point.freeGrants += 1;
      });
    }

    if (grant.status === "FAILED") {
      applyDate(grant.createdAt, (point) => {
        point.failedAuthorizations += 1;
      });
    }
  }

  for (const order of paidOrders) {
    if (!order.paidAt) {
      continue;
    }

    applyDate(order.paidAt, (point) => {
      point.paidPasses += 1;
      point.grossRevenueCents += order.amountCents;
      point.platformFeeCents += order.platformFeeCents;
      point.cafeShareCents += order.amountCents - order.platformFeeCents;
    });
  }

  for (const redemption of voucherRedemptions) {
    applyDate(redemption.redeemedAt, (point) => {
      point.voucherRedemptions += 1;
    });
  }

  return { days, months };
}
