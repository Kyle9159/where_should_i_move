import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { renderToBuffer } from "@react-pdf/renderer";
import { createElement } from "react";
import { authOptions } from "@/lib/auth";
import { isPremium } from "@/lib/premium";
import { db } from "@/db";
import { CityReportPdf } from "@/lib/cityPdf";

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
		with: {
			housing: true,
			jobs: true,
			climate: true,
			safety: true,
			schools: true,
			walkability: true,
		},
	});

	if (!city) return NextResponse.json({ error: "City not found" }, { status: 404 });

	const generatedAt = new Date().toISOString();

	// Generate PDF buffer server-side (no browser / Puppeteer needed).
	// Cast needed because renderToBuffer's TS overload expects DocumentProps directly,
	// but our wrapper component is valid at runtime.
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const pdfBuffer = await renderToBuffer(
		createElement(CityReportPdf, { city, generatedAt }) as any,
	);

	const filename = `nexthome-${city.slug}-report.pdf`;

	// Buffer isn't a valid BodyInit in the Web Fetch API — convert to Uint8Array
	return new NextResponse(new Uint8Array(pdfBuffer), {
		status: 200,
		headers: {
			"Content-Type": "application/pdf",
			"Content-Disposition": `attachment; filename="${filename}"`,
			"Content-Length": String(pdfBuffer.byteLength),
		},
	});
}
