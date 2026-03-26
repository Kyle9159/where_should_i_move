/**
 * GreatSchools API integration.
 * Docs: https://www.greatschools.org/api/docs/
 *
 * Returns school ratings for a city. Requires GREATSCHOOLS_API_KEY.
 * Free tier: 2,500 calls/day.
 *
 * When unconfigured, returns null — the app falls back to seeded estimates.
 */

export interface GreatSchoolsSummary {
	avgRating: number;       // 1–10 average across all schools in city
	totalSchools: number;
	elementaryAvg: number | null;
	middleAvg: number | null;
	highAvg: number | null;
	topRatedCount: number;   // schools rated 8+
}

interface GsSchool {
	gsRating?: number;
	type?: string;           // "public" | "private" | "charter"
	levelCodes?: string[];   // ["e"] | ["m"] | ["h"]
}

interface GsResponse {
	schools?: GsSchool[];
}

export async function getGreatSchoolsRatings(
	city: string,
	stateCode: string,
): Promise<GreatSchoolsSummary | null> {
	const key = process.env.GREATSCHOOLS_API_KEY;
	if (!key) return null;

	try {
		const url = new URL("https://api.greatschools.org/schools");
		url.searchParams.set("state", stateCode.toLowerCase());
		url.searchParams.set("city", city);
		url.searchParams.set("limit", "50");
		url.searchParams.set("key", key);

		const res = await fetch(url.toString(), {
			headers: { Accept: "application/json" },
			signal: AbortSignal.timeout(10000),
			next: { revalidate: 86400 * 90 }, // cache 90 days — ratings don't change often
		} as RequestInit);

		if (!res.ok) return null;
		const data = (await res.json()) as GsResponse;
		const schools = data.schools ?? [];

		const rated = schools.filter((s) => s.gsRating != null && s.gsRating > 0);
		if (rated.length === 0) return null;

		const avg = (arr: GsSchool[]) =>
			arr.length === 0 ? null : Math.round((arr.reduce((s, x) => s + (x.gsRating ?? 0), 0) / arr.length) * 10) / 10;

		const elem = rated.filter((s) => s.levelCodes?.includes("e"));
		const middle = rated.filter((s) => s.levelCodes?.includes("m"));
		const high = rated.filter((s) => s.levelCodes?.includes("h"));

		return {
			avgRating: avg(rated) ?? 0,
			totalSchools: rated.length,
			elementaryAvg: avg(elem),
			middleAvg: avg(middle),
			highAvg: avg(high),
			topRatedCount: rated.filter((s) => (s.gsRating ?? 0) >= 8).length,
		};
	} catch {
		return null;
	}
}
