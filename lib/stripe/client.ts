import Stripe from "stripe";
import { getOptionalServerEnv, requireServerEnv } from "@/lib/env";

export const stripeApiVersion = "2026-04-22.dahlia";

let stripe: Stripe | null = null;

export function hasRealStripeSecret() {
  return Boolean(getOptionalServerEnv("STRIPE_SECRET_KEY"));
}

export function getStripe() {
  if (!stripe) {
    stripe = new Stripe(requireServerEnv("STRIPE_SECRET_KEY"), {
      apiVersion: stripeApiVersion,
      appInfo: {
        name: "Perch",
        version: "0.1.0",
      },
    });
  }

  return stripe;
}
