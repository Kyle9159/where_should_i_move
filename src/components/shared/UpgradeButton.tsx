"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
	interval?: "monthly" | "yearly";
	label?: string;
	className?: string;
}

export function UpgradeButton({ interval = "monthly", label = "Upgrade to Premium", className }: Props) {
	const { data: session } = useSession();
	const [loading, setLoading] = useState(false);

	async function handleUpgrade() {
		if (!session?.user?.id) {
			window.location.href = "/auth/signin?callbackUrl=/upgrade";
			return;
		}
		setLoading(true);
		try {
			const res = await fetch("/api/stripe/checkout", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ interval }),
			});
			const data = await res.json() as { url?: string; error?: string };
			if (data.url) {
				window.location.href = data.url;
			}
		} finally {
			setLoading(false);
		}
	}

	return (
		<button
			type="button"
			onClick={handleUpgrade}
			disabled={loading}
			className={cn(
				"inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all hover:brightness-110 disabled:opacity-60",
				className,
			)}
			style={{ background: "var(--color-accent)", color: "#000" }}
		>
			<Sparkles size={14} />
			{loading ? "Redirecting…" : label}
		</button>
	);
}
