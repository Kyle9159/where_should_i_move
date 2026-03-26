"use client";

import { useEffect } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function CityError({
	error,
	reset,
}: {
	error: Error & { digest?: string };
	reset: () => void;
}) {
	useEffect(() => {
		console.error("[CityPage error]", error);
	}, [error]);

	return (
		<main
			className="min-h-screen flex flex-col items-center justify-center gap-6 px-6 text-center"
			style={{ background: "var(--color-background)" }}
		>
			<span className="text-5xl">🏙️</span>
			<div>
				<h1 className="text-2xl font-bold mb-2">Couldn't load this city</h1>
				<p className="text-sm" style={{ color: "var(--color-muted)" }}>
					Something went wrong loading the city data. It may have moved or been updated.
				</p>
			</div>
			<div className="flex items-center gap-3">
				<button
					type="button"
					onClick={reset}
					className="text-sm px-5 py-2.5 rounded-xl font-semibold"
					style={{ background: "var(--color-accent)", color: "#000" }}
				>
					Try again
				</button>
				<Link
					href="/explore"
					className="flex items-center gap-1.5 text-sm"
					style={{ color: "var(--color-muted)" }}
				>
					<ArrowLeft size={14} /> Back to Explore
				</Link>
			</div>
		</main>
	);
}
