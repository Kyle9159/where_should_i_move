import { type NextAuthOptions, type Session, type User } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { createId } from "@paralleldrive/cuid2";
import { sendWelcomeEmail } from "@/lib/email";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3010";

// Extend session to carry user id and tier
declare module "next-auth" {
	interface Session {
		user: { id: string; name?: string | null; email?: string | null; image?: string | null; tier: string };
	}
}

export const authOptions: NextAuthOptions = {
	secret: process.env.NEXTAUTH_SECRET,
	session: { strategy: "jwt" },
	pages: {
		signIn: "/auth/signin",
		error: "/auth/signin",
	},
	providers: [
		CredentialsProvider({
			name: "Email",
			credentials: {
				email: { label: "Email", type: "email", placeholder: "you@email.com" },
				password: { label: "Password", type: "password" },
				mode: { label: "mode", type: "text" }, // "signin" | "signup"
			},
			async authorize(credentials) {
				if (!credentials?.email || !credentials?.password) return null;

				const email = credentials.email.toLowerCase().trim();
				const existing = await db.query.users.findFirst({
					where: (u, { eq }) => eq(u.email, email),
				});

				if (credentials.mode === "signup") {
					if (existing) return null; // email taken
					const hash = await bcrypt.hash(credentials.password, 12);
					const id = createId();
					const name = email.split("@")[0];
					const verifyToken = randomBytes(32).toString("hex");
					await (db as any).insert(users).values({
						id, email, passwordHash: hash, name,
						emailVerifyToken: verifyToken, emailVerified: false,
					});
					sendWelcomeEmail(email, name).catch(() => {});
					if (process.env.RESEND_API_KEY) {
						const verifyUrl = `${APP_URL}/api/auth/verify-email?token=${verifyToken}`;
						import("resend").then(({ Resend }) => {
							new Resend(process.env.RESEND_API_KEY!).emails.send({
								from: process.env.EMAIL_FROM ?? "Where Should I Move <notifications@whereshouldimove.us>",
								to: email,
								subject: "Verify your Where Should I Move email",
								html: `<div style="font-family:sans-serif;max-width:500px;margin:40px auto;background:#111;color:#e0e0e0;padding:32px;border-radius:16px;border:1px solid #222"><h2 style="color:#00d4ff;margin-top:0">Verify your email</h2><p>Click below to verify your account.</p><a href="${verifyUrl}" style="display:inline-block;background:#00d4ff;color:#000;padding:12px 24px;border-radius:10px;font-weight:600;text-decoration:none">Verify Email</a></div>`,
							}).catch(() => {});
						}).catch(() => {});
					}
					return { id, email, name, tier: "free" } as User & { tier: string };
				}

				// sign-in
				if (!existing?.passwordHash) return null;
				const valid = await bcrypt.compare(credentials.password, existing.passwordHash);
				if (!valid) return null;
				return { id: existing.id, email: existing.email!, name: existing.name, tier: existing.tier } as User & { tier: string };
			},
		}),
		...(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
			? [GoogleProvider({ clientId: process.env.GOOGLE_CLIENT_ID, clientSecret: process.env.GOOGLE_CLIENT_SECRET })]
			: []),
	],
	callbacks: {
		async jwt({ token, user }) {
			if (user) {
				token.id = user.id;
				token.tier = (user as User & { tier: string }).tier ?? "free";
			}
			return token;
		},
		async session({ session, token }) {
			if (session.user && token.id) {
				session.user.id = token.id as string;
				// Re-fetch tier from DB so Stripe upgrades reflect on next page load
				const dbUser = await db.query.users.findFirst({
					where: (u, { eq }) => eq(u.id, token.id as string),
					columns: { tier: true },
				});
				session.user.tier = dbUser?.tier ?? "free";
			}
			return session;
		},
	},
};
