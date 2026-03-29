/**
 * Enriches city_climate with AQI data from EPA AirNow API.
 * Requires AIRNOW_API_KEY in .env.local.
 *
 * Run: npx tsx src/db/enrich-airnow.ts
 * Options:
 *   LIMIT=100     — only enrich first N cities (default: all)
 *   DELAY_MS=1500 — ms between calls (default: 1500 — within 500/hr free tier)
 *   DRY_RUN=1     — fetch but do not write to DB
 */
import { config } from "dotenv";
import { resolve } from "path";
config({ path: resolve(process.cwd(), ".env.local") });

import Database from "better-sqlite3";

const DELAY_MS = parseInt(process.env.DELAY_MS ?? "1500", 10);
const DRY_RUN = process.env.DRY_RUN === "1";
const LIMIT = parseInt(process.env.LIMIT ?? "9999", 10);

const dbUrl = process.env.DATABASE_URL?.replace("file:", "") ?? "./nexthome.db";
const sqlite = new Database(dbUrl);
const API_KEY = process.env.AIRNOW_API_KEY!;

function sleep(ms: number) { return new Promise((r) => setTimeout(r, ms)); }

interface AirNowObservation {
	ParameterName: string;
	AQI: number;
	Category: { Number: number; Name: string };
}

async function fetchAQI(lat: number, lng: number): Promise<{ aqi: number; grade: string } | null> {
	const url = `https://www.airnowapi.org/aq/observation/latLong/current/?format=application/json&latitude=${lat}&longitude=${lng}&distance=25&API_KEY=${API_KEY}`;
	const controller = new AbortController();
	const timer = setTimeout(() => controller.abort(), 10000);
	try {
		const res = await fetch(url, { signal: controller.signal });
		clearTimeout(timer);
		if (!res.ok) return null;
		const data: AirNowObservation[] = await res.json();
		if (!Array.isArray(data) || data.length === 0) return null;
		// Take the worst (max) AQI value across all pollutants
		const worst = data.reduce((max, obs) => obs.AQI > max.AQI ? obs : max, data[0]);
		return { aqi: worst.AQI, grade: worst.Category.Name };
	} catch {
		clearTimeout(timer);
		return null;
	}
}

async function main() {
	if (!API_KEY) {
		console.error("❌  AIRNOW_API_KEY not set — add it to .env.local");
		process.exit(1);
	}

	const cities = sqlite
		.prepare(`
			SELECT c.id, c.name, c.state_id, c.lat, c.lng
			FROM cities c
			WHERE c.lat IS NOT NULL AND c.lng IS NOT NULL
			ORDER BY c.overall_score DESC
			LIMIT ?
		`)
		.all(LIMIT) as Array<{ id: string; name: string; state_id: string; lat: number; lng: number }>;

	console.log(`🌬️  Enriching AirNow AQI for ${cities.length} cities...`);
	if (DRY_RUN) console.log("DRY RUN — no DB writes");

	let ok = 0; let noData = 0;

	for (let i = 0; i < cities.length; i++) {
		const city = cities[i];
		const result = await fetchAQI(city.lat, city.lng);

		if (!result) {
			noData++;
			if (i < 10 || i % 200 === 0) {
				console.log(`[${i + 1}/${cities.length}] ${city.name}, ${city.state_id}  — no data`);
			}
			await sleep(DELAY_MS);
			continue;
		}

		if (!DRY_RUN) {
			const existing = sqlite.prepare("SELECT id FROM city_climate WHERE city_id = ?").get(city.id);
			if (existing) {
				sqlite.prepare(`
					UPDATE city_climate
					SET air_quality_index = ?, air_quality_grade = ?, data_as_of = date('now')
					WHERE city_id = ?
				`).run(result.aqi, result.grade, city.id);
			} else {
				sqlite.prepare(`
					INSERT INTO city_climate (id, city_id, air_quality_index, air_quality_grade, data_as_of)
					VALUES (lower(hex(randomblob(16))), ?, ?, ?, date('now'))
				`).run(city.id, result.aqi, result.grade);
			}
		}

		ok++;
		if (i < 20 || i % 100 === 0) {
			console.log(`[${i + 1}/${cities.length}] ${city.name}, ${city.state_id}  AQI:${result.aqi} (${result.grade}) ✅`);
		}
		await sleep(DELAY_MS);
	}

	console.log(`\n✅ Done! Updated: ${ok}, No data: ${noData}`);
	sqlite.close();
}

main().catch((e) => { console.error(e); process.exit(1); });
