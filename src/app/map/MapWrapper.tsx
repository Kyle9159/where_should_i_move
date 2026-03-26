"use client";

import dynamic from "next/dynamic";

function MapLoading() {
	return (
		<div
			className="h-screen flex items-center justify-center"
			style={{ background: "#0a0a0a", color: "#00d4ff" }}
		>
			<div className="flex flex-col items-center gap-3">
				<div
					className="w-8 h-8 rounded-full border-2 animate-spin"
					style={{ borderColor: "#00d4ff", borderTopColor: "transparent" }}
				/>
				<span className="text-sm">Loading map...</span>
			</div>
		</div>
	);
}

const MapClient = dynamic(() => import("./MapClient"), {
	ssr: false,
	loading: MapLoading,
});

export default function MapWrapper() {
	return <MapClient />;
}
