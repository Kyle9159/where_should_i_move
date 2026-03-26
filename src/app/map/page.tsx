import type { Metadata } from "next";
import MapWrapper from "./MapWrapper";

export const metadata: Metadata = {
	title: "Interactive Map — NextHome USA",
	description:
		"Explore US cities on an interactive heatmap. Visualize affordability, safety, job market, climate, and more across 1,000 cities.",
};

export default function MapPage() {
	return <MapWrapper />;
}
