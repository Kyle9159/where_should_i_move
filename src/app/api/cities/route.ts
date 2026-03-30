import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { type FilterWeights, decodeWeights, computeMatchPct, computeCategoryScores } from "@/lib/ranking";
import type { CityFilterScores } from "@/db/schema";

interface CityRow {
	id: string;
	slug: string;
	name: string;
	stateId: string;
	tier: string;
	population: number | null;
	county: string | null;
	metro: string | null;
	heroImageUrl: string | null;
	thumbnailUrl: string | null;
	overallScore: number | null;
	lat: number | null;
	lng: number | null;
	filterScores: CityFilterScores | null;
}

export async function GET(req: NextRequest) {
	try {
	const { searchParams } = req.nextUrl;

	const stateIds = searchParams.getAll("stateIds");
	const excludeStates = searchParams.getAll("excludeStates");
	const weightsEncoded = searchParams.get("weights");
	const sortBy = (searchParams.get("sort") ?? "match") as "match" | "population" | "name";
	const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
	const pageSize = Math.min(50, Math.max(1, parseInt(searchParams.get("pageSize") ?? "20", 10)));
	const tierFilter = searchParams.getAll("tier");

	const weights: FilterWeights = weightsEncoded ? decodeWeights(weightsEncoded) : {};

	// Fetch cities with filter scores using relational query
	const allCities = await db.query.cities.findMany({
		with: { filterScores: true },
	});

	// Filter by state/tier
	const filtered = allCities.filter((city) => {
		if (stateIds.length > 0 && !stateIds.includes(city.stateId)) return false;
		if (excludeStates.length > 0 && excludeStates.includes(city.stateId)) return false;
		if (tierFilter.length > 0 && !tierFilter.includes(city.tier)) return false;
		return true;
	});

	// Compute match % for each city
	const ranked = filtered
		.filter((r) => r.filterScores != null)
		.map((r) => {
			const scores = r.filterScores as CityFilterScores;
			return {
				id: r.id,
				slug: r.slug,
				name: r.name,
				stateId: r.stateId,
				tier: r.tier,
				population: r.population,
				county: r.county,
				metro: r.metro,
				heroImageUrl: r.heroImageUrl,
				thumbnailUrl: r.thumbnailUrl,
				overallScore: r.overallScore,
				lat: r.lat,
				lng: r.lng,
				matchPct: computeMatchPct(scores, weights),
				categoryScores: computeCategoryScores(scores, weights),
			};
		});

	// Sort
	if (sortBy === "match") {
		ranked.sort((a, b) => b.matchPct - a.matchPct);
	} else if (sortBy === "population") {
		ranked.sort((a, b) => (b.population ?? 0) - (a.population ?? 0));
	} else {
		ranked.sort((a, b) => a.name.localeCompare(b.name));
	}

	const total = ranked.length;
	const offset = (page - 1) * pageSize;
	const paginated = ranked.slice(offset, offset + pageSize);

	return NextResponse.json({
		cities: paginated,
		total,
		page,
		pageSize,
		totalPages: Math.ceil(total / pageSize),
	});
	} catch (err) {
		console.error("[/api/cities] error:", err);
		return NextResponse.json({ cities: [], total: 0, page: 1, pageSize: 20, totalPages: 0 }, { status: 500 });
	}
}
