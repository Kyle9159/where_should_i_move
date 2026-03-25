"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { User, LogIn } from "lucide-react";

export function AuthNav() {
	const { data: session, status } = useSession();

	if (status === "loading") return null;

	if (session?.user) {
		return (
			<Link
				href="/dashboard"
				className="flex items-center gap-2 text-sm px-3 py-1.5 rounded-xl border transition-colors hover:border-[var(--color-accent)]"
				style={{ borderColor: "var(--color-border)", color: "var(--color-muted)" }}
			>
				<User size={14} />
				<span className="hidden sm:inline">Dashboard</span>
			</Link>
		);
	}

	return (
		<Link
			href="/auth/signin"
			className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-xl border transition-colors hover:border-[var(--color-accent)]"
			style={{ borderColor: "var(--color-border)", color: "var(--color-muted)" }}
		>
			<LogIn size={14} />
			<span className="hidden sm:inline">Sign In</span>
		</Link>
	);
}
