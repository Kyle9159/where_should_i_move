import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { eq } from "drizzle-orm";
import { randomUUID } from "crypto";
import { authOptions } from "@/lib/auth";
import { db } from "@/db";
import { savedComparisons } from "@/db/schema";

export async function GET(_req: NextRequest) {
	const session = await getServerSession(authOptions);
	if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

	const comparisons = await db.query.savedComparisons.findMany({
		where: (c, { eq }) => eq(c.userId, session.user!.id!),
		orderBy: (c, { desc }) => [desc(c.createdAt)],
		limit: 50,
	});

	return NextResponse.json({ comparisons });
}

export async function POST(req: NextRequest) {
	const session = await getServerSession(authOptions);
	if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

	const body = (await req.json()) as { name?: string; cityIds: string[] };
	if (!body.cityIds?.length) return NextResponse.json({ error: "cityIds required" }, { status: 400 });

	const name = body.name || `Comparison ${new Date().toLocaleDateString()}`;

	await (db as any).insert(savedComparisons).values({
		id: randomUUID(),
		userId: session.user.id,
		name,
		cityIds: JSON.stringify(body.cityIds),
	});

	return NextResponse.json({ ok: true }, { status: 201 });
}

export async function DELETE(req: NextRequest) {
	const session = await getServerSession(authOptions);
	if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

	const { id } = (await req.json()) as { id: string };
	if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

	const comp = await db.query.savedComparisons.findFirst({
		where: (c, { and, eq }) => and(eq(c.id, id), eq(c.userId, session.user!.id!)),
	});
	if (!comp) return NextResponse.json({ error: "Not found" }, { status: 404 });

	await (db as any).delete(savedComparisons).where(eq(savedComparisons.id, id));
	return NextResponse.json({ ok: true });
}
