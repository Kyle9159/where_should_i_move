import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { randomUUID } from "crypto";
import { db } from "@/db";
import { apiCache } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getCityRedditSentiment } from "@/lib/reddit";

const TTL_MS = 86400 * 3 * 1000; // 3 days

export async function GET(
	_req: NextRequest,
	{ params }: { params: Promise<{ slug: string }> },
) {
	const { slug } = await params;

	const city = await db.query.cities.findFirst({
		where: (c, { eq }) => eq(c.slug, slug),
	});
	if (!city) return NextResponse.json({ error: "Not found" }, { status: 404 });

	const cacheKey = `reddit_sentiment_${city.id}`;

	// Check cache first
	const cached = await db.query.apiCache.findFirst({
		where: (c, { eq }) => eq(c.cacheKey, cacheKey),
	});

	if (cached?.responseBody) {
		const age = Date.now() - new Date(cached.fetchedAt ?? 0).getTime();
		if (age < TTL_MS) {
			return NextResponse.json({ sentiment: JSON.parse(cached.responseBody), source: "cache" });
		}
	}

	const sentiment = await getCityRedditSentiment(city.name, city.stateId);
	if (!sentiment) return NextResponse.json({ sentiment: null });

	const expiresAt = new Date(Date.now() + TTL_MS).toISOString();
	const body = JSON.stringify(sentiment);

	try {
		if (cached) {
			await (db as any).update(apiCache)
				.set({ responseBody: body, fetchedAt: new Date().toISOString(), expiresAt })
				.where(eq(apiCache.cacheKey, cacheKey));
		} else {
			await (db as any).insert(apiCache).values({
				id: randomUUID(),
				cacheKey,
				source: "reddit",
				cityId: city.id,
				responseBody: body,
				fetchedAt: new Date().toISOString(),
				expiresAt,
				httpStatus: 200,
			});
		}
	} catch {
		// Cache write failure is non-fatal
	}

	return NextResponse.json({ sentiment, source: "live" });
}
