import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

export type Actor = {
  email: string;
  role: "PLATFORM_ADMIN" | "SHOP_OWNER" | "STAFF";
};

function configuredUser() {
  return process.env.ADMIN_BASIC_USERNAME ?? "admin@example.com";
}

function configuredPassword() {
  return process.env.ADMIN_BASIC_PASSWORD ?? "perch-local-admin";
}

export function actorFromRequest(request: Request | NextRequest): Actor {
  const email = request.headers.get("x-perch-actor-email") ?? configuredUser();
  const role = request.headers.get("x-perch-actor-role") ?? "PLATFORM_ADMIN";

  return {
    email,
    role: role === "STAFF" || role === "SHOP_OWNER" ? role : "PLATFORM_ADMIN",
  };
}

export function basicAuthResponse() {
  return new NextResponse("Authentication required", {
    status: 401,
    headers: {
      "WWW-Authenticate": 'Basic realm="Perch Admin"',
    },
  });
}

export function isBasicAuthAllowed(request: Request | NextRequest) {
  if (process.env.DISABLE_BASIC_AUTH === "true") {
    return false;
  }

  const header = request.headers.get("authorization");
  if (!header?.startsWith("Basic ")) {
    return false;
  }

  const encoded = header.slice("Basic ".length);
  const decoded =
    typeof globalThis.atob === "function"
      ? globalThis.atob(encoded)
      : Buffer.from(encoded, "base64").toString("utf8");
  const separator = decoded.indexOf(":");
  if (separator === -1) {
    return false;
  }

  const username = decoded.slice(0, separator);
  const password = decoded.slice(separator + 1);

  return username === configuredUser() && password === configuredPassword();
}
