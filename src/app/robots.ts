import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
	const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://nexthomeusa.com";
	return {
		rules: [{ userAgent: "*", allow: "/", disallow: ["/api/", "/dashboard/"] }],
		sitemap: `${appUrl}/sitemap.xml`,
	};
}
