/**
 * Enriches city_demographics table with real Census ACS data.
 * Also updates city_lifestyle.diversity_index with more complete race data.
 *
 * Census ACS 5-year 2022 — no API key required.
 * One state-batch request per state (same pattern as enrich-lifestyle.ts).
 *
 * Variables fetched per state:
 *   B01001_001E = Total population (denominator for all ratios)
 *   B03002_003E = White non-Hispanic
 *   B03002_004E = Black/AA
 *   B03002_005E = Native American
 *   B03002_006E = Asian
 *   B03002_007E = Pacific Islander
 *   B03002_009E = 2+ races
 *   B03002_012E = Hispanic/Latino
 *   B05002_013E = Foreign born
 *   B09001_001E = Population under 18
 *   B15003_001E = Education: total pop 25+ (denominator)
 *   B15003_022E = Bachelor's degree
 *   B15003_023E = Master's degree
 *   B15003_024E = Professional school degree
 *   B15003_025E = Doctorate
 *   B25003_001E = Occupied housing units (denominator)
 *   B25003_002E = Owner-occupied housing units
 *
 * Run: npx tsx src/db/enrich-demographics.ts
 * Options:
 *   DRY_RUN=1   — no DB writes
 *   LIMIT=N     — first N cities only
 */
import { config } from "dotenv";
import { resolve } from "path";
config({ path: resolve(process.cwd(), ".env.local") });

import Database from "better-sqlite3";

const DRY_RUN = process.env.DRY_RUN === "1";
const LIMIT = parseInt(process.env.LIMIT ?? "9999", 10);
const CENSUS_BASE = "https://api.census.gov/data/2022/acs/acs5";

const dbUrl = process.env.DATABASE_URL?.replace("file:", "") ?? "./nexthome.db";
const sqlite = new Database(dbUrl);

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }

// ── State FIPS ────────────────────────────────────────────────────────────────

const STATE_FIPS: Record<string, string> = {
	AL:"01",AK:"02",AZ:"04",AR:"05",CA:"06",CO:"08",CT:"09",DC:"11",
	DE:"10",FL:"12",GA:"13",HI:"15",ID:"16",IL:"17",IN:"18",IA:"19",
	KS:"20",KY:"21",LA:"22",ME:"23",MD:"24",MA:"25",MI:"26",MN:"27",
	MS:"28",MO:"29",MT:"30",NE:"31",NV:"32",NH:"33",NJ:"34",NM:"35",
	NY:"36",NC:"37",ND:"38",OH:"39",OK:"40",OR:"41",PA:"42",RI:"44",
	SC:"45",SD:"46",TN:"47",TX:"48",UT:"49",VT:"50",VA:"51",WA:"53",
	WV:"54",WI:"55",WY:"56",
};

// ── City name normalization (same as other enrichment scripts) ────────────────

function normalizeName(name: string): string {
	return name.split(",")[0]
		.replace(/\b(city|town|village|borough|municipality|township|cdp|unified government|metro government|consolidated government|charter township|urban county)\b/gi, "")
		.trim()
		.toLowerCase();
}

// ── Census fetch ──────────────────────────────────────────────────────────────

interface CensusDemo {
	name: string;
	totalPop: number;
	white: number;
	black: number;
	native: number;
	asian: number;
	pacific: number;
	multiRace: number;
	hispanic: number;
	foreignBorn: number;
	under18: number;
	eduTotal: number;
	bachelors: number;
	masters: number;
	professional: number;
	doctorate: number;
	housingTotal: number;
	ownerOccupied: number;
}

const VARIABLES = [
	"B01001_001E", // total population
	"B03002_003E", // white non-Hispanic
	"B03002_004E", // Black/AA
	"B03002_005E", // Native American
	"B03002_006E", // Asian
	"B03002_007E", // Pacific Islander
	"B03002_009E", // 2+ races
	"B03002_012E", // Hispanic/Latino
	"B05002_013E", // Foreign born
	"B09001_001E", // Under 18
	"B15003_001E", // Education total (25+)
	"B15003_022E", // Bachelor's
	"B15003_023E", // Master's
	"B15003_024E", // Professional
	"B15003_025E", // Doctorate
	"B25003_001E", // Occupied housing
	"B25003_002E", // Owner-occupied
].join(",");

async function fetchStateDemographics(stateFips: string): Promise<CensusDemo[]> {
	const url = `${CENSUS_BASE}?get=NAME,${VARIABLES}&for=place:*&in=state:${stateFips}`;
	try {
		const res = await fetch(url, { signal: AbortSignal.timeout(25000) });
		if (!res.ok) return [];
		const rows = await res.json() as string[][];
		return rows.slice(1).map(row => ({
			name: row[0],
			totalPop:      Math.max(1, parseInt(row[1]) || 1),
			white:         Math.max(0, parseInt(row[2]) || 0),
			black:         Math.max(0, parseInt(row[3]) || 0),
			native:        Math.max(0, parseInt(row[4]) || 0),
			asian:         Math.max(0, parseInt(row[5]) || 0),
			pacific:       Math.max(0, parseInt(row[6]) || 0),
			multiRace:     Math.max(0, parseInt(row[7]) || 0),
			hispanic:      Math.max(0, parseInt(row[8]) || 0),
			foreignBorn:   Math.max(0, parseInt(row[9]) || 0),
			under18:       Math.max(0, parseInt(row[10]) || 0),
			eduTotal:      Math.max(1, parseInt(row[11]) || 1),
			bachelors:     Math.max(0, parseInt(row[12]) || 0),
			masters:       Math.max(0, parseInt(row[13]) || 0),
			professional:  Math.max(0, parseInt(row[14]) || 0),
			doctorate:     Math.max(0, parseInt(row[15]) || 0),
			housingTotal:  Math.max(1, parseInt(row[16]) || 1),
			ownerOccupied: Math.max(0, parseInt(row[17]) || 0),
		})).filter(p => p.totalPop > 100); // skip tiny CDPs
	} catch {
		return [];
	}
}

function computeDiversityIndex(d: CensusDemo): number {
	const N = d.totalPop;
	const groups = [d.white, d.black, d.asian, d.hispanic, d.native, d.pacific, d.multiRace];
	const sumSq = groups.reduce((acc, n) => acc + (n / N) ** 2, 0);
	return Math.round((1 - sumSq) * 1000) / 1000;
}

function pct(numerator: number, denominator: number): number {
	if (denominator <= 0) return 0;
	return Math.round((numerator / denominator) * 10000) / 10000; // 4 decimal places
}

// ── Upsert helpers ────────────────────────────────────────────────────────────

function upsertDemographics(cityId: string, fields: Record<string, unknown>) {
	const existing = sqlite.prepare("SELECT id FROM city_demographics WHERE city_id = ?").get(cityId);
	const keys = Object.keys(fields);
	const vals = Object.values(fields);
	if (existing) {
		const sets = keys.map(k => `${k} = ?`).join(", ");
		sqlite.prepare(`UPDATE city_demographics SET ${sets}, data_as_of = date('now') WHERE city_id = ?`)
			.run(...vals, cityId);
	} else {
		const cols = ["id", "city_id", ...keys].join(", ");
		const placeholders = ["lower(hex(randomblob(16)))", "?", ...keys.map(() => "?")].join(", ");
		sqlite.prepare(`INSERT INTO city_demographics (${cols}, data_as_of) VALUES (${placeholders}, date('now'))`)
			.run(cityId, ...vals);
	}
}

function updateLifestyleDiversity(cityId: string, diversityIndex: number) {
	const existing = sqlite.prepare("SELECT id FROM city_lifestyle WHERE city_id = ?").get(cityId);
	if (existing) {
		sqlite.prepare("UPDATE city_lifestyle SET diversity_index = ? WHERE city_id = ?")
			.run(diversityIndex, cityId);
	}
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
	const cities = sqlite
		.prepare(`
			SELECT id, name, state_id
			FROM cities
			ORDER BY overall_score DESC
			LIMIT ?
		`)
		.all(LIMIT) as Array<{ id: string; name: string; state_id: string }>;

	console.log(`🧑‍🤝‍🧑 Demographics enrichment for ${cities.length} cities`);
	if (DRY_RUN) console.log("   DRY RUN — no writes");

	// Group by state
	const byState = new Map<string, typeof cities>();
	for (const city of cities) {
		if (!byState.has(city.state_id)) byState.set(city.state_id, []);
		byState.get(city.state_id)!.push(city);
	}

	let updated = 0; let notFound = 0; let stateNum = 0;

	for (const [stateId, stateCities] of byState) {
		const fips = STATE_FIPS[stateId];
		if (!fips) { notFound += stateCities.length; continue; }
		stateNum++;
		process.stdout.write(`\r  [${stateNum}/${byState.size}] ${stateId}...      `);

		const places = await fetchStateDemographics(fips);

		// Build lookup by normalized name
		const placeMap = new Map<string, CensusDemo>();
		for (const p of places) placeMap.set(normalizeName(p.name), p);

		for (const city of stateCities) {
			const place = placeMap.get(city.name.toLowerCase());
			if (!place) { notFound++; continue; }

			const diversityIndex = computeDiversityIndex(place);
			const pctWhite    = pct(place.white, place.totalPop);
			const pctBlack    = pct(place.black, place.totalPop);
			const pctAsian    = pct(place.asian, place.totalPop);
			const pctHispanic = pct(place.hispanic, place.totalPop);
			const pctNative   = pct(place.native, place.totalPop);
			const pctPacific  = pct(place.pacific, place.totalPop);
			const pctMulti    = pct(place.multiRace, place.totalPop);
			const pctOther    = Math.max(0, Math.round((1 - pctWhite - pctBlack - pctAsian - pctHispanic - pctNative - pctPacific - pctMulti) * 10000) / 10000);
			const pctForeignBorn    = pct(place.foreignBorn, place.totalPop);
			const pctUnder18        = pct(place.under18, place.totalPop);
			const pctCollegeEduc    = pct(place.bachelors + place.masters + place.professional + place.doctorate, place.eduTotal);
			const homeownershipRate = pct(place.ownerOccupied, place.housingTotal);

			if (!DRY_RUN) {
				upsertDemographics(city.id, {
					total_population:      place.totalPop,
					pct_white:             pctWhite,
					pct_black:             pctBlack,
					pct_asian:             pctAsian,
					pct_hispanic:          pctHispanic,
					pct_other:             pctOther,
					pct_foreign_born:      pctForeignBorn,
					pct_college_educated:  pctCollegeEduc,
					pct_under_18:          pctUnder18,
					homeownership_rate:    homeownershipRate,
					diversity_index:       diversityIndex,
					source:                "census-acs",
				});
				// Also refresh diversity_index in city_lifestyle if present
				updateLifestyleDiversity(city.id, diversityIndex);
			}
			updated++;
		}
		await sleep(80);
	}

	process.stdout.write("\n");
	console.log(`\n✅ Done: ${updated} cities updated, ${notFound} not matched in Census`);
}

main().catch(console.error);
