import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";

export async function GET(
	_req: NextRequest,
	{ params }: { params: Promise<{ slug: string }> },
) {
	try {
		const { slug } = await params;

		const city = await db.query.cities.findFirst({
			where: (c, { eq }) => eq(c.slug, slug),
			with: {
				state: true,
				housing: true,
				jobs: true,
				climate: true,
				safety: true,
				schools: true,
				walkability: true,
				demographics: true,
				lifestyle: true,
				filterScores: true,
				photos: true,
				neighborhoods: true,
			},
		});

		if (!city) {
			return NextResponse.json({ error: "City not found" }, { status: 404 });
		}

		return NextResponse.json(city, {
			headers: { "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400" },
		});
	} catch (err) {
		console.error("City detail error:", err);
		return NextResponse.json({ error: "Internal server error", detail: String(err) }, { status: 500 });
	}
}
