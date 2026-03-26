/**
 * Enriches city_safety table with real FBI UCR crime data.
 * No API key required — FBI CDE API is open.
 *
 * Run: npx tsx src/db/enrich-crime.ts
 * Options:
 *   LIMIT=100     — first N cities
 *   DELAY_MS=1000 — ms between calls (FBI API is fairly permissive)
 *   DRY_RUN=1     — no DB writes
 */
import { config } from "dotenv";
import { resolve } from "path";
config({ path: resolve(process.cwd(), ".env.local") });

import Database from "better-sqlite3";
import { getFbiCrimeData } from "../lib/fbi-crime";

const DELAY_MS = parseInt(process.env.DELAY_MS ?? "1000", 10);
const DRY_RUN = process.env.DRY_RUN === "1";
const LIMIT = parseInt(process.env.LIMIT ?? "9999", 10);

const dbUrl = process.env.DATABASE_URL?.replace("file:", "") ?? "./nexthome.db";
const sqlite = new Database(dbUrl);

function sleep(ms: number) { return new Promise((r) => setTimeout(r, ms)); }

async function main() {
	const cities = sqlite
		.prepare(`SELECT id, name, state_id, population FROM cities ORDER BY overall_score DESC LIMIT ?`)
		.all(LIMIT) as Array<{ id: string; name: string; state_id: string; population: number | null }>;

	console.log(`🚔 Enriching FBI crime data for ${cities.length} cities...`);

	let ok = 0; let fail = 0;

	for (let i = 0; i < cities.length; i++) {
		const city = cities[i];
		const result = await getFbiCrimeData(city.name, city.state_id, city.population ?? 50000);

		if (!result) {
			fail++;
			console.log(`[${i + 1}/${cities.length}] ${city.name} ❌`);
			await sleep(DELAY_MS);
			continue;
		}

		if (!DRY_RUN) {
			const existing = sqlite.prepare("SELECT id FROM city_safety WHERE city_id = ?").get(city.id);
			if (existing) {
				const sets: string[] = []; const vals: unknown[] = [];
				if (result.violentCrimeRate != null) { sets.push("violent_crime_rate = ?"); vals.push(result.violentCrimeRate); }
				if (result.propertyCrimeRate != null) { sets.push("property_crime_rate = ?"); vals.push(result.propertyCrimeRate); }
				if (sets.length) { vals.push(city.id); sqlite.prepare(`UPDATE city_safety SET ${sets.join(", ")} WHERE city_id = ?`).run(...vals); }
			} else {
				sqlite.prepare(`INSERT INTO city_safety (id, city_id, violent_crime_rate, property_crime_rate) VALUES (lower(hex(randomblob(16))), ?, ?, ?)`)
					.run(city.id, result.violentCrimeRate, result.propertyCrimeRate);
			}
		}

		ok++;
		console.log(`[${i + 1}/${cities.length}] ${city.name}, ${city.state_id}  Violent:${result.violentCrimeRate}/100k  Property:${result.propertyCrimeRate}/100k  ✅`);
		await sleep(DELAY_MS);
	}

	console.log(`\n✅ Done: ${ok} enriched, ${fail} failed`);
	sqlite.close();
}

main().catch((e) => { console.error(e); process.exit(1); });
