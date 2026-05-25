import { NextResponse } from "next/server";
import { getPrisma } from "@/lib/db";
import { paymentSuccessRedirectUrl } from "@/lib/utils/redirect";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const orderId = new URL(request.url).searchParams.get("orderId");

  if (!orderId) {
    return NextResponse.json({ error: "Missing orderId." }, { status: 400 });
  }

  const order = await getPrisma().order.findUnique({
    where: { id: orderId },
    select: { id: true, status: true },
  });

  if (!order) {
    return NextResponse.json({ error: "Order not found." }, { status: 404 });
  }

  return NextResponse.json({
    orderId: order.id,
    status: order.status,
    redirectUrl: order.status === "AUTHORIZED" ? paymentSuccessRedirectUrl() : null,
  });
}
