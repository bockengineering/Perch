import { NextResponse } from "next/server";
import { databaseUrlConfigured, demoToolsEnabled, getOptionalServerEnv } from "@/lib/env";
import { isSupabaseAdminConfigured, isSupabaseAuthConfigured } from "@/lib/auth/supabase";

export const dynamic = "force-dynamic";

export async function GET() {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({
    ok: true,
    databaseConfigured: databaseUrlConfigured(),
    supabaseAuthConfigured: isSupabaseAuthConfigured(),
    supabaseAdminConfigured: isSupabaseAdminConfigured(),
    fieldEncryptionConfigured: Boolean(getOptionalServerEnv("FIELD_ENCRYPTION_KEY")),
    macPepperConfigured: Boolean(getOptionalServerEnv("APP_MAC_PEPPER")),
    voucherSecretConfigured: Boolean(getOptionalServerEnv("VOUCHER_CODE_SECRET")),
    demoToolsEnabled: demoToolsEnabled(),
  });
}
