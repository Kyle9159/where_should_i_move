import { headers } from "next/headers";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { stripe } from "@/lib/stripe";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import type Stripe from "stripe";
import {
	sendSubscriptionConfirmedEmail,
	sendSubscriptionCancelledEmail,
	sendPaymentFailedEmail,
} from "@/lib/email";

// Raw body is required for Stripe signature verification
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
	const body = await req.text();
	const heads = await headers();
	const sig = heads.get("stripe-signature");

	if (!sig || !process.env.STRIPE_WEBHOOK_SECRET) {
		return NextResponse.json({ error: "Missing signature" }, { status: 400 });
	}

	let event: Stripe.Event;
	try {
		event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET);
	} catch {
		return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
	}

	try {
		switch (event.type) {
			case "checkout.session.completed": {
				const session = event.data.object as Stripe.Checkout.Session;
				const userId = session.metadata?.userId;
				if (!userId || session.mode !== "subscription") break;

				await (db as any).update(users)
					.set({
						tier: "premium",
						stripeCustomerId: session.customer as string,
						subscriptionStatus: "active",
						stripePriceId: null,
					})
					.where(eq(users.id, userId));
				// Send premium welcome email
				const newUser = await db.query.users.findFirst({
					where: (u, { eq }) => eq(u.id, userId),
					columns: { email: true, name: true },
				});
				if (newUser?.email) {
					const planLabel = (session.amount_total ?? 0) >= 7900 ? "Yearly Premium ($79/yr)" : "Monthly Premium ($9/mo)";
					sendSubscriptionConfirmedEmail(newUser.email, newUser.name ?? "", planLabel).catch(() => {});
				}
				break;
			}

			case "customer.subscription.created":
			case "customer.subscription.updated": {
				const sub = event.data.object as Stripe.Subscription;
				const userId = sub.metadata?.userId;
				if (!userId) break;

				const isActive = sub.status === "active" || sub.status === "trialing";
				const priceId = sub.items.data[0]?.price.id ?? null;
				// cancel_at is set when a future cancellation is scheduled
				const endsAt = sub.cancel_at
					? new Date(sub.cancel_at * 1000).toISOString()
					: null;

				await (db as any).update(users)
					.set({
						subscriptionStatus: sub.status,
						tier: isActive ? "premium" : "free",
						stripePriceId: priceId,
						subscriptionEndsAt: endsAt,
					})
					.where(eq(users.id, userId));
				break;
			}

			case "customer.subscription.deleted": {
				const sub = event.data.object as Stripe.Subscription;
				const userId = sub.metadata?.userId;
				if (!userId) break;

				const endsAt = sub.cancel_at
					? new Date(sub.cancel_at * 1000).toISOString()
					: new Date().toISOString();
				await (db as any).update(users)
					.set({ tier: "free", subscriptionStatus: "canceled", subscriptionEndsAt: endsAt })
					.where(eq(users.id, userId));
				// Cancellation email
				const cancelledUser = await db.query.users.findFirst({
					where: (u, { eq }) => eq(u.id, userId),
					columns: { email: true, name: true },
				});
				if (cancelledUser?.email) {
					sendSubscriptionCancelledEmail(cancelledUser.email, cancelledUser.name ?? "", new Date(endsAt).toLocaleDateString()).catch(() => {});
				}
				break;
			}

			case "invoice.payment_failed": {
				const invoice = event.data.object as Stripe.Invoice;
				// Find user by Stripe customer ID
				const customerId = invoice.customer as string;
				const user = await db.query.users.findFirst({
					where: (u, { eq }) => eq(u.stripeCustomerId, customerId),
					columns: { id: true },
				});
				if (user) {
					await (db as any).update(users)
						.set({ subscriptionStatus: "past_due" })
						.where(eq(users.id, user.id));
					// Payment failed email
					const failedUser = await db.query.users.findFirst({
						where: (u, { eq }) => eq(u.id, user.id),
						columns: { email: true, name: true },
					});
					if (failedUser?.email) {
						sendPaymentFailedEmail(failedUser.email, failedUser.name ?? "").catch(() => {});
					}
				}
				break;
			}
		}
	} catch (err) {
		console.error("Webhook handler error:", err);
		return NextResponse.json({ error: "Handler failed" }, { status: 500 });
	}

	return NextResponse.json({ received: true });
}
