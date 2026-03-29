/**
 * Enriches city_housing with real Census ACS data.
 * No API key required. Uses state-batch approach — fetches all places
 * in a state at once, then matches by city name (same pattern as enrich-schools-free.ts).
 *
 * Data source: Census ACS 5-year 2022
 *   B25077_001E — Median home value
 *   B25064_001E — Median gross rent
 *
 * Also computes:
 *   price_to_rent_ratio = median_home_price / (median_rent × 12)
 *
 * Run: npx tsx src/db/enrich-housing.ts
 * Options:
 *   LIMIT=100  — only first N cities (default: all)
 *   DRY_RUN=1  — no DB writes
 */
import { config } from "dotenv";
import { resolve } from "path";
config({ path: resolve(process.cwd(), ".env.local") });

import Database from "better-sqlite3";

const DRY_RUN = process.env.DRY_RUN === "1";
const LIMIT = parseInt(process.env.LIMIT ?? "9999", 10);
const CENSUS_BASE = "https://api.census.gov/data/2022/acs/acs5";
const DELAY_MS = 80; // Census allows ~500 req/min; 80ms is safe

const dbUrl = process.env.DATABASE_URL?.replace("file:", "") ?? "./nexthome.db";
const sqlite = new Database(dbUrl);

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }

const STATE_FIPS: Record<string, string> = {
	AL:"01",AK:"02",AZ:"04",AR:"05",CA:"06",CO:"08",CT:"09",DC:"11",
	DE:"10",FL:"12",GA:"13",HI:"15",ID:"16",IL:"17",IN:"18",IA:"19",
	KS:"20",KY:"21",LA:"22",ME:"23",MD:"24",MA:"25",MI:"26",MN:"27",
	MS:"28",MO:"29",MT:"30",NE:"31",NV:"32",NH:"33",NJ:"34",NM:"35",
	NY:"36",NC:"37",ND:"38",OH:"39",OK:"40",OR:"41",PA:"42",RI:"44",
	SC:"45",SD:"46",TN:"47",TX:"48",UT:"49",VT:"50",VA:"51",WA:"53",
	WV:"54",WI:"55",WY:"56",
};

interface PlaceData {
	name: string;
	homeValue: number; // B25077_001E
	grossRent: number; // B25064_001E
}

async function fetchStatePlaces(stateFips: string): Promise<PlaceData[]> {
	const url = `${CENSUS_BASE}?get=NAME,B25077_001E,B25064_001E&for=place:*&in=state:${stateFips}`;
	try {
		const res = await fetch(url, { signal: AbortSignal.timeout(20000) });
		if (!res.ok) return [];
		const rows = await res.json() as string[][];
		return rows.slice(1)
			.map(row => ({
				name: row[0],
				homeValue: parseInt(row[1]) || 0,
				grossRent: parseInt(row[2]) || 0,
			}))
			.filter(p => p.homeValue > 0); // negative = not available
	} catch {
		return [];
	}
}

function normalizeName(name: string): string {
	// "Austin city, Texas" → "austin"
	return name.split(",")[0]
		.replace(/\b(city|town|village|borough|municipality|township|cdp|unified government|metro government|consolidated government|charter township|urban county)\b/gi, "")
		.trim()
		.toLowerCase();
}

async function main() {
	const cities = sqlite
		.prepare("SELECT id, name, state_id FROM cities ORDER BY overall_score DESC LIMIT ?")
		.all(LIMIT) as Array<{ id: string; name: string; state_id: string }>;

	console.log(`🏠 Enriching housing data for ${cities.length} cities via Census ACS...`);
	if (DRY_RUN) console.log("   DRY RUN — no writes");

	// Group by state
	const byState = new Map<string, Array<{ id: string; name: string }>>();
	for (const city of cities) {
		if (!byState.has(city.state_id)) byState.set(city.state_id, []);
		byState.get(city.state_id)!.push({ id: city.id, name: city.name });
	}

	const existsStmt = sqlite.prepare("SELECT id FROM city_housing WHERE city_id = ?");
	const updateStmt = sqlite.prepare(`
		UPDATE city_housing
		SET median_home_price = ?, median_rent_2bed = ?, price_to_rent_ratio = ?,
		    data_as_of = 'census-acs-2022', source = 'census'
		WHERE city_id = ?
	`);
	const insertStmt = sqlite.prepare(`
		INSERT INTO city_housing (id, city_id, median_home_price, median_rent_2bed, price_to_rent_ratio, data_as_of, source)
		VALUES (lower(hex(randomblob(16))), ?, ?, ?, ?, 'census-acs-2022', 'census')
	`);

	let updated = 0; let skipped = 0; let stateNum = 0;

	for (const [stateId, stateCities] of byState) {
		const fips = STATE_FIPS[stateId];
		if (!fips) { skipped += stateCities.length; continue; }

		stateNum++;
		process.stdout.write(`\r  [${stateNum}/${byState.size}] ${stateId} — fetching...      `);

		const places = await fetchStatePlaces(fips);
		if (places.length === 0) { skipped += stateCities.length; await sleep(DELAY_MS); continue; }

		// Build normalized-name → place map
		const placeMap = new Map<string, PlaceData>();
		for (const place of places) {
			placeMap.set(normalizeName(place.name), place);
		}

		for (const city of stateCities) {
			const place = placeMap.get(city.name.toLowerCase());
			if (!place) { skipped++; continue; }

			const homePrice = place.homeValue;
			const rent = place.grossRent > 0 ? place.grossRent : null;
			const ptr = rent ? Math.round((homePrice / (rent * 12)) * 10) / 10 : null;

			if (!DRY_RUN) {
				const existing = existsStmt.get(city.id);
				if (existing) {
					updateStmt.run(homePrice, rent, ptr, city.id);
				} else {
					insertStmt.run(city.id, homePrice, rent, ptr);
				}
			}
			updated++;
		}

		await sleep(DELAY_MS);
	}

	process.stdout.write("\n");

	if (!DRY_RUN) {
		const withData = (sqlite.prepare(
			"SELECT COUNT(*) as c FROM city_housing WHERE source = 'census' AND median_home_price > 0"
		).get() as { c: number }).c;
		console.log(`   Cities with Census housing data: ${withData}/2708`);
	}

	console.log(`\n✅ Done! Updated: ${updated}, Skipped: ${skipped}`);
	sqlite.close();
}

main().catch(e => { console.error(e); process.exit(1); });
