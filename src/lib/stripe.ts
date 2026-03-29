import Stripe from "stripe";

let _stripe: Stripe | null = null;

export function getStripe(): Stripe {
	if (!process.env.STRIPE_SECRET_KEY) {
		throw new Error("STRIPE_SECRET_KEY is not set");
	}
	if (!_stripe) {
		_stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
			apiVersion: "2026-02-25.clover",
		});
	}
	return _stripe;
}

// Keep named export for backwards compat — lazily resolved on first use
export const stripe = new Proxy({} as Stripe, {
	get(_target, prop) {
		return (getStripe() as any)[prop];
	},
});

// Price IDs are set in the Stripe dashboard, then added to env.
// Create one Product "Where Should I Move Premium" with two prices:
//   Monthly: $9/mo   → STRIPE_PREMIUM_MONTHLY_PRICE_ID
//   Yearly:  $79/yr  → STRIPE_PREMIUM_YEARLY_PRICE_ID
export const PREMIUM_MONTHLY_PRICE_ID = process.env.STRIPE_PREMIUM_MONTHLY_PRICE_ID ?? "";
export const PREMIUM_YEARLY_PRICE_ID = process.env.STRIPE_PREMIUM_YEARLY_PRICE_ID ?? "";
