/**
 * Enriches city_lifestyle with nature + culture data via OSM Overpass & computed proximity.
 *
 * Pass A — National park proximity (computed from lat/lng, instant, no API):
 *   near_national_park, distance_to_national_park
 *
 * Pass B — OSM Overpass (single combined query per city):
 *   art_museum_count, theater_count  (arts & culture)
 *   trails_miles_nearby              (hiking route density)
 *   parks_acres_per_capita           (green space proxy)
 *
 * Run: npx tsx src/db/enrich-lifestyle-osm2.ts
 * Options:
 *   LIMIT=100     — only first N cities
 *   DRY_RUN=1     — no DB writes
 *   SKIP_OSM=1    — skip Pass B (only run national park proximity)
 *   DELAY_MS=2500 — ms between cities (default: 2500)
 *   RESUME=N      — skip first N cities (resume from offset)
 */
import { config } from "dotenv";
import { resolve } from "path";
config({ path: resolve(process.cwd(), ".env.local") });

import Database from "better-sqlite3";

const DRY_RUN = process.env.DRY_RUN === "1";
const LIMIT    = parseInt(process.env.LIMIT    ?? "9999", 10);
const SKIP_OSM = process.env.SKIP_OSM === "1";
const DELAY_MS = parseInt(process.env.DELAY_MS ?? "2500", 10);
const RESUME   = parseInt(process.env.RESUME   ?? "0",    10);

// Mirrors tried in order; moves to next on error
const OVERPASS_MIRRORS = [
	"https://overpass.private.coffee/api/interpreter",
	"https://overpass-api.de/api/interpreter",
	"https://overpass.openstreetmap.ru/api/interpreter",
];

const dbUrl = process.env.DATABASE_URL?.replace("file:", "") ?? "./nexthome.db";
const sqlite = new Database(dbUrl);

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }

// ── National Parks ────────────────────────────────────────────────────────────

interface Park { name: string; lat: number; lng: number; }

const NATIONAL_PARKS: Park[] = [
	{ name: "Yellowstone",           lat: 44.428,  lng: -110.588 },
	{ name: "Grand Canyon",          lat: 36.107,  lng: -112.113 },
	{ name: "Yosemite",              lat: 37.865,  lng: -119.538 },
	{ name: "Great Smoky Mountains", lat: 35.611,  lng: -83.508  },
	{ name: "Rocky Mountain",        lat: 40.343,  lng: -105.688 },
	{ name: "Zion",                  lat: 37.297,  lng: -113.026 },
	{ name: "Olympic",               lat: 47.802,  lng: -123.604 },
	{ name: "Glacier",               lat: 48.695,  lng: -113.717 },
	{ name: "Acadia",                lat: 44.338,  lng: -68.273  },
	{ name: "Grand Teton",           lat: 43.787,  lng: -110.702 },
	{ name: "Joshua Tree",           lat: 33.873,  lng: -115.901 },
	{ name: "Bryce Canyon",          lat: 37.593,  lng: -112.187 },
	{ name: "Arches",                lat: 38.733,  lng: -109.592 },
	{ name: "Shenandoah",            lat: 38.487,  lng: -78.465  },
	{ name: "Cape Cod NS",           lat: 41.831,  lng: -70.007  },
	{ name: "Sequoia",               lat: 36.486,  lng: -118.565 },
	{ name: "Death Valley",          lat: 36.505,  lng: -117.079 },
	{ name: "Mount Rainier",         lat: 46.855,  lng: -121.757 },
	{ name: "Crater Lake",           lat: 42.897,  lng: -122.122 },
	{ name: "Everglades",            lat: 25.286,  lng: -80.898  },
	{ name: "Cuyahoga Valley",       lat: 41.243,  lng: -81.548  },
	{ name: "Badlands",              lat: 43.748,  lng: -102.494 },
	{ name: "Wind Cave",             lat: 43.557,  lng: -103.479 },
	{ name: "Carlsbad Caverns",      lat: 32.148,  lng: -104.557 },
	{ name: "Great Basin",           lat: 38.983,  lng: -114.300 },
	{ name: "Petrified Forest",      lat: 35.065,  lng: -109.789 },
	{ name: "Canyonlands",           lat: 38.200,  lng: -109.930 },
	{ name: "Capitol Reef",          lat: 38.367,  lng: -111.261 },
	{ name: "Mesa Verde",            lat: 37.182,  lng: -108.490 },
	{ name: "Great Sand Dunes",      lat: 37.732,  lng: -105.511 },
	{ name: "Pinnacles",             lat: 36.491,  lng: -121.198 },
	{ name: "Redwood",               lat: 41.213,  lng: -124.004 },
	{ name: "Lassen Volcanic",       lat: 40.493,  lng: -121.508 },
	{ name: "Channel Islands",       lat: 34.007,  lng: -119.779 },
	{ name: "North Cascades",        lat: 48.421,  lng: -121.206 },
	{ name: "Voyageurs",             lat: 48.485,  lng: -92.838  },
	{ name: "Theodore Roosevelt",    lat: 46.979,  lng: -103.538 },
	{ name: "Isle Royale",           lat: 47.997,  lng: -88.909  },
	{ name: "Mammoth Cave",          lat: 37.186,  lng: -86.104  },
	{ name: "New River Gorge",       lat: 37.856,  lng: -81.071  },
	{ name: "Saguaro",               lat: 32.254,  lng: -110.500 },
	{ name: "Guadalupe Mountains",   lat: 31.923,  lng: -104.870 },
	{ name: "Big Bend",              lat: 29.127,  lng: -103.243 },
	{ name: "Congaree",              lat: 33.798,  lng: -80.793  },
	{ name: "Biscayne",              lat: 25.391,  lng: -80.377  },
	{ name: "Hawaii Volcanoes",      lat: 19.432,  lng: -155.258 },
	{ name: "Haleakala",             lat: 20.721,  lng: -156.152 },
	{ name: "Indiana Dunes",         lat: 41.608,  lng: -87.058  },
	{ name: "Gateway Arch",          lat: 38.625,  lng: -90.185  },
	{ name: "Black Canyon Gunnison", lat: 38.574,  lng: -107.724 },
	{ name: "White Sands",           lat: 32.779,  lng: -106.171 },
	{ name: "Denali",                lat: 63.069,  lng: -151.008 },
	{ name: "Glacier Bay",           lat: 58.666,  lng: -136.900 },
	{ name: "Kenai Fjords",          lat: 59.921,  lng: -149.652 },
	{ name: "Katmai",                lat: 58.594,  lng: -154.969 },
	{ name: "Virgin Islands NP",     lat: 18.351,  lng: -64.795  },
	{ name: "Sleeping Bear Dunes",   lat: 44.883,  lng: -86.045  },
	{ name: "Pictured Rocks",        lat: 46.559,  lng: -86.271  },
	{ name: "Point Reyes NS",        lat: 38.049,  lng: -122.888 },
	{ name: "Assateague Island NS",  lat: 38.059,  lng: -75.202  },
	{ name: "Padre Island NS",       lat: 27.015,  lng: -97.369  },
	{ name: "Cumberland Island NS",  lat: 30.853,  lng: -81.470  },
	{ name: "Hot Springs",           lat: 34.518,  lng: -93.042  },
];

function haversine(lat1: number, lon1: number, lat2: number, lon2: number): number {
	const R = 3958.8;
	const dLat = (lat2 - lat1) * Math.PI / 180;
	const dLon = (lon2 - lon1) * Math.PI / 180;
	const a = Math.sin(dLat / 2) ** 2 +
		Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
	return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ── OSM Overpass — single combined query per city ─────────────────────────────

type OsmElement = { type: string; tags?: Record<string, string> };

/**
 * Sends ONE combined Overpass query per city, returns all matched elements.
 * Tries each mirror in sequence on failure; retries up to 3× with backoff.
 */
async function queryOverpass(
	lat: number, lng: number, timeoutMs = 50000,
): Promise<OsmElement[]> {
	// Single query covers arts venues (nodes + ways), hiking route relations, and parks.
	// Using [out:json] + out tags; so we can count client-side by tag.
	// Route relations for hiking keep count manageable (not individual path segments).
	const q = `[out:json][timeout:45];
(
  node(around:15000,${lat},${lng})[tourism=museum];
  way(around:15000,${lat},${lng})[tourism=museum];
  node(around:15000,${lat},${lng})[amenity=arts_centre];
  node(around:15000,${lat},${lng})[amenity=theatre];
  node(around:15000,${lat},${lng})[amenity=cinema];
  node(around:15000,${lat},${lng})[amenity=art_gallery];
  relation(around:25000,${lat},${lng})[route=hiking];
  relation(around:25000,${lat},${lng})[route=foot][name];
  way(around:8000,${lat},${lng})[leisure=park];
  way(around:8000,${lat},${lng})[leisure=nature_reserve];
  way(around:8000,${lat},${lng})[leisure=garden];
  node(around:8000,${lat},${lng})[leisure=park];
);
out tags;`;

	for (let attempt = 0; attempt < 3; attempt++) {
		const mirror = OVERPASS_MIRRORS[attempt % OVERPASS_MIRRORS.length];
		const controller = new AbortController();
		const timer = setTimeout(() => controller.abort(), timeoutMs);
		try {
			const res = await fetch(mirror, {
				method: "POST",
				headers: { "Content-Type": "application/x-www-form-urlencoded" },
				body: `data=${encodeURIComponent(q)}`,
				signal: controller.signal,
			});
			clearTimeout(timer);

			if (res.status === 429 || res.status === 503) {
				const wait = (attempt + 1) * 10_000;
				process.stdout.write(`\n  ⏳ rate limited by ${mirror} — waiting ${wait / 1000}s...`);
				await sleep(wait);
				continue;
			}
			if (!res.ok) {
				process.stdout.write(`\n  ⚠️  HTTP ${res.status} from ${mirror}`);
				await sleep(3000);
				continue;
			}

			const text = await res.text();
			// Overpass sometimes returns HTML error pages
			if (text.trim().startsWith("<")) {
				process.stdout.write(`\n  ⚠️  HTML response from ${mirror} (attempt ${attempt + 1})`);
				await sleep(5000);
				continue;
			}

			const data = JSON.parse(text) as { elements?: OsmElement[] };
			return data.elements ?? [];
		} catch (err) {
			clearTimeout(timer);
			const msg = err instanceof Error ? err.message : String(err);
			const isTimeout = msg.includes("abort") || msg.includes("timeout");
			process.stdout.write(`\n  ⚠️  ${isTimeout ? "timeout" : msg} (attempt ${attempt + 1}, mirror: ${mirror})`);
			await sleep((attempt + 1) * 4000);
		}
	}

	process.stdout.write(`\n  ❌ all mirrors failed — skipping city`);
	return [];
}

function countElements(elements: OsmElement[]): {
	artsCount: number; trailsCount: number; parksCount: number;
} {
	let artsCount = 0, trailsCount = 0, parksCount = 0;

	for (const el of elements) {
		const t = el.tags ?? {};
		// Arts
		if (
			t.tourism === "museum" ||
			t.amenity === "arts_centre" ||
			t.amenity === "theatre" ||
			t.amenity === "cinema" ||
			t.amenity === "art_gallery"
		) artsCount++;

		// Hiking routes (named relations)
		if (
			el.type === "relation" &&
			(t.route === "hiking" || (t.route === "foot" && t.name))
		) trailsCount++;

		// Parks
		if (
			t.leisure === "park" ||
			t.leisure === "nature_reserve" ||
			t.leisure === "garden"
		) parksCount++;
	}

	return { artsCount, trailsCount, parksCount };
}

// ── Upsert helper ─────────────────────────────────────────────────────────────

function upsertLifestyle(cityId: string, fields: Record<string, unknown>) {
	const existing = sqlite.prepare("SELECT id FROM city_lifestyle WHERE city_id = ?").get(cityId);
	const keys = Object.keys(fields);
	const vals = Object.values(fields);
	if (existing) {
		const sets = keys.map(k => `${k} = ?`).join(", ");
		sqlite.prepare(`UPDATE city_lifestyle SET ${sets}, data_as_of = date('now') WHERE city_id = ?`)
			.run(...vals, cityId);
	} else {
		const cols = ["id", "city_id", ...keys].join(", ");
		const placeholders = ["lower(hex(randomblob(16)))", "?", ...keys.map(() => "?")].join(", ");
		sqlite.prepare(`INSERT INTO city_lifestyle (${cols}, data_as_of) VALUES (${placeholders}, date('now'))`)
			.run(cityId, ...vals);
	}
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
	const cities = sqlite
		.prepare(`
			SELECT id, name, state_id, lat, lng, population
			FROM cities
			WHERE lat IS NOT NULL AND lng IS NOT NULL
			ORDER BY overall_score DESC
			LIMIT ?
		`)
		.all(LIMIT) as Array<{
		id: string; name: string; state_id: string;
		lat: number; lng: number; population: number | null;
	}>;

	console.log(`🌲 Nature & Culture enrichment for ${cities.length} cities`);
	if (RESUME > 0) console.log(`   Resuming from offset ${RESUME}`);
	if (DRY_RUN)    console.log("   DRY RUN — no writes");

	// ── PASS A: National Park proximity ───────────────────────────────────────
	console.log("\n🏔️  Pass A: National park proximity (computed)...");
	let parkUpdated = 0;

	for (const city of cities) {
		let nearest: { name: string; dist: number } | null = null;
		for (const park of NATIONAL_PARKS) {
			const dist = haversine(city.lat, city.lng, park.lat, park.lng);
			if (!nearest || dist < nearest.dist) nearest = { name: park.name, dist };
		}
		if (!nearest) continue;
		if (!DRY_RUN) {
			upsertLifestyle(city.id, {
				near_national_park: nearest.dist <= 60 ? 1 : 0,
				distance_to_national_park: Math.round(nearest.dist),
			});
		}
		parkUpdated++;
	}
	console.log(`  ✅ National parks: ${parkUpdated} cities processed`);

	if (SKIP_OSM) {
		console.log("\n⏭️  Pass B: OSM skipped (SKIP_OSM=1)");
		console.log("\n✅ Done! Run npm run db:normalize:all to update filter scores.");
		sqlite.close();
		return;
	}

	// ── PASS B: OSM combined query per city ───────────────────────────────────
	console.log(`\n🎨  Pass B: OSM Overpass — 1 query/city, ${DELAY_MS}ms delay`);
	console.log(`   Mirrors: ${OVERPASS_MIRRORS.join(", ")}`);

	const slice = cities.slice(RESUME);
	let done = 0; let failed = 0; let allZero = 0;

	for (let i = 0; i < slice.length; i++) {
		const city = slice[i];
		const globalIdx = RESUME + i + 1;

		process.stdout.write(
			`\r  [${globalIdx}/${cities.length}] ${city.name}, ${city.state_id}...    `
		);

		const elements = await queryOverpass(city.lat, city.lng);
		const { artsCount, trailsCount, parksCount } = countElements(elements);

		// Derive stored metrics
		const pop = city.population ?? 10_000;
		// Hiking route relations each represent a full trail; multiply for rough miles
		const trailsMiles     = Math.round(trailsCount * 3.5);
		// Parks/green-space density relative to population
		const parksAcresPer10k = Math.round((parksCount * 5) / Math.max(pop, 1_000) * 10_000) / 10;

		if (!DRY_RUN) {
			upsertLifestyle(city.id, {
				art_museum_count:     artsCount,
				theater_count:        0, // bundled into art_museum_count
				trails_miles_nearby:  trailsMiles,
				parks_acres_per_capita: parksAcresPer10k,
			});
		}

		const isAllZero = artsCount === 0 && trailsCount === 0 && parksCount === 0;
		if (isAllZero) allZero++;
		done++;

		// Print every 10 or when there's data
		if (!isAllZero || i % 10 === 0) {
			process.stdout.write(
				`\r  [${globalIdx}/${cities.length}] ${city.name}, ${city.state_id}` +
				`  🎨 ${artsCount}  🥾 ${trailsMiles}mi  🌳 ${parksAcresPer10k}/10k    \n`
			);
		}

		await sleep(DELAY_MS);
	}

	process.stdout.write("\n");
	console.log(`\n✅ OSM done: ${done} cities | zeros: ${allZero} | failed: ${failed}`);
	console.log("   Run  npm run db:normalize:all  to push scores to filter table.");
	sqlite.close();
}

main().catch(e => { console.error(e); process.exit(1); });
