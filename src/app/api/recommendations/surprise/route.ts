import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { GROK_MODEL } from "@/lib/constants";
import { decodeWeights, type FilterWeights } from "@/lib/ranking";

const RequestSchema = z.object({
	filterWeights: z.record(z.string(), z.number()).optional(),
	weightsEncoded: z.string().optional(),
	excludeSlugs: z.array(z.string()).optional().default([]),
	count: z.number().min(1).max(10).optional().default(5),
});

interface SurpriseCity {
	id: string;
	slug: string;
	name: string;
	stateId: string;
	population: number | null;
	tier: string;
	heroImageUrl: string | null;
	thumbnailUrl: string | null;
	overallScore: number | null;
	grokReasoning: string;
}

const SYSTEM_PROMPT = `You are a relocation advisor helping someone find hidden-gem US cities they'd never think to consider.
Given a user's preferences (encoded as weighted filters), recommend surprising, non-obvious cities that would genuinely delight them.
Avoid the usual suspects (Austin, Denver, Seattle, etc.) unless they're truly the best fit.
Focus on cities that punch above their weight in ways that match this specific user's priorities.

For each city, provide ONE sentence of reasoning that explains specifically WHY this city matches their profile — be concrete (mention actual features, not generic praise).

Respond ONLY with a JSON object: { "recommendations": [{ "slug": "city-slug-st", "reasoning": "..." }, ...] }
No markdown, no explanation outside the JSON.`;

export async function POST(req: NextRequest) {
	try {
		const body = await req.json() as unknown;
		const parsed = RequestSchema.safeParse(body);
		if (!parsed.success) {
			return NextResponse.json({ error: "Invalid request" }, { status: 400 });
		}

		const { filterWeights, weightsEncoded, excludeSlugs, count } = parsed.data;

		// Resolve weights
		const weights: FilterWeights = filterWeights ??
			(weightsEncoded ? decodeWeights(weightsEncoded) : {});

		// Get top 100 cities by overall score as candidates (Grok picks the hidden gems from these)
		const candidates = await db.query.cities.findMany({
			orderBy: (c, { desc }) => [desc(c.overallScore)],
			limit: 200,
			columns: { id: true, slug: true, name: true, stateId: true, tier: true, overallScore: true },
		});

		// Filter out excluded slugs and limit context size for Grok
		const candidateList = candidates
			.filter((c) => !excludeSlugs.includes(c.slug))
			.map((c) => `${c.slug} (${c.name}, ${c.stateId}, score:${Math.round(c.overallScore ?? 50)})`)
			.slice(0, 100)
			.join(", ");

		const userMessage = `User preferences: ${JSON.stringify(weights, null, 2)}

Available cities to choose from: ${candidateList}

Pick ${count} surprising, hidden-gem cities from this list that best match these preferences. Avoid the most obvious major metros unless genuinely surprising. Focus on mid-size cities and underrated gems.`;

		const apiKey = process.env.XAI_API_KEY;

		let recommendations: Array<{ slug: string; reasoning: string }> = [];

		if (apiKey) {
			try {
				const res = await fetch("https://api.x.ai/v1/chat/completions", {
					method: "POST",
					headers: {
						Authorization: `Bearer ${apiKey}`,
						"Content-Type": "application/json",
					},
					body: JSON.stringify({
						model: GROK_MODEL,
						response_format: { type: "json_object" },
						messages: [
							{ role: "system", content: SYSTEM_PROMPT },
							{ role: "user", content: userMessage },
						],
						temperature: 0.7, // higher temp for creative variety
					}),
					signal: AbortSignal.timeout(15_000),
				});

				if (res.ok) {
					const data = await res.json() as { choices: Array<{ message: { content: string } }> };
					const raw = JSON.parse(data.choices[0]?.message?.content ?? "{}") as { recommendations?: Array<{ slug: string; reasoning: string }> };
					recommendations = raw.recommendations ?? [];
				}
			} catch {
				// Fall through to deterministic fallback
			}
		}

		// Fallback: pick cities from the candidates list that aren't too obvious
		if (recommendations.length === 0) {
			const fallbackCities = candidates
				.filter((c) => !excludeSlugs.includes(c.slug))
				.filter((c) => c.tier !== "major-city") // skip the big ones
				.slice(5, 5 + count); // skip very top, pick second-tier
			recommendations = fallbackCities.map((c) => ({
				slug: c.slug,
				reasoning: `${c.name} consistently scores high across the metrics you prioritized — a hidden gem worth considering.`,
			}));
		}

		// Fetch full city data for the recommendations
		const resultCities: SurpriseCity[] = [];
		for (const rec of recommendations.slice(0, count)) {
			const city = await db.query.cities.findFirst({
				where: (c, { eq }) => eq(c.slug, rec.slug),
				columns: {
					id: true, slug: true, name: true, stateId: true,
					population: true, tier: true, heroImageUrl: true,
					thumbnailUrl: true, overallScore: true,
				},
			});

			if (city) {
				resultCities.push({ ...city, grokReasoning: rec.reasoning });
			}
		}

		return NextResponse.json({
			cities: resultCities,
			count: resultCities.length,
			poweredBy: apiKey ? "grok" : "fallback",
		});
	} catch (err) {
		console.error("Surprise Me error:", err);
		return NextResponse.json({ error: "Failed to generate recommendations" }, { status: 500 });
	}
}
