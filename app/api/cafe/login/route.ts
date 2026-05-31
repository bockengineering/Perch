import { NextResponse, type NextRequest } from "next/server";
import {
  CAFE_SESSION_COOKIE_NAME,
  CAFE_SESSION_MAX_AGE_SECONDS,
  createCafeSessionCookie,
  isCafeLoginValid,
  safeCafeRedirectPath,
} from "@/lib/auth/cafe-session";
import { resolveCafeAccountForLocalDemo, resolveCafeAccountForSupabaseUser } from "@/lib/auth/cafe-account";
import { hostedPreviewCafeAccount, isDemoCafeLogin, isHostedPreviewCafeLogin } from "@/lib/auth/hosted-preview";
import { isSupabaseAuthConfigured, signInWithSupabasePassword } from "@/lib/auth/supabase";

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const nextPath = safeCafeRedirectPath(String(formData.get("next") ?? "/cafe"));

  let account = null;

  const supabaseConfigured = isSupabaseAuthConfigured();

  if (supabaseConfigured) {
    const signIn = await signInWithSupabasePassword(email, password);
    if (signIn.ok && signIn.user.email) {
      const name = typeof signIn.user.user_metadata?.name === "string" ? signIn.user.user_metadata.name : null;
      account = await resolveCafeAccountForSupabaseUser({
        supabaseUserId: signIn.user.id,
        email: signIn.user.email,
        name,
      });
    }
  }

  if (!account && isHostedPreviewCafeLogin(email, password)) {
    account = hostedPreviewCafeAccount();
  } else if (!account && isDemoCafeLogin(email, password)) {
    account = await resolveCafeAccountForLocalDemo(email);
  } else if (!account && !supabaseConfigured && isCafeLoginValid(email, password)) {
    account = await resolveCafeAccountForLocalDemo(email);
  }

  if (!account) {
    const loginUrl = new URL("/cafe/login", request.url);
    loginUrl.searchParams.set("error", "invalid");
    loginUrl.searchParams.set("next", nextPath);
    return NextResponse.redirect(loginUrl, 303);
  }

  const response = NextResponse.redirect(new URL(nextPath, request.url), 303);
  response.cookies.set({
    name: CAFE_SESSION_COOKIE_NAME,
    value: await createCafeSessionCookie(account),
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: CAFE_SESSION_MAX_AGE_SECONDS,
  });

  return response;
}
