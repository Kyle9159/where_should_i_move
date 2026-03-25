import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { stripe, PREMIUM_MONTHLY_PRICE_ID, PREMIUM_YEARLY_PRICE_ID } from "@/lib/stripe";
import { db } from "@/db";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3010";

export async function POST(req: NextRequest) {
	const session = await getServerSession(authOptions);
	if (!session?.user?.id) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}

	if (session.user.tier === "premium") {
		return NextResponse.json({ error: "Already premium" }, { status: 400 });
	}

	const { interval = "monthly" } = (await req.json()) as { interval?: "monthly" | "yearly" };
	const priceId = interval === "yearly" ? PREMIUM_YEARLY_PRICE_ID : PREMIUM_MONTHLY_PRICE_ID;

	// Look up existing Stripe customer ID
	const user = await db.query.users.findFirst({
		where: (u, { eq }) => eq(u.id, session.user.id),
		columns: { stripeCustomerId: true, email: true },
	});

	const checkoutSession = await stripe.checkout.sessions.create({
		mode: "subscription",
		payment_method_types: ["card"],
		line_items: [{ price: priceId, quantity: 1 }],
		customer: user?.stripeCustomerId ?? undefined,
		customer_email: user?.stripeCustomerId ? undefined : (user?.email ?? session.user.email ?? undefined),
		metadata: { userId: session.user.id },
		subscription_data: { metadata: { userId: session.user.id } },
		success_url: `${APP_URL}/dashboard?upgraded=1`,
		cancel_url: `${APP_URL}/upgrade`,
		allow_promotion_codes: true,
	});

	return NextResponse.json({ url: checkoutSession.url });
}
