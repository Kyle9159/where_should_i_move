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

const STATE_NAMES: Record<string, string> = {
	AL:"Alabama",AK:"Alaska",AZ:"Arizona",AR:"Arkansas",CA:"California",
	CO:"Colorado",CT:"Connecticut",DE:"Delaware",DC:"Washington DC",FL:"Florida",
	GA:"Georgia",HI:"Hawaii",ID:"Idaho",IL:"Illinois",IN:"Indiana",IA:"Iowa",
	KS:"Kansas",KY:"Kentucky",LA:"Louisiana",ME:"Maine",MD:"Maryland",
	MA:"Massachusetts",MI:"Michigan",MN:"Minnesota",MS:"Mississippi",MO:"Missouri",
	MT:"Montana",NE:"Nebraska",NV:"Nevada",NH:"New Hampshire",NJ:"New Jersey",
	NM:"New Mexico",NY:"New York",NC:"North Carolina",ND:"North Dakota",OH:"Ohio",
	OK:"Oklahoma",OR:"Oregon",PA:"Pennsylvania",RI:"Rhode Island",SC:"South Carolina",
	SD:"South Dakota",TN:"Tennessee",TX:"Texas",UT:"Utah",VT:"Vermont",
	VA:"Virginia",WA:"Washington",WV:"West Virginia",WI:"Wisconsin",WY:"Wyoming",
};

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

	const stateName = STATE_NAMES[stateId] ?? stateId;
	// Try 2 queries max (each counts against rate limit).
	// Most cities succeed on query 1; query 2 is a broader fallback.
	const queries = [
		`${cityName} ${stateName} city`,
		`${cityName} ${stateName}`,
	];

	for (const query of queries) {
		const url = new URL(`${BASE}/search/photos`);
		url.searchParams.set("query", query);
		url.searchParams.set("per_page", String(perPage));
		url.searchParams.set("orientation", "landscape");
		url.searchParams.set("content_filter", "high");

		try {
			const res = await fetch(url.toString(), {
				headers: { Authorization: `Client-ID ${key}` },
				signal: AbortSignal.timeout(8000),
			});

			if (!res.ok) return [];

			const data = (await res.json()) as UnsplashSearchResult;
			if (data.results?.length > 0) return data.results;
		} catch {
			return [];
		}
	}

	return [];
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
