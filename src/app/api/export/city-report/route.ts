import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { isPremium } from "@/lib/premium";
import { db } from "@/db";

export async function POST(req: NextRequest) {
	const session = await getServerSession(authOptions);

	if (!isPremium(session)) {
		return NextResponse.json(
			{ error: "Premium required", upgrade_url: "/upgrade" },
			{ status: 402 },
		);
	}

	const { slug } = (await req.json()) as { slug: string };
	if (!slug) return NextResponse.json({ error: "slug required" }, { status: 400 });

	const city = await db.query.cities.findFirst({
		where: (c, { eq }) => eq(c.slug, slug),
		with: { housing: true, jobs: true, climate: true, safety: true, schools: true, walkability: true },
	});

	if (!city) return NextResponse.json({ error: "City not found" }, { status: 404 });

	// TODO: replace with Puppeteer or @react-pdf/renderer for actual PDF generation.
	// For now, return a JSON "report" — frontend can print/save this via browser print dialog.
	return NextResponse.json({
		city: city.name,
		report: {
			housing: city.housing,
			jobs: city.jobs,
			climate: city.climate,
			safety: city.safety,
			schools: city.schools,
			walkability: city.walkability,
		},
		generatedAt: new Date().toISOString(),
		note: "Full PDF generation coming soon. Use browser File → Print → Save as PDF for now.",
	});
}
