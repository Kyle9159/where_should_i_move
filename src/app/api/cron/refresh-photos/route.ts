/**
 * Cron: Fetch Unsplash photos for cities that don't have any yet.
 * Runs weekly (Sunday 04:00 UTC). Protected by CRON_SECRET via middleware.
 *
 * Processes up to 40 cities per run (respects 50 req/hr Unsplash demo limit
 * plus the 200ms delay gives ~3 min per run).
 */
import { NextResponse } from "next/server";
import { db } from "@/db";
import { cities, cityPhotos } from "@/db/schema";
import { eq } from "drizzle-orm";
import { searchCityPhotos } from "@/lib/unsplash";
import { randomUUID } from "crypto";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const BATCH = 40; // max cities per cron run

export async function GET() {
	if (!process.env.UNSPLASH_ACCESS_KEY) {
		return NextResponse.json({ skipped: true, reason: "UNSPLASH_ACCESS_KEY not set" });
	}

	// Cities without photos, ordered by overall score
	const allCities = await db.query.cities.findMany({
		with: { photos: { columns: { id: true } } },
		orderBy: (c, { desc }) => [desc(c.overallScore)],
		columns: { id: true, name: true, stateId: true },
	});

	const needPhotos = allCities
		.filter((c) => c.photos.length === 0)
		.slice(0, BATCH);

	if (needPhotos.length === 0) {
		return NextResponse.json({ ok: true, updated: 0, message: "All cities have photos" });
	}

	let updated = 0;

	for (const city of needPhotos) {
		const photos = await searchCityPhotos(city.name, city.stateId, 4);
		if (photos.length === 0) continue;

		for (let i = 0; i < photos.length; i++) {
			const p = photos[i];
			await (db as any).insert(cityPhotos).values({
				id: randomUUID(),
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
			await (db as any).update(cities).set({
				heroImageUrl: photos[0].urls.regular,
				thumbnailUrl: photos[0].urls.small,
				unsplashPhotoId: photos[0].id,
			}).where(eq(cities.id, city.id));
		}

		updated++;
		await new Promise((r) => setTimeout(r, 1200));
	}

	return NextResponse.json({
		ok: true,
		updated,
		processed: needPhotos.length,
		timestamp: new Date().toISOString(),
	});
}
