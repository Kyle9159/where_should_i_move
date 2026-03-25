"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { Heart } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
	cityId: string;
	cityName: string;
}

export function SaveCityButton({ cityId, cityName }: Props) {
	const { data: session } = useSession();
	const [saved, setSaved] = useState(false);
	const [loading, setLoading] = useState(false);

	// Check if already saved
	useEffect(() => {
		if (!session?.user?.id) return;
		fetch("/api/users/me/cities")
			.then((r) => r.json())
			.then((data: Array<{ cityId: string }>) => {
				setSaved(data.some((c) => c.cityId === cityId));
			})
			.catch(() => {});
	}, [session, cityId]);

	async function toggle() {
		if (!session?.user?.id) {
			window.location.href = `/auth/signin?callbackUrl=/city/${cityId}`;
			return;
		}
		setLoading(true);
		try {
			if (saved) {
				await fetch("/api/users/me/cities", {
					method: "DELETE",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ cityId }),
				});
				setSaved(false);
			} else {
				await fetch("/api/users/me/cities", {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ cityId }),
				});
				setSaved(true);
			}
		} finally {
			setLoading(false);
		}
	}

	return (
		<button
			type="button"
			onClick={toggle}
			disabled={loading}
			className={cn(
				"flex items-center gap-2 text-sm px-4 py-2 rounded-xl border transition-all",
				saved ? "border-red-400" : "hover:border-[var(--color-accent)]",
			)}
			style={saved
				? { background: "oklch(18% 0.04 15)", borderColor: "oklch(60% 0.15 15)", color: "oklch(70% 0.15 15)" }
				: { borderColor: "var(--color-border)", color: "var(--color-muted)" }
			}
			title={saved ? `Remove ${cityName} from saved` : `Save ${cityName}`}
		>
			<Heart size={14} className={saved ? "fill-current" : ""} />
			{saved ? "Saved" : "Save City"}
		</button>
	);
}
