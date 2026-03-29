import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
	return {
		name: "Where Should I Move — AI Relocation Research",
		short_name: "Where Should I Move",
		description: "Discover, compare, and research the best US cities to live in with AI-powered insights.",
		start_url: "/",
		display: "standalone",
		background_color: "#0a0a0a",
		theme_color: "#00d4ff",
		orientation: "portrait-primary",
		categories: ["lifestyle", "travel", "productivity"],
		icons: [
			{
				src: "/icon-192.png",
				sizes: "192x192",
				type: "image/png",
				purpose: "maskable",
			},
			{
				src: "/icon-512.png",
				sizes: "512x512",
				type: "image/png",
				purpose: "maskable",
			},
		],
		screenshots: [
			{
				src: "/screenshot-explore.png",
				sizes: "1280x720",
				type: "image/png",
			},
		],
		shortcuts: [
			{
				name: "Explore Cities",
				short_name: "Explore",
				description: "Browse and filter US cities",
				url: "/explore",
				icons: [{ src: "/icon-192.png", sizes: "192x192" }],
			},
			{
				name: "AI Quiz",
				short_name: "Quiz",
				description: "Find your perfect city with AI",
				url: "/quiz",
				icons: [{ src: "/icon-192.png", sizes: "192x192" }],
			},
			{
				name: "My Move Plan",
				short_name: "Dashboard",
				description: "Your saved cities and research",
				url: "/dashboard",
				icons: [{ src: "/icon-192.png", sizes: "192x192" }],
			},
		],
	};
}
