/**
 * Enriches city_walkability with walk_score and transit_score proxies
 * computed from OpenStreetMap data via the free Overpass API.
 * No API key required — replaces the Walk Score paid API.
 *
 * Method:
 *   Pass 1 — fetch raw POI + transit node counts for every city (Overpass API)
 *   Pass 2 — normalize counts to 0–100 using p5/p95 percentile clamping
 *   Pass 3 — write scores to city_walkability
 *
 * Walk score proxy  : walkable amenity nodes within 1 mile of city center
 * Transit score proxy: bus/tram/subway nodes within 1 km of city center
 *
 * Run: npx tsx src/db/enrich-walkability-osm.ts
 * Options:
 *   LIMIT=100     — only enrich first N cities (default: all)
 *   DELAY_MS=2000 — ms between cities (default: 2000)
 *   DRY_RUN=1     — fetch but do not write to DB
 */
import { config } from "dotenv";
import { resolve } from "path";
config({ path: resolve(process.cwd(), ".env.local") });

import Database from "better-sqlite3";

const DELAY_MS = parseInt(process.env.DELAY_MS ?? "2000", 10);
const DRY_RUN = process.env.DRY_RUN === "1";
const LIMIT = parseInt(process.env.LIMIT ?? "9999", 10);
const OVERPASS_URL = "https://overpass-api.de/api/interpreter";

const dbUrl = process.env.DATABASE_URL?.replace("file:", "") ?? "./nexthome.db";
const sqlite = new Database(dbUrl);

function sleep(ms: number) { return new Promise((r) => setTimeout(r, ms)); }

async function overpassCount(query: string, retries = 2): Promise<number> {
	for (let attempt = 0; attempt <= retries; attempt++) {
		const controller = new AbortController();
		const timer = setTimeout(() => controller.abort(), 65000); // 65s — covers dense cities
		try {
			const res = await fetch(OVERPASS_URL, {
				method: "POST",
				headers: { "Content-Type": "application/x-www-form-urlencoded" },
				body: `data=${encodeURIComponent(query)}`,
				signal: controller.signal,
			});
			clearTimeout(timer);
			if (!res.ok) { await sleep(3000); continue; }
			const data = await res.json();
			const countEl = data?.elements?.[0];
			const n = parseInt(countEl?.tags?.total ?? "0", 10);
			if (n === 0 && attempt < retries) { await sleep(3000); continue; } // retry on suspicious 0
			return n;
		} catch {
			clearTimeout(timer);
			if (attempt < retries) await sleep(3000);
		}
	}
	return 0;
}

function computePercentile(values: number[], pct: number): number {
	const sorted = [...values].sort((a, b) => a - b);
	const idx = Math.floor((pct / 100) * sorted.length);
	return sorted[Math.min(idx, sorted.length - 1)];
}

function percentileNorm(value: number, p5: number, p95: number): number {
	if (p95 <= p5) return 50;
	return Math.min(100, Math.max(0, Math.round(((value - p5) / (p95 - p5)) * 100)));
}

async function main() {
	const cities = sqlite
		.prepare(`
			SELECT c.id, c.name, c.state_id, c.lat, c.lng
			FROM cities c
			WHERE c.lat IS NOT NULL AND c.lng IS NOT NULL
			ORDER BY c.overall_score DESC
			LIMIT ?
		`)
		.all(LIMIT) as Array<{ id: string; name: string; state_id: string; lat: number; lng: number }>;

	console.log(`🗺️  OSM walkability enrichment for ${cities.length} cities...`);
	if (DRY_RUN) console.log("DRY RUN — no DB writes");

	// PASS 1: Collect raw counts from Overpass API
	console.log("\n📡 Pass 1: Fetching OSM data...");
	const results: Array<{ city: typeof cities[0]; walkCount: number; transitCount: number }> = [];

	for (let i = 0; i < cities.length; i++) {
		const city = cities[i];
		const { lat, lng } = city;

		const walkQuery = `[out:json][timeout:60];node(around:1609,${lat},${lng})[amenity~"^(restaurant|cafe|bar|fast_food|pharmacy|supermarket|convenience|school|bank|post_office|library|gym|cinema|theatre|marketplace)$"];out count;`;
		const transitQuery = `[out:json][timeout:60];(node(around:1200,${lat},${lng})[highway=bus_stop];node(around:1200,${lat},${lng})[public_transport=stop_position];node(around:1200,${lat},${lng})[railway~"^(station|tram_stop|subway_entrance|halt)$"];node(around:1200,${lat},${lng})[amenity=bus_station];);out count;`;

		const walkCount = await overpassCount(walkQuery);
		await sleep(500); // brief gap between the two sub-queries
		const transitCount = await overpassCount(transitQuery);

		results.push({ city, walkCount, transitCount });

		if (i % 50 === 0 || i < 5) {
			console.log(`  [${i + 1}/${cities.length}] ${city.name}, ${city.state_id}  POIs:${walkCount}  Transit:${transitCount}`);
		}

		await sleep(DELAY_MS);
	}

	// PASS 2: Normalize to 0–100 using p5/p95 clamping
	console.log("\n📊 Pass 2: Normalizing scores...");
	const walkCounts = results.map(r => r.walkCount);
	const transitCounts = results.map(r => r.transitCount);

	const walkP5 = computePercentile(walkCounts, 5);
	const walkP95 = computePercentile(walkCounts, 95);
	const transitP5 = computePercentile(transitCounts, 5);
	const transitP95 = computePercentile(transitCounts, 95);

	console.log(`  Walk POIs — p5:${walkP5}, p95:${walkP95}`);
	console.log(`  Transit   — p5:${transitP5}, p95:${transitP95}`);

	// PASS 3: Write to DB
	console.log("\n💾 Pass 3: Writing to DB...");
	let ok = 0;
	for (const { city, walkCount, transitCount } of results) {
		const walkScore = percentileNorm(walkCount, walkP5, walkP95);
		const transitScore = percentileNorm(transitCount, transitP5, transitP95);

		if (!DRY_RUN) {
			const existing = sqlite.prepare("SELECT id FROM city_walkability WHERE city_id = ?").get(city.id);
			if (existing) {
				sqlite.prepare(`
					UPDATE city_walkability
					SET walk_score = ?, transit_score = ?, data_as_of = date('now')
					WHERE city_id = ?
				`).run(walkScore, transitScore, city.id);
			} else {
				sqlite.prepare(`
					INSERT INTO city_walkability (id, city_id, walk_score, transit_score, data_as_of)
					VALUES (lower(hex(randomblob(16))), ?, ?, ?, date('now'))
				`).run(city.id, walkScore, transitScore);
			}
		}
		ok++;
	}

	console.log(`\n✅ Done! ${ok} cities enriched${DRY_RUN ? " (DRY RUN — no writes)" : ""}`);

	if (DRY_RUN && results.length > 0) {
		console.log("\nSample scores:");
		for (const { city, walkCount, transitCount } of results.slice(0, 10)) {
			const ws = percentileNorm(walkCount, walkP5, walkP95);
			const ts = percentileNorm(transitCount, transitP5, transitP95);
			console.log(`  ${city.name}, ${city.state_id}: Walk:${ws}  Transit:${ts}  (raw POIs:${walkCount} transit:${transitCount})`);
		}
	}

	sqlite.close();
}

main().catch((e) => { console.error(e); process.exit(1); });
