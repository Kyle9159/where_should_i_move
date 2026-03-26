/**
 * Cron: Refresh stale AI city summaries (>30 days old).
 * Runs monthly (1st of month, 03:00 UTC). Protected by CRON_SECRET.
 *
 * Processes up to 20 cities per run (Grok calls take ~3s each).
 */
import { NextResponse } from "next/server";
import { db } from "@/db";
import { aiSummaries } from "@/db/schema";
import { lt, isNull, or, eq } from "drizzle-orm";
import { randomUUID } from "crypto";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const BATCH = 20;
const STALE_DAYS = 30;

interface GrokResponse {
	choices?: Array<{ message?: { content?: string } }>;
}

async function generateSummary(cityName: string, stateId: string): Promise<string | null> {
	const key = process.env.XAI_API_KEY;
	if (!key) return null;

	try {
		const res = await fetch("https://api.x.ai/v1/chat/completions", {
			method: "POST",
			headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
			body: JSON.stringify({
				model: "grok-3-mini",
				messages: [{
					role: "user",
					content: `Write a 2-sentence relocation overview for ${cityName}, ${stateId}. Focus on what makes it unique for people considering moving there. Be specific, honest, and helpful. No fluff.`,
				}],
				max_tokens: 150,
				temperature: 0.7,
			}),
			signal: AbortSignal.timeout(15000),
		});

		if (!res.ok) return null;
		const data = (await res.json()) as GrokResponse;
		return data.choices?.[0]?.message?.content?.trim() ?? null;
	} catch {
		return null;
	}
}

export async function GET() {
	const cutoff = new Date(Date.now() - STALE_DAYS * 24 * 60 * 60 * 1000).toISOString();

	// Find cities with stale or missing summaries
	const staleSummaries = await db.query.aiSummaries.findMany({
		where: (s) => lt(s.generatedAt, cutoff),
		with: { city: { columns: { id: true, name: true, stateId: true } } },
		limit: BATCH,
	});

	// Also grab cities with no summary at all
	const allCities = await db.query.cities.findMany({
		columns: { id: true, name: true, stateId: true },
		orderBy: (c, { desc }) => [desc(c.overallScore)],
		limit: 200,
	});

	const hasSummary = new Set([...staleSummaries.map((s) => s.cityId)]);
	const allSummaries = await db.query.aiSummaries.findMany({ columns: { cityId: true } });
	const withSummary = new Set(allSummaries.map((s) => s.cityId));
	const missing = allCities.filter((c) => !withSummary.has(c.id)).slice(0, BATCH - staleSummaries.length);

	const toProcess = [
		...staleSummaries.map((s) => s.city!),
		...missing,
	].slice(0, BATCH);

	let updated = 0;

	for (const city of toProcess) {
		if (!city) continue;
		const text = await generateSummary(city.name, city.stateId);
		if (!text) continue;

		const existing = await db.query.aiSummaries.findFirst({
			where: (s, { eq }) => eq(s.cityId, city.id),
			columns: { id: true },
		});

		if (existing) {
			await (db as any).update(aiSummaries)
				.set({ overview: text, generatedAt: new Date().toISOString() })
				.where(eq(aiSummaries.id, existing.id));
		} else {
			await (db as any).insert(aiSummaries).values({
				id: randomUUID(),
				cityId: city.id,
				overview: text,
				model: "grok-3-mini",
				generatedAt: new Date().toISOString(),
				promptVersion: "cron-v1",
			});
		}

		updated++;
		await new Promise((r) => setTimeout(r, 500));
	}

	return NextResponse.json({
		ok: true,
		updated,
		staleRefreshed: staleSummaries.length,
		newGenerated: missing.length,
		timestamp: new Date().toISOString(),
	});
}
