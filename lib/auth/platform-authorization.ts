import type { Actor } from "@/lib/auth/basic";
import {
  parsePlatformCookieHeader,
  PLATFORM_SESSION_COOKIE_NAME,
  type PlatformSession,
  verifyPlatformSessionCookie,
} from "@/lib/auth/platform-session";

export async function getPlatformSessionFromRequest(request: Request) {
  const cookieValue = parsePlatformCookieHeader(request.headers.get("cookie"), PLATFORM_SESSION_COOKIE_NAME);
  return verifyPlatformSessionCookie(cookieValue);
}

export function platformActorFromSession(session: PlatformSession): Actor {
  return {
    email: session.email,
    role: "PLATFORM_ADMIN",
  };
}
