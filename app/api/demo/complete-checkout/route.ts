import { NextResponse } from "next/server";
import { z } from "zod";
import { completeDemoCheckout } from "@/lib/services/demo-environment";

export const dynamic = "force-dynamic";

const schema = z.object({
  orderId: z.string().min(1),
});

export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid demo checkout payload." }, { status: 400 });
  }

  try {
    const result = await completeDemoCheckout(parsed.data.orderId);
    return NextResponse.json({ ok: true, order: result.order, webhook: result.result });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Demo checkout completion failed." },
      { status: 400 },
    );
  }
}
