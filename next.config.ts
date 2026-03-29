import type { NextConfig } from "next";

// ── Security headers ──────────────────────────────────────────────────────────
const securityHeaders = [
	{ key: "X-DNS-Prefetch-Control", value: "on" },
	{ key: "X-Frame-Options", value: "DENY" },
	{ key: "X-Content-Type-Options", value: "nosniff" },
	{ key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
	{ key: "X-XSS-Protection", value: "1; mode=block" },
	{ key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(self), interest-cohort=()" },
	{ key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
	{
		key: "Content-Security-Policy",
		value: [
			"default-src 'self'",
			"script-src 'self' 'unsafe-eval' 'unsafe-inline' https://www.googletagmanager.com https://js.stripe.com",
			"style-src 'self' 'unsafe-inline'",
			"img-src 'self' data: blob: https://images.unsplash.com https://*.tile.openstreetmap.org https://*.basemaps.cartocdn.com https://maps.googleapis.com",
			"font-src 'self' data:",
			"connect-src 'self' https://api.unsplash.com https://api.stripe.com https://archive-api.open-meteo.com https://www.airnowapi.org https://api.usa.gov https://api.bls.gov wss:",
			"frame-src https://js.stripe.com https://hooks.stripe.com",
			"worker-src blob:",
		].join("; "),
	},
];

const nextConfig: NextConfig = {
	output: "standalone",
	images: {
		remotePatterns: [
			{ protocol: "https", hostname: "images.unsplash.com" },
			{ protocol: "https", hostname: "plus.unsplash.com" },
			{ protocol: "https", hostname: "maps.googleapis.com" },
		],
	},

	async headers() {
		return [
			{ source: "/:path*", headers: securityHeaders },
			// Looser CSP for the map page (Leaflet tile CDNs)
			{
				source: "/map",
				headers: [{
					key: "Content-Security-Policy",
					value: [
						"default-src 'self'",
						"script-src 'self' 'unsafe-eval' 'unsafe-inline'",
						"style-src 'self' 'unsafe-inline'",
						"img-src 'self' data: blob: https://images.unsplash.com https://*.tile.openstreetmap.org https://*.basemaps.cartocdn.com https://*.tiles.mapbox.com",
						"connect-src 'self' wss: https://*.tile.openstreetmap.org",
						"worker-src blob:",
					].join("; "),
				}],
			},
		];
	},

	async redirects() {
		return [
			{ source: "/home", destination: "/", permanent: true },
			{ source: "/cities", destination: "/explore", permanent: true },
		];
	},

	experimental: {
		optimizePackageImports: ["lucide-react", "recharts"],
	},
};

export default nextConfig;
