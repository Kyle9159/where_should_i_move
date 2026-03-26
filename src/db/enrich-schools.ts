/**
 * Enriches city_schools table with real GreatSchools ratings.
 * Requires GREATSCHOOLS_API_KEY in .env.local.
 *
 * Run: npx tsx src/db/enrich-schools.ts
 * Options:
 *   LIMIT=100     — first N cities
 *   DELAY_MS=500  — ms between calls (2,500 calls/day free = 1 every 35s to be safe)
 *   DRY_RUN=1     — no DB writes
 */
import { config } from "dotenv";
import { resolve } from "path";
config({ path: resolve(process.cwd(), ".env.local") });

import Database from "better-sqlite3";
import { getGreatSchoolsRatings } from "../lib/greatschools";

const DELAY_MS = parseInt(process.env.DELAY_MS ?? "36000", 10); // ~2,400/day safe
const DRY_RUN = process.env.DRY_RUN === "1";
const LIMIT = parseInt(process.env.LIMIT ?? "9999", 10);

const dbUrl = process.env.DATABASE_URL?.replace("file:", "") ?? "./nexthome.db";
const sqlite = new Database(dbUrl);

function sleep(ms: number) { return new Promise((r) => setTimeout(r, ms)); }

async function main() {
	if (!process.env.GREATSCHOOLS_API_KEY) {
		console.error("❌  GREATSCHOOLS_API_KEY not set");
		process.exit(1);
	}

	const cities = sqlite
		.prepare(`
			SELECT id, name, state_id
			FROM cities
			ORDER BY overall_score DESC
			LIMIT ?
		`)
		.all(LIMIT) as Array<{ id: string; name: string; state_id: string }>;

	console.log(`🎓 Enriching GreatSchools data for ${cities.length} cities...`);
	console.log(`⏱  Delay: ${DELAY_MS / 1000}s/city → ETA: ~${((cities.length * DELAY_MS) / 1000 / 3600).toFixed(1)}h`);

	let ok = 0; let fail = 0;

	for (let i = 0; i < cities.length; i++) {
		const city = cities[i];
		const result = await getGreatSchoolsRatings(city.name, city.state_id);

		if (!result) {
			fail++;
			console.log(`[${i + 1}/${cities.length}] ${city.name} ❌`);
			await sleep(DELAY_MS);
			continue;
		}

		if (!DRY_RUN) {
			const existing = sqlite.prepare("SELECT id FROM city_schools WHERE city_id = ?").get(city.id);
			if (existing) {
				sqlite.prepare(`
					UPDATE city_schools
					SET great_schools_rating = ?,
					    total_schools = ?
					WHERE city_id = ?
				`).run(result.avgRating, result.totalSchools, city.id);
			} else {
				sqlite.prepare(`
					INSERT INTO city_schools (id, city_id, great_schools_rating, total_schools)
					VALUES (lower(hex(randomblob(16))), ?, ?, ?)
				`).run(city.id, result.avgRating, result.totalSchools);
			}
		}

		ok++;
		console.log(`[${i + 1}/${cities.length}] ${city.name}, ${city.state_id}  Rating:${result.avgRating}/10  Schools:${result.totalSchools}  Top-rated:${result.topRatedCount}  ✅`);
		await sleep(DELAY_MS);
	}

	console.log(`\n✅ Done: ${ok} enriched, ${fail} failed`);
	sqlite.close();
}

main().catch((e) => { console.error(e); process.exit(1); });
