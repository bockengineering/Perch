type ShopTimePolicy = {
  timezone: string;
  freeResetHour: number;
};

function localParts(timezone: string, date: Date) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);

  const value = (type: string) => parts.find((part) => part.type === type)?.value ?? "00";

  return {
    year: Number(value("year")),
    month: Number(value("month")),
    day: Number(value("day")),
    hour: Number(value("hour")),
    minute: Number(value("minute")),
    second: Number(value("second")),
  };
}

function ymd(year: number, month: number, day: number) {
  return `${year.toString().padStart(4, "0")}-${month.toString().padStart(2, "0")}-${day
    .toString()
    .padStart(2, "0")}`;
}

export function getShopLocalDate(shop: ShopTimePolicy, now = new Date()) {
  const parts = localParts(shop.timezone, now);
  const resetHour = Math.max(0, Math.min(23, shop.freeResetHour ?? 0));

  if (parts.hour >= resetHour) {
    return ymd(parts.year, parts.month, parts.day);
  }

  const previous = new Date(Date.UTC(parts.year, parts.month - 1, parts.day) - 24 * 60 * 60 * 1000);
  return ymd(previous.getUTCFullYear(), previous.getUTCMonth() + 1, previous.getUTCDate());
}

export function addMinutes(date: Date, minutes: number) {
  return new Date(date.getTime() + minutes * 60 * 1000);
}

export function startOfTodayUtc() {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

function timeZoneOffsetMs(timezone: string, date: Date) {
  const parts = localParts(timezone, date);
  const localAsUtc = Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour,
    parts.minute,
    parts.second,
  );
  return localAsUtc - date.getTime();
}

function zonedTimeToUtc(timezone: string, year: number, month: number, day: number, hour = 0) {
  const utcGuess = Date.UTC(year, month - 1, day, hour, 0, 0);
  const firstOffset = timeZoneOffsetMs(timezone, new Date(utcGuess));
  const firstPass = new Date(utcGuess - firstOffset);
  const secondOffset = timeZoneOffsetMs(timezone, firstPass);
  return new Date(utcGuess - secondOffset);
}

function addLocalDays(year: number, month: number, day: number, days: number) {
  const next = new Date(Date.UTC(year, month - 1, day + days, 12, 0, 0));
  return {
    year: next.getUTCFullYear(),
    month: next.getUTCMonth() + 1,
    day: next.getUTCDate(),
  };
}

export function getNextLocalMidnight(timezone: string, now = new Date()) {
  const parts = localParts(timezone, now);
  const nextLocalDate = addLocalDays(parts.year, parts.month, parts.day, 1);
  return zonedTimeToUtc(
    timezone,
    nextLocalDate.year,
    nextLocalDate.month,
    nextLocalDate.day,
    0,
  );
}
