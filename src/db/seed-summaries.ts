/**
 * Pre-generates Grok AI summaries for the top N cities by overall score.
 * Run: npm run db:seed:summaries
 *
 * Uses 2s delay between calls. At grok-4-1-fast-reasoning speeds,
 * 200 cities takes ~10 minutes.
 */
import { config } from "dotenv";
import { resolve } from "path";
config({ path: resolve(process.cwd(), ".env.local") });

const LIMIT = parseInt(process.env.SUMMARY_LIMIT ?? "200", 10);
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3010";
const DELAY_MS = 2000;

async function sleep(ms: number) {
	return new Promise((r) => setTimeout(r, ms));
}

async function main() {
	const apiKey = process.env.XAI_API_KEY;
	if (!apiKey) { console.error("❌ XAI_API_KEY not set"); process.exit(1); }

	// Get city slugs ordered by score
	const Database = (await import("better-sqlite3")).default;
	const db = new Database("./nexthome.db");
	const cities = db.prepare(
		"SELECT slug, name FROM cities WHERE overall_score IS NOT NULL ORDER BY overall_score DESC LIMIT ?",
	).all(LIMIT) as Array<{ slug: string; name: string }>;
	db.close();

	console.log(`🤖 Pre-generating Grok summaries for ${cities.length} cities...`);

	let success = 0;
	let skipped = 0;
	let failed = 0;

	for (let i = 0; i < cities.length; i++) {
		const { slug, name } = cities[i];

		// Call the summary API endpoint (which handles caching)
		try {
			const res = await fetch(`${APP_URL}/api/cities/${slug}/summary`, {
				signal: AbortSignal.timeout(15_000),
			});

			if (res.ok) {
				const data = await res.json() as { summary: string | null; cached: boolean };
				if (data.cached) skipped++;
				else if (data.summary) success++;
				else failed++;
			} else {
				failed++;
			}
		} catch {
			failed++;
		}

		if ((i + 1) % 10 === 0) {
			process.stdout.write(`\r  ✓ ${success} generated, ${skipped} cached, ${failed} failed (${i + 1}/${cities.length})`);
		}

		await sleep(DELAY_MS);
	}

	console.log(`\n✅ Done: ${success} new, ${skipped} already cached, ${failed} failed`);
}

main().catch((err) => { console.error(err); process.exit(1); });
