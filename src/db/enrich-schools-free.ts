/**
 * Free school quality enrichment using Census ACS.
 * No API key required. Replaces GreatSchools ($52/mo).
 *
 * Data sources (both free):
 *  - B15003: Educational attainment by city (bachelor's, graduate degrees)
 *    Strong proxy for school quality — areas with good schools attract
 *    more educated families and the correlation is well-established.
 *  - B14001: School enrollment by type (public vs private)
 *    High private school enrollment signals dissatisfaction with public schools.
 *
 * Score computation (0–10 scale, approximates GreatSchools):
 *   pctBachelor  ≥ 50% → base 9–10
 *   pctBachelor  35–50% → base 7–8
 *   pctBachelor  25–35% → base 5–6
 *   pctBachelor  15–25% → base 3–4
 *   pctBachelor  < 15%  → base 1–2
 *   + graduate degree bonus (up to +1)
 *   – private school flight penalty (high private % → -0.5 to -1)
 *
 * Run: npx tsx src/db/enrich-schools-free.ts
 * Options:
 *   LIMIT=100  — only first N cities
 *   DRY_RUN=1  — no DB writes
 */
import { config } from "dotenv";
import { resolve } from "path";
config({ path: resolve(process.cwd(), ".env.local") });

import Database from "better-sqlite3";

const DRY_RUN = process.env.DRY_RUN === "1";
const LIMIT = parseInt(process.env.LIMIT ?? "9999", 10);
const CENSUS_BASE = "https://api.census.gov/data/2022/acs/acs5";
const DELAY_MS = 50; // Census allows ~500 req/min

const dbUrl = process.env.DATABASE_URL?.replace("file:", "") ?? "./nexthome.db";
const sqlite = new Database(dbUrl);

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }

// ── State FIPS map ────────────────────────────────────────────────────────────

const STATE_FIPS: Record<string, string> = {
	AL:"01",AK:"02",AZ:"04",AR:"05",CA:"06",CO:"08",CT:"09",DC:"11",
	DE:"10",FL:"12",GA:"13",HI:"15",ID:"16",IL:"17",IN:"18",IA:"19",
	KS:"20",KY:"21",LA:"22",ME:"23",MD:"24",MA:"25",MI:"26",MN:"27",
	MS:"28",MO:"29",MT:"30",NE:"31",NV:"32",NH:"33",NJ:"34",NM:"35",
	NY:"36",NC:"37",ND:"38",OH:"39",OK:"40",OR:"41",PA:"42",RI:"44",
	SC:"45",SD:"46",TN:"47",TX:"48",UT:"49",VT:"50",VA:"51",WA:"53",
	WV:"54",WI:"55",WY:"56",
};

// ── Score computation ─────────────────────────────────────────────────────────

function computeSchoolScore(
	pctBachelor: number,
	pctGraduate: number,
	privateRatio: number,
): number {
	// Base score from % bachelor's degree (0–8)
	let score: number;
	if (pctBachelor >= 50) score = 8.5;
	else if (pctBachelor >= 40) score = 7.5;
	else if (pctBachelor >= 30) score = 6.5;
	else if (pctBachelor >= 22) score = 5.5;
	else if (pctBachelor >= 16) score = 4.5;
	else if (pctBachelor >= 12) score = 3.5;
	else if (pctBachelor >= 8) score = 2.5;
	else score = 1.5;

	// Graduate degree bonus (+0 to +1)
	if (pctGraduate >= 20) score += 1.0;
	else if (pctGraduate >= 12) score += 0.6;
	else if (pctGraduate >= 7) score += 0.3;

	// Private school flight penalty (high private % = concern about public schools)
	// Note: very wealthy areas also have high private %, so cap penalty
	if (privateRatio >= 40) score -= 1.0;
	else if (privateRatio >= 30) score -= 0.5;
	else if (privateRatio >= 20) score -= 0.2;

	return Math.min(10, Math.max(1, Math.round(score * 10) / 10));
}

// ── Fetch Census data for a state ────────────────────────────────────────────

interface PlaceData {
	name: string;          // "Raleigh city, North Carolina"
	bachelor: number;      // B15003_022E
	graduate: number;      // B15003_023E + B15003_024E
	total25Plus: number;   // B15003_001E
	publicEnroll: number;  // B14001_002E
	privateEnroll: number; // B14001_008E
	placeFips: string;
}

async function fetchStatePlaces(stateFips: string): Promise<PlaceData[]> {
	const url = `${CENSUS_BASE}?get=NAME,B15003_022E,B15003_001E,B15003_023E,B15003_024E,B14001_002E,B14001_008E&for=place:*&in=state:${stateFips}`;
	try {
		const res = await fetch(url, { signal: AbortSignal.timeout(20000) });
		if (!res.ok) return [];
		const rows = await res.json() as string[][];

		return rows.slice(1).map(row => ({
			name: row[0],
			bachelor: parseInt(row[1]) || 0,
			total25Plus: parseInt(row[2]) || 1,
			graduate: (parseInt(row[3]) || 0) + (parseInt(row[4]) || 0),
			publicEnroll: parseInt(row[5]) || 0,
			privateEnroll: parseInt(row[6]) || 0,
			placeFips: row[8],
		}));
	} catch {
		return [];
	}
}

// ── Match Census place name → city in our DB ──────────────────────────────────

function normalizeName(name: string): string {
	// "Raleigh city, North Carolina" → "raleigh"
	return name.split(",")[0].replace(/\b(city|town|village|borough|municipality|township|cdp)\b/gi, "").trim().toLowerCase();
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
	const cities = sqlite
		.prepare("SELECT id, name, state_id FROM cities ORDER BY overall_score DESC LIMIT ?")
		.all(LIMIT) as Array<{ id: string; name: string; state_id: string }>;

	console.log(`🎓 Enriching school quality for ${cities.length} cities via Census ACS...`);
	if (DRY_RUN) console.log("   DRY RUN — no writes");

	// Group cities by state
	const byState = new Map<string, Array<{ id: string; name: string }>>();
	for (const city of cities) {
		if (!byState.has(city.state_id)) byState.set(city.state_id, []);
		byState.get(city.state_id)!.push({ id: city.id, name: city.name });
	}

	let totalUpdated = 0; let totalSkipped = 0;

	const updateStmt = sqlite.prepare(
		"UPDATE city_schools SET great_schools_rating = ?, data_as_of = 'census-acs-2022' WHERE city_id = ?"
	);
	const insertStmt = sqlite.prepare(
		"INSERT OR IGNORE INTO city_schools (id, city_id, great_schools_rating, data_as_of) VALUES (lower(hex(randomblob(16))), ?, ?, 'census-acs-2022')"
	);
	const existsStmt = sqlite.prepare("SELECT id FROM city_schools WHERE city_id = ?");

	let stateNum = 0;
	for (const [stateId, stateCities] of byState) {
		const fips = STATE_FIPS[stateId];
		if (!fips) { totalSkipped += stateCities.length; continue; }

		stateNum++;
		process.stdout.write(`\r  [${stateNum}/${byState.size}] ${stateId} — fetching Census data...`);

		const places = await fetchStatePlaces(fips);
		if (places.length === 0) { totalSkipped += stateCities.length; continue; }

		// Build name → place map for fast lookup
		const placeMap = new Map<string, PlaceData>();
		for (const place of places) {
			placeMap.set(normalizeName(place.name), place);
		}

		for (const city of stateCities) {
			const normalized = city.name.toLowerCase();
			const place = placeMap.get(normalized);

			if (!place) { totalSkipped++; continue; }

			const pctBachelor = (place.bachelor / place.total25Plus) * 100;
			const pctGraduate = (place.graduate / place.total25Plus) * 100;
			const totalEnroll = place.publicEnroll + place.privateEnroll;
			const privateRatio = totalEnroll > 0 ? (place.privateEnroll / totalEnroll) * 100 : 0;

			const score = computeSchoolScore(pctBachelor, pctGraduate, privateRatio);

			if (!DRY_RUN) {
				const existing = existsStmt.get(city.id);
				if (existing) {
					updateStmt.run(score, city.id);
				} else {
					insertStmt.run(city.id, score);
				}
			}
			totalUpdated++;
		}

		await sleep(DELAY_MS);
	}

	const withRating = (sqlite.prepare(
		"SELECT COUNT(*) as c FROM city_schools WHERE great_schools_rating > 0"
	).get() as { c: number }).c;

	console.log(`\n\n✅ Done!`);
	console.log(`   Updated: ${totalUpdated}`);
	console.log(`   Skipped (no Census match): ${totalSkipped}`);
	console.log(`   Cities with school rating: ${withRating}/2708`);
	if (DRY_RUN) console.log("   (DRY RUN — no changes written)");

	sqlite.close();
}

main().catch(e => { console.error(e); process.exit(1); });
