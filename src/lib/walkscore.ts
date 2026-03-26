/**
 * Walk Score API integration.
 * Docs: https://www.walkscore.com/professional/api.php
 *
 * Returns Walk Score, Transit Score, and Bike Score (0–100) for a lat/lng.
 * Requires WALKSCORE_API_KEY in .env.local.
 * Free tier: 5,000 calls/day.
 *
 * When unconfigured, returns null so the app falls back to seeded estimates.
 */

export interface WalkScoreResult {
	walkScore: number;
	walkDescription: string;
	transitScore: number | null;
	transitDescription: string | null;
	bikeScore: number | null;
	bikeDescription: string | null;
}

interface WalkScoreResponse {
	status: number;          // 1 = success
	walkscore: number;
	description: string;
	transit?: { score: number; description: string };
	bike?: { score: number; description: string };
}

export async function getWalkScore(
	lat: number,
	lng: number,
	address: string,
): Promise<WalkScoreResult | null> {
	const key = process.env.WALKSCORE_API_KEY;
	if (!key) return null;

	const url = new URL("https://api.walkscore.com/score");
	url.searchParams.set("format", "json");
	url.searchParams.set("address", address);
	url.searchParams.set("lat", String(lat));
	url.searchParams.set("lon", String(lng));
	url.searchParams.set("transit", "1");
	url.searchParams.set("bike", "1");
	url.searchParams.set("wsapikey", key);

	try {
		const res = await fetch(url.toString(), {
			signal: AbortSignal.timeout(8000),
			next: { revalidate: 86400 * 30 }, // cache 30 days in Next.js
		} as RequestInit);

		if (!res.ok) return null;
		const data = (await res.json()) as WalkScoreResponse;
		if (data.status !== 1) return null;

		return {
			walkScore: data.walkscore,
			walkDescription: data.description,
			transitScore: data.transit?.score ?? null,
			transitDescription: data.transit?.description ?? null,
			bikeScore: data.bike?.score ?? null,
			bikeDescription: data.bike?.description ?? null,
		};
	} catch {
		return null;
	}
}
