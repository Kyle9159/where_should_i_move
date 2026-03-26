/**
 * Housing data integrations.
 *
 * Strategy (in priority order):
 * 1. ATTOM Data API (attomdata.com) — industry-standard, free tier 100 calls/mo
 *    Set ATTOM_API_KEY in .env.local
 * 2. HUD FMR (Fair Market Rent) API — completely free, no key required
 *    Provides median 2BR rent by metro area
 * 3. Seeded DB estimates (fallback)
 *
 * Zillow's API is closed to most developers. Their ZHVI/ZORI datasets are
 * published monthly as CSV at zillow.com/research/data/ — use the
 * `db:enrich:housing` script to import them.
 */

// ── HUD Fair Market Rent (free, no key) ─────────────────────────────────────
// Returns median 2BR FMR for a county/metro. Updated annually by HUD.

interface HudFmrResponse {
	data?: {
		basicdata?: {
			Efficiency?: number;
			One_Bedroom?: number;
			Two_Bedroom?: number;
			Three_Bedroom?: number;
			Four_Bedroom?: number;
			fips_code?: string;
			county_name?: string;
			statename?: string;
		};
	};
}

export async function getHudFmr(
	stateFips: string,
	countyFips: string,
	year = new Date().getFullYear() - 1, // FMR data is published ~1yr behind
): Promise<{ rent2Bed: number | null; rent1Bed: number | null } | null> {
	try {
		const url = `https://www.huduser.gov/hudapi/public/fmr/statedata/${stateFips}?year=${year}`;
		const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
		if (!res.ok) return null;

		const data = (await res.json()) as { data?: Array<{ fips_code: string; Two_Bedroom?: number; One_Bedroom?: number }> };
		const counties = data?.data ?? [];
		// Match by county FIPS (last 3 digits of 5-digit FIPS)
		const match = counties.find((c) => c.fips_code?.endsWith(countyFips.slice(-3)));
		if (!match) return null;

		return {
			rent2Bed: match.Two_Bedroom ?? null,
			rent1Bed: match.One_Bedroom ?? null,
		};
	} catch {
		return null;
	}
}

// ── ATTOM Property Data API ──────────────────────────────────────────────────

interface AttomResponse {
	property?: Array<{
		assessment?: { assessed?: { assdTtlValue?: number } };
		sale?: { saleAmountData?: { saleAmt?: number } };
	}>;
	summary?: Array<{
		propClass?: string;
		yearBuilt?: number;
	}>;
}

export async function getAttomMedianHomeValue(
	city: string,
	stateCode: string,
): Promise<{ medianHomePrice: number | null } | null> {
	const key = process.env.ATTOM_API_KEY;
	if (!key) return null;

	try {
		const url = new URL("https://api.gateway.attomdata.com/propertyapi/v1.0.0/salestrend/snapshot");
		url.searchParams.set("geoIdV4", `${city}, ${stateCode}`);
		url.searchParams.set("interval", "yearly");
		url.searchParams.set("startyear", String(new Date().getFullYear() - 1));
		url.searchParams.set("endyear", String(new Date().getFullYear() - 1));

		const res = await fetch(url.toString(), {
			headers: { apikey: key, accept: "application/json" },
			signal: AbortSignal.timeout(10000),
		});
		if (!res.ok) return null;

		const data = await res.json();
		const medSale = data?.saleTrend?.[0]?.medSaleAmt ?? null;
		return { medianHomePrice: medSale };
	} catch {
		return null;
	}
}

// ── Census ACS Median Home Value (free, no key) ──────────────────────────────
// Uses Census Bureau API to get B25077_001E (median home value) for a place.

export async function getCensusMedianHomeValue(
	stateFips: string,
	placeFips: string,
): Promise<number | null> {
	try {
		const url = `https://api.census.gov/data/2022/acs/acs5?get=B25077_001E,B25064_001E&for=place:${placeFips}&in=state:${stateFips}`;
		const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
		if (!res.ok) return null;

		const rows = (await res.json()) as string[][];
		// rows[0] = headers, rows[1] = data
		if (rows.length < 2) return null;
		const val = parseInt(rows[1][0], 10);
		return isNaN(val) || val < 0 ? null : val;
	} catch {
		return null;
	}
}
