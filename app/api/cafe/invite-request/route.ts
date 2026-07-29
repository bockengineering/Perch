import { NextResponse, type NextRequest } from "next/server";
import { Resend } from "resend";
import { getOptionalServerEnv } from "@/lib/env";
import {
  buildInviteRequestEmail,
  inviteRequestSchema,
  normalizeInviteRequest,
} from "@/lib/services/invite-request";
import { checkRateLimit } from "@/lib/utils/rate-limit";

export const dynamic = "force-dynamic";

function clientIp(request: NextRequest) {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown"
  );
}

function json(body: Record<string, unknown>, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

export async function POST(request: NextRequest) {
  const rateLimit = checkRateLimit(`cafe-invite-request:${clientIp(request)}`, 4, 60 * 60 * 1000);
  if (!rateLimit.allowed) {
    return json({ error: "Too many requests. Please try again later." }, 429);
  }

  const parsed = inviteRequestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return json({ error: "Enter your name, a valid email, and your shop name." }, 400);
  }

  const requestData = normalizeInviteRequest(parsed.data);

  // Silently accept bot submissions so the honeypot does not reveal itself.
  if (requestData.website) {
    return json({ ok: true });
  }

  const apiKey = getOptionalServerEnv("RESEND_API_KEY");
  const recipient =
    getOptionalServerEnv("INVITE_REQUEST_TO_EMAIL") ??
    getOptionalServerEnv("PLATFORM_ADMIN_EMAIL");
  const sender =
    getOptionalServerEnv("INVITE_REQUEST_FROM_EMAIL") ??
    "Perch <onboarding@resend.dev>";

  if (!apiKey || !recipient) {
    return json(
      { error: "Invite requests are temporarily unavailable. Please try again soon." },
      503,
    );
  }

  const email = buildInviteRequestEmail(requestData);
  try {
    const { error } = await new Resend(apiKey).emails.send({
      from: sender,
      to: recipient,
      replyTo: email.replyTo,
      subject: email.subject,
      text: email.text,
    });

    if (error) {
      console.error("Invite request email delivery failed", {
        name: error.name,
        message: error.message,
      });
      return json(
        { error: "We could not send your request. Please try again in a moment." },
        502,
      );
    }
  } catch (error) {
    console.error(
      "Invite request email delivery failed",
      error instanceof Error ? { name: error.name, message: error.message } : {},
    );
    return json(
      { error: "We could not send your request. Please try again in a moment." },
      502,
    );
  }

  return json({ ok: true });
}
