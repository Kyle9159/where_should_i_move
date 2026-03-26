import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/db";
import { cityReviews } from "@/db/schema";
import { randomUUID } from "crypto";

// ── GET: approved reviews for a city ────────────────────────────────────────

export async function GET(
	_req: NextRequest,
	{ params }: { params: Promise<{ slug: string }> },
) {
	const { slug } = await params;

	const city = await db.query.cities.findFirst({
		where: (c, { eq }) => eq(c.slug, slug),
	});
	if (!city) return NextResponse.json({ error: "Not found" }, { status: 404 });

	const rows = await db.query.cityReviews.findMany({
		where: (r, { and, eq }) =>
			and(eq(r.cityId, city.id), eq(r.status, "approved")),
		with: { user: { columns: { name: true } } },
		orderBy: (r, { desc }) => [desc(r.createdAt)],
		limit: 50,
	});

	const reviews = rows.map((r) => ({
		id: r.id,
		rating: r.rating,
		body: r.body,
		pros: r.pros,
		cons: r.cons,
		yearsLivedThere: r.yearsLivedThere,
		livedFrom: r.livedFrom,
		livedTo: r.livedTo,
		createdAt: r.createdAt,
		authorName: r.user?.name ?? null,
	}));

	return NextResponse.json({ reviews });
}

// ── POST: submit a review (auth required) ───────────────────────────────────

const ALLOWED_RATINGS = [1, 2, 3, 4, 5];

export async function POST(
	req: NextRequest,
	{ params }: { params: Promise<{ slug: string }> },
) {
	const { slug } = await params;

	const session = await getServerSession(authOptions);
	if (!session?.user?.id) {
		return NextResponse.json({ error: "Sign in to leave a review" }, { status: 401 });
	}

	const city = await db.query.cities.findFirst({
		where: (c, { eq }) => eq(c.slug, slug),
	});
	if (!city) return NextResponse.json({ error: "City not found" }, { status: 404 });

	// Prevent duplicate reviews from the same user
	const existing = await db.query.cityReviews.findFirst({
		where: (r, { and, eq }) =>
			and(eq(r.cityId, city.id), eq(r.userId, session.user!.id!)),
	});
	if (existing) {
		return NextResponse.json(
			{ error: "You've already reviewed this city" },
			{ status: 409 },
		);
	}

	const body = (await req.json()) as {
		rating?: number;
		body?: string;
		pros?: string[];
		cons?: string[];
		yearsLivedThere?: number;
		livedFrom?: number;
		livedTo?: number;
	};

	if (!body.body || body.body.trim().length < 20) {
		return NextResponse.json(
			{ error: "Review must be at least 20 characters" },
			{ status: 400 },
		);
	}
	if (body.rating !== undefined && !ALLOWED_RATINGS.includes(body.rating)) {
		return NextResponse.json({ error: "Rating must be 1–5" }, { status: 400 });
	}

	await (db as any).insert(cityReviews).values({
		id: randomUUID(),
		cityId: city.id,
		userId: session.user.id,
		rating: body.rating ?? null,
		body: body.body.trim(),
		pros: body.pros?.length ? JSON.stringify(body.pros) : null,
		cons: body.cons?.length ? JSON.stringify(body.cons) : null,
		yearsLivedThere: body.yearsLivedThere ?? null,
		livedFrom: body.livedFrom ?? null,
		livedTo: body.livedTo ?? null,
		status: "pending",
	});

	return NextResponse.json(
		{ message: "Review submitted! It will appear after moderation." },
		{ status: 201 },
	);
}
