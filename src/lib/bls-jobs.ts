/**
 * Bureau of Labor Statistics (BLS) Public API v2
 * Docs: https://www.bls.gov/developers/api_signature_v2.htm
 *
 * Provides:
 * - Metropolitan area unemployment rates (LAUS series)
 * - State-level employment stats
 *
 * Free with registration: get key at https://data.bls.gov/registrationEngine/
 * Without a key: limited to 25 series per query, 10 years of data.
 * With key: 500 series per query, 20 years, daily email notifications.
 *
 * When BLS_API_KEY is not set, falls back to no-key mode (fewer results).
 */

export interface BlsJobsResult {
	unemploymentRate: number | null;
	year: number;
	areaName: string | null;
}

interface BlsSeries {
	seriesID: string;
	data: Array<{
		year: string;
		period: string;
		value: string;
		footnotes?: Array<{ code?: string }>;
	}>;
}

interface BlsResponse {
	status: string;
	Results?: { series: BlsSeries[] };
}

const BLS_BASE = "https://api.bls.gov/publicAPI/v2/timeseries/data/";

// LAUS series ID format: LAUMT{stateCode}{areaCode}0000000003
// We use state-level LAUS codes as a fallback when metro codes aren't available

// Map of state abbreviations to BLS state FIPS codes
const STATE_FIPS: Record<string, string> = {
	AL: "01", AK: "02", AZ: "04", AR: "05", CA: "06", CO: "08", CT: "09",
	DE: "10", DC: "11", FL: "12", GA: "13", HI: "15", ID: "16", IL: "17",
	IN: "18", IA: "19", KS: "20", KY: "21", LA: "22", ME: "23", MD: "24",
	MA: "25", MI: "26", MN: "27", MS: "28", MO: "29", MT: "30", NE: "31",
	NV: "32", NH: "33", NJ: "34", NM: "35", NY: "36", NC: "37", ND: "38",
	OH: "39", OK: "40", OR: "41", PA: "42", RI: "44", SC: "45", SD: "46",
	TN: "47", TX: "48", UT: "49", VT: "50", VA: "51", WA: "53", WV: "54",
	WI: "55", WY: "56",
};

export async function getStateUnemploymentRate(stateId: string): Promise<BlsJobsResult | null> {
	const fips = STATE_FIPS[stateId];
	if (!fips) return null;

	// State-level LAUS series: LASST{fips}0000000000003 = unemployment rate
	const seriesId = `LASST${fips}0000000000003`;
	const currentYear = new Date().getFullYear();

	const body: Record<string, unknown> = {
		seriesid: [seriesId],
		startyear: String(currentYear - 1),
		endyear: String(currentYear),
		annualaverage: true,
	};

	if (process.env.BLS_API_KEY) {
		body.registrationkey = process.env.BLS_API_KEY;
	}

	try {
		const res = await fetch(BLS_BASE, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(body),
			signal: AbortSignal.timeout(10000),
		});

		if (!res.ok) return null;
		const data = (await res.json()) as BlsResponse;
		if (data.status !== "REQUEST_SUCCEEDED") return null;

		const series = data.Results?.series?.[0];
		if (!series?.data?.length) return null;

		// Get most recent annual average (period = M13)
		const annual = series.data
			.filter((d) => d.period === "M13")
			.sort((a, b) => Number(b.year) - Number(a.year))[0]
			?? series.data.sort((a, b) => Number(b.year) - Number(a.year))[0];

		const rate = parseFloat(annual.value);
		if (isNaN(rate)) return null;

		return {
			unemploymentRate: rate,
			year: parseInt(annual.year, 10),
			areaName: `${stateId} (state)`,
		};
	} catch {
		return null;
	}
}
