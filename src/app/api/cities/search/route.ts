import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { db } from "@/db";

export async function GET(req: NextRequest) {
	const q = req.nextUrl.searchParams.get("q")?.trim() ?? "";
	if (q.length < 2) return NextResponse.json([]);

	const cities = await db.query.cities.findMany({
		where: (c, { like, or }) => or(
			like(c.name, `${q}%`),
			like(c.name, `% ${q}%`),
		),
		with: {
			state: { columns: { name: true, costIndex: true, taxBurden: true } },
			housing: { columns: { medianRent2Bed: true, medianHomePrice: true } },
		},
		columns: { id: true, slug: true, name: true, stateId: true, population: true },
		limit: 8,
		orderBy: (c, { desc }) => [desc(c.population)],
	});

	return NextResponse.json(cities.map((c) => ({
		id: c.id,
		slug: c.slug,
		name: c.name,
		stateId: c.stateId,
		stateName: c.state?.name ?? c.stateId,
		population: c.population,
		costIndex: c.state?.costIndex ?? 100,
		taxBurden: c.state?.taxBurden ?? null,
		medianRent: c.housing?.medianRent2Bed ?? null,
		medianHomePrice: c.housing?.medianHomePrice ?? null,
	})));
}
