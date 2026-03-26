import { type NextAuthOptions, type Session, type User } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { createId } from "@paralleldrive/cuid2";
import { sendWelcomeEmail } from "@/lib/email";

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
					await (db as any).insert(users).values({ id, email, passwordHash: hash, name });
					// Fire-and-forget welcome email
					sendWelcomeEmail(email, name).catch(() => {});
					return { id, email, name, tier: "free" } as User & { tier: string };
				}

				// sign-in
				if (!existing?.passwordHash) return null;
				const valid = await bcrypt.compare(credentials.password, existing.passwordHash);
				if (!valid) return null;
				return { id: existing.id, email: existing.email!, name: existing.name, tier: existing.tier } as User & { tier: string };
			},
		}),
		// Uncomment to enable Google OAuth:
		// GoogleProvider({
		//   clientId: process.env.GOOGLE_CLIENT_ID!,
		//   clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
		// }),
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
