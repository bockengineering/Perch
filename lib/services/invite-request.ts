import { z } from "zod";

export const inviteRequestSchema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(180),
  shopName: z.string().trim().min(2).max(160),
  website: z.string().max(240).optional().default(""),
});

export type InviteRequest = z.infer<typeof inviteRequestSchema>;

function singleLine(value: string) {
  return value.replace(/[\r\n]+/g, " ").replace(/\s+/g, " ").trim();
}

export function normalizeInviteRequest(data: InviteRequest) {
  return {
    name: singleLine(data.name),
    email: data.email.trim().toLowerCase(),
    shopName: singleLine(data.shopName),
    website: data.website.trim(),
  };
}

export function buildInviteRequestEmail(data: InviteRequest) {
  const normalized = normalizeInviteRequest(data);

  return {
    subject: `New Perch invite request: ${normalized.shopName}`,
    text: [
      "A cafe owner requested an invitation to Perch.",
      "",
      `Name: ${normalized.name}`,
      `Email: ${normalized.email}`,
      `Shop: ${normalized.shopName}`,
      "",
      "Reply to this email to follow up.",
    ].join("\n"),
    replyTo: normalized.email,
  };
}
