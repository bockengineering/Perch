export const CAFE_SESSION_COOKIE_NAME = "perch_cafe_session";
export const CAFE_SESSION_MAX_AGE_SECONDS = 8 * 60 * 60;

export type CafeSession = {
  email: string;
  role: "SHOP_OWNER" | "STAFF";
  userId?: string;
  shopIds?: string[];
  exp: number;
};

function cafeLoginEmail() {
  return process.env.CAFE_LOGIN_EMAIL ?? process.env.ADMIN_BASIC_USERNAME ?? "admin@example.com";
}

function cafeLoginPassword() {
  return process.env.CAFE_LOGIN_PASSWORD ?? process.env.ADMIN_BASIC_PASSWORD ?? "perch-local-admin";
}

function cafeSessionSecret() {
  return (
    process.env.CAFE_SESSION_SECRET ??
    process.env.NEXTAUTH_SECRET ??
    process.env.ADMIN_BASIC_PASSWORD ??
    "perch-local-cafe-session"
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
    encoder.encode(cafeSessionSecret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(value));
  return base64UrlEncode(new Uint8Array(signature));
}

export function getCafeLoginCredentials() {
  return {
    email: cafeLoginEmail(),
    password: cafeLoginPassword(),
  };
}

export function isCafeLoginValid(email: string, password: string) {
  const credentials = getCafeLoginCredentials();
  return email.trim().toLowerCase() === credentials.email.toLowerCase() && password === credentials.password;
}

type CafeSessionInput =
  | string
  | {
      email: string;
      userId?: string;
      role?: "SHOP_OWNER" | "STAFF";
      shopIds?: string[];
    };

export async function createCafeSessionCookie(input: CafeSessionInput, now = new Date()) {
  const email = typeof input === "string" ? input : input.email;
  const session: CafeSession = {
    email: email.trim().toLowerCase(),
    role: typeof input === "string" ? "SHOP_OWNER" : (input.role ?? "SHOP_OWNER"),
    userId: typeof input === "string" ? undefined : input.userId,
    shopIds: typeof input === "string" ? undefined : input.shopIds,
    exp: Math.floor(now.getTime() / 1000) + CAFE_SESSION_MAX_AGE_SECONDS,
  };
  const payload = base64UrlEncode(JSON.stringify(session));
  const signature = await hmacSha256(payload);
  return `${payload}.${signature}`;
}

export async function verifyCafeSessionCookie(cookieValue: string | undefined, now = new Date()) {
  if (!cookieValue) {
    return null;
  }

  const [payload, signature] = cookieValue.split(".");
  if (!payload || !signature || signature !== (await hmacSha256(payload))) {
    return null;
  }

  try {
    const session = JSON.parse(base64UrlDecode(payload)) as Partial<CafeSession>;
    if ((session.role !== "SHOP_OWNER" && session.role !== "STAFF") || !session.email || !session.exp) {
      return null;
    }
    if (session.exp <= Math.floor(now.getTime() / 1000)) {
      return null;
    }
    return session as CafeSession;
  } catch {
    return null;
  }
}

export function safeCafeRedirectPath(value: string | null | undefined) {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.includes("\\")) {
    return "/cafe";
  }
  return value;
}

export function parseCookieHeader(header: string | null, name: string) {
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
