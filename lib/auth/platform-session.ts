export const PLATFORM_SESSION_COOKIE_NAME = "perch_platform_session";
export const PLATFORM_SESSION_MAX_AGE_SECONDS = 8 * 60 * 60;

export type PlatformSession = {
  email: string;
  role: "PLATFORM_ADMIN";
  userId?: string;
  exp: number;
};

function usableEnv(value: string | undefined) {
  return Boolean(value && !value.includes("placeholder") && !value.includes("replace_with"));
}

function platformLoginEmail() {
  return process.env.PLATFORM_ADMIN_EMAIL ?? process.env.ADMIN_BASIC_USERNAME ?? "admin@perch.local";
}

function platformLoginPassword() {
  return process.env.PLATFORM_ADMIN_PASSWORD ?? process.env.ADMIN_BASIC_PASSWORD ?? "perch-local-admin";
}

function platformSessionSecret() {
  return (
    process.env.PLATFORM_SESSION_SECRET ??
    process.env.CAFE_SESSION_SECRET ??
    process.env.NEXTAUTH_SECRET ??
    process.env.ADMIN_BASIC_PASSWORD ??
    "perch-local-platform-session"
  );
}

function base64UrlEncode(value: string | Uint8Array) {
  const binary =
    typeof value === "string" ? value : Array.from(value, (byte) => String.fromCharCode(byte)).join("");
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}

function base64UrlDecode(value: string) {
  const normalized = value.replaceAll("-", "+").replaceAll("_", "/");
  const padded = normalized.padEnd(normalized.length + ((4 - (normalized.length % 4)) % 4), "=");
  return atob(padded);
}

async function hmacSha256(value: string) {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(platformSessionSecret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(value));
  return base64UrlEncode(new Uint8Array(signature));
}

export function getPlatformLoginCredentials() {
  return {
    email: platformLoginEmail(),
    password: platformLoginPassword(),
  };
}

export function platformFallbackLoginConfigured() {
  if (process.env.NODE_ENV !== "production") {
    return true;
  }

  return (
    (usableEnv(process.env.PLATFORM_ADMIN_EMAIL) && usableEnv(process.env.PLATFORM_ADMIN_PASSWORD)) ||
    (usableEnv(process.env.ADMIN_BASIC_USERNAME) && usableEnv(process.env.ADMIN_BASIC_PASSWORD))
  );
}

export function isPlatformFallbackLoginValid(email: string, password: string) {
  if (!platformFallbackLoginConfigured()) {
    return false;
  }
  const credentials = getPlatformLoginCredentials();
  return email.trim().toLowerCase() === credentials.email.toLowerCase() && password === credentials.password;
}

export async function createPlatformSessionCookie(
  input: { email: string; userId?: string },
  now = new Date(),
) {
  const session: PlatformSession = {
    email: input.email.trim().toLowerCase(),
    role: "PLATFORM_ADMIN",
    userId: input.userId,
    exp: Math.floor(now.getTime() / 1000) + PLATFORM_SESSION_MAX_AGE_SECONDS,
  };
  const payload = base64UrlEncode(JSON.stringify(session));
  const signature = await hmacSha256(payload);
  return `${payload}.${signature}`;
}

export async function verifyPlatformSessionCookie(cookieValue: string | undefined, now = new Date()) {
  if (!cookieValue) {
    return null;
  }

  const [payload, signature] = cookieValue.split(".");
  if (!payload || !signature || signature !== (await hmacSha256(payload))) {
    return null;
  }

  try {
    const session = JSON.parse(base64UrlDecode(payload)) as Partial<PlatformSession>;
    if (session.role !== "PLATFORM_ADMIN" || !session.email || !session.exp) {
      return null;
    }
    if (session.exp <= Math.floor(now.getTime() / 1000)) {
      return null;
    }
    return session as PlatformSession;
  } catch {
    return null;
  }
}

export function safeAdminRedirectPath(value: string | null | undefined) {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.includes("\\")) {
    return "/admin";
  }
  if (!value.startsWith("/admin") || value.startsWith("/admin/login")) {
    return "/admin";
  }
  return value;
}

export function parsePlatformCookieHeader(header: string | null, name: string) {
  if (!header) {
    return undefined;
  }
  for (const part of header.split(";")) {
    const [cookieName, ...valueParts] = part.trim().split("=");
    if (cookieName === name) {
      return valueParts.join("=");
    }
  }
  return undefined;
}
