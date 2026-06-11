import { z } from "zod";

const embeddedLogoDataUrlSchema = z
  .string()
  .max(360_000)
  .regex(/^data:image\/(?:png|jpeg|webp);base64,[A-Za-z0-9+/]+={0,2}$/);

const remoteLogoUrlSchema = z
  .string()
  .url()
  .max(500)
  .refine((value) => {
    const protocol = new URL(value).protocol;
    return protocol === "http:" || protocol === "https:";
  });

export const updateShopSchema = z.object({
  name: z.string().min(2).optional(),
  timezone: z.string().min(3).optional(),
  status: z.enum(["DRAFT", "ACTIVE", "PAUSED", "DISABLED"]).optional(),
  freeMinutesPerDay: z.number().int().min(0).optional(),
  checkoutGraceMinutes: z.number().int().min(1).optional(),
  maxCheckoutGracePerDay: z.number().int().min(0).optional(),
  platformFeeBps: z.number().int().min(0).max(10000).optional(),
  brandLogoUrl: z.union([remoteLogoUrlSchema, embeddedLogoDataUrlSchema]).nullable().optional(),
  brandPrimaryColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).nullable().optional(),
  supportEmail: z.string().email().nullable().optional(),
});

export function parseShopUpdatePayload(payload: unknown) {
  return updateShopSchema.safeParse(payload);
}
