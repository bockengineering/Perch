import crypto from "node:crypto";

export function normalizeMac(mac: string) {
  const stripped = mac.trim().replace(/[:-]/g, "").toUpperCase();

  if (!/^[0-9A-F]{12}$/.test(stripped)) {
    throw new Error("Invalid MAC address");
  }

  return stripped.match(/.{1,2}/g)?.join(":") ?? stripped;
}

function macPepper() {
  const value = process.env.APP_MAC_PEPPER;
  if (value && !value.includes("replace_with")) {
    return value;
  }

  if (process.env.NODE_ENV === "production") {
    throw new Error("APP_MAC_PEPPER must be configured in production");
  }

  return "perch-development-mac-pepper";
}

export function hashMac(shopId: string, normalizedMac: string) {
  return crypto
    .createHmac("sha256", macPepper())
    .update(`${shopId}:${normalizedMac}`)
    .digest("hex");
}

export function hashOpaqueValue(value: string) {
  return crypto.createHmac("sha256", macPepper()).update(value).digest("hex");
}
