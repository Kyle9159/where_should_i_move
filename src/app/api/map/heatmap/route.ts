import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";

// Map layer name → city_filter_scores column (null = use overallScore from cities table)
const LAYER_MAP: Record<string, string | null> = {
	overall:       null,
	housing:       "scoreMedianHomePrice",
	jobs:          "scoreJobMarket",
	income:        "scoreMedianIncome",
	crime:         "scoreViolentCrime",
	climate:       "scoreWeather",
	schools:       "scoreSchoolQuality",
	walkability:   "scoreWalkability",
	airquality:    "scoreAirQuality",
	disaster:      "scoreNaturalDisasterRisk",
	diversity:     "scoreDiversity",
	college:       "scoreCollegeEducated",
	homeownership: "scoreHomeownership",
};

export async function GET(req: NextRequest) {
	const { searchParams } = req.nextUrl;

	// Accept ?layers=X,Y,Z (multi) OR ?layer=X (legacy single)
	const layersParam = searchParams.get("layers");
	const layerParam = searchParams.get("layer") ?? "overall";
	const requestedLayers = layersParam
		? layersParam.split(",").filter((l) => l in LAYER_MAP)
		: [layerParam in LAYER_MAP ? layerParam : "overall"];

	if (requestedLayers.length === 0) requestedLayers.push("overall");

	// Whether to also include neighborhood sub-points
	const showNeighborhoods = searchParams.get("neighborhoods") === "1";

	// Separate "overall" from score-column layers
	const hasOverall = requestedLayers.includes("overall");
	const scoreKeys = requestedLayers
		.filter((l) => l !== "overall")
		.map((l) => LAYER_MAP[l] as string);

	// Build filterScores columns to fetch
	const filterCols: Record<string, true> = {};
	for (const key of scoreKeys) filterCols[key] = true;
	const needFilterScores = scoreKeys.length > 0;

	const cities = await db.query.cities.findMany({
		where: (c, { isNotNull }) => isNotNull(c.lat),
		columns: {
			id: true, slug: true, name: true, stateId: true,
			lat: true, lng: true, population: true, tier: true,
			overallScore: true,
		},
		with: {
			...(needFilterScores ? { filterScores: { columns: filterCols } } : {}),
			...(showNeighborhoods ? { neighborhoods: { columns: { id: true, name: true, lat: true, lng: true } } } : {}),
		},
		limit: 3000,
	});

	function computeScore(c: typeof cities[number]): number {
		const fs = (c as any).filterScores as Record<string, number | null> | null | undefined;
		const scores: number[] = [];
		if (hasOverall) scores.push(c.overallScore ?? 50);
		for (const key of scoreKeys) scores.push(fs?.[key] ?? 50);
		return Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
	}

	const features: object[] = [];

	for (const c of cities) {
		if (!c.lat || !c.lng) continue;
		const score = computeScore(c);

		features.push({
			id: c.id,
			slug: c.slug,
			name: c.name,
			stateId: c.stateId,
			lat: c.lat,
			lng: c.lng,
			population: c.population,
			tier: c.tier,
			score,
			overallScore: c.overallScore,
			isNeighborhood: false,
		});

		// Add neighborhood sub-points using parent city's score
		if (showNeighborhoods) {
			const hoods = (c as any).neighborhoods as Array<{ id: string; name: string; lat: number | null; lng: number | null }> | undefined;
			for (const hood of hoods ?? []) {
				if (!hood.lat || !hood.lng) continue;
				features.push({
					id: hood.id,
					slug: c.slug,
					name: `${hood.name}, ${c.name}`,
					stateId: c.stateId,
					lat: hood.lat,
					lng: hood.lng,
					population: null,
					tier: "neighborhood",
					score,
					overallScore: c.overallScore,
					isNeighborhood: true,
				});
			}
		}
	}

	return NextResponse.json(
		{ features, layer: requestedLayers.join(",") },
		{ headers: { "Cache-Control": "public, s-maxage=3600" } },
	);
}
