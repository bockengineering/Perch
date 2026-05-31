import type { CafeAccount } from "@/lib/auth/cafe-account";
import { databaseUrlConfigured } from "@/lib/env";

export const hostedPreviewShopId = "shop_demo_cafe";
export const hostedPreviewCafeCredentials = {
  email: "perch.demo.owner@gmail.com",
  password: "Perch-demo-2026!",
};

export function hostedPreviewDemoEnabled() {
  return process.env.HOSTED_PREVIEW_DEMO_ENABLED === "true" && !databaseUrlConfigured();
}

export function isHostedPreviewCafeLogin(email: string, password: string) {
  return (
    hostedPreviewDemoEnabled() &&
    email.trim().toLowerCase() === hostedPreviewCafeCredentials.email &&
    password === hostedPreviewCafeCredentials.password
  );
}

export function hostedPreviewCafeAccount(): CafeAccount {
  return {
    userId: "preview_demo_owner",
    email: hostedPreviewCafeCredentials.email,
    name: "Demo Cafe Owner",
    role: "SHOP_OWNER",
    shopIds: [hostedPreviewShopId],
  };
}
