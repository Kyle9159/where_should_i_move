"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function ExploreError({
	error,
	reset,
}: {
	error: Error & { digest?: string };
	reset: () => void;
}) {
	useEffect(() => {
		console.error("[ExplorePage error]", error);
	}, [error]);

	return (
		<main
			className="min-h-screen flex flex-col items-center justify-center gap-6 px-6 text-center"
			style={{ background: "var(--color-background)" }}
		>
			<span className="text-5xl">🔍</span>
			<div>
				<h1 className="text-2xl font-bold mb-2">Search unavailable</h1>
				<p className="text-sm" style={{ color: "var(--color-muted)" }}>
					There was a problem loading city data. Please try again.
				</p>
			</div>
			<button
				type="button"
				onClick={reset}
				className="text-sm px-5 py-2.5 rounded-xl font-semibold"
				style={{ background: "var(--color-accent)", color: "#000" }}
			>
				Retry
			</button>
		</main>
	);
}
