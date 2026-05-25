export const defaultSuccessUrl = "https://www.google.com";

export function paymentSuccessRedirectUrl() {
  return defaultSuccessUrl;
}

export function safeRedirectUrl(originalUrl?: string | null, fallback = defaultSuccessUrl) {
  if (!originalUrl) {
    return fallback;
  }

  try {
    const parsed = new URL(originalUrl);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return fallback;
    }

    if (parsed.username || parsed.password) {
      return fallback;
    }

    return parsed.toString();
  } catch {
    return fallback;
  }
}
