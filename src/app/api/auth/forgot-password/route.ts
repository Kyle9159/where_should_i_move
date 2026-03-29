import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { randomBytes } from "crypto";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3010";
const TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hour

export async function POST(req: NextRequest) {
	const { email } = (await req.json()) as { email?: string };
	if (!email) return NextResponse.json({ error: "Email required" }, { status: 400 });

	const user = await db.query.users.findFirst({
		where: (u, { eq }) => eq(u.email, email.toLowerCase().trim()),
		columns: { id: true, name: true, passwordHash: true },
	});

	// Always return success to prevent user enumeration
	if (!user?.passwordHash) {
		return NextResponse.json({ ok: true });
	}

	const token = randomBytes(32).toString("hex");
	const expiresAt = new Date(Date.now() + TOKEN_TTL_MS).toISOString();

	await (db as any).update(users)
		.set({ passwordResetToken: token, passwordResetExpiresAt: expiresAt })
		.where(eq(users.id, user.id));

	// Send reset email
	const resetUrl = `${APP_URL}/auth/reset-password?token=${token}`;
	const { send } = await import("@/lib/email").then((m) => ({ send: m }));

	if (process.env.RESEND_API_KEY) {
		const { Resend } = await import("resend");
		const resend = new Resend(process.env.RESEND_API_KEY);
		await resend.emails.send({
			from: process.env.EMAIL_FROM ?? "Where Should I Move <notifications@whereshouldimove.us>",
			to: email,
			subject: "Reset your Where Should I Move password",
			html: `
				<div style="font-family:sans-serif;max-width:500px;margin:40px auto;background:#111;color:#e0e0e0;padding:32px;border-radius:16px;border:1px solid #222">
					<h2 style="color:#00d4ff;margin-top:0">Reset your password</h2>
					<p>Hi ${user.name ?? "there"}, click the button below to reset your password. This link expires in 1 hour.</p>
					<a href="${resetUrl}" style="display:inline-block;background:#00d4ff;color:#000;padding:12px 24px;border-radius:10px;font-weight:600;text-decoration:none;margin:16px 0">Reset Password</a>
					<p style="color:#888;font-size:13px">If you didn't request this, you can safely ignore this email.</p>
					<p style="color:#555;font-size:12px">Link expires: ${new Date(expiresAt).toLocaleString()}</p>
				</div>
			`,
		}).catch(() => {});
	}

	return NextResponse.json({ ok: true });
}
