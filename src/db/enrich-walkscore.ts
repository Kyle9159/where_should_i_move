/**
 * Enriches city_walkability table with real Walk Score data.
 * Requires WALKSCORE_API_KEY in .env.local.
 *
 * Run: npx tsx src/db/enrich-walkscore.ts
 * Options:
 *   LIMIT=100     — only enrich first N cities (default: all)
 *   DELAY_MS=300  — ms between calls (default: 300 — well within 5k/day free tier)
 *   DRY_RUN=1     — fetch but do not write to DB
 */
import { config } from "dotenv";
import { resolve } from "path";
config({ path: resolve(process.cwd(), ".env.local") });

import Database from "better-sqlite3";
import { getWalkScore } from "../lib/walkscore";

const DELAY_MS = parseInt(process.env.DELAY_MS ?? "300", 10);
const DRY_RUN = process.env.DRY_RUN === "1";
const LIMIT = parseInt(process.env.LIMIT ?? "9999", 10);

const dbUrl = process.env.DATABASE_URL?.replace("file:", "") ?? "./nexthome.db";
const sqlite = new Database(dbUrl);

function sleep(ms: number) { return new Promise((r) => setTimeout(r, ms)); }

async function main() {
	if (!process.env.WALKSCORE_API_KEY) {
		console.error("❌  WALKSCORE_API_KEY not set — add it to .env.local");
		process.exit(1);
	}

	const cities = sqlite
		.prepare(`
			SELECT c.id, c.name, c.state_id, c.lat, c.lng, c.county
			FROM cities c
			WHERE c.lat IS NOT NULL AND c.lng IS NOT NULL
			ORDER BY c.overall_score DESC
			LIMIT ?
		`)
		.all(LIMIT) as Array<{ id: string; name: string; state_id: string; lat: number; lng: number; county: string | null }>;

	console.log(`🚶 Enriching Walk Score for ${cities.length} cities...`);
	if (DRY_RUN) console.log("DRY RUN — no DB writes");

	let ok = 0; let fail = 0;

	for (let i = 0; i < cities.length; i++) {
		const city = cities[i];
		const address = `${city.name}, ${city.state_id}`;
		const result = await getWalkScore(city.lat, city.lng, address);

		if (!result) {
			fail++;
			console.log(`[${i + 1}/${cities.length}] ${city.name} ❌`);
			await sleep(DELAY_MS);
			continue;
		}

		if (!DRY_RUN) {
			const existing = sqlite.prepare("SELECT id FROM city_walkability WHERE city_id = ?").get(city.id);
			if (existing) {
				sqlite.prepare(`
					UPDATE city_walkability
					SET walk_score = ?, transit_score = ?, bike_score = ?
					WHERE city_id = ?
				`).run(result.walkScore, result.transitScore, result.bikeScore, city.id);
			} else {
				sqlite.prepare(`
					INSERT INTO city_walkability (id, city_id, walk_score, transit_score, bike_score)
					VALUES (lower(hex(randomblob(16))), ?, ?, ?, ?)
				`).run(city.id, result.walkScore, result.transitScore, result.bikeScore);
			}
		}

		ok++;
		console.log(`[${i + 1}/${cities.length}] ${city.name}, ${city.state_id}  Walk:${result.walkScore}  Transit:${result.transitScore ?? "—"}  Bike:${result.bikeScore ?? "—"}  ✅`);
		await sleep(DELAY_MS);
	}

	console.log(`\n✅ Done: ${ok} enriched, ${fail} failed`);
	sqlite.close();
}

main().catch((e) => { console.error(e); process.exit(1); });
