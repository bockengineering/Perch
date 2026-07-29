import { NextResponse } from "next/server";
import { isCronRequestAuthorized } from "@/lib/auth/cron";
import { runSilentFreeAccessTick } from "@/lib/services/silent-free-worker";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(request: Request) {
  if (!isCronRequestAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const results = await runSilentFreeAccessTick();
    return NextResponse.json({
      ok: true,
      shops: results.length,
      granted: results.reduce((total, result) => total + result.granted, 0),
      failed: results.reduce((total, result) => total + result.failed, 0),
    });
  } catch (error) {
    console.error("Silent free access cron failed", error);
    return NextResponse.json({ ok: false, error: "Worker pass failed" }, { status: 500 });
  }
}
