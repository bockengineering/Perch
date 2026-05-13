import { NextResponse } from "next/server";
import { z } from "zod";
import { expireDemoDeviceAccess } from "@/lib/services/demo-environment";

export const dynamic = "force-dynamic";

const schema = z
  .object({
    mac: z.string().optional(),
  })
  .optional();

export async function POST(request: Request) {
  const body = await request.json().catch(() => undefined);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid demo access payload." }, { status: 400 });
  }

  try {
    const result = await expireDemoDeviceAccess(parsed.data?.mac);
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not end demo access." },
      { status: 400 },
    );
  }
}
