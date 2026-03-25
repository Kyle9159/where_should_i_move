import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";

// Map layer name → city_filter_scores column
const LAYER_MAP: Record<string, string> = {
	overall: "scoreMedianHomePrice", // use affordability as proxy for overall
	housing: "scoreMedianHomePrice",
	jobs: "scoreJobMarket",
	crime: "scoreViolentCrime",
	climate: "scoreWeather",
	schools: "scoreSchoolQuality",
	walkability: "scoreWalkability",
	airquality: "scoreAirQuality",
};

export async function GET(req: NextRequest) {
	const layer = req.nextUrl.searchParams.get("layer") ?? "overall";
	const scoreKey = LAYER_MAP[layer] ?? "scoreMedianHomePrice";

	const cities = await db.query.cities.findMany({
		where: (c, { isNotNull }) => isNotNull(c.lat),
		columns: {
			id: true, slug: true, name: true, stateId: true,
			lat: true, lng: true, population: true, tier: true,
			overallScore: true,
		},
		with: { filterScores: { columns: { [scoreKey]: true } } },
		limit: 1000,
	});

	const features = cities
		.filter((c) => c.lat && c.lng)
		.map((c) => {
			const score = (c.filterScores as Record<string, number | null> | null)?.[scoreKey] ?? null;
			return {
				id: c.id,
				slug: c.slug,
				name: c.name,
				stateId: c.stateId,
				lat: c.lat!,
				lng: c.lng!,
				population: c.population,
				tier: c.tier,
				score: score ?? 50,
				overallScore: c.overallScore,
			};
		});

	return NextResponse.json(
		{ features, layer, scoreKey },
		{ headers: { "Cache-Control": "public, s-maxage=3600" } },
	);
}
