/**
 * Generates top 5 neighborhoods for the top 300 cities using xAI (Grok).
 * Neighborhoods include name, description, approximate lat/lng, vibe tags,
 * and rough housing price data.
 *
 * Run: npm run db:seed:neighborhoods
 *
 * Options:
 *   LIMIT=N       — process only first N cities (default: 300)
 *   DRY_RUN=1     — print output without writing to DB
 *   REPLACE=1     — replace existing neighborhoods (default: skip cities with data)
 */

import { config } from "dotenv";
import { resolve } from "path";
config({ path: resolve(process.cwd(), ".env.local") });

import OpenAI from "openai";
import Database from "better-sqlite3";
import { createId } from "@paralleldrive/cuid2";

const DRY_RUN = process.env.DRY_RUN === "1";
const REPLACE = process.env.REPLACE === "1";
const LIMIT = parseInt(process.env.LIMIT ?? "300", 10);

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

async function generateNeighborhoods(
	cityName: string,
	stateId: string,
	cityLat: number,
	cityLng: number,
): Promise<NeighborhoodRow[]> {
	const prompt = `List the 5 most well-known and distinct neighborhoods in ${cityName}, ${stateId}.

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

Return ONLY a valid JSON array of 5 objects, no markdown, no explanation.`;

	const msg = await client.chat.completions.create({
		model: "grok-3-mini",
		max_tokens: 1024,
		messages: [{ role: "user", content: prompt }],
	});

	const text = (msg.choices[0].message.content ?? "").trim();

	// Strip markdown code fences if present
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
	// Top N cities by overall_score with major-city or mid-size tier
	const cities = sqlite.prepare(`
		SELECT id, name, state_id, lat, lng, overall_score
		FROM cities
		WHERE lat IS NOT NULL AND lng IS NOT NULL
		  AND tier IN ('major-city', 'mid-size')
		ORDER BY overall_score DESC
		LIMIT ?
	`).all(LIMIT) as Array<{
		id: string; name: string; state_id: string;
		lat: number; lng: number; overall_score: number;
	}>;

	console.log(`🏘️  Generating neighborhoods for ${cities.length} cities`);
	if (DRY_RUN) console.log("   DRY RUN — no writes");

	const hasNeighborhoods = sqlite.prepare(
		"SELECT COUNT(*) as n FROM neighborhoods WHERE city_id = ?"
	);

	let done = 0; let skipped = 0; let failed = 0;

	for (const city of cities) {
		const existing = (hasNeighborhoods.get(city.id) as { n: number }).n;
		if (existing > 0 && !REPLACE) {
			skipped++;
			continue;
		}

		process.stdout.write(
			`\r  [${done + skipped + failed + 1}/${cities.length}] ${city.name}, ${city.state_id}...    `
		);

		try {
			const hoods = await generateNeighborhoods(
				city.name, city.state_id, city.lat, city.lng,
			);

			if (DRY_RUN) {
				console.log(`\n  ${city.name}: ${hoods.map((h) => h.name).join(", ")}`);
				done++;
				continue;
			}

			// Clear existing if replacing
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
		} catch (err) {
			console.error(`\n  ❌ ${city.name}: ${(err as Error).message}`);
			failed++;
		}

		// Small delay to be polite to the API
		await new Promise((r) => setTimeout(r, 200));
	}

	process.stdout.write("\n");
	console.log(`\n✅ Done: ${done} cities seeded, ${skipped} skipped, ${failed} failed`);
	console.log(`   Total neighborhoods: ${(sqlite.prepare("SELECT COUNT(*) as n FROM neighborhoods").get() as { n: number }).n}`);
}

main().catch(console.error);
