import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { db } from "@/db";
import { getWalkScore } from "@/lib/walkscore";

export async function GET(
	_req: NextRequest,
	{ params }: { params: Promise<{ slug: string }> },
) {
	const { slug } = await params;

	const city = await db.query.cities.findFirst({
		where: (c, { eq }) => eq(c.slug, slug),
		with: { walkability: true },
	});
	if (!city) return NextResponse.json({ error: "Not found" }, { status: 404 });

	// Return cached DB values first
	const cached = city.walkability;

	// If API key is configured, try to fetch fresh score
	if (process.env.WALKSCORE_API_KEY && city.lat && city.lng) {
		const fresh = await getWalkScore(
			city.lat,
			city.lng,
			`${city.name}, ${city.stateId}`,
		);
		if (fresh) {
			return NextResponse.json({
				walkScore: fresh.walkScore,
				walkDescription: fresh.walkDescription,
				transitScore: fresh.transitScore,
				transitDescription: fresh.transitDescription,
				bikeScore: fresh.bikeScore,
				bikeDescription: fresh.bikeDescription,
				source: "walkscore_api",
			});
		}
	}

	// Fall back to DB estimate
	return NextResponse.json({
		walkScore: cached?.walkScore ?? null,
		transitScore: cached?.transitScore ?? null,
		bikeScore: cached?.bikeScore ?? null,
		source: "estimate",
	});
}
