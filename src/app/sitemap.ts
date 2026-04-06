import type { MetadataRoute } from "next";
import { db } from "@/db";

const PERSONA_SLUGS = [
	"remote-work", "retirees", "outdoors", "young-professionals",
	"families", "budget", "beach-life", "college-towns",
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
	const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://whereshouldimove.us";

	// Static pages
	const staticPages: MetadataRoute.Sitemap = [
		{ url: appUrl, lastModified: new Date(), changeFrequency: "weekly", priority: 1.0 },
		{ url: `${appUrl}/explore`, lastModified: new Date(), changeFrequency: "daily", priority: 0.9 },
		{ url: `${appUrl}/quiz`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.8 },
		{ url: `${appUrl}/map`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.7 },
		{ url: `${appUrl}/compare`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.7 },
		{ url: `${appUrl}/best`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.8 },
		{ url: `${appUrl}/tools/cost-of-living`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.8 },
		{ url: `${appUrl}/surprise`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.6 },
	];

	// Best Cities For... persona pages
	const personaPages: MetadataRoute.Sitemap = PERSONA_SLUGS.map((slug) => ({
		url: `${appUrl}/best/${slug}`,
		lastModified: new Date(),
		changeFrequency: "weekly" as const,
		priority: 0.8,
	}));

	// All city pages
	const cities = await db.query.cities.findMany({ columns: { slug: true, updatedAt: true } });

	const cityPages: MetadataRoute.Sitemap = cities.map((city) => ({
		url: `${appUrl}/city/${city.slug}`,
		lastModified: city.updatedAt ? new Date(city.updatedAt) : new Date(),
		changeFrequency: "weekly" as const,
		priority: 0.7,
	}));

	return [...staticPages, ...personaPages, ...cityPages];
}
