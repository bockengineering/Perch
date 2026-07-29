import { timingSafeEqual } from "node:crypto";
import { getOptionalServerEnv } from "@/lib/env";

export function isCronRequestAuthorized(request: Request) {
  const secret = getOptionalServerEnv("CRON_SECRET");
  const authorization = request.headers.get("authorization");
  if (!secret || !authorization) {
    return false;
  }

  const actual = Buffer.from(authorization);
  const expected = Buffer.from(`Bearer ${secret}`);
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}
