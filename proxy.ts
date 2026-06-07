import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { CAFE_SESSION_COOKIE_NAME, safeCafeRedirectPath, verifyCafeSessionCookie } from "@/lib/auth/cafe-session";
import {
  PLATFORM_SESSION_COOKIE_NAME,
  safeAdminRedirectPath,
  verifyPlatformSessionCookie,
} from "@/lib/auth/platform-session";
import { isBasicAuthAllowed } from "@/lib/auth/basic";

function redirectToCafeLogin(request: NextRequest) {
  const loginUrl = new URL("/cafe/login", request.url);
  loginUrl.searchParams.set("next", safeCafeRedirectPath(`${request.nextUrl.pathname}${request.nextUrl.search}`));
  return NextResponse.redirect(loginUrl);
}

function redirectToAdminLogin(request: NextRequest) {
  const loginUrl = new URL("/admin/login", request.url);
  loginUrl.searchParams.set("next", safeAdminRedirectPath(`${request.nextUrl.pathname}${request.nextUrl.search}`));
  return NextResponse.redirect(loginUrl);
}

function apiUnauthorized() {
  return NextResponse.json({ error: "Authentication required" }, { status: 401 });
}

function nextWithActor(request: NextRequest, actor: { email: string; role: string }) {
  const headers = new Headers(request.headers);
  headers.set("x-perch-actor-email", actor.email);
  headers.set("x-perch-actor-role", actor.role);
  return NextResponse.next({ request: { headers } });
}

export async function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname;
  const publicCafeAuthPath =
    path === "/cafe/login" ||
    path === "/cafe/signup" ||
    path.startsWith("/api/cafe/login") ||
    path.startsWith("/api/cafe/signup") ||
    path.startsWith("/api/cafe/logout");
  const publicAdminAuthPath =
    path === "/admin/login" || path.startsWith("/api/admin/login") || path.startsWith("/api/admin/logout");
  const cafeSessionPath =
    (path.startsWith("/cafe") && !publicCafeAuthPath) ||
    path.startsWith("/staff") ||
    path.startsWith("/api/admin/shops") ||
    path.startsWith("/api/staff/shops");
  const adminPagePath = path.startsWith("/admin") && !publicAdminAuthPath;
  const adminApiPath = path.startsWith("/api/admin") && !publicAdminAuthPath;
  const staffPath = path.startsWith("/staff") || path.startsWith("/api/staff");

  if (publicCafeAuthPath || publicAdminAuthPath) {
    return NextResponse.next();
  }

  const platformSession = await verifyPlatformSessionCookie(request.cookies.get(PLATFORM_SESSION_COOKIE_NAME)?.value);
  if (platformSession && (adminPagePath || adminApiPath || staffPath)) {
    return nextWithActor(request, { email: platformSession.email, role: platformSession.role });
  }

  if (cafeSessionPath) {
    const session = await verifyCafeSessionCookie(request.cookies.get(CAFE_SESSION_COOKIE_NAME)?.value);
    if (session) {
      return nextWithActor(request, { email: session.email, role: session.role });
    }
    if (path.startsWith("/cafe") || path.startsWith("/staff")) {
      return redirectToCafeLogin(request);
    }
    if (!isBasicAuthAllowed(request)) {
      return apiUnauthorized();
    }
  }

  if (adminPagePath) {
    if (isBasicAuthAllowed(request)) {
      return NextResponse.next();
    }
    return redirectToAdminLogin(request);
  }

  if (adminApiPath || staffPath) {
    if (isBasicAuthAllowed(request)) {
      return NextResponse.next();
    }
    return apiUnauthorized();
  }

  if (isBasicAuthAllowed(request)) {
    return NextResponse.next();
  }

  return NextResponse.next();
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
