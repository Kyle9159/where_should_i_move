import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function POST(req: NextRequest) {
	const { token, password } = (await req.json()) as { token?: string; password?: string };

	if (!token || !password || password.length < 8) {
		return NextResponse.json({ error: "Token and password (8+ chars) required" }, { status: 400 });
	}

	const user = await db.query.users.findFirst({
		where: (u, { eq }) => eq(u.passwordResetToken, token),
		columns: { id: true, passwordResetExpiresAt: true },
	});

	if (!user) {
		return NextResponse.json({ error: "Invalid or expired reset link" }, { status: 400 });
	}

	if (user.passwordResetExpiresAt && new Date(user.passwordResetExpiresAt) < new Date()) {
		return NextResponse.json({ error: "Reset link has expired. Request a new one." }, { status: 400 });
	}

	const hash = await bcrypt.hash(password, 12);

	await (db as any).update(users)
		.set({
			passwordHash: hash,
			passwordResetToken: null,
			passwordResetExpiresAt: null,
		})
		.where(eq(users.id, user.id));

	return NextResponse.json({ ok: true });
}
