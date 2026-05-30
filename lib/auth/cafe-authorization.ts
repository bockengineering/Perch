import {
  CAFE_SESSION_COOKIE_NAME,
  parseCookieHeader,
  type CafeSession,
  verifyCafeSessionCookie,
} from "@/lib/auth/cafe-session";

export type CafeActor = {
  email: string;
  role: "SHOP_OWNER" | "STAFF";
  userId?: string;
};

export async function getCafeSessionFromRequest(request: Request) {
  const cookieValue = parseCookieHeader(request.headers.get("cookie"), CAFE_SESSION_COOKIE_NAME);
  return verifyCafeSessionCookie(cookieValue);
}

export function cafeSessionCanAccessShop(session: CafeSession | null, shopId: string, ownerOnly = false) {
  if (!session?.shopIds?.includes(shopId)) {
    return false;
  }
  if (ownerOnly && session.role !== "SHOP_OWNER") {
    return false;
  }
  return true;
}

export function cafeActorFromSession(session: CafeSession): CafeActor {
  return {
    email: session.email,
    role: session.role,
    userId: session.userId,
  };
}
