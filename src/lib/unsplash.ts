/**
 * Unsplash API helper.
 *
 * Only the Access Key (Client ID) is needed — it authenticates server-side
 * photo search. The Secret Key is only for OAuth user flows (not needed here).
 * The Application ID is just your app's numeric identifier in the dashboard.
 */

export interface UnsplashPhoto {
	id: string;
	urls: { regular: string; small: string; thumb: string };
	user: { name: string; links: { html: string } };
	width: number;
	height: number;
	alt_description: string | null;
}

interface UnsplashSearchResult {
	results: UnsplashPhoto[];
	total: number;
}

const BASE = "https://api.unsplash.com";

/**
 * Search for city photos. Returns up to `perPage` results.
 * Uses the Access Key as the Authorization header.
 */
export async function searchCityPhotos(
	cityName: string,
	stateId: string,
	perPage = 4,
): Promise<UnsplashPhoto[]> {
	const key = process.env.UNSPLASH_ACCESS_KEY;
	if (!key) return [];

	const query = `${cityName} ${stateId} city skyline`;

	const url = new URL(`${BASE}/search/photos`);
	url.searchParams.set("query", query);
	url.searchParams.set("per_page", String(perPage));
	url.searchParams.set("orientation", "landscape");
	url.searchParams.set("content_filter", "high");

	try {
		const res = await fetch(url.toString(), {
			headers: { Authorization: `Client-ID ${key}` },
			signal: AbortSignal.timeout(8000),
			next: { revalidate: 86400 }, // Next.js cache for 24h
		});

		if (!res.ok) return [];

		const data = await res.json() as UnsplashSearchResult;
		return data.results ?? [];
	} catch {
		return [];
	}
}

/**
 * Get a single photo by Unsplash photo ID.
 */
export async function getUnsplashPhoto(photoId: string): Promise<UnsplashPhoto | null> {
	const key = process.env.UNSPLASH_ACCESS_KEY;
	if (!key) return null;

	try {
		const res = await fetch(`${BASE}/photos/${photoId}`, {
			headers: { Authorization: `Client-ID ${key}` },
			signal: AbortSignal.timeout(6000),
		});
		if (!res.ok) return null;
		return await res.json() as UnsplashPhoto;
	} catch {
		return null;
	}
}

/**
 * Attribution string for Unsplash (required by their API guidelines).
 */
export function unsplashAttribution(photo: UnsplashPhoto): string {
	return `Photo by ${photo.user.name} on Unsplash`;
}
