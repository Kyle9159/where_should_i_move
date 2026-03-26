/**
 * FBI Crime Data Explorer API (UCR/NIBRS)
 * Docs: https://cde.ucr.cjis.gov/LATEST/webapp/#/pages/docApi
 * API base: https://api.usa.gov/crime/fbi/cde
 *
 * Free, no key required for basic queries.
 * Provides violent crime and property crime rates per 100k for agencies/cities.
 *
 * Note: The FBI API maps to ORI (agency) codes, not city names directly.
 * We query by state + city name and pick the best-matching agency.
 */

export interface FbiCrimeResult {
	violentCrimeRate: number | null;   // per 100,000 residents
	propertyCrimeRate: number | null;
	year: number;
	agencyName: string | null;
}

interface FbiAgency {
	ori: string;
	agency_name: string;
	city_name: string;
	state_abbr: string;
}

interface FbiCrimeData {
	results?: Array<{
		year?: number;
		violent_crime?: number;
		property_crime?: number;
		population?: number;
	}>;
}

const FBI_BASE = "https://api.usa.gov/crime/fbi/cde";

// Find the best-matching FBI agency ORI code for a city
async function findAgencyOri(cityName: string, stateAbbr: string): Promise<string | null> {
	try {
		const url = `${FBI_BASE}/agency/byStateAbbr/${stateAbbr}?API_KEY=iiHnOKfno2Mgkt5AynpvPpUQTEyxE77jo1RU8PIv`;
		const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
		if (!res.ok) return null;

		const data = (await res.json()) as FbiAgency[];
		if (!Array.isArray(data)) return null;

		// Find best match by city name (case-insensitive contains)
		const city = cityName.toLowerCase();
		const match = data.find(
			(a) => a.city_name?.toLowerCase() === city && a.agency_name?.toLowerCase().includes("police"),
		) ?? data.find((a) => a.city_name?.toLowerCase().includes(city));

		return match?.ori ?? null;
	} catch {
		return null;
	}
}

export async function getFbiCrimeData(
	cityName: string,
	stateAbbr: string,
	population: number,
): Promise<FbiCrimeResult | null> {
	const ori = await findAgencyOri(cityName, stateAbbr);
	if (!ori) return null;

	try {
		// Get the last 3 years of crime data and average them for stability
		const currentYear = new Date().getFullYear() - 1;
		const url = `${FBI_BASE}/summarized/agency/${ori}/offenses/${currentYear - 2}/${currentYear}?API_KEY=iiHnOKfno2Mgkt5AynpvPpUQTEyxE77jo1RU8PIv`;
		const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
		if (!res.ok) return null;

		const data = (await res.json()) as FbiCrimeData;
		const results = data.results ?? [];
		if (results.length === 0) return null;

		// Use most recent year
		const latest = results.sort((a, b) => (b.year ?? 0) - (a.year ?? 0))[0];
		const pop = latest.population ?? population;
		if (!pop) return null;

		const violentRate = latest.violent_crime != null
			? Math.round((latest.violent_crime / pop) * 100000)
			: null;
		const propertyRate = latest.property_crime != null
			? Math.round((latest.property_crime / pop) * 100000)
			: null;

		return {
			violentCrimeRate: violentRate,
			propertyCrimeRate: propertyRate,
			year: latest.year ?? currentYear,
			agencyName: null,
		};
	} catch {
		return null;
	}
}
