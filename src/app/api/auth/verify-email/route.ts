import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET(req: NextRequest) {
	const token = req.nextUrl.searchParams.get("token");
	if (!token) return NextResponse.redirect(new URL("/auth/signin?error=invalid", req.url));

	const user = await db.query.users.findFirst({
		where: (u, { eq }) => eq(u.emailVerifyToken, token),
		columns: { id: true, emailVerified: true },
	});

	if (!user) {
		return NextResponse.redirect(new URL("/auth/signin?error=invalid_token", req.url));
	}

	if (user.emailVerified) {
		return NextResponse.redirect(new URL("/dashboard?verified=already", req.url));
	}

	await (db as any).update(users)
		.set({ emailVerified: true, emailVerifyToken: null })
		.where(eq(users.id, user.id));

	return NextResponse.redirect(new URL("/dashboard?verified=1", req.url));
}
