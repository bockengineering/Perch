import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { basicAuthResponse, isBasicAuthAllowed } from "@/lib/auth/basic";

export function proxy(request: NextRequest) {
  const protectedPath =
    request.nextUrl.pathname.startsWith("/admin") ||
    request.nextUrl.pathname.startsWith("/staff") ||
    request.nextUrl.pathname.startsWith("/api/admin") ||
    request.nextUrl.pathname.startsWith("/api/staff");

  if (!protectedPath || isBasicAuthAllowed(request)) {
    return NextResponse.next();
  }

  return basicAuthResponse();
}

export const config = {
  matcher: ["/admin/:path*", "/staff/:path*", "/api/admin/:path*", "/api/staff/:path*"],
};
