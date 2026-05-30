type SupabaseAuthUser = {
  id: string;
  email?: string;
  user_metadata?: Record<string, unknown>;
};

type SupabasePasswordSignInResult =
  | { ok: true; user: SupabaseAuthUser; accessToken: string }
  | { ok: false; reason: "disabled" | "invalid" | "error"; message: string };

function supabaseUrl() {
  return process.env.SUPABASE_URL?.replace(/\/$/, "");
}

function supabasePublishableKey() {
  return process.env.SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
}

function supabaseSecretKey() {
  return process.env.SUPABASE_SECRET_KEY;
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
