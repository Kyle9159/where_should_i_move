import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/db";
import { movePlans, savedCities } from "@/db/schema";
import { eq } from "drizzle-orm";
import { createId } from "@paralleldrive/cuid2";
import { randomBytes } from "crypto";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://whereshouldimove.us";

export async function GET() {
	const session = await getServerSession(authOptions);
	if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

	const existingPlan = await db.query.movePlans.findFirst({
		where: (p, { eq }) => eq(p.userId, session.user.id),
	});

	if (!existingPlan) return NextResponse.json({ plan: null });

	return NextResponse.json({
		plan: {
			token: existingPlan.token,
			url: `${APP_URL}/plan/${existingPlan.token}`,
			title: existingPlan.title,
			cityCount: JSON.parse(existingPlan.cityIds).length,
		},
	});
}

export async function POST(req: Request) {
	const session = await getServerSession(authOptions);
	if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

	if (session.user.tier !== "premium") {
		return NextResponse.json({ error: "Premium required" }, { status: 403 });
	}

	const body = await req.json().catch(() => ({}));
	const { title, quizWeightsEncoded } = body as { title?: string; quizWeightsEncoded?: string };

	// Fetch user's saved cities (in score order)
	const saved = await db.query.savedCities.findMany({
		where: (sc, { eq }) => eq(sc.userId, session.user.id),
	});

	if (saved.length === 0) {
		return NextResponse.json({ error: "Save at least one city first" }, { status: 400 });
	}

	const cityRows = await db.query.cities.findMany({
		where: (c, { inArray }) => inArray(c.id, saved.map((s) => s.cityId)),
		columns: { id: true, overallScore: true },
	});
	const scoreMap = new Map(cityRows.map((c) => [c.id, c.overallScore ?? 0]));

	const cityIds = saved
		.sort((a, b) => (scoreMap.get(b.cityId) ?? 0) - (scoreMap.get(a.cityId) ?? 0))
		.map((sc) => sc.cityId);

	// Upsert — each user has one plan
	const existing = await db.query.movePlans.findFirst({
		where: (p, { eq }) => eq(p.userId, session.user.id),
	});

	const token = existing?.token ?? randomBytes(8).toString("hex");
	const now = new Date().toISOString();

	if (existing) {
		await (db as any).update(movePlans)
			.set({
				cityIds: JSON.stringify(cityIds),
				title: title ?? existing.title,
				quizWeightsEncoded: quizWeightsEncoded ?? existing.quizWeightsEncoded,
				updatedAt: now,
			})
			.where(eq(movePlans.userId, session.user.id));
	} else {
		await (db as any).insert(movePlans).values({
			id: createId(),
			userId: session.user.id,
			token,
			title: title ?? `${session.user.name ?? "My"} Move Plan`,
			cityIds: JSON.stringify(cityIds),
			quizWeightsEncoded: quizWeightsEncoded ?? null,
			createdAt: now,
			updatedAt: now,
		});
	}

	const planUrl = `${APP_URL}/plan/${token}`;
	return NextResponse.json({ token, url: planUrl }, { status: 201 });
}
