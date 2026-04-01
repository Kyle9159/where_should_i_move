/**
 * OSM Neighborhood Name Extractor
 *
 * Queries the Overpass API for real `place=neighbourhood` nodes near each city
 * and stores the results in a `neighborhood_hints` table. These names are
 * then consumed by seed-neighborhoods.ts as prompts to xAI, producing more
 * accurate neighborhood data.
 *
 * Run BEFORE seed-neighborhoods.ts for best results:
 *   npm run db:enrich:neighborhoods:osm
 *
 * Options:
 *   LIMIT=N       — process only first N cities (default: all)
 *   REPLACE=1     — re-fetch even if hints already exist
 *   RADIUS=N      — search radius in metres (default: 15000)
 */

import { config } from "dotenv";
import { resolve } from "path";
config({ path: resolve(process.cwd(), ".env.local") });

import Database from "better-sqlite3";

const REPLACE = process.env.REPLACE === "1";
const LIMIT = parseInt(process.env.LIMIT ?? "99999", 10);
const RADIUS = parseInt(process.env.RADIUS ?? "15000", 10);
const DELAY_MS = 1500; // polite delay between Overpass requests

const dbUrl = process.env.DATABASE_URL?.replace("file:", "") ?? "./nexthome.db";
const sqlite = new Database(dbUrl);

// Ensure hints table exists
sqlite.exec(`
	CREATE TABLE IF NOT EXISTS neighborhood_hints (
		city_id  TEXT PRIMARY KEY,
		names    TEXT NOT NULL,  -- JSON array of neighbourhood names
		source   TEXT NOT NULL DEFAULT 'osm',
		fetched_at TEXT NOT NULL
	)
`);

interface OverpassElement {
	type: string;
	id: number;
	lat?: number;
	lon?: number;
	tags?: { name?: string; [key: string]: string | undefined };
}

interface OverpassResult {
	elements: OverpassElement[];
}

const OVERPASS_MIRRORS = [
	"https://overpass-api.de/api/interpreter",
	"https://overpass.kumi.systems/api/interpreter",
];

async function fetchNeighbourhoodNames(lat: number, lng: number): Promise<string[]> {
	const query = `
[out:json][timeout:30];
(
  node["place"="neighbourhood"](around:${RADIUS},${lat},${lng});
  way["place"="neighbourhood"](around:${RADIUS},${lat},${lng});
  relation["place"="neighbourhood"](around:${RADIUS},${lat},${lng});
);
out tags;
`;

	for (const mirror of OVERPASS_MIRRORS) {
		try {
			const res = await fetch(mirror, {
				method: "POST",
				headers: { "Content-Type": "application/x-www-form-urlencoded" },
				body: `data=${encodeURIComponent(query)}`,
				signal: AbortSignal.timeout(35_000),
			});

			if (!res.ok) continue;

			const data = (await res.json()) as OverpassResult;
			const names = data.elements
				.map((el) => el.tags?.name)
				.filter((n): n is string => Boolean(n && n.trim().length > 1))
				.filter((n) => !n.match(/^[0-9]+$/)) // drop purely numeric names
				.filter((n, i, arr) => arr.indexOf(n) === i) // deduplicate
				.sort();

			return names;
		} catch {
			// try next mirror
		}
	}

	return [];
}

// Score a neighbourhood name by quality (prefer specific, reject generic)
const GENERIC_PATTERNS = /^(north|south|east|west|downtown|uptown|midtown|central|old town|new town|district|area|zone|sector|ward|block|unit|quarter)\s*\d*$/i;

function scoreNames(names: string[]): string[] {
	return names
		.filter((n) => !GENERIC_PATTERNS.test(n.trim()))
		.sort((a, b) => {
			// Prefer title-case multi-word names (e.g. "Beacon Hill" > "district 4")
			const aScore = /^[A-Z][a-z]/.test(a) ? 1 : 0;
			const bScore = /^[A-Z][a-z]/.test(b) ? 1 : 0;
			return bScore - aScore;
		})
		.slice(0, 8); // keep top 8 candidates
}

async function main() {
	const cities = sqlite.prepare(`
		SELECT id, name, state_id, lat, lng, population
		FROM cities
		WHERE lat IS NOT NULL AND lng IS NOT NULL
		ORDER BY COALESCE(population, 0) DESC
		LIMIT ?
	`).all(LIMIT) as Array<{
		id: string; name: string; state_id: string;
		lat: number; lng: number; population: number | null;
	}>;

	// Skip cities that already have fully-seeded neighborhoods (unless REPLACE)
	const alreadySeeded = new Set(
		(sqlite.prepare(`
			SELECT DISTINCT city_id FROM neighborhoods
		`).all() as Array<{ city_id: string }>).map((r) => r.city_id)
	);

	const existing = new Set(
		(sqlite.prepare("SELECT city_id FROM neighborhood_hints").all() as Array<{ city_id: string }>)
			.map((r) => r.city_id)
	);

	const toProcess = cities.filter((c) => {
		if (alreadySeeded.has(c.id) && !REPLACE) return false; // already has hoods
		if (existing.has(c.id) && !REPLACE) return false;       // already has hints
		return true;
	});

	console.log(`🗺️  OSM neighbourhood extractor`);
	console.log(`   Cities to process: ${toProcess.length} (of ${cities.length} total)`);
	console.log(`   Skipped (already seeded): ${alreadySeeded.size}`);
	console.log(`   Radius: ${(RADIUS / 1000).toFixed(1)} km`);
	console.log();

	const upsert = sqlite.prepare(`
		INSERT INTO neighborhood_hints (city_id, names, source, fetched_at)
		VALUES (?, ?, 'osm', datetime('now'))
		ON CONFLICT(city_id) DO UPDATE SET names = excluded.names, fetched_at = excluded.fetched_at
	`);

	let done = 0; let empty = 0; let failed = 0;

	for (const city of toProcess) {
		process.stdout.write(
			`\r  [${done + empty + failed + 1}/${toProcess.length}] ${city.name}, ${city.state_id}...    `
		);

		try {
			const rawNames = await fetchNeighbourhoodNames(city.lat, city.lng);
			const names = scoreNames(rawNames);

			if (names.length === 0) {
				empty++;
				// Store empty array so we know we checked this city
				upsert.run(city.id, "[]");
			} else {
				upsert.run(city.id, JSON.stringify(names));
				done++;
			}
		} catch (err) {
			process.stdout.write(`\n  ❌ ${city.name}: ${(err as Error).message}\n`);
			failed++;
		}

		await new Promise((r) => setTimeout(r, DELAY_MS));
	}

	process.stdout.write("\n");

	const totalHints = (sqlite.prepare(
		"SELECT COUNT(*) as n FROM neighborhood_hints WHERE names != '[]'"
	).get() as { n: number }).n;

	console.log(`\n✅ Done: ${done} cities with hints, ${empty} no OSM data, ${failed} errors`);
	console.log(`   Total cities with OSM hints: ${totalHints}`);
	console.log(`\n💡 Now run: npm run db:seed:neighborhoods`);
}

main().catch(console.error);
