/**
 * Enriches city_housing table using Census ACS (free, no key needed).
 * Fetches median home value (B25077_001E) and median gross rent (B25064_001E)
 * for each city using its Census FIPS codes.
 *
 * Run: npx tsx src/db/enrich-housing.ts
 * Options:
 *   LIMIT=100    — only first N cities
 *   DELAY_MS=500 — ms between Census API calls
 *   DRY_RUN=1    — fetch but do not write
 *
 * Note: Cities must have fips_state + fips_place codes in the DB.
 * The seed script populates approximate values; this script refreshes with
 * authoritative Census data where available.
 */
import { config } from "dotenv";
import { resolve } from "path";
config({ path: resolve(process.cwd(), ".env.local") });

import Database from "better-sqlite3";

const DELAY_MS = parseInt(process.env.DELAY_MS ?? "500", 10);
const DRY_RUN = process.env.DRY_RUN === "1";
const LIMIT = parseInt(process.env.LIMIT ?? "9999", 10);

const dbUrl = process.env.DATABASE_URL?.replace("file:", "") ?? "./nexthome.db";
const sqlite = new Database(dbUrl);

function sleep(ms: number) { return new Promise((r) => setTimeout(r, ms)); }

// Fetch B25077_001E (median home value) + B25064_001E (median gross rent)
// for a Census place
async function fetchCensus(stateFips: string, placeFips: string) {
	const url = `https://api.census.gov/data/2022/acs/acs5?get=B25077_001E,B25064_001E&for=place:${placeFips}&in=state:${stateFips}`;
	try {
		const res = await fetch(url, { signal: AbortSignal.timeout(12000) });
		if (!res.ok) return null;
		const rows = (await res.json()) as string[][];
		if (rows.length < 2) return null;
		const homeVal = parseInt(rows[1][0], 10);
		const rent = parseInt(rows[1][1], 10);
		return {
			medianHomePrice: isNaN(homeVal) || homeVal < 0 ? null : homeVal,
			medianRent: isNaN(rent) || rent < 0 ? null : rent,
		};
	} catch {
		return null;
	}
}

async function main() {
	// Get cities that have FIPS codes set
	const cities = sqlite
		.prepare(`
			SELECT c.id, c.name, c.state_id,
			       c.fips_state, c.fips_place
			FROM cities c
			WHERE c.fips_state IS NOT NULL
			  AND c.fips_place IS NOT NULL
			ORDER BY c.overall_score DESC
			LIMIT ?
		`)
		.all(LIMIT) as Array<{ id: string; name: string; state_id: string; fips_state: string; fips_place: string }>;

	if (cities.length === 0) {
		console.log("⚠️  No cities with FIPS codes found. Run the FIPS seed first.");
		sqlite.close();
		return;
	}

	console.log(`🏠 Enriching housing data via Census ACS for ${cities.length} cities...`);
	if (DRY_RUN) console.log("DRY RUN — no writes");

	let ok = 0; let fail = 0;

	for (let i = 0; i < cities.length; i++) {
		const city = cities[i];
		const result = await fetchCensus(city.fips_state, city.fips_place);

		if (!result) {
			fail++;
			console.log(`[${i + 1}/${cities.length}] ${city.name} ❌`);
			await sleep(DELAY_MS);
			continue;
		}

		if (!DRY_RUN) {
			const existing = sqlite.prepare("SELECT id FROM city_housing WHERE city_id = ?").get(city.id);
			if (existing) {
				const sets: string[] = [];
				const vals: unknown[] = [];
				if (result.medianHomePrice) { sets.push("median_home_price = ?"); vals.push(result.medianHomePrice); }
				if (result.medianRent) { sets.push("median_rent_2_bed = ?"); vals.push(result.medianRent); }
				if (sets.length) {
					vals.push(city.id);
					sqlite.prepare(`UPDATE city_housing SET ${sets.join(", ")} WHERE city_id = ?`).run(...vals);
				}
			} else {
				sqlite.prepare(`
					INSERT INTO city_housing (id, city_id, median_home_price, median_rent_2_bed)
					VALUES (lower(hex(randomblob(16))), ?, ?, ?)
				`).run(city.id, result.medianHomePrice, result.medianRent);
			}
		}

		ok++;
		console.log(`[${i + 1}/${cities.length}] ${city.name}, ${city.state_id}  Home:$${result.medianHomePrice?.toLocaleString() ?? "—"}  Rent:$${result.medianRent ?? "—"}/mo  ✅`);
		await sleep(DELAY_MS);
	}

	console.log(`\n✅ Done: ${ok} enriched, ${fail} failed`);
	sqlite.close();
}

main().catch((e) => { console.error(e); process.exit(1); });
