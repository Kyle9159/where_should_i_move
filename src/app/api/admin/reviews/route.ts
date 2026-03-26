/**
 * Admin: list pending reviews + approve/reject.
 * Protected by ADMIN_SECRET header (set ADMIN_SECRET in .env.local).
 */
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { db } from "@/db";
import { cityReviews, cities } from "@/db/schema";
import { eq } from "drizzle-orm";

function isAdmin(req: NextRequest) {
	const secret = process.env.ADMIN_SECRET;
	if (!secret) return false;
	// Check Authorization header OR x-admin-secret header
	const auth = req.headers.get("x-admin-secret") ?? req.headers.get("authorization")?.replace("Bearer ", "");
	return auth === secret;
}

// GET /api/admin/reviews?status=pending
export async function GET(req: NextRequest) {
	if (!isAdmin(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

	const status = req.nextUrl.searchParams.get("status") ?? "pending";

	const reviews = await db.query.cityReviews.findMany({
		where: (r, { eq }) => eq(r.status, status),
		with: {
			user: { columns: { name: true, email: true } },
			city: { columns: { name: true, stateId: true, slug: true } },
		},
		orderBy: (r, { desc }) => [desc(r.createdAt)],
		limit: 100,
	});

	return NextResponse.json({ reviews, total: reviews.length });
}

// PATCH /api/admin/reviews — approve or reject a review
export async function PATCH(req: NextRequest) {
	if (!isAdmin(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

	const { id, action } = (await req.json()) as { id: string; action: "approve" | "reject" };
	if (!id || !["approve", "reject"].includes(action)) {
		return NextResponse.json({ error: "id and action (approve|reject) required" }, { status: 400 });
	}

	const newStatus = action === "approve" ? "approved" : "rejected";
	await (db as any).update(cityReviews).set({ status: newStatus }).where(eq(cityReviews.id, id));

	return NextResponse.json({ ok: true, id, status: newStatus });
}

// DELETE /api/admin/reviews — permanently delete a review
export async function DELETE(req: NextRequest) {
	if (!isAdmin(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

	const { id } = (await req.json()) as { id: string };
	if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

	await (db as any).delete(cityReviews).where(eq(cityReviews.id, id));
	return NextResponse.json({ ok: true });
}
