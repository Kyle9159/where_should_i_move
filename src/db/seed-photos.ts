/**
 * Photo seed script — fetches Unsplash photos for the top N cities by
 * overall score and stores them in the city_photos table.
 *
 * Run: npm run db:seed:photos
 *
 * Rate limit: Unsplash demo tier = 50 req/hour. This script adds a
 * 1.5s delay between calls to respect that limit.
 * Production (approved app): 5,000 req/hour — can reduce the delay.
 */
import { config } from "dotenv";
import { resolve } from "path";
// Load .env.local from repo root
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

const LIMIT = parseInt(process.env.PHOTO_LIMIT ?? "200", 10); // top N cities
const DELAY_MS = 1500; // ~40 req/min → safe for 50 req/hr demo tier

async function sleep(ms: number) {
	return new Promise((r) => setTimeout(r, ms));
}

async function main() {
	const apiKey = process.env.UNSPLASH_ACCESS_KEY;
	if (!apiKey) {
		console.error("❌ UNSPLASH_ACCESS_KEY not set in environment");
		process.exit(1);
	}

	// Get top cities that don't have photos yet
	const cities = await db.query.cities.findMany({
		orderBy: (c, { desc }) => [desc(c.overallScore)],
		limit: LIMIT,
		with: { photos: true },
	});

	const needsPhotos = cities.filter((c) => c.photos.length === 0);
	console.log(`📸 Fetching Unsplash photos for ${needsPhotos.length} cities (${LIMIT} total, ${cities.length - needsPhotos.length} already have photos)...`);

	let fetched = 0;
	let failed = 0;

	for (const city of needsPhotos) {
		const photos = await searchCityPhotos(city.name, city.stateId, 4);

		if (photos.length === 0) {
			failed++;
			await sleep(DELAY_MS);
			continue;
		}

		// Insert photos
		for (let i = 0; i < photos.length; i++) {
			const p = photos[i];
			await db.insert(schema.cityPhotos).values({
				id: createId(),
				cityId: city.id,
				url: p.urls.regular,
				thumbnailUrl: p.urls.small,
				credit: p.user.name,
				source: "unsplash",
				sourceId: p.id,
				width: p.width,
				height: p.height,
				isPrimary: i === 0,
			}).onConflictDoNothing();
		}

		// Update hero image on the city row
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

		fetched++;
		if (fetched % 10 === 0) {
			process.stdout.write(`\r  ✓ ${fetched} cities fetched...`);
		}

		await sleep(DELAY_MS);
	}

	console.log(`\n✅ Photos seeded: ${fetched} success, ${failed} failed`);
	sqlite.close();
}

main().catch((err) => {
	console.error("Photo seed failed:", err);
	process.exit(1);
});
