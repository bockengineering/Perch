export function appUrl() {
  return process.env.APP_URL ?? "http://localhost:3000";
}

export function networkProviderMode() {
  const value = (process.env.NETWORK_PROVIDER_MODE ?? "mock").toLowerCase();
  return value === "unifi" ? "unifi" : "mock";
}

export function workerPollIntervalSeconds() {
  const value = Number(process.env.WORKER_POLL_INTERVAL_SECONDS ?? "5");
  return Number.isFinite(value) && value > 0 ? value : 5;
}

export function requireServerEnv(name: string) {
  const value = process.env[name];
  if (!value || value.includes("placeholder") || value.includes("replace_with")) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export function getOptionalServerEnv(name: string) {
  const value = process.env[name];
  if (!value || value.includes("placeholder") || value.includes("replace_with")) {
    return undefined;
  }
  return value;
}
