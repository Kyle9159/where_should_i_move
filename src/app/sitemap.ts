import type { MetadataRoute } from "next";
import { db } from "@/db";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
	const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://nexthomeusa.com";

	// Static pages
	const staticPages: MetadataRoute.Sitemap = [
		{ url: appUrl, lastModified: new Date(), changeFrequency: "weekly", priority: 1.0 },
		{ url: `${appUrl}/explore`, lastModified: new Date(), changeFrequency: "daily", priority: 0.9 },
		{ url: `${appUrl}/quiz`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.8 },
		{ url: `${appUrl}/map`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.7 },
		{ url: `${appUrl}/surprise`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.6 },
	];

	// All city pages
	const cities = await db.query.cities.findMany({ columns: { slug: true, updatedAt: true } });

	const cityPages: MetadataRoute.Sitemap = cities.map((city) => ({
		url: `${appUrl}/city/${city.slug}`,
		lastModified: city.updatedAt ? new Date(city.updatedAt) : new Date(),
		changeFrequency: "weekly" as const,
		priority: 0.7,
	}));

	return [...staticPages, ...cityPages];
}
