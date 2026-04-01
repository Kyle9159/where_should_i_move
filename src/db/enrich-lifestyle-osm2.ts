/**
 * Enriches city_lifestyle with nature + culture data via OSM Overpass & computed proximity.
 *
 * Pass A — National park proximity (computed from lat/lng, instant, no API):
 *   near_national_park, distance_to_national_park
 *
 * Pass B — OSM Overpass (per city, ~2s/city):
 *   art_museum_count, theater_count  (arts & culture)
 *   trails_miles_nearby              (hiking trail density)
 *   parks_acres_per_capita           (park count proxy)
 *
 * Run: npx tsx src/db/enrich-lifestyle-osm2.ts
 * Options:
 *   LIMIT=100    — only first N cities
 *   DRY_RUN=1    — no DB writes
 *   SKIP_OSM=1   — skip Pass B (only run national park proximity)
 *   DELAY_MS=2000 — ms between OSM requests per city (default: 2000)
 */
import { config } from "dotenv";
import { resolve } from "path";
config({ path: resolve(process.cwd(), ".env.local") });

import Database from "better-sqlite3";

const DRY_RUN = process.env.DRY_RUN === "1";
const LIMIT = parseInt(process.env.LIMIT ?? "9999", 10);
const SKIP_OSM = process.env.SKIP_OSM === "1";
const DELAY_MS = parseInt(process.env.DELAY_MS ?? "2000", 10);
const OVERPASS_URL = "https://overpass-api.de/api/interpreter";

const dbUrl = process.env.DATABASE_URL?.replace("file:", "") ?? "./nexthome.db";
const sqlite = new Database(dbUrl);

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }

// ── National Parks (NPS units with approximate center coordinates) ────────────

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

// ── Haversine distance (miles) ────────────────────────────────────────────────

function haversine(lat1: number, lon1: number, lat2: number, lon2: number): number {
	const R = 3958.8;
	const dLat = (lat2 - lat1) * Math.PI / 180;
	const dLon = (lon2 - lon1) * Math.PI / 180;
	const a = Math.sin(dLat / 2) ** 2 +
		Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
	return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ── OSM Overpass query helper ─────────────────────────────────────────────────

async function overpassCount(query: string, timeoutMs = 40000): Promise<number> {
	const controller = new AbortController();
	const timer = setTimeout(() => controller.abort(), timeoutMs);
	try {
		const res = await fetch(OVERPASS_URL, {
			method: "POST",
			headers: { "Content-Type": "application/x-www-form-urlencoded" },
			body: `data=${encodeURIComponent(query)}`,
			signal: controller.signal,
		});
		clearTimeout(timer);
		if (!res.ok) return 0;
		const data = await res.json();
		return parseInt(data?.elements?.[0]?.tags?.total ?? "0", 10);
	} catch {
		clearTimeout(timer);
		return 0;
	}
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
		.all(LIMIT) as Array<{ id: string; name: string; state_id: string; lat: number; lng: number; population: number | null }>;

	console.log(`🌲 Nature & Culture enrichment for ${cities.length} cities`);
	if (DRY_RUN) console.log("   DRY RUN — no writes");

	// ── PASS A: National Park proximity ───────────────────────────────────────
	console.log("\n🏔️  Pass A: National park proximity (computed)...");
	const NEAR_THRESHOLD_MILES = 60;
	let parkUpdated = 0;

	for (const city of cities) {
		let nearest: { name: string; dist: number } | null = null;
		for (const park of NATIONAL_PARKS) {
			const dist = haversine(city.lat, city.lng, park.lat, park.lng);
			if (!nearest || dist < nearest.dist) nearest = { name: park.name, dist };
		}
		if (!nearest) continue;

		const isNear = nearest.dist <= NEAR_THRESHOLD_MILES;
		if (!DRY_RUN) {
			upsertLifestyle(city.id, {
				near_national_park: isNear ? 1 : 0,
				distance_to_national_park: Math.round(nearest.dist),
			});
		}
		parkUpdated++;
	}
	console.log(`  ✅ National parks: ${parkUpdated} cities processed (${NEAR_THRESHOLD_MILES}mi threshold)`);

	if (SKIP_OSM) {
		console.log("\n⏭️  Pass B: OSM skipped (SKIP_OSM=1)");
		console.log("\n✅ Done! Run npm run db:normalize:all to update filter scores.");
		sqlite.close();
		return;
	}

	// ── PASS B: OSM arts + trails + parks ─────────────────────────────────────
	console.log(`\n🎨  Pass B: OSM Overpass (arts/trails/parks, ${DELAY_MS}ms delay)...`);
	let osmUpdated = 0;

	for (let i = 0; i < cities.length; i++) {
		const city = cities[i];
		const { lat, lng, population } = city;
		const pop10k = Math.max((population ?? 10000) / 10000, 0.1);

		// Arts venues within 15km
		const artsQuery = `[out:json][timeout:35];(node(around:15000,${lat},${lng})[tourism=museum];node(around:15000,${lat},${lng})[amenity=arts_centre];node(around:15000,${lat},${lng})[amenity=theatre];node(around:15000,${lat},${lng})[amenity=cinema];);out count;`;

		// Hiking trails within 20km (named paths/tracks)
		const trailsQuery = `[out:json][timeout:35];(way(around:20000,${lat},${lng})[highway~"^(path|track)$"][name];way(around:20000,${lat},${lng})[route=hiking];);out count;`;

		// Parks within 5km
		const parksQuery = `[out:json][timeout:35];(way(around:5000,${lat},${lng})[leisure~"^(park|garden|nature_reserve|recreation_ground)$"];node(around:5000,${lat},${lng})[leisure=park];);out count;`;

		const [artsCount, trailsCount, parksCount] = await Promise.all([
			overpassCount(artsQuery),
			overpassCount(trailsQuery),
			overpassCount(parksQuery),
		]);
		await sleep(DELAY_MS);

		// trails_miles_nearby: rough estimate (each named trail ~1-2mi avg)
		const trailsMiles = Math.round(trailsCount * 1.5);
		// parks_acres_per_capita: rough estimate (each park ~5 acres avg / pop)
		const parksAcres = Math.round((parksCount * 5) / Math.max(population ?? 10000, 1000) * 10000) / 10;

		if (!DRY_RUN) {
			upsertLifestyle(city.id, {
				art_museum_count: artsCount,
				theater_count: 0, // already counted in artsCount above
				trails_miles_nearby: trailsMiles,
				parks_acres_per_capita: parksAcres,
			});
		}

		osmUpdated++;
		if (i % 50 === 0 || i < 3) {
			const nearPark = haversine(lat, lng, NATIONAL_PARKS[0].lat, NATIONAL_PARKS[0].lng);
			console.log(`  [${i + 1}/${cities.length}] ${city.name}, ${city.state_id}  🎨 ${artsCount} arts  🥾 ${trailsMiles}mi trails  🌳 ${parksAcres} acres/10k`);
		}
	}
	console.log(`  ✅ OSM: ${osmUpdated} cities updated`);

	console.log("\n✅ Done! Run npm run db:normalize:all to update filter scores.");
	sqlite.close();
}

main().catch(e => { console.error(e); process.exit(1); });
