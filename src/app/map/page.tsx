import type { Metadata } from "next";
import dynamic from "next/dynamic";

export const metadata: Metadata = {
	title: "Interactive Map — NextHome USA",
	description: "Explore US cities on an interactive heatmap. Visualize affordability, safety, job market, climate, and more across 1,000 cities.",
};

// No SSR — Leaflet requires browser APIs
const MapClient = dynamic(() => import("./MapClient"), {
	ssr: false,
	loading: () => (
		<div
			className="h-screen flex items-center justify-center"
			style={{ background: "#0a0a0a", color: "#00d4ff" }}
		>
			<div className="flex flex-col items-center gap-3">
				<div className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: "#00d4ff", borderTopColor: "transparent" }} />
				<span className="text-sm">Loading map...</span>
			</div>
		</div>
	),
});

export default function MapPage() {
	return <MapClient />;
}
