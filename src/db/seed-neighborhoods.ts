/**
 * Generates neighborhoods for cities using xAI (Grok), tiered by population.
 *
 * Population tiers:
 *   > 250 000  → 5 neighborhoods
 *   150–250 k   → 3 neighborhoods
 *   < 150 000  → 2 neighborhoods
 *
 * Run: npm run db:seed:neighborhoods
 *
 * Options:
 *   LIMIT=N       — process only first N cities (default: 2708)
 *   DRY_RUN=1     — print output without writing to DB
 *   REPLACE=1     — replace existing neighborhoods (default: skip cities with data)
 *   MIN_POP=N     — skip cities with population below N (default: 0)
 */

import { config } from "dotenv";
import { resolve } from "path";
config({ path: resolve(process.cwd(), ".env.local") });

import OpenAI from "openai";
import Database from "better-sqlite3";
import { createId } from "@paralleldrive/cuid2";

const DRY_RUN = process.env.DRY_RUN === "1";
const REPLACE = process.env.REPLACE === "1";
const LIMIT = parseInt(process.env.LIMIT ?? "2708", 10);
const MIN_POP = parseInt(process.env.MIN_POP ?? "0", 10);

const apiKey = process.env.XAI_API_KEY;
if (!apiKey) {
	console.error("❌  Set XAI_API_KEY in .env.local");
	process.exit(1);
}

const client = new OpenAI({ baseURL: "https://api.x.ai/v1", apiKey });
const dbUrl = process.env.DATABASE_URL?.replace("file:", "") ?? "./nexthome.db";
const sqlite = new Database(dbUrl);

type NeighborhoodRow = {
	name: string;
	description: string;
	lat: number;
	lng: number;
	vibeKeywords: string[];
	pros: string[];
	cons: string[];
	bestFor: string[];
	medianRent: number;
	medianHomePrice: number;
	walkScore: number;
};

const VALID_VIBES = new Set([
	"walkable", "family-friendly", "artsy", "trendy",
	"historic", "suburban", "urban",
]);

const VALID_BEST_FOR = new Set([
	"families", "young professionals", "students", "retirees",
	"remote workers", "nightlife seekers", "outdoor enthusiasts",
]);

function neighborhoodCount(population: number | null): number {
	const pop = population ?? 0;
	if (pop > 250_000) return 5;
	if (pop > 150_000) return 3;
	return 2;
}

async function generateNeighborhoods(
	cityName: string,
	stateId: string,
	cityLat: number,
	cityLng: number,
	count: number,
	hintNames?: string[], // OSM-sourced real names
): Promise<NeighborhoodRow[]> {
	const nameHint = hintNames && hintNames.length >= 2
		? `\n\nIMPORTANT: Prioritise these real neighborhood names (from OpenStreetMap): ${hintNames.slice(0, count).join(", ")}. Use them as-is; only invent names if you need to reach ${count} total.`
		: "";

	const prompt = `List the ${count} most well-known and distinct neighborhoods in ${cityName}, ${stateId}.${nameHint}

For each neighborhood return a JSON object with these exact fields:
- name: neighborhood name (string)
- description: 1-2 sentences describing the vibe and character (string)
- lat: approximate latitude as a number (must be within ~0.15 degrees of city center ${cityLat.toFixed(4)})
- lng: approximate longitude as a number (must be within ~0.15 degrees of city center ${cityLng.toFixed(4)})
- vibeKeywords: array of 2-3 tags chosen ONLY from: "walkable", "family-friendly", "artsy", "trendy", "historic", "suburban", "urban"
- pros: array of 2-3 short phrases (max 6 words each) — real positives of living here
- cons: array of 2-3 short phrases (max 6 words each) — real drawbacks of living here
- bestFor: array of 1-2 tags chosen ONLY from: "families", "young professionals", "students", "retirees", "remote workers", "nightlife seekers", "outdoor enthusiasts"
- medianRent: approximate median monthly rent in USD as integer (realistic for this neighborhood)
- medianHomePrice: approximate median home price in USD as integer
- walkScore: estimated Walk Score 0-100 as integer

Return ONLY a valid JSON array of ${count} objects, no markdown, no explanation.`;

	const msg = await client.chat.completions.create({
		model: "grok-3-mini",
		max_tokens: count <= 2 ? 600 : count <= 3 ? 800 : 1200,
		messages: [{ role: "user", content: prompt }],
	});

	const text = (msg.choices[0].message.content ?? "").trim();
	const json = text.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
	const raw = JSON.parse(json) as NeighborhoodRow[];

	return raw.map((n) => ({
		name: String(n.name),
		description: String(n.description ?? ""),
		lat: Number(n.lat) || cityLat,
		lng: Number(n.lng) || cityLng,
		vibeKeywords: (Array.isArray(n.vibeKeywords) ? n.vibeKeywords : [])
			.filter((v: string) => VALID_VIBES.has(v)),
		pros: Array.isArray(n.pros) ? n.pros.map(String).slice(0, 3) : [],
		cons: Array.isArray(n.cons) ? n.cons.map(String).slice(0, 3) : [],
		bestFor: (Array.isArray(n.bestFor) ? n.bestFor : [])
			.filter((v: string) => VALID_BEST_FOR.has(v)).slice(0, 2),
		medianRent: Math.max(0, Math.round(Number(n.medianRent) || 0)),
		medianHomePrice: Math.max(0, Math.round(Number(n.medianHomePrice) || 0)),
		walkScore: Math.min(100, Math.max(0, Math.round(Number(n.walkScore) || 50))),
	}));
}

async function main() {
	const cities = sqlite.prepare(`
		SELECT id, name, state_id, lat, lng, overall_score, population
		FROM cities
		WHERE lat IS NOT NULL AND lng IS NOT NULL
		  AND (population IS NULL OR population >= ?)
		ORDER BY overall_score DESC
		LIMIT ?
	`).all(MIN_POP, LIMIT) as Array<{
		id: string; name: string; state_id: string;
		lat: number; lng: number; overall_score: number; population: number | null;
	}>;

	console.log(`🏘️  Generating neighborhoods for ${cities.length} cities`);
	console.log(`   Tiers: >250k → 5 hoods | 150-250k → 3 hoods | <150k → 2 hoods`);
	if (DRY_RUN) console.log("   DRY RUN — no writes");

	const hasNeighborhoods = sqlite.prepare(
		"SELECT COUNT(*) as n FROM neighborhoods WHERE city_id = ?"
	);

	// Check for OSM hint names written by enrich-neighborhoods-osm.ts
	const getOsmHints = (() => {
		const tableExists = sqlite.prepare(
			"SELECT name FROM sqlite_master WHERE type='table' AND name='neighborhood_hints'"
		).get() != null;
		if (!tableExists) return (_cityId: string): string[] => [];
		return (cityId: string): string[] => {
			const row = sqlite.prepare(
				"SELECT names FROM neighborhood_hints WHERE city_id = ?"
			).get(cityId) as { names: string } | undefined;
			if (!row?.names) return [];
			try { return JSON.parse(row.names) as string[]; } catch { return []; }
		};
	})();

	let done = 0; let skipped = 0; let failed = 0;
	const tierCounts: Record<string, number> = { "5 hoods": 0, "3 hoods": 0, "2 hoods": 0 };

	for (const city of cities) {
		const count = neighborhoodCount(city.population);
		const tierKey = `${count} hoods` as keyof typeof tierCounts;

		const existing = (hasNeighborhoods.get(city.id) as { n: number }).n;
		if (existing > 0 && !REPLACE) {
			skipped++;
			continue;
		}

		process.stdout.write(
			`\r  [${done + skipped + failed + 1}/${cities.length}] ${city.name}, ${city.state_id} (${count} hoods, pop ${(city.population ?? 0).toLocaleString()})...    `
		);

		try {
			const osmHints = getOsmHints(city.id);
			const hoods = await generateNeighborhoods(
				city.name, city.state_id, city.lat, city.lng, count, osmHints.length >= 2 ? osmHints : undefined,
			);

			if (DRY_RUN) {
				console.log(`\n  ${city.name}: ${hoods.map((h) => h.name).join(", ")}`);
				done++;
				tierCounts[tierKey] = (tierCounts[tierKey] ?? 0) + 1;
				continue;
			}

			if (REPLACE) {
				sqlite.prepare("DELETE FROM neighborhoods WHERE city_id = ?").run(city.id);
			}

			const insert = sqlite.prepare(`
				INSERT INTO neighborhoods
				  (id, city_id, name, description, lat, lng, vibe_keywords,
				   pros, cons, best_for,
				   median_rent, median_home_price, walk_score, created_at, updated_at)
				VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
			`);

			const insertMany = sqlite.transaction((rows: NeighborhoodRow[]) => {
				for (const h of rows) {
					insert.run(
						createId(), city.id,
						h.name, h.description, h.lat, h.lng,
						JSON.stringify(h.vibeKeywords),
						JSON.stringify(h.pros),
						JSON.stringify(h.cons),
						JSON.stringify(h.bestFor),
						h.medianRent, h.medianHomePrice, h.walkScore,
					);
				}
			});
			insertMany(hoods);
			done++;
			tierCounts[tierKey] = (tierCounts[tierKey] ?? 0) + 1;
		} catch (err) {
			console.error(`\n  ❌ ${city.name}: ${(err as Error).message}`);
			failed++;
		}

		await new Promise((r) => setTimeout(r, 200));
	}

	process.stdout.write("\n");
	console.log(`\n✅ Done: ${done} cities seeded, ${skipped} skipped, ${failed} failed`);
	console.log(`   Tier breakdown: ${JSON.stringify(tierCounts)}`);
	console.log(`   Total neighborhoods: ${(sqlite.prepare("SELECT COUNT(*) as n FROM neighborhoods").get() as { n: number }).n}`);
}

main().catch(console.error);
