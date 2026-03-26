"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { Download, Lock } from "lucide-react";
import Link from "next/link";

interface Props {
	slug: string;
	cityName: string;
}

export function DownloadReportButton({ slug, cityName }: Props) {
	const { data: session } = useSession();
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const isPremium = session?.user?.tier === "premium";

	if (!session?.user) {
		return (
			<Link
				href={`/auth/signin?callbackUrl=/city/${slug}`}
				className="flex items-center gap-2 text-xs px-4 py-2 rounded-xl border transition-colors hover:border-[var(--color-accent)]"
				style={{ borderColor: "var(--color-border)", color: "var(--color-muted)" }}
			>
				<Download size={13} /> PDF Report
			</Link>
		);
	}

	if (!isPremium) {
		return (
			<Link
				href="/upgrade"
				className="flex items-center gap-2 text-xs px-4 py-2 rounded-xl border transition-colors hover:border-[var(--color-accent)]"
				style={{ borderColor: "var(--color-border)", color: "var(--color-muted)" }}
				title="Premium feature"
			>
				<Lock size={12} /> PDF Report
			</Link>
		);
	}

	async function download() {
		setLoading(true);
		setError(null);
		try {
			const res = await fetch("/api/export/city-report", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ slug }),
			});

			if (!res.ok) {
				setError("Failed to generate report");
				return;
			}

			const blob = await res.blob();
			const url = URL.createObjectURL(blob);
			const a = document.createElement("a");
			a.href = url;
			a.download = `nexthome-${slug}-report.pdf`;
			a.click();
			URL.revokeObjectURL(url);
		} catch {
			setError("Download failed");
		} finally {
			setLoading(false);
		}
	}

	return (
		<div className="flex flex-col items-start gap-1">
			<button
				type="button"
				onClick={download}
				disabled={loading}
				className="flex items-center gap-2 text-xs px-4 py-2 rounded-xl border transition-all hover:border-[var(--color-accent)] disabled:opacity-50"
				style={{ borderColor: "var(--color-accent)", color: "var(--color-accent)" }}
			>
				<Download size={13} />
				{loading ? "Generating..." : `Download PDF`}
			</button>
			{error && <p className="text-xs" style={{ color: "oklch(65% 0.15 30)" }}>{error}</p>}
		</div>
	);
}
