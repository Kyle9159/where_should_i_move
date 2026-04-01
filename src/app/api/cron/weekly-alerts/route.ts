import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { savedSearches } from "@/db/schema";
import { decodeWeights, computeMatchPct } from "@/lib/ranking";
import { sendWeeklyAlertEmail } from "@/lib/email";
import type { CityFilterScores } from "@/db/schema";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://whereshouldimove.us";

export async function GET(req: NextRequest) {
	// Validate cron secret
	const secret = process.env.CRON_SECRET;
	const authHeader = req.headers.get("authorization");
	if (secret && authHeader !== `Bearer ${secret}`) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}

	// Fetch all enabled alerts with user info
	const alerts = await db.query.savedSearches.findMany({
		where: (s, { eq }) => eq(s.alertEnabled, true),
		with: { user: { columns: { id: true, name: true, email: true } } },
		limit: 1000,
	});

	if (alerts.length === 0) {
		return NextResponse.json({ sent: 0, message: "No active alerts" });
	}

	// Fetch all city data once (reused for every alert)
	const allCities = await db.query.cities.findMany({
		with: { filterScores: true },
		columns: {
			id: true, slug: true, name: true, stateId: true, tier: true, overallScore: true,
		},
	});

	let sent = 0;
	const errors: string[] = [];

	for (const alert of alerts) {
		if (!alert.user?.email) continue;

		try {
			const state = JSON.parse(alert.filterState) as {
				weights?: string;
				stateIds?: string[];
				tiers?: string[];
				sortBy?: string;
			};

			const weights = state.weights ? decodeWeights(state.weights) : null;

			// Filter + rank cities
			let filtered = allCities.filter((c) => c.filterScores != null);

			if (state.stateIds?.length) {
				filtered = filtered.filter((c) => state.stateIds!.includes(c.stateId));
			}
			if (state.tiers?.length) {
				filtered = filtered.filter((c) => state.tiers!.includes(c.tier));
			}

			const ranked = filtered
				.map((c) => ({
					name: c.name,
					stateId: c.stateId,
					slug: c.slug,
					score: weights
						? computeMatchPct(c.filterScores as CityFilterScores, weights)
						: Math.round(c.overallScore ?? 50),
				}))
				.sort((a, b) => b.score - a.score)
				.slice(0, 5);

			if (ranked.length === 0) continue;

			const exploreUrl = state.weights
				? `${APP_URL}/explore?weights=${encodeURIComponent(state.weights)}`
				: `${APP_URL}/explore`;

			await sendWeeklyAlertEmail(
				alert.user.email,
				alert.user.name ?? "there",
				alert.name ?? "My Search",
				ranked,
				exploreUrl,
				`${APP_URL}/dashboard`,
			);

			// Update lastSentAt
			await (db as any).update(savedSearches)
				.set({ alertLastSentAt: new Date().toISOString() })
				.where(eq(savedSearches.id, alert.id));

			sent++;
		} catch (err) {
			errors.push(`${alert.id}: ${String(err)}`);
		}
	}

	return NextResponse.json({ sent, total: alerts.length, errors });
}
