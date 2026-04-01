import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { eq } from "drizzle-orm";
import { randomUUID } from "crypto";
import { authOptions } from "@/lib/auth";
import { db } from "@/db";
import { savedSearches } from "@/db/schema";

export async function GET(_req: NextRequest) {
	const session = await getServerSession(authOptions);
	if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

	const searches = await db.query.savedSearches.findMany({
		where: (s, { eq }) => eq(s.userId, session.user!.id!),
		orderBy: (s, { desc }) => [desc(s.createdAt)],
		limit: 50,
	});

	return NextResponse.json({ searches });
}

export async function POST(req: NextRequest) {
	const session = await getServerSession(authOptions);
	if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

	const body = (await req.json()) as {
		name?: string;
		filterState: string; // JSON string of filter state
		resultCount?: number;
	};

	if (!body.filterState) return NextResponse.json({ error: "filterState required" }, { status: 400 });

	const name = body.name || `Search ${new Date().toLocaleDateString()}`;

	await (db as any).insert(savedSearches).values({
		id: randomUUID(),
		userId: session.user.id,
		name,
		filterState: body.filterState,
		resultCount: body.resultCount ?? null,
		lastRunAt: new Date().toISOString(),
	});

	return NextResponse.json({ ok: true }, { status: 201 });
}

export async function DELETE(req: NextRequest) {
	const session = await getServerSession(authOptions);
	if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

	const { id } = (await req.json()) as { id: string };
	if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

	// Verify ownership before deleting
	const search = await db.query.savedSearches.findFirst({
		where: (s, { and, eq }) => and(eq(s.id, id), eq(s.userId, session.user!.id!)),
	});
	if (!search) return NextResponse.json({ error: "Not found" }, { status: 404 });

	await (db as any).delete(savedSearches).where(eq(savedSearches.id, id));
	return NextResponse.json({ ok: true });
}

export async function PATCH(req: NextRequest) {
	const session = await getServerSession(authOptions);
	if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

	const { id, alertEnabled } = (await req.json()) as { id: string; alertEnabled: boolean };
	if (!id || alertEnabled === undefined) return NextResponse.json({ error: "id and alertEnabled required" }, { status: 400 });

	const search = await db.query.savedSearches.findFirst({
		where: (s, { and, eq }) => and(eq(s.id, id), eq(s.userId, session.user!.id!)),
	});
	if (!search) return NextResponse.json({ error: "Not found" }, { status: 404 });

	await (db as any).update(savedSearches).set({ alertEnabled }).where(eq(savedSearches.id, id));
	return NextResponse.json({ ok: true });
}
