/**
 * Priority photo seeder — fetches photos for large cities missing hero images,
 * prioritized by population (not overall score).
 *
 * Run: npx tsx src/db/seed-photos-priority.ts
 * Options:
 *   MIN_POP=50000   — minimum population threshold (default: 50000)
 *   DELAY_MS=73000  — ms between calls (default: 73000 for 50/hr demo tier)
 *   DRY_RUN=1       — print list without fetching
 */
import { config } from "dotenv";
import { resolve } from "path";
config({ path: resolve(process.cwd(), ".env.local") });

import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { createId } from "@paralleldrive/cuid2";
import { eq } from "drizzle-orm";
import * as schema from "./schema";
import { searchCityPhotos } from "../lib/unsplash";

const dbUrl = process.env.DATABASE_URL?.replace("file:", "") ?? "./nexthome.db";
const sqlite = new Database(dbUrl);
const db = drizzle(sqlite, { schema });

const MIN_POP = parseInt(process.env.MIN_POP ?? "50000", 10);
const DELAY_MS = parseInt(process.env.DELAY_MS ?? "73000", 10);
const DRY_RUN = process.env.DRY_RUN === "1";

async function sleep(ms: number) {
	return new Promise((r) => setTimeout(r, ms));
}

async function main() {
	const apiKey = process.env.UNSPLASH_ACCESS_KEY;
	if (!apiKey && !DRY_RUN) {
		console.error("❌ UNSPLASH_ACCESS_KEY not set in environment");
		process.exit(1);
	}

	// Cities missing photos, sorted by population descending
	const missing = sqlite
		.prepare(
			`SELECT c.id, c.name, c.state_id, c.population
			 FROM cities c
			 WHERE c.hero_image_url IS NULL
			   AND c.population >= ?
			 ORDER BY c.population DESC`,
		)
		.all(MIN_POP) as Array<{ id: string; name: string; state_id: string; population: number }>;

	const etaMins = Math.round((missing.length * DELAY_MS) / 1000 / 60);
	console.log(`📸 ${missing.length} cities ≥ ${MIN_POP.toLocaleString()} pop missing photos`);
	console.log(`⏱  ${DELAY_MS / 1000}s delay → ETA: ~${etaMins} min`);

	if (DRY_RUN) {
		missing.forEach((c) => console.log(`  ${c.population?.toLocaleString()} ${c.name}, ${c.state_id}`));
		return;
	}

	let ok = 0;
	let failed = 0;

	for (let i = 0; i < missing.length; i++) {
		const city = missing[i];
		const photos = await searchCityPhotos(city.name, city.state_id, 4);

		if (photos.length === 0) {
			failed++;
			console.log(`[${i + 1}/${missing.length}] ${city.name}, ${city.state_id} ❌ no results`);
			await sleep(DELAY_MS);
			continue;
		}

		// Insert photos
		for (let j = 0; j < photos.length; j++) {
			const p = photos[j];
			await db
				.insert(schema.cityPhotos)
				.values({
					id: createId(),
					cityId: city.id,
					url: p.urls.regular,
					thumbnailUrl: p.urls.small,
					credit: p.user.name,
					source: "unsplash",
					sourceId: p.id,
					width: p.width,
					height: p.height,
					isPrimary: j === 0,
				})
				.onConflictDoNothing();
		}

		// Update hero image on city row
		if (photos[0]) {
			await db
				.update(schema.cities)
				.set({
					heroImageUrl: photos[0].urls.regular,
					thumbnailUrl: photos[0].urls.small,
					unsplashPhotoId: photos[0].id,
				})
				.where(eq(schema.cities.id, city.id));
		}

		ok++;
		console.log(`[${i + 1}/${missing.length}] ${city.name}, ${city.state_id} ✅ (${photos.length} photos)`);

		if (i < missing.length - 1) await sleep(DELAY_MS);
	}

	console.log(`\n✅ Done: ${ok} success, ${failed} failed`);
	sqlite.close();
}

main().catch((e) => {
	console.error(e);
	process.exit(1);
});
