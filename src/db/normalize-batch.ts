/**
 * Batch normalize: compute city_filter_scores for any cities missing them.
 * Run: npx tsx src/db/normalize-batch.ts
 * Options:
 *   ALL=1    — re-compute scores for ALL cities, not just missing ones
 */
import { config } from "dotenv";
import { resolve } from "path";
config({ path: resolve(process.cwd(), ".env.local") });

import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "./schema";
import { computeAllScores } from "./normalize";

const RECOMPUTE_ALL = process.env.ALL === "1";
const dbUrl = process.env.DATABASE_URL?.replace("file:", "") ?? "./nexthome.db";
const sqlite = new Database(dbUrl);
const db = drizzle(sqlite, { schema });

async function main() {
	// Find cities missing filter scores (or all cities if ALL=1)
	const query = RECOMPUTE_ALL
		? "SELECT id, name, state_id FROM cities ORDER BY overall_score DESC"
		: `SELECT c.id, c.name, c.state_id FROM cities c
		   LEFT JOIN city_filter_scores fs ON fs.city_id = c.id
		   WHERE fs.id IS NULL
		   ORDER BY c.overall_score DESC`;

	const cities = sqlite.prepare(query).all() as Array<{
		id: string;
		name: string;
		state_id: string;
	}>;

	if (cities.length === 0) {
		console.log("✅ All cities already have filter scores.");
		sqlite.close();
		return;
	}

	console.log(
		`🧮 Computing filter scores for ${cities.length} cities${RECOMPUTE_ALL ? " (ALL mode)" : " (missing only)"}...`
	);

	// computeAllScores processes all cities in one pass — no need to loop per city.
	// The cityIds filter scopes which cities to update.
	const cityIds = RECOMPUTE_ALL ? undefined : cities.map((c) => c.id);
	const ok = await computeAllScores(db, cityIds);

	const total = (sqlite.prepare("SELECT COUNT(*) as c FROM city_filter_scores").get() as { c: number }).c;
	console.log(`\n✅ Done! ${ok} cities scored.`);
	console.log(`   Total rows in city_filter_scores: ${total}`);

	sqlite.close();
}

main().catch((e) => {
	console.error(e);
	process.exit(1);
});
