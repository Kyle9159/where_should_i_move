/**
 * Cron: Refresh AQI for top 100 cities daily at 07:00 UTC.
 * Triggered by Vercel Cron (vercel.json). Protected by CRON_SECRET via middleware.
 *
 * Uses EPA AirNow API — requires AIRNOW_API_KEY in environment.
 * Writes results to city_climate.air_quality_index and api_cache table.
 */
import { NextResponse } from "next/server";
import { db } from "@/db";
import { cityClimate, apiCache } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getAirQuality } from "@/lib/epa-airnow";
import { randomUUID } from "crypto";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET() {
	if (!process.env.AIRNOW_API_KEY) {
		return NextResponse.json({ skipped: true, reason: "AIRNOW_API_KEY not set" });
	}

	// Top 100 cities by overall score that have coordinates
	const cities = await db.query.cities.findMany({
		where: (c, { isNotNull }) => isNotNull(c.lat),
		orderBy: (c, { desc }) => [desc(c.overallScore)],
		limit: 100,
		columns: { id: true, name: true, stateId: true, lat: true, lng: true },
	});

	let updated = 0;
	let skipped = 0;

	for (const city of cities) {
		if (!city.lat || !city.lng) { skipped++; continue; }

		const result = await getAirQuality(city.lat, city.lng);
		if (!result) { skipped++; continue; }

		// Update city_climate
		const climate = await db.query.cityClimate.findFirst({
			where: (c, { eq }) => eq(c.cityId, city.id),
			columns: { id: true },
		});

		if (climate) {
			await (db as any).update(cityClimate)
				.set({ airQualityIndex: result.aqi })
				.where(eq(cityClimate.id, climate.id));
		}

		// Cache the full AirNow result
		const cacheKey = `airnow_aqi_${city.id}`;
		const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
		const existing = await db.query.apiCache.findFirst({
			where: (c, { eq }) => eq(c.cacheKey, cacheKey),
			columns: { id: true },
		});

		if (existing) {
			await (db as any).update(apiCache)
				.set({ responseBody: JSON.stringify(result), fetchedAt: new Date().toISOString(), expiresAt })
				.where(eq(apiCache.id, existing.id));
		} else {
			await (db as any).insert(apiCache).values({
				id: randomUUID(),
				cacheKey,
				source: "airnow",
				cityId: city.id,
				responseBody: JSON.stringify(result),
				fetchedAt: new Date().toISOString(),
				expiresAt,
				httpStatus: 200,
			});
		}

		updated++;
		// Small delay to avoid hammering AirNow
		await new Promise((r) => setTimeout(r, 200));
	}

	return NextResponse.json({
		ok: true,
		updated,
		skipped,
		timestamp: new Date().toISOString(),
	});
}
