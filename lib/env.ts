export function appUrl() {
  return process.env.APP_URL ?? "http://localhost:3000";
}

function isUsableEnvValue(value: string | undefined) {
  return Boolean(value && !value.includes("placeholder") && !value.includes("replace_with"));
}

export function databaseUrl() {
  for (const name of [
    "DATABASE_URL",
    "POSTGRES_PRISMA_URL",
    "POSTGRES_URL",
    "POSTGRES_URL_NON_POOLING",
    "SUPABASE_DB_URL",
  ]) {
    const value = process.env[name];
    if (isUsableEnvValue(value)) {
      return value;
    }
  }

  return undefined;
}

export function databaseUrlConfigured() {
  return Boolean(databaseUrl());
}

export function applyDatabaseUrlAlias() {
  const value = databaseUrl();
  if (value && !process.env.DATABASE_URL) {
    process.env.DATABASE_URL = value;
  }
  return value;
}

export function networkProviderMode() {
  const value = (process.env.NETWORK_PROVIDER_MODE ?? "mock").toLowerCase();
  return value === "unifi" ? "unifi" : "mock";
}

export function workerPollIntervalSeconds() {
  const value = Number(process.env.WORKER_POLL_INTERVAL_SECONDS ?? "5");
  return Number.isFinite(value) && value > 0 ? value : 5;
}

export function demoToolsEnabled() {
  return process.env.NODE_ENV !== "production" && process.env.DEMO_TOOLS_ENABLED === "true";
}

export function publicSignupEnabled() {
  if (process.env.NODE_ENV === "production") {
    return process.env.PUBLIC_SIGNUP_ENABLED === "true";
  }

  return process.env.PUBLIC_SIGNUP_ENABLED !== "false";
}

export function requireServerEnv(name: string) {
  const value = process.env[name];
  if (!isUsableEnvValue(value)) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value!;
}

export function getOptionalServerEnv(name: string) {
  const value = process.env[name];
  if (!isUsableEnvValue(value)) {
    return undefined;
  }
  return value;
}
