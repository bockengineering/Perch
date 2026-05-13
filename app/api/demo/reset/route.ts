import { NextResponse } from "next/server";
import { resetDemoData } from "@/lib/services/demo-environment";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    const shop = await resetDemoData();
    return NextResponse.json({ ok: true, shopId: shop.id });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Demo reset failed." },
      { status: 400 },
    );
  }
}
