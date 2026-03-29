/**
 * FBI Crime Data Explorer API (UCR/NIBRS)
 * Docs: https://cde.ucr.cjis.gov/LATEST/webapp/#/pages/docApi
 * API base: https://api.usa.gov/crime/fbi/cde
 *
 * Free, no key required.
 * Provides violent and property crime rates per 100k for cities via ORI codes.
 */

export interface FbiCrimeResult {
	violentCrimeRate: number | null;  // per 100,000 residents
	propertyCrimeRate: number | null;
	year: number;
	agencyName: string | null;
}

interface FbiAgency {
	ori: string;
	agency_name: string;
	state_abbr: string;
	agency_type_name?: string;
	latitude?: number | null;
	longitude?: number | null;
}

const FBI_BASE = "https://api.usa.gov/crime/fbi/cde";
const API_KEY = "iiHnOKfno2Mgkt5AynpvPpUQTEyxE77jo1RU8PIv";

// Response is { [countyName: string]: FbiAgency[] } — flatten to array
async function findAgencyOri(cityName: string, stateAbbr: string): Promise<{ ori: string; name: string } | null> {
	try {
		const res = await fetch(
			`${FBI_BASE}/agency/byStateAbbr/${stateAbbr}?API_KEY=${API_KEY}`,
			{ signal: AbortSignal.timeout(10000) },
		);
		if (!res.ok) return null;

		const data = await res.json() as Record<string, FbiAgency[]>;

		// Flatten all county buckets into one array
		const agencies: FbiAgency[] = Object.values(data).flat();

		const city = cityName.toLowerCase().trim();

		// Priority 1: exact city name + "Police Department" — name must START with city to avoid
		// "South Chicago Heights" matching "Chicago", etc.
		const exactPolice = agencies.find(
			(a) => {
				const n = a.agency_name?.toLowerCase() ?? "";
				return n.startsWith(city + " police department") || n === city + " police department";
			},
		);
		if (exactPolice) return { ori: exactPolice.ori, name: exactPolice.agency_name };

		// Priority 2: starts with city + "Police"
		const startsPolice = agencies.find(
			(a) => {
				const n = a.agency_name?.toLowerCase() ?? "";
				return n.startsWith(city + " police");
			},
		);
		if (startsPolice) return { ori: startsPolice.ori, name: startsPolice.agency_name };

		// Priority 3: starts with city + City agency type
		const startsCity = agencies.find(
			(a) => {
				const n = a.agency_name?.toLowerCase() ?? "";
				return n.startsWith(city + " ") && a.agency_type_name === "City";
			},
		);
		if (startsCity) return { ori: startsCity.ori, name: startsCity.agency_name };

		return null;
	} catch {
		return null;
	}
}

// Parse monthly rate data into an annual rate per 100k
// FBI CDE returns monthly crime rates (per 100k, for each individual month).
// Average the months then multiply by 12 to get the annualized rate.
// Response: { offenses: { rates: { "Agency Name Offenses": { "MM-YYYY": monthlyRate, ... } } } }
function parseRates(data: any, agencyName: string): number | null {
	try {
		const rates: Record<string, Record<string, number>> = data?.offenses?.rates ?? {};
		// Find the key for this specific agency (ends with " Offenses")
		const agencyKey = Object.keys(rates).find(
			(k) => k.toLowerCase().includes(agencyName.toLowerCase().split(" ")[0]) && k.endsWith("Offenses"),
		) ?? Object.keys(rates).find((k) => !k.includes("United States") && !k.includes("Clearances") && k.endsWith("Offenses"));

		if (!agencyKey) return null;
		const monthlyRates = Object.values(rates[agencyKey]);
		if (!monthlyRates.length) return null;

		// Average monthly rates then ×12 to get annualized rate per 100k
		const valid = monthlyRates.filter((v) => typeof v === "number" && v > 0);
		if (!valid.length) return null;
		const monthlyAvg = valid.reduce((a, b) => a + b, 0) / valid.length;
		return Math.round(monthlyAvg * 12);
	} catch {
		return null;
	}
}

export async function getFbiCrimeData(
	cityName: string,
	stateAbbr: string,
	_population: number,
): Promise<FbiCrimeResult | null> {
	const agency = await findAgencyOri(cityName, stateAbbr);
	if (!agency) return null;

	try {
		// Use MM-YYYY date format; pull last 3 years for stability
		const endYear = new Date().getFullYear() - 1;
		const from = `01-${endYear - 2}`;
		const to = `12-${endYear}`;

		const [violentRes, propertyRes] = await Promise.all([
			fetch(`${FBI_BASE}/summarized/agency/${agency.ori}/violent-crime?API_KEY=${API_KEY}&from=${from}&to=${to}`, { signal: AbortSignal.timeout(12000) }),
			fetch(`${FBI_BASE}/summarized/agency/${agency.ori}/property-crime?API_KEY=${API_KEY}&from=${from}&to=${to}`, { signal: AbortSignal.timeout(12000) }),
		]);

		if (!violentRes.ok && !propertyRes.ok) return null;

		const [violentData, propertyData] = await Promise.all([
			violentRes.ok ? violentRes.json() : null,
			propertyRes.ok ? propertyRes.json() : null,
		]);

		const violentCrimeRate = violentData ? parseRates(violentData, agency.name) : null;
		const propertyCrimeRate = propertyData ? parseRates(propertyData, agency.name) : null;

		if (violentCrimeRate === null && propertyCrimeRate === null) return null;

		return {
			violentCrimeRate,
			propertyCrimeRate,
			year: endYear,
			agencyName: agency.name,
		};
	} catch {
		return null;
	}
}
