import { NextResponse, type NextRequest } from "next/server";
import { PLATFORM_SESSION_COOKIE_NAME } from "@/lib/auth/platform-session";

export async function POST(request: NextRequest) {
  const response = NextResponse.redirect(new URL("/admin/login", request.url), 303);
  response.cookies.set({
    name: PLATFORM_SESSION_COOKIE_NAME,
    value: "",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
  return response;
}
