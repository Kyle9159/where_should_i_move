import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { stripe } from "@/lib/stripe";
import { db } from "@/db";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3010";

export async function POST() {
	const session = await getServerSession(authOptions);
	if (!session?.user?.id) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}

	const user = await db.query.users.findFirst({
		where: (u, { eq }) => eq(u.id, session.user.id),
		columns: { stripeCustomerId: true },
	});

	if (!user?.stripeCustomerId) {
		return NextResponse.json({ error: "No billing account found" }, { status: 404 });
	}

	const portalSession = await stripe.billingPortal.sessions.create({
		customer: user.stripeCustomerId,
		return_url: `${APP_URL}/dashboard`,
	});

	return NextResponse.json({ url: portalSession.url });
}
