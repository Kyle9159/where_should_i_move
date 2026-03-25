"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import type { Map as LeafletMap, CircleMarker } from "leaflet";

interface CityFeature {
	id: string;
	slug: string;
	name: string;
	stateId: string;
	lat: number;
	lng: number;
	population: number | null;
	tier: string;
	score: number;
	overallScore: number | null;
}

interface HeatmapResponse {
	features: CityFeature[];
	layer: string;
}

const LAYERS = [
	{ id: "overall", label: "Overall Score", icon: "⭐" },
	{ id: "housing", label: "Affordability", icon: "💰" },
	{ id: "jobs", label: "Job Market", icon: "💼" },
	{ id: "crime", label: "Safety", icon: "🛡️" },
	{ id: "climate", label: "Climate", icon: "☀️" },
	{ id: "schools", label: "Schools", icon: "🎓" },
	{ id: "walkability", label: "Walkability", icon: "🚶" },
	{ id: "airquality", label: "Air Quality", icon: "🌬️" },
] as const;

// Score → hex color (red → yellow → green)
function scoreToColor(score: number, opacity = 0.85): string {
	const s = Math.max(0, Math.min(100, score)) / 100;
	// Red (hue 0) → Yellow (hue 60) → Green (hue 120)
	const hue = Math.round(s * 120);
	return `hsla(${hue}, 80%, 45%, ${opacity})`;
}

function scoreToRadius(tier: string): number {
	switch (tier) {
		case "major-city": return 10;
		case "mid-size": return 7;
		case "small-city": return 5;
		default: return 3;
	}
}

export default function MapClient() {
	const mapRef = useRef<LeafletMap | null>(null);
	const containerRef = useRef<HTMLDivElement>(null);
	const markersRef = useRef<CircleMarker[]>([]);
	const [selectedLayer, setSelectedLayer] = useState<string>("overall");
	const [selectedCity, setSelectedCity] = useState<CityFeature | null>(null);
	const [mapReady, setMapReady] = useState(false);

	const { data, isLoading } = useQuery<HeatmapResponse>({
		queryKey: ["heatmap", selectedLayer],
		queryFn: async () => {
			const res = await fetch(`/api/map/heatmap?layer=${selectedLayer}`);
			return res.json() as Promise<HeatmapResponse>;
		},
		staleTime: 5 * 60 * 1000,
	});

	// Initialise Leaflet map once
	useEffect(() => {
		if (!containerRef.current || mapRef.current) return;
		let mounted = true;

		import("leaflet").then((L) => {
			if (!mounted || !containerRef.current) return;

			// Fix marker icon paths (Leaflet webpack issue)
			// @ts-expect-error - leaflet icon path fix
			delete L.Icon.Default.prototype._getIconUrl;
			L.Icon.Default.mergeOptions({
				iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
				iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
				shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
			});

			const map = L.map(containerRef.current!, {
				center: [39.5, -98.35],
				zoom: 4,
				zoomControl: true,
				attributionControl: true,
			});

			// Dark tile layer (CartoDB dark matter)
			L.tileLayer(
				"https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
				{
					attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> © <a href="https://carto.com/">CARTO</a>',
					subdomains: "abcd",
					maxZoom: 14,
				},
			).addTo(map);

			mapRef.current = map;
			setMapReady(true);
		});

		return () => {
			mounted = false;
		};
	}, []);

	// Update markers when data or layer changes
	useEffect(() => {
		if (!mapReady || !mapRef.current || !data?.features) return;

		import("leaflet").then((L) => {
			const map = mapRef.current!;

			// Clear existing markers
			markersRef.current.forEach((m) => map.removeLayer(m));
			markersRef.current = [];

			// Add new markers
			const newMarkers = data.features.map((city) => {
				const marker = L.circleMarker([city.lat, city.lng], {
					radius: scoreToRadius(city.tier),
					fillColor: scoreToColor(city.score),
					color: "rgba(0,0,0,0.3)",
					weight: 0.5,
					opacity: 1,
					fillOpacity: 0.85,
				});

				marker.on("click", () => setSelectedCity(city));
				marker.on("mouseover", function (this: CircleMarker) {
					this.setStyle({ weight: 2, color: "#00d4ff" });
				});
				marker.on("mouseout", function (this: CircleMarker) {
					this.setStyle({ weight: 0.5, color: "rgba(0,0,0,0.3)" });
				});

				marker.addTo(map);
				return marker;
			});

			markersRef.current = newMarkers;
		});
	}, [data, mapReady]);

	const currentLayerLabel = LAYERS.find((l) => l.id === selectedLayer)?.label ?? "Score";

	return (
		<div className="relative h-screen w-full overflow-hidden" style={{ background: "#0a0a0a" }}>
			{/* Leaflet CSS */}
			<link
				rel="stylesheet"
				href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
				integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY="
				crossOrigin=""
			/>

			{/* Map container */}
			<div ref={containerRef} className="absolute inset-0 z-0" />

			{/* Nav overlay */}
			<div className="absolute top-4 left-4 z-[1000]">
				<Link
					href="/explore"
					className="flex items-center gap-2 text-sm px-3 py-2 rounded-xl"
					style={{ background: "oklch(14% 0 0 / 0.9)", backdropFilter: "blur(8px)", border: "1px solid oklch(28% 0 0)", color: "oklch(80% 0 0)" }}
				>
					← Explore
				</Link>
			</div>

			{/* Layer controls */}
			<div
				className="absolute top-4 right-4 z-[1000] rounded-2xl p-4 flex flex-col gap-2"
				style={{ background: "oklch(14% 0 0 / 0.92)", backdropFilter: "blur(12px)", border: "1px solid oklch(28% 0 0)", minWidth: 180 }}
			>
				<p className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: "oklch(55% 0 0)" }}>
					Map Layer
				</p>
				{LAYERS.map((layer) => (
					<button
						key={layer.id}
						type="button"
						onClick={() => setSelectedLayer(layer.id)}
						className="flex items-center gap-2 text-xs px-3 py-2 rounded-lg text-left transition-all"
						style={
							selectedLayer === layer.id
								? { background: "oklch(18% 0.04 220)", border: "1px solid #00d4ff", color: "#00d4ff" }
								: { border: "1px solid transparent", color: "oklch(70% 0 0)" }
						}
					>
						<span>{layer.icon}</span>
						{layer.label}
					</button>
				))}

				{/* Legend */}
				<div className="mt-2 pt-2" style={{ borderTop: "1px solid oklch(28% 0 0)" }}>
					<p className="text-xs mb-1" style={{ color: "oklch(55% 0 0)" }}>Score legend</p>
					<div className="flex items-center gap-1">
						<span className="text-xs" style={{ color: "oklch(55% 0 0)" }}>Low</span>
						<div className="flex-1 h-2 rounded" style={{ background: "linear-gradient(to right, hsl(0,80%,45%), hsl(60,80%,45%), hsl(120,80%,45%))" }} />
						<span className="text-xs" style={{ color: "oklch(55% 0 0)" }}>High</span>
					</div>
				</div>
			</div>

			{/* Loading overlay */}
			{isLoading && (
				<div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-[1000] px-4 py-2 rounded-xl text-xs" style={{ background: "oklch(14% 0 0 / 0.9)", color: "#00d4ff" }}>
					Loading {currentLayerLabel} data...
				</div>
			)}

			{/* City popover */}
			{selectedCity && (
				<div
					className="absolute bottom-8 left-1/2 -translate-x-1/2 z-[1000] rounded-2xl p-4 flex items-center gap-4"
					style={{ background: "oklch(14% 0 0 / 0.95)", backdropFilter: "blur(12px)", border: "1px solid #00d4ff", minWidth: 260 }}
				>
					<div className="flex-1">
						<p className="font-bold">{selectedCity.name}</p>
						<p className="text-xs" style={{ color: "oklch(55% 0 0)" }}>
							{selectedCity.stateId} · {currentLayerLabel}: {selectedCity.score}/100
						</p>
					</div>
					<div className="flex items-center gap-2">
						<Link
							href={`/city/${selectedCity.slug}`}
							className="text-xs px-3 py-1.5 rounded-lg font-medium"
							style={{ background: "#00d4ff", color: "#000" }}
						>
							View City
						</Link>
						<button
							type="button"
							onClick={() => setSelectedCity(null)}
							className="text-xs px-2 py-1.5 rounded-lg"
							style={{ color: "oklch(55% 0 0)" }}
						>
							✕
						</button>
					</div>
				</div>
			)}

			{/* City count badge */}
			<div
				className="absolute bottom-4 right-4 z-[1000] text-xs px-3 py-1.5 rounded-xl"
				style={{ background: "oklch(14% 0 0 / 0.85)", color: "oklch(55% 0 0)", border: "1px solid oklch(28% 0 0)" }}
			>
				{data?.features.length ?? 0} cities
			</div>
		</div>
	);
}
