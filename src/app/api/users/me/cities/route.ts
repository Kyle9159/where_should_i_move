import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { eq, and } from "drizzle-orm";
import { createId } from "@paralleldrive/cuid2";
import { authOptions } from "@/lib/auth";
import { db } from "@/db";
import { savedCities } from "@/db/schema";

export async function GET() {
	const session = await getServerSession(authOptions);
	if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

	const saved = await db.query.savedCities.findMany({
		where: (t, { eq }) => eq(t.userId, session.user.id),
		with: {
			city: {
				with: { filterScores: true },
				columns: { id: true, slug: true, name: true, stateId: true, overallScore: true, heroImageUrl: true, thumbnailUrl: true, tier: true },
			},
		},
		orderBy: (t, { desc }) => [desc(t.addedAt)],
	});

	return NextResponse.json(saved);
}

export async function POST(req: NextRequest) {
	const session = await getServerSession(authOptions);
	if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

	const { cityId, notes } = await req.json() as { cityId: string; notes?: string };
	if (!cityId) return NextResponse.json({ error: "cityId required" }, { status: 400 });

	await db
		.insert(savedCities)
		.values({ id: createId(), userId: session.user.id, cityId, notes })
		.onConflictDoNothing();

	return NextResponse.json({ ok: true }, { status: 201 });
}

export async function DELETE(req: NextRequest) {
	const session = await getServerSession(authOptions);
	if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

	const { cityId } = await req.json() as { cityId: string };
	if (!cityId) return NextResponse.json({ error: "cityId required" }, { status: 400 });

	await db.delete(savedCities).where(
		and(eq(savedCities.userId, session.user.id), eq(savedCities.cityId, cityId)),
	);

	return NextResponse.json({ ok: true });
}
