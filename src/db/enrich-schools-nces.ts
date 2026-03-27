/**
 * Enrich city_schools with public/private/charter school counts from Census ACS.
 * Uses B14001 (school enrollment by type) and B15003 (grad rate proxy).
 * Free, no API key.
 *
 * Fills in:
 *   - public_school_count (estimated from enrollment / avg class size)
 *   - private_school_count
 *   - graduation_rate (from Census B06009 educational attainment for residents 25+)
 *   - pct_college_educated (updates demographics table too)
 *
 * Run: npx tsx src/db/enrich-schools-nces.ts
 */
import { config } from "dotenv";
import { resolve } from "path";
config({ path: resolve(process.cwd(), ".env.local") });

import Database from "better-sqlite3";

const DRY_RUN = process.env.DRY_RUN === "1";
const CENSUS_BASE = "https://api.census.gov/data/2022/acs/acs5";
const DELAY_MS = 50;

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

// B14001 variables:
//   _001E = Total enrolled
//   _002E = Nursery through 12 (public)
//   _003E = Nursery/preschool (public)
//   _004E = K-8 (public)
//   _005E = 9-12 (public)
//   _006E = College (public)
//   _007E = Graduate (public)
//   _008E = Nursery through 12 (private)
// B15003:
//   _001E = Total 25+
//   _017E = High school diploma
//   _018E = GED
//   _022E = Bachelor's
//   _023E = Master's
//   _024E = Professional
//   _025E = Doctorate

async function fetchStatePlaces(stateFips: string): Promise<Map<string, {
	publicEnroll: number; privateEnroll: number;
	hsGrad: number; bachelors: number; total25: number; placeFips: string;
}>> {
	// Fetch both enrollment and attainment in one call
	const vars = [
		"B14001_002E",  // public school k-12
		"B14001_008E",  // private school k-12
		"B15003_001E",  // total 25+
		"B15003_017E",  // HS diploma
		"B15003_018E",  // GED
		"B15003_022E",  // Bachelor's
		"B15003_023E",  // Master's
		"B15003_024E",  // Professional
		"B15003_025E",  // Doctorate
	].join(",");

	const url = `${CENSUS_BASE}?get=NAME,${vars}&for=place:*&in=state:${stateFips}`;
	try {
		const res = await fetch(url, { signal: AbortSignal.timeout(20000) });
		if (!res.ok) return new Map();
		const rows = await res.json() as string[][];

		type PlaceEntry = { publicEnroll: number; privateEnroll: number; hsGrad: number; bachelors: number; total25: number; placeFips: string };
		const result = new Map<string, PlaceEntry>();
		for (const row of rows.slice(1)) {
			const name = row[0].split(",")[0]
				.replace(/\b(city|town|village|borough|municipality|township|cdp)\b/gi, "")
				.trim().toLowerCase();
			const publicK12 = parseInt(row[1]) || 0;
			const privateK12 = parseInt(row[2]) || 0;
			const total25 = parseInt(row[3]) || 1;
			const hsGrad = (parseInt(row[4]) || 0) + (parseInt(row[5]) || 0);
			const bachelors = (parseInt(row[6]) || 0) + (parseInt(row[7]) || 0) + (parseInt(row[8]) || 0) + (parseInt(row[9]) || 0);
			result.set(name, { publicEnroll: publicK12, privateEnroll: privateK12, hsGrad, bachelors, total25, placeFips: row[11] });
		}
		return result;
	} catch {
		return new Map();
	}
}

async function main() {
	const cities = sqlite
		.prepare("SELECT id, name, state_id, population FROM cities ORDER BY overall_score DESC")
		.all() as Array<{ id: string; name: string; state_id: string; population: number | null }>;

	console.log(`📚 Enriching school counts + grad rates for ${cities.length} cities...`);

	const byState = new Map<string, typeof cities>();
	for (const city of cities) {
		if (!byState.has(city.state_id)) byState.set(city.state_id, []);
		byState.get(city.state_id)!.push(city);
	}

	const updateSchoolsStmt = sqlite.prepare(`
		UPDATE city_schools
		SET public_school_count = ?, private_school_count = ?, graduation_rate = ?
		WHERE city_id = ?
	`);
	const insertSchoolsStmt = sqlite.prepare(`
		INSERT OR IGNORE INTO city_schools (id, city_id, public_school_count, private_school_count, graduation_rate)
		VALUES (lower(hex(randomblob(16))), ?, ?, ?, ?)
	`);
	const existsStmt = sqlite.prepare("SELECT id FROM city_schools WHERE city_id = ?");
	const updateDemosStmt = sqlite.prepare(`
		UPDATE city_demographics SET pct_college_educated = ? WHERE city_id = ?
	`);

	let updated = 0; let skipped = 0;
	let stateNum = 0;

	for (const [stateId, stateCities] of byState) {
		const fips = STATE_FIPS[stateId];
		if (!fips) { skipped += stateCities.length; continue; }

		stateNum++;
		process.stdout.write(`\r  [${stateNum}/${byState.size}] ${stateId}...`);

		const places = await fetchStatePlaces(fips);
		if (places.size === 0) { skipped += stateCities.length; continue; }

		for (const city of stateCities) {
			const place = places.get(city.name.toLowerCase());
			if (!place) { skipped++; continue; }

			const { publicEnroll, privateEnroll, hsGrad, bachelors, total25 } = place;

			// Estimate school counts from enrollment (avg school size ~400 students K-12)
			const avgSchoolSize = city.population && city.population > 100000 ? 600 : 380;
			const publicCount = Math.max(1, Math.round(publicEnroll / avgSchoolSize));
			const privateCount = Math.max(0, Math.round(privateEnroll / 200)); // private schools smaller

			// Graduation rate proxy: % with HS diploma or higher / all adults
			// Using HS + GED + bachelor's+ as "graduated HS"
			const hsGradRate = Math.min(99, Math.round(((hsGrad + bachelors) / total25) * 100));

			// College educated %
			const pctCollege = Math.round((bachelors / total25) * 100);

			if (!DRY_RUN) {
				const existing = existsStmt.get(city.id);
				if (existing) {
					updateSchoolsStmt.run(publicCount, privateCount, hsGradRate, city.id);
				} else {
					insertSchoolsStmt.run(city.id, publicCount, privateCount, hsGradRate);
				}
				// Update demographics too
				if (pctCollege > 0) {
					updateDemosStmt.run(pctCollege, city.id);
				}
			}
			updated++;
		}

		await sleep(DELAY_MS);
	}

	const withSchools = (sqlite.prepare("SELECT COUNT(*) as c FROM city_schools WHERE public_school_count > 0").get() as { c: number }).c;
	console.log(`\n\n✅ Done! Updated: ${updated}, Skipped: ${skipped}`);
	console.log(`   Cities with school counts: ${withSchools}`);
	if (DRY_RUN) console.log("   (DRY RUN)");

	sqlite.close();
}

main().catch(e => { console.error(e); process.exit(1); });
