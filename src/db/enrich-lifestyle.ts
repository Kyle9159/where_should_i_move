/**
 * Enriches city_lifestyle with lifestyle metrics from 3 sources:
 *
 * Pass A — Census ACS (state-batch, fast, no key):
 *   median_age     (B01002_001E)
 *   diversity_index (Simpson's D from B03002 race data)
 *
 * Pass B — Computed from lat/lng (instant, no API):
 *   major_airport_nearby, closest_airport_code, airport_drive_mins
 *
 * Pass C — OSM Overpass (per city, ~1.5s/city, no key):
 *   restaurants_per_capita, bars_nightlife_per_capita
 *
 * Run: npx tsx src/db/enrich-lifestyle.ts
 * Options:
 *   LIMIT=100    — only first N cities (default: all)
 *   DRY_RUN=1    — no DB writes
 *   SKIP_OSM=1   — skip Pass C (OSM) — useful for quick Census + airport run
 *   DELAY_MS=1500 — ms between OSM requests (default: 1500)
 */
import { config } from "dotenv";
import { resolve } from "path";
config({ path: resolve(process.cwd(), ".env.local") });

import Database from "better-sqlite3";

const DRY_RUN = process.env.DRY_RUN === "1";
const LIMIT = parseInt(process.env.LIMIT ?? "9999", 10);
const SKIP_OSM = process.env.SKIP_OSM === "1";
const DELAY_MS = parseInt(process.env.DELAY_MS ?? "1500", 10);
const CENSUS_BASE = "https://api.census.gov/data/2022/acs/acs5";
const OVERPASS_URL = "https://overpass-api.de/api/interpreter";

const dbUrl = process.env.DATABASE_URL?.replace("file:", "") ?? "./nexthome.db";
const sqlite = new Database(dbUrl);

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }

// ── State FIPS ────────────────────────────────────────────────────────────────

const STATE_FIPS: Record<string, string> = {
	AL:"01",AK:"02",AZ:"04",AR:"05",CA:"06",CO:"08",CT:"09",DC:"11",
	DE:"10",FL:"12",GA:"13",HI:"15",ID:"16",IL:"17",IN:"18",IA:"19",
	KS:"20",KY:"21",LA:"22",ME:"23",MD:"24",MA:"25",MI:"26",MN:"27",
	MS:"28",MO:"29",MT:"30",NE:"31",NV:"32",NH:"33",NJ:"34",NM:"35",
	NY:"36",NC:"37",ND:"38",OH:"39",OK:"40",OR:"41",PA:"42",RI:"44",
	SC:"45",SD:"46",TN:"47",TX:"48",UT:"49",VT:"50",VA:"51",WA:"53",
	WV:"54",WI:"55",WY:"56",
};

// ── Airports (top ~90 US airports by passenger volume) ───────────────────────

interface Airport { code: string; lat: number; lng: number; }

const AIRPORTS: Airport[] = [
	{ code:"ATL", lat:33.6407, lng:-84.4277 },
	{ code:"LAX", lat:33.9425, lng:-118.4081 },
	{ code:"ORD", lat:41.9742, lng:-87.9073 },
	{ code:"DFW", lat:32.8998, lng:-97.0403 },
	{ code:"DEN", lat:39.8561, lng:-104.6737 },
	{ code:"JFK", lat:40.6413, lng:-73.7781 },
	{ code:"SFO", lat:37.6213, lng:-122.3790 },
	{ code:"SEA", lat:47.4502, lng:-122.3088 },
	{ code:"LAS", lat:36.0840, lng:-115.1537 },
	{ code:"MCO", lat:28.4312, lng:-81.3081 },
	{ code:"CLT", lat:35.2140, lng:-80.9431 },
	{ code:"PHX", lat:33.4373, lng:-112.0078 },
	{ code:"MIA", lat:25.7959, lng:-80.2870 },
	{ code:"EWR", lat:40.6895, lng:-74.1745 },
	{ code:"MSP", lat:44.8848, lng:-93.2223 },
	{ code:"BOS", lat:42.3656, lng:-71.0096 },
	{ code:"DTW", lat:42.2124, lng:-83.3534 },
	{ code:"FLL", lat:26.0742, lng:-80.1506 },
	{ code:"PHL", lat:39.8719, lng:-75.2411 },
	{ code:"BWI", lat:39.1754, lng:-76.6682 },
	{ code:"LGA", lat:40.7769, lng:-73.8740 },
	{ code:"MDW", lat:41.7868, lng:-87.7522 },
	{ code:"SLC", lat:40.7884, lng:-111.9778 },
	{ code:"IAH", lat:29.9902, lng:-95.3368 },
	{ code:"HOU", lat:29.6454, lng:-95.2789 },
	{ code:"DAL", lat:32.8471, lng:-96.8517 },
	{ code:"SAN", lat:32.7336, lng:-117.1897 },
	{ code:"TPA", lat:27.9756, lng:-82.5332 },
	{ code:"PDX", lat:45.5898, lng:-122.5951 },
	{ code:"STL", lat:38.7487, lng:-90.3700 },
	{ code:"HNL", lat:21.3187, lng:-157.9224 },
	{ code:"BNA", lat:36.1245, lng:-86.6782 },
	{ code:"AUS", lat:30.1975, lng:-97.6664 },
	{ code:"OAK", lat:37.7213, lng:-122.2208 },
	{ code:"RDU", lat:35.8776, lng:-78.7875 },
	{ code:"SJC", lat:37.3626, lng:-121.9290 },
	{ code:"SMF", lat:38.6954, lng:-121.5908 },
	{ code:"MSY", lat:29.9934, lng:-90.2580 },
	{ code:"IND", lat:39.7173, lng:-86.2944 },
	{ code:"JAX", lat:30.4941, lng:-81.6879 },
	{ code:"PIT", lat:40.4915, lng:-80.2329 },
	{ code:"SAT", lat:29.5337, lng:-98.4698 },
	{ code:"CMH", lat:39.9998, lng:-82.8919 },
	{ code:"RSW", lat:26.5362, lng:-81.7552 },
	{ code:"CLE", lat:41.4117, lng:-81.8498 },
	{ code:"BUF", lat:42.9405, lng:-78.7322 },
	{ code:"BDL", lat:41.9389, lng:-72.6832 },
	{ code:"MKE", lat:42.9472, lng:-87.8966 },
	{ code:"OMA", lat:41.3032, lng:-95.8941 },
	{ code:"MCI", lat:39.2976, lng:-94.7139 },
	{ code:"PBI", lat:26.6832, lng:-80.0956 },
	{ code:"SNA", lat:33.6757, lng:-117.8682 },
	{ code:"SJU", lat:18.4395, lng:-66.0018 },
	{ code:"GEG", lat:47.6199, lng:-117.5338 },
	{ code:"TUL", lat:36.1984, lng:-95.8881 },
	{ code:"OKC", lat:35.3931, lng:-97.6007 },
	{ code:"ABQ", lat:35.0395, lng:-106.6090 },
	{ code:"ELP", lat:31.8076, lng:-106.3779 },
	{ code:"ONT", lat:34.0560, lng:-117.6012 },
	{ code:"BOI", lat:43.5644, lng:-116.2228 },
	{ code:"TUS", lat:32.1161, lng:-110.9410 },
	{ code:"LGB", lat:33.8177, lng:-118.1516 },
	{ code:"CVG", lat:39.0488, lng:-84.6678 },
	{ code:"RNO", lat:39.4991, lng:-119.7681 },
	{ code:"DSM", lat:41.5340, lng:-93.6631 },
	{ code:"MEM", lat:35.0424, lng:-89.9767 },
	{ code:"RIC", lat:37.5052, lng:-77.3197 },
	{ code:"BHM", lat:33.5629, lng:-86.7535 },
	{ code:"GSP", lat:34.8957, lng:-82.2189 },
	{ code:"CHS", lat:32.8986, lng:-80.0405 },
	{ code:"HSV", lat:34.6372, lng:-86.7751 },
	{ code:"LIT", lat:34.7294, lng:-92.2243 },
	{ code:"SDF", lat:38.1744, lng:-85.7360 },
	{ code:"ORF", lat:36.8976, lng:-76.0132 },
	{ code:"ROC", lat:43.1189, lng:-77.6724 },
	{ code:"PVD", lat:41.7240, lng:-71.4283 },
	{ code:"ALB", lat:42.7483, lng:-73.8017 },
	{ code:"GRR", lat:42.8808, lng:-85.5228 },
	{ code:"ICT", lat:37.6499, lng:-97.4330 },
	{ code:"TYS", lat:35.8110, lng:-83.9941 },
	{ code:"FAT", lat:36.7762, lng:-119.7181 },
	{ code:"XNA", lat:36.2819, lng:-94.3068 },
	{ code:"LEX", lat:38.0365, lng:-84.6059 },
	{ code:"CAK", lat:40.9161, lng:-81.4422 },
	{ code:"SAV", lat:32.1276, lng:-81.2021 },
	{ code:"ANC", lat:61.1743, lng:-149.9961 },
	{ code:"FSD", lat:43.5820, lng:-96.7418 },
	{ code:"FWA", lat:40.9785, lng:-85.1952 },
	{ code:"OGG", lat:20.8986, lng:-156.4305 },
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

function normalizeName(name: string): string {
	return name.split(",")[0]
		.replace(/\b(city|town|village|borough|municipality|township|cdp|unified government|metro government|consolidated government|charter township|urban county)\b/gi, "")
		.trim()
		.toLowerCase();
}

// ── Pass A: Census ACS ────────────────────────────────────────────────────────

interface CensusLifestyle {
	name: string;
	medianAge: number;
	total: number;
	white: number;
	black: number;
	asian: number;
	hispanic: number;
	native: number;
	pacific: number;
	multiRace: number;
}

async function fetchStateCensus(stateFips: string): Promise<CensusLifestyle[]> {
	// B01002_001E = median age
	// B03002_001E = total, 003=white, 004=black, 006=asian, 012=hispanic, 005=native, 007=pacific, 009=2+ races
	const url = `${CENSUS_BASE}?get=NAME,B01002_001E,B03002_001E,B03002_003E,B03002_004E,B03002_006E,B03002_012E,B03002_005E,B03002_007E,B03002_009E&for=place:*&in=state:${stateFips}`;
	try {
		const res = await fetch(url, { signal: AbortSignal.timeout(20000) });
		if (!res.ok) return [];
		const rows = await res.json() as string[][];
		return rows.slice(1).map(row => ({
			name: row[0],
			medianAge: parseFloat(row[1]) || 0,
			total: parseInt(row[2]) || 1,
			white: parseInt(row[3]) || 0,
			black: parseInt(row[4]) || 0,
			asian: parseInt(row[5]) || 0,
			hispanic: parseInt(row[6]) || 0,
			native: parseInt(row[7]) || 0,
			pacific: parseInt(row[8]) || 0,
			multiRace: parseInt(row[9]) || 0,
		})).filter(p => p.medianAge > 0);
	} catch {
		return [];
	}
}

function computeDiversityIndex(p: CensusLifestyle): number {
	const N = p.total;
	const groups = [p.white, p.black, p.asian, p.hispanic, p.native, p.pacific, p.multiRace];
	const sumSq = groups.reduce((acc, n) => acc + (n / N) ** 2, 0);
	return Math.round((1 - sumSq) * 1000) / 1000; // 3 decimal places, 0–1
}

// ── Pass C: OSM Overpass ──────────────────────────────────────────────────────

async function overpassCount(query: string): Promise<number> {
	const controller = new AbortController();
	const timer = setTimeout(() => controller.abort(), 35000);
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

	console.log(`🏙️  Lifestyle enrichment for ${cities.length} cities`);
	if (DRY_RUN) console.log("   DRY RUN — no writes");

	// ── PASS A: Census ACS (median_age + diversity_index) ─────────────────────
	console.log("\n📊 Pass A: Census ACS (age + diversity)...");

	const byState = new Map<string, typeof cities>();
	for (const city of cities) {
		if (!byState.has(city.state_id)) byState.set(city.state_id, []);
		byState.get(city.state_id)!.push(city);
	}

	let censusUpdated = 0; let stateNum = 0;
	for (const [stateId, stateCities] of byState) {
		const fips = STATE_FIPS[stateId];
		if (!fips) continue;
		stateNum++;
		process.stdout.write(`\r  [${stateNum}/${byState.size}] ${stateId}...      `);

		const places = await fetchStateCensus(fips);
		const placeMap = new Map<string, CensusLifestyle>();
		for (const p of places) placeMap.set(normalizeName(p.name), p);

		for (const city of stateCities) {
			const place = placeMap.get(city.name.toLowerCase());
			if (!place) continue;
			const diversityIndex = computeDiversityIndex(place);
			if (!DRY_RUN) {
				upsertLifestyle(city.id, {
					median_age: place.medianAge,
					diversity_index: diversityIndex,
				});
			}
			censusUpdated++;
		}
		await sleep(80);
	}
	process.stdout.write("\n");
	console.log(`  ✅ Census: ${censusUpdated} cities updated`);

	// ── PASS B: Airport proximity (in-memory computation) ─────────────────────
	console.log("\n✈️  Pass B: Airport proximity (computed from lat/lng)...");
	let airportUpdated = 0;
	const AIRPORT_RADIUS_MILES = 60;

	for (const city of cities) {
		let nearest: { code: string; dist: number } | null = null;
		for (const airport of AIRPORTS) {
			const dist = haversine(city.lat, city.lng, airport.lat, airport.lng);
			if (!nearest || dist < nearest.dist) nearest = { code: airport.code, dist };
		}
		if (!nearest) continue;

		const nearby = nearest.dist <= AIRPORT_RADIUS_MILES;
		const driveMins = nearby ? Math.round(nearest.dist / 0.75) : null; // ~45mph avg

		if (!DRY_RUN) {
			upsertLifestyle(city.id, {
				major_airport_nearby: nearby ? 1 : 0,
				closest_airport_code: nearest.code,
				airport_drive_mins: driveMins,
			});
		}
		airportUpdated++;
	}
	console.log(`  ✅ Airports: ${airportUpdated} cities processed (${AIRPORT_RADIUS_MILES}mi threshold)`);

	// ── PASS C: OSM Overpass (restaurants + bars per capita) ──────────────────
	if (SKIP_OSM) {
		console.log("\n⏭️  Pass C: OSM skipped (SKIP_OSM=1)");
	} else {
		console.log(`\n🍽️  Pass C: OSM Overpass (restaurants + bars, ${DELAY_MS}ms delay)...`);
		let osmUpdated = 0;
		for (let i = 0; i < cities.length; i++) {
			const city = cities[i];
			const { lat, lng, population } = city;
			const pop10k = Math.max((population ?? 10000) / 10000, 0.1);

			const restQuery = `[out:json][timeout:30];node(around:5000,${lat},${lng})[amenity~"^(restaurant|cafe|fast_food|food_court)$"];out count;`;
			const barQuery = `[out:json][timeout:30];node(around:5000,${lat},${lng})[amenity~"^(bar|pub|nightclub|biergarten)$"];out count;`;

			const restCount = await overpassCount(restQuery);
			await sleep(300);
			const barCount = await overpassCount(barQuery);

			const restPerCapita = Math.round((restCount / pop10k) * 10) / 10;
			const barPerCapita = Math.round((barCount / pop10k) * 10) / 10;

			if (!DRY_RUN) {
				upsertLifestyle(city.id, {
					restaurants_per_capita: restPerCapita,
					bars_nightlife_per_capita: barPerCapita,
				});
			}

			osmUpdated++;
			if (i % 50 === 0 || i < 3) {
				console.log(`  [${i + 1}/${cities.length}] ${city.name}, ${city.state_id}  🍽️ ${restPerCapita}/10k  🍺 ${barPerCapita}/10k`);
			}
			await sleep(DELAY_MS);
		}
		console.log(`  ✅ OSM: ${osmUpdated} cities updated`);
	}

	console.log("\n✅ Done! Run npm run db:normalize:all to update filter scores.");
	sqlite.close();
}

main().catch(e => { console.error(e); process.exit(1); });
