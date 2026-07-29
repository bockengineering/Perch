import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildInviteRequestEmail,
  inviteRequestSchema,
  normalizeInviteRequest,
} from "@/lib/services/invite-request";

describe("cafe invite requests", () => {
  it("normalizes cafe contact details", () => {
    const parsed = inviteRequestSchema.parse({
      name: "  Alex   Rivera  ",
      email: "  OWNER@EXAMPLE.COM ",
      shopName: "  Juniper\nCoffee ",
    });

    assert.deepEqual(normalizeInviteRequest(parsed), {
      name: "Alex Rivera",
      email: "owner@example.com",
      shopName: "Juniper Coffee",
      website: "",
    });
  });

  it("builds a replyable plain-text notification", () => {
    const email = buildInviteRequestEmail({
      name: "Alex Rivera",
      email: "owner@example.com",
      shopName: "Juniper Coffee",
      website: "",
    });

    assert.equal(email.subject, "New Perch invite request: Juniper Coffee");
    assert.equal(email.replyTo, "owner@example.com");
    assert.match(email.text, /Name: Alex Rivera/);
    assert.match(email.text, /Shop: Juniper Coffee/);
  });

  it("rejects incomplete and invalid requests", () => {
    assert.equal(
      inviteRequestSchema.safeParse({
        name: "A",
        email: "not-an-email",
        shopName: "",
      }).success,
      false,
    );
  });
});
