import { NextResponse } from "next/server";
import { db } from "@/db";
import { movePlans } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET(_req: Request, { params }: { params: Promise<{ token: string }> }) {
	const { token } = await params;

	const plan = await db.query.movePlans.findFirst({
		where: (p, { eq }) => eq(p.token, token),
		with: { user: { columns: { id: true, name: true } } },
	});

	if (!plan) return NextResponse.json({ error: "Plan not found" }, { status: 404 });

	const cityIds: string[] = JSON.parse(plan.cityIds);
	const cities = await db.query.cities.findMany({
		where: (c, { inArray }) => inArray(c.id, cityIds),
		columns: {
			id: true, slug: true, name: true, stateId: true,
			overallScore: true, heroImageUrl: true, thumbnailUrl: true, tier: true, population: true,
		},
	});

	// preserve the saved order
	const cityMap = new Map(cities.map((c) => [c.id, c]));
	const orderedCities = cityIds.map((id) => cityMap.get(id)).filter(Boolean);

	return NextResponse.json({
		plan: {
			token: plan.token,
			title: plan.title,
			ownerName: plan.user?.name ?? "Someone",
			quizWeightsEncoded: plan.quizWeightsEncoded,
			cities: orderedCities,
			updatedAt: plan.updatedAt,
		},
	});
}
