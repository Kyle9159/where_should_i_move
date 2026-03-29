"use client";

import { useEffect, useRef } from "react";
import type { Map as LeafletMap } from "leaflet";

interface Props {
	lat: number;
	lng: number;
	cityName: string;
}

export function CityMiniMap({ lat, lng, cityName }: Props) {
	const containerRef = useRef<HTMLDivElement>(null);
	const mapRef = useRef<LeafletMap | null>(null);

	useEffect(() => {
		if (!containerRef.current || mapRef.current) return;
		let mounted = true;

		import("leaflet").then((L) => {
			if (!mounted || !containerRef.current) return;

			const map = L.map(containerRef.current!, {
				center: [lat, lng],
				zoom: 11,
				zoomControl: false,
				attributionControl: false,
				dragging: false,
				scrollWheelZoom: false,
				doubleClickZoom: false,
				touchZoom: false,
				keyboard: false,
			});

			L.tileLayer(
				"https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
				{ subdomains: "abcd", maxZoom: 14 },
			).addTo(map);

			L.circleMarker([lat, lng] as [number, number], {
				radius: 10,
				fillColor: "#00d4ff",
				color: "rgba(0,212,255,0.3)",
				weight: 6,
				fillOpacity: 1,
			}).addTo(map);

			mapRef.current = map;
		});

		return () => {
			mounted = false;
			mapRef.current?.remove();
			mapRef.current = null;
		};
	}, [lat, lng]);

	const googleMapsUrl = `https://maps.google.com/?q=${lat},${lng}`;

	return (
		<a
			href={googleMapsUrl}
			target="_blank"
			rel="noopener noreferrer"
			className="block relative overflow-hidden group cursor-pointer"
			style={{ height: 220 }}
			aria-label={`Open ${cityName} in Google Maps`}
		>
			<div ref={containerRef} className="absolute inset-0" />
			{/* Hover overlay */}
			<div
				className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200"
				style={{ background: "rgba(0,0,0,0.4)" }}
			>
				<span
					className="text-sm font-medium px-4 py-2 rounded-xl"
					style={{
						background: "oklch(18% 0.04 220)",
						border: "1px solid #00d4ff",
						color: "#00d4ff",
					}}
				>
					Open in Google Maps ↗
				</span>
			</div>
		</a>
	);
}
