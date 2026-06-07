import { NextResponse, type NextRequest } from "next/server";
import {
  createPlatformSessionCookie,
  isPlatformFallbackLoginValid,
  PLATFORM_SESSION_COOKIE_NAME,
  PLATFORM_SESSION_MAX_AGE_SECONDS,
  safeAdminRedirectPath,
} from "@/lib/auth/platform-session";
import {
  resolvePlatformAccountForFallbackLogin,
  resolvePlatformAccountForSupabaseUser,
} from "@/lib/auth/platform-account";
import { isSupabaseAuthConfigured, signInWithSupabasePassword } from "@/lib/auth/supabase";

function redirectToLogin(request: NextRequest, nextPath: string, error: "invalid" | "server") {
  const loginUrl = new URL("/admin/login", request.url);
  loginUrl.searchParams.set("error", error);
  loginUrl.searchParams.set("next", nextPath);
  return NextResponse.redirect(loginUrl, 303);
}

export async function POST(request: NextRequest) {
  let nextPath = "/admin";

  try {
    const formData = await request.formData();
    const email = String(formData.get("email") ?? "");
    const password = String(formData.get("password") ?? "");
    nextPath = safeAdminRedirectPath(String(formData.get("next") ?? "/admin"));

    let account = null;
    const supabaseConfigured = isSupabaseAuthConfigured();

    if (supabaseConfigured) {
      const signIn = await signInWithSupabasePassword(email, password);
      if (signIn.ok && signIn.user.email) {
        const name = typeof signIn.user.user_metadata?.name === "string" ? signIn.user.user_metadata.name : null;
        account = await resolvePlatformAccountForSupabaseUser({
          supabaseUserId: signIn.user.id,
          email: signIn.user.email,
          name,
        });
      }
    }

    if (!account && isPlatformFallbackLoginValid(email, password)) {
      account = await resolvePlatformAccountForFallbackLogin(email);
    }

    if (!account) {
      return redirectToLogin(request, nextPath, "invalid");
    }

    const response = NextResponse.redirect(new URL(nextPath, request.url), 303);
    response.cookies.set({
      name: PLATFORM_SESSION_COOKIE_NAME,
      value: await createPlatformSessionCookie(account),
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: PLATFORM_SESSION_MAX_AGE_SECONDS,
    });

    return response;
  } catch (error) {
    console.error("Platform admin login failed", error);
    return redirectToLogin(request, nextPath, "server");
  }
}
