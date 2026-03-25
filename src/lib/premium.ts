import type { Session } from "next-auth";

export function isPremium(session: Session | null | undefined): boolean {
	return session?.user?.tier === "premium";
}
