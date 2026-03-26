import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { renderToBuffer } from "@react-pdf/renderer";
import { createElement } from "react";
import { authOptions } from "@/lib/auth";
import { isPremium } from "@/lib/premium";
import { db } from "@/db";
import { CompareReportPdf } from "@/lib/comparePdf";

export async function POST(req: NextRequest) {
	const session = await getServerSession(authOptions);

	if (!isPremium(session)) {
		return NextResponse.json(
			{ error: "Premium required", upgrade_url: "/upgrade" },
			{ status: 402 },
		);
	}

	const { slugs } = (await req.json()) as { slugs: string[] };
	if (!slugs?.length || slugs.length < 2 || slugs.length > 4) {
		return NextResponse.json(
			{ error: "Provide 2–4 city slugs" },
			{ status: 400 },
		);
	}

	const cities = await Promise.all(
		slugs.map((slug) =>
			db.query.cities.findFirst({
				where: (c, { eq }) => eq(c.slug, slug),
				with: { housing: true, jobs: true, climate: true, safety: true, schools: true, walkability: true },
			}),
		),
	);

	const found = cities.filter(Boolean);
	if (found.length < 2) {
		return NextResponse.json({ error: "Cities not found" }, { status: 404 });
	}

	const generatedAt = new Date().toISOString();

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const pdfBuffer = await renderToBuffer(
		createElement(CompareReportPdf, { cities: found as any[], generatedAt }) as any,
	);

	const names = found.map((c) => c!.slug).join("-vs-");
	return new NextResponse(new Uint8Array(pdfBuffer), {
		status: 200,
		headers: {
			"Content-Type": "application/pdf",
			"Content-Disposition": `attachment; filename="nexthome-compare-${names}.pdf"`,
			"Content-Length": String(pdfBuffer.byteLength),
		},
	});
}
