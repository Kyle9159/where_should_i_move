import Link from "next/link";
import { ArrowLeft, MapPin } from "lucide-react";

export default function NotFound() {
	return (
		<main
			className="min-h-screen flex flex-col items-center justify-center gap-6 px-6 text-center"
			style={{ background: "var(--color-background)" }}
		>
			<div className="relative">
				<span className="text-6xl">🗺️</span>
				<span className="absolute -top-1 -right-2 text-2xl">?</span>
			</div>

			<div>
				<h1 className="text-3xl font-bold mb-2">Page not found</h1>
				<p className="text-sm" style={{ color: "var(--color-muted)" }}>
					The page you're looking for doesn't exist or has moved.
				</p>
			</div>

			<div className="flex flex-col sm:flex-row items-center gap-3">
				<Link
					href="/explore"
					className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold"
					style={{ background: "var(--color-accent)", color: "#000" }}
				>
					<MapPin size={14} /> Browse Cities
				</Link>
				<Link
					href="/"
					className="flex items-center gap-2 text-sm"
					style={{ color: "var(--color-muted)" }}
				>
					<ArrowLeft size={14} /> Back to Home
				</Link>
			</div>
		</main>
	);
}
