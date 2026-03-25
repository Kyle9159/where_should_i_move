import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db";

const Schema = z.object({
	cityIds: z.array(z.string()).min(2).max(4),
});

export async function POST(req: NextRequest) {
	try {
		const body = await req.json() as unknown;
		const parsed = Schema.safeParse(body);

		if (!parsed.success) {
			return NextResponse.json({ error: "Provide 2–4 city IDs or slugs" }, { status: 400 });
		}

		const { cityIds } = parsed.data;

		const cities = await Promise.all(
			cityIds.map((idOrSlug) =>
				db.query.cities.findFirst({
					where: (c, { or, eq }) => or(eq(c.id, idOrSlug), eq(c.slug, idOrSlug)),
					with: {
						state: true,
						housing: true,
						jobs: true,
						climate: true,
						safety: true,
						schools: true,
						walkability: true,
						lifestyle: true,
						filterScores: true,
					},
				}),
			),
		);

		const validCities = cities.filter(Boolean);

		if (validCities.length < 2) {
			return NextResponse.json({ error: "Could not find enough cities" }, { status: 404 });
		}

		return NextResponse.json({ cities: validCities });
	} catch (err) {
		console.error("Compare error:", err);
		return NextResponse.json({ error: "Internal error" }, { status: 500 });
	}
}
