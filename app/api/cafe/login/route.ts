import { NextResponse, type NextRequest } from "next/server";
import {
  CAFE_SESSION_COOKIE_NAME,
  CAFE_SESSION_MAX_AGE_SECONDS,
  createCafeSessionCookie,
  isCafeLoginValid,
  safeCafeRedirectPath,
} from "@/lib/auth/cafe-session";

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const nextPath = safeCafeRedirectPath(String(formData.get("next") ?? "/cafe"));

  if (!isCafeLoginValid(email, password)) {
    const loginUrl = new URL("/cafe/login", request.url);
    loginUrl.searchParams.set("error", "invalid");
    loginUrl.searchParams.set("next", nextPath);
    return NextResponse.redirect(loginUrl, 303);
  }

  const response = NextResponse.redirect(new URL(nextPath, request.url), 303);
  response.cookies.set({
    name: CAFE_SESSION_COOKIE_NAME,
    value: await createCafeSessionCookie(email),
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: CAFE_SESSION_MAX_AGE_SECONDS,
  });

  return response;
}
