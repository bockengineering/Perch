type SupabaseAuthUser = {
  id: string;
  email?: string;
  user_metadata?: Record<string, unknown>;
};

type SupabasePasswordSignInResult =
  | { ok: true; user: SupabaseAuthUser; accessToken: string }
  | { ok: false; reason: "disabled" | "invalid" | "error"; message: string };

function firstEnv(...names: string[]) {
  for (const name of names) {
    const value = process.env[name];
    if (value && !value.includes("placeholder") && !value.includes("replace_with")) {
      return value;
    }
  }
  return undefined;
}

function firstKeyFromJsonEnv(name: string) {
  const value = process.env[name];
  if (!value) {
    return undefined;
  }

  try {
    const parsed = JSON.parse(value) as Record<string, unknown>;
    const key = Object.values(parsed).find((entry) => typeof entry === "string" && entry.length > 0);
    return typeof key === "string" ? key : undefined;
  } catch {
    return undefined;
  }
}

function supabaseUrl() {
  return firstEnv("SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_URL")?.replace(/\/$/, "");
}

function supabasePublishableKey() {
  return (
    firstEnv(
      "SUPABASE_PUBLISHABLE_KEY",
      "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
      "SUPABASE_ANON_KEY",
      "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    ) ?? firstKeyFromJsonEnv("SUPABASE_PUBLISHABLE_KEYS")
  );
}

function supabaseSecretKey() {
  return firstEnv("SUPABASE_SECRET_KEY", "SUPABASE_SERVICE_ROLE_KEY") ?? firstKeyFromJsonEnv("SUPABASE_SECRET_KEYS");
}

export function isSupabaseAuthConfigured() {
  return Boolean(supabaseUrl() && supabasePublishableKey());
}

export function isSupabaseAdminConfigured() {
  return Boolean(supabaseUrl() && supabaseSecretKey());
}

export async function signInWithSupabasePassword(
  email: string,
  password: string,
): Promise<SupabasePasswordSignInResult> {
  const url = supabaseUrl();
  const key = supabasePublishableKey();
  if (!url || !key) {
    return { ok: false, reason: "disabled", message: "Supabase Auth is not configured." };
  }

  const response = await fetch(`${url}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email, password }),
    cache: "no-store",
  });

  const payload = (await response.json().catch(() => ({}))) as {
    access_token?: string;
    user?: SupabaseAuthUser;
    error_description?: string;
    msg?: string;
  };

  if (!response.ok || !payload.user || !payload.access_token) {
    const invalid = response.status === 400 || response.status === 401 || response.status === 422;
    return {
      ok: false,
      reason: invalid ? "invalid" : "error",
      message: payload.error_description ?? payload.msg ?? "Supabase sign-in failed.",
    };
  }

  return { ok: true, user: payload.user, accessToken: payload.access_token };
}

export async function createSupabaseCafeUser(input: {
  email: string;
  password?: string;
  name?: string | null;
}) {
  const url = supabaseUrl();
  const key = supabaseSecretKey();
  if (!url || !key) {
    throw new Error("Supabase admin API is not configured.");
  }

  const response = await fetch(`${url}/auth/v1/admin/users`, {
    method: "POST",
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email: input.email,
      password: input.password,
      email_confirm: true,
      app_metadata: { perch_account: true },
      user_metadata: input.name ? { name: input.name } : undefined,
    }),
    cache: "no-store",
  });

  const payload = (await response.json().catch(() => ({}))) as SupabaseAuthUser & { msg?: string };
  if (!response.ok || !payload.id) {
    throw new Error(payload.msg ?? "Supabase user creation failed.");
  }

  return payload;
}
