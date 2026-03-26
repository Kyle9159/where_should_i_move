import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { db } from "@/db";
import { getAirQuality } from "@/lib/epa-airnow";

export async function GET(
	_req: NextRequest,
	{ params }: { params: Promise<{ slug: string }> },
) {
	const { slug } = await params;

	const city = await db.query.cities.findFirst({
		where: (c, { eq }) => eq(c.slug, slug),
		with: { climate: { columns: { airQualityIndex: true } } },
	});
	if (!city) return NextResponse.json({ error: "Not found" }, { status: 404 });

	// Try live AirNow data if key is set and city has coordinates
	if (process.env.AIRNOW_API_KEY && city.lat && city.lng) {
		const live = await getAirQuality(city.lat, city.lng);
		if (live) {
			return NextResponse.json({ ...live, source: "airnow_live" });
		}
	}

	// Fallback to seeded AQI estimate
	return NextResponse.json({
		aqi: city.climate?.airQualityIndex ?? null,
		category: null,
		source: "estimate",
	});
}
