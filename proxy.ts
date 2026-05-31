import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { CAFE_SESSION_COOKIE_NAME, safeCafeRedirectPath, verifyCafeSessionCookie } from "@/lib/auth/cafe-session";
import { basicAuthResponse, isBasicAuthAllowed } from "@/lib/auth/basic";

function redirectToCafeLogin(request: NextRequest) {
  const loginUrl = new URL("/cafe/login", request.url);
  loginUrl.searchParams.set("next", safeCafeRedirectPath(`${request.nextUrl.pathname}${request.nextUrl.search}`));
  return NextResponse.redirect(loginUrl);
}

function apiUnauthorized() {
  return NextResponse.json({ error: "Authentication required" }, { status: 401 });
}

export async function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname;
  const cafeLoginPath = path === "/cafe/login" || path.startsWith("/api/cafe/login");
  const cafeSessionPath =
    (path.startsWith("/cafe") && !cafeLoginPath) ||
    path.startsWith("/staff") ||
    path.startsWith("/api/admin/shops") ||
    path.startsWith("/api/staff/shops");
  const adminBasicPath =
    path.startsWith("/admin") ||
    path.startsWith("/staff") ||
    path.startsWith("/api/admin") ||
    path.startsWith("/api/staff");

  if (cafeSessionPath) {
    const session = await verifyCafeSessionCookie(request.cookies.get(CAFE_SESSION_COOKIE_NAME)?.value);
    if (session) {
      return NextResponse.next();
    }
    if (path.startsWith("/cafe") || path.startsWith("/staff")) {
      return redirectToCafeLogin(request);
    }
    if (!isBasicAuthAllowed(request)) {
      return apiUnauthorized();
    }
  }

  if (!adminBasicPath || isBasicAuthAllowed(request)) {
    return NextResponse.next();
  }

  return basicAuthResponse();
}

export const config = {
  matcher: [
    "/admin/:path*",
    "/cafe/:path*",
    "/staff/:path*",
    "/api/admin/:path*",
    "/api/staff/:path*",
    "/api/cafe/:path*",
  ],
};
