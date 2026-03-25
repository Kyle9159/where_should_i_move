import Stripe from "stripe";

if (!process.env.STRIPE_SECRET_KEY) {
	throw new Error("STRIPE_SECRET_KEY is not set");
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
	apiVersion: "2026-02-25.clover",
});

// Price IDs are set in the Stripe dashboard, then added to env.
// Create one Product "NextHome USA Premium" with two prices:
//   Monthly: $9/mo   → STRIPE_PREMIUM_MONTHLY_PRICE_ID
//   Yearly:  $79/yr  → STRIPE_PREMIUM_YEARLY_PRICE_ID
export const PREMIUM_MONTHLY_PRICE_ID = process.env.STRIPE_PREMIUM_MONTHLY_PRICE_ID!;
export const PREMIUM_YEARLY_PRICE_ID = process.env.STRIPE_PREMIUM_YEARLY_PRICE_ID!;
